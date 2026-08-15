"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createPeerConnection,
  getCallMedia,
  refreshPeerIceServers,
  stopStream,
} from "@/lib/webrtc";
import {
  callChannelName,
  signalChannelName,
  type LokrCall,
  type SignalMessage,
} from "@/lib/call-signaling";
import { loadCall, setCallStatus, startCall as startCallAction } from "@/lib/actions/calls";
import { blobToFile, createVideoRecorder, mixCallStreams, MAX_VIDEO_SECONDS } from "@/lib/video-recording";
import { Button } from "@/components/ui/button";
import { SendVideoDialog } from "@/components/SendVideoDialog";

type Session = {
  call: LokrCall;
  role: "caller" | "callee";
  peerName: string;
};

type CallContextValue = {
  startVideoCall: (conversationId: string, peerName: string) => Promise<string | null>;
  inCall: boolean;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const value = useContext(CallContext);
  if (!value) throw new Error("useCall must be used inside CallProvider");
  return value;
}

export function CallProvider({
  userId,
  workspaceId,
  children,
}: {
  userId: string;
  workspaceId: string | null;
  children: ReactNode;
}) {
  const [incoming, setIncoming] = useState<{ call: LokrCall; fromName: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mixStopRef = useRef<(() => void) | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const ringTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const restartingRef = useRef(false);
  const roleRef = useRef<"caller" | "callee" | null>(null);
  const lastConversationIdRef = useRef<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const sendSignal = useCallback(async (channel: RealtimeChannel, payload: SignalMessage) => {
    await channel.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const cleanup = useCallback(async () => {
    if (recordTimerRef.current) window.clearTimeout(recordTimerRef.current);
    if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    restartingRef.current = false;
    roleRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    mixStopRef.current?.();
    mixStopRef.current = null;
    recorderRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setRemoteStream(null);
    if (callChannelRef.current) {
      await supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }
    setSession(null);
    setIncoming(null);
    setMicOn(true);
    setCamOn(true);
    setRecording(false);
    setStatus("");
  }, [supabase]);

  const hangup = useCallback(async () => {
    const call = session?.call ?? incoming?.call;
    if (callChannelRef.current && call) {
      await sendSignal(callChannelRef.current, { type: "hangup", callId: call.id });
    }
    if (call) await setCallStatus(call.id, "ended");
    await cleanup();
  }, [cleanup, incoming, sendSignal, session]);

  const attachLocal = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, []);

  const restartIce = useCallback(
    async (pc: RTCPeerConnection) => {
      if (restartingRef.current || pc.connectionState === "closed") return;
      restartingRef.current = true;
      setStatus("Reconnecting…");
      try {
        await refreshPeerIceServers(pc);
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        if (callChannelRef.current) {
          await sendSignal(callChannelRef.current, { type: "offer", sdp: offer });
        }
      } catch {
        setStatus("Connection lost");
      } finally {
        restartingRef.current = false;
      }
    },
    [sendSignal],
  );

  const bindPeer = useCallback(
    (pc: RTCPeerConnection, channel: RealtimeChannel) => {
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal(channel, { type: "ice", candidate: event.candidate.toJSON() });
        }
      };
      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          void remoteVideoRef.current.play().catch(() => {});
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setStatus("");
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setStatus("");
          return;
        }
        if (roleRef.current !== "caller") return;
        if (pc.iceConnectionState === "failed") {
          void restartIce(pc);
          return;
        }
        if (pc.iceConnectionState === "disconnected") {
          if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = window.setTimeout(() => {
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
              void restartIce(pc);
            }
          }, 2500);
        }
      };
    },
    [restartIce, sendSignal],
  );

  const handleSignal = useCallback(
    async (payload: SignalMessage) => {
      const pc = pcRef.current;
      if (payload.type === "hangup") {
        await cleanup();
        return;
      }
      if (payload.type === "ice") {
        if (!pc || !pc.remoteDescription) {
          pendingIce.current.push(payload.candidate);
          return;
        }
        await pc.addIceCandidate(payload.candidate);
        return;
      }
      if (payload.type === "offer" && pc) {
        await pc.setRemoteDescription(payload.sdp);
        for (const candidate of pendingIce.current) {
          await pc.addIceCandidate(candidate);
        }
        pendingIce.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (callChannelRef.current) {
          await sendSignal(callChannelRef.current, { type: "answer", sdp: answer });
        }
        return;
      }
      if (payload.type === "answer" && pc) {
        await pc.setRemoteDescription(payload.sdp);
        for (const candidate of pendingIce.current) {
          await pc.addIceCandidate(candidate);
        }
        pendingIce.current = [];
      }
      if (payload.type === "join" && pc && callChannelRef.current) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal(callChannelRef.current, { type: "offer", sdp: offer });
        if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
        await setCallStatus(payload.callId, "active");
      }
    },
    [cleanup, sendSignal],
  );

  const joinCallChannel = useCallback(
    async (call: LokrCall) => {
      const channel = supabase.channel(callChannelName(call.id), {
        config: { broadcast: { ack: true } },
      });
      channel.on("broadcast", { event: "signal" }, ({ payload }) => {
        void handleSignal(payload as SignalMessage);
      });
      await new Promise<void>((resolve) => {
        channel.subscribe((state) => {
          if (state === "SUBSCRIBED") resolve();
        });
      });
      callChannelRef.current = channel;
      return channel;
    },
    [handleSignal, supabase],
  );

  const startVideoCall = useCallback(
    async (conversationId: string, peerName: string) => {
      if (session) return "A call is already in progress.";
      setStatus("Starting call…");
      const started = await startCallAction(conversationId);
      if (started.error || !started.call) {
        setStatus("");
        return started.error ?? "We could not start that call.";
      }
      try {
        const stream = await getCallMedia();
        attachLocal(stream);
        const pc = await createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pcRef.current = pc;
        const channel = await joinCallChannel(started.call);
        bindPeer(pc, channel);
        const invite: SignalMessage = {
          type: "invite",
          callId: started.call.id,
          conversationId,
          fromId: userId,
        };
        const signal = supabase.channel(signalChannelName(started.call.callee_id));
        await new Promise<void>((resolve) => {
          signal.subscribe((state) => {
            if (state === "SUBSCRIBED") resolve();
          });
        });
        await sendSignal(signal, invite);
        await supabase.removeChannel(signal);
        roleRef.current = "caller";
        setSession({ call: started.call, role: "caller", peerName });
        lastConversationIdRef.current = started.call.conversation_id;
        setStatus("Calling…");
        if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
        ringTimerRef.current = window.setTimeout(() => {
          void hangup();
        }, 45000);
        return null;
      } catch {
        await setCallStatus(started.call.id, "ended");
        await cleanup();
        return "Camera or microphone could not be opened.";
      }
    },
    [attachLocal, bindPeer, cleanup, hangup, joinCallChannel, sendSignal, session, supabase, userId],
  );

  const acceptIncoming = useCallback(async () => {
    if (!incoming) return;
    const { call, fromName } = incoming;
    try {
      const stream = await getCallMedia();
      attachLocal(stream);
      const pc = await createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pcRef.current = pc;
      const channel = await joinCallChannel(call);
      bindPeer(pc, channel);
      await sendSignal(channel, { type: "join", callId: call.id });
      await setCallStatus(call.id, "active");
      if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
      roleRef.current = "callee";
      setIncoming(null);
      setSession({ call, role: "callee", peerName: fromName });
      lastConversationIdRef.current = call.conversation_id;
      setStatus("");
    } catch {
      await setCallStatus(call.id, "ended");
      await cleanup();
    }
  }, [attachLocal, bindPeer, cleanup, incoming, joinCallChannel, sendSignal]);

  const declineIncoming = useCallback(async () => {
    if (!incoming) return;
    await setCallStatus(incoming.call.id, "ended");
    const channel = supabase.channel(callChannelName(incoming.call.id));
    await new Promise<void>((resolve) => {
      channel.subscribe((state) => {
        if (state === "SUBSCRIBED") resolve();
      });
    });
    await sendSignal(channel, { type: "hangup", callId: incoming.call.id });
    await supabase.removeChannel(channel);
    setIncoming(null);
  }, [incoming, sendSignal, supabase]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(signalChannelName(userId));
    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      const message = payload as SignalMessage;
      if (message.type !== "invite") return;
      void (async () => {
        const loaded = await loadCall(message.callId);
        if (!loaded.call || loaded.call.status === "ended") return;
        if (loaded.call.callee_id !== userId) return;
        if (session || incoming) return;
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", loaded.call.caller_id)
          .maybeSingle();
        const fromName = data?.full_name || data?.email || "Someone";
        setIncoming({ call: loaded.call, fromName });
      })();
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [incoming, session, supabase, userId]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [session]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      void remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream, session]);

  function toggleMic() {
    const next = !micOn;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicOn(next);
  }

  function toggleCam() {
    const next = !camOn;
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCamOn(next);
  }

  function startRecording() {
    const local = localStreamRef.current;
    if (!local || !localVideoRef.current) return;
    const mixed = mixCallStreams(
      localVideoRef.current,
      remoteVideoRef.current,
      local,
      remoteStreamRef.current,
    );
    mixStopRef.current = mixed.stop;
    const { recorder, chunks, mimeType } = createVideoRecorder(mixed.stream);
    recorder.onstop = () => {
      mixStopRef.current?.();
      mixStopRef.current = null;
      const blob = new Blob(chunks, { type: mimeType });
      setRecordedFile(blobToFile(blob, mimeType));
      setRecording(false);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
    recordTimerRef.current = window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, MAX_VIDEO_SECONDS * 1000);
  }

  function stopRecording() {
    if (recordTimerRef.current) window.clearTimeout(recordTimerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  const inCall = Boolean(session);

  return (
    <CallContext.Provider value={{ startVideoCall, inCall }}>
      {children}
      {incoming && !session ? (
        <div className="fixed inset-x-0 top-4 z-50 mx-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-[#3F3F3F] bg-[#1F1F1F] p-5 shadow-xl">
          <p className="font-heading text-lg text-[#F8F8F7]">Incoming call</p>
          <p className="mt-1 text-[#A39E96]">{incoming.fromName} is calling on a locked line.</p>
          <div className="mt-4 flex gap-3">
            <Button type="button" onClick={() => void acceptIncoming()}>
              Answer
            </Button>
            <Button type="button" variant="outline" onClick={() => void declineIncoming()}>
              Decline
            </Button>
          </div>
        </div>
      ) : null}
      {session ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#1F1F1F]">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-heading text-xl text-[#F8F8F7]">{session.peerName}</p>
              <p className="text-sm text-[#A39E96]">{status || (recording ? "Recording" : "Private call")}</p>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 px-4 pb-4">
            <video
              ref={remoteVideoRef}
              className="h-full w-full rounded-xl bg-[#2A2A2A] object-cover"
              autoPlay
              playsInline
            />
            <video
              ref={localVideoRef}
              className="absolute bottom-6 right-6 h-36 w-28 rounded-lg border border-[#3F3F3F] bg-[#333333] object-cover"
              autoPlay
              muted
              playsInline
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-5">
            <Button type="button" variant="outline" size="icon" onClick={toggleMic} aria-label={micOn ? "Mute" : "Unmute"}>
              {micOn ? <Mic /> : <MicOff />}
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={toggleCam} aria-label={camOn ? "Turn camera off" : "Turn camera on"}>
              {camOn ? <Video /> : <VideoOff />}
            </Button>
            <Button
              type="button"
              variant={recording ? "destructive" : "outline"}
              onClick={recording ? stopRecording : startRecording}
            >
              <Circle className={recording ? "fill-current" : ""} />
              {recording ? "Stop recording" : "Record"}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void hangup()}>
              <PhoneOff />
              End call
            </Button>
          </div>
        </div>
      ) : (
        <>
          <video ref={localVideoRef} className="hidden" autoPlay muted playsInline />
          <video ref={remoteVideoRef} className="hidden" autoPlay playsInline />
        </>
      )}
      {recordedFile && workspaceId ? (
        <SendVideoDialog
          file={recordedFile}
          workspaceId={workspaceId}
          defaultConversationId={lastConversationIdRef.current}
          onClose={() => setRecordedFile(null)}
        />
      ) : null}
    </CallContext.Provider>
  );
}

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
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createPeerConnection, getCallMedia, refreshPeerIceServers, stopStream } from "@/lib/webrtc";
import {
  callChannelName,
  signalChannelName,
  type CallPeer,
  type LokrCall,
  type RemotePeer,
  type SignalMessage,
} from "@/lib/call-signaling";
import { listCallPeers, loadCall, setCallStatus, startCall as startCallAction } from "@/lib/actions/calls";
import { Button } from "@/components/ui/button";

type Session = {
  call: LokrCall;
  role: "caller" | "callee";
};

type CallContextValue = {
  startVideoCall: (conversationId: string, peers: CallPeer[]) => Promise<string | null>;
  joinVideoCall: (call: LokrCall, peers: CallPeer[]) => Promise<string | null>;
  hangup: () => Promise<void>;
  inCall: boolean;
  callConversationId: string | null;
  localStream: MediaStream | null;
  remotePeers: RemotePeer[];
  micOn: boolean;
  camOn: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  status: string;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  return useContext(CallContext);
}

export function CallProvider({
  userId,
  workspaceId: _workspaceId,
  children,
}: {
  userId: string;
  workspaceId: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [incoming, setIncoming] = useState<{ call: LokrCall; fromName: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState("");

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIce = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const namesRef = useRef<Map<string, string>>(new Map());
  const callChannelRef = useRef<RealtimeChannel | null>(null);
  const ringTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<Map<string, number>>(new Map());
  const sessionRef = useRef<Session | null>(null);
  const incomingRef = useRef<{ call: LokrCall; fromName: string } | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);

  const sendSignal = useCallback(async (channel: RealtimeChannel, payload: SignalMessage) => {
    await channel.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const rememberPeers = useCallback((peers: CallPeer[]) => {
    for (const peer of peers) {
      namesRef.current.set(peer.id, peer.display_name);
    }
  }, []);

  const peerName = useCallback((id: string) => namesRef.current.get(id) ?? "Someone", []);

  const closePeer = useCallback((remoteId: string) => {
    const timer = reconnectTimerRef.current.get(remoteId);
    if (timer) window.clearTimeout(timer);
    reconnectTimerRef.current.delete(remoteId);
    pcsRef.current.get(remoteId)?.close();
    pcsRef.current.delete(remoteId);
    pendingIce.current.delete(remoteId);
    setRemotePeers((current) => current.filter((peer) => peer.userId !== remoteId));
  }, []);

  const cleanup = useCallback(async () => {
    if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
    for (const timer of reconnectTimerRef.current.values()) window.clearTimeout(timer);
    reconnectTimerRef.current.clear();
    for (const pc of pcsRef.current.values()) pc.close();
    pcsRef.current.clear();
    pendingIce.current.clear();
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setRemotePeers([]);
    if (callChannelRef.current) {
      await supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }
    sessionRef.current = null;
    incomingRef.current = null;
    setSession(null);
    setIncoming(null);
    setMicOn(true);
    setCamOn(true);
    setStatus("");
  }, [supabase]);

  const hangup = useCallback(async () => {
    const call = sessionRef.current?.call ?? incomingRef.current?.call;
    if (callChannelRef.current && call) {
      await sendSignal(callChannelRef.current, {
        type: "hangup",
        callId: call.id,
        userId,
        endAll: true,
      });
    }
    if (call) await setCallStatus(call.id, "ended");
    await cleanup();
  }, [cleanup, sendSignal, userId]);

  const flushIce = useCallback(async (remoteId: string, pc: RTCPeerConnection) => {
    const queued = pendingIce.current.get(remoteId) ?? [];
    pendingIce.current.set(remoteId, []);
    for (const candidate of queued) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  const bindPeer = useCallback(
    (pc: RTCPeerConnection, remoteId: string) => {
      pc.onicecandidate = (event) => {
        if (!event.candidate || !callChannelRef.current) return;
        void sendSignal(callChannelRef.current, {
          type: "ice",
          fromId: userId,
          toId: remoteId,
          candidate: event.candidate.toJSON(),
        });
      };
      pc.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
        setRemotePeers((current) => {
          const next = current.filter((peer) => peer.userId !== remoteId);
          next.push({ userId: remoteId, name: peerName(remoteId), stream });
          return next;
        });
        setStatus("Private call");
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setStatus("Private call");
          return;
        }
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          const existing = reconnectTimerRef.current.get(remoteId);
          if (existing) window.clearTimeout(existing);
          reconnectTimerRef.current.set(
            remoteId,
            window.setTimeout(() => {
              if (pc.iceConnectionState === "failed") {
                void refreshPeerIceServers(pc);
                if (userId < remoteId) {
                  void pc
                    .createOffer({ iceRestart: true })
                    .then(async (offer) => {
                      await pc.setLocalDescription(offer);
                      if (callChannelRef.current) {
                        await sendSignal(callChannelRef.current, {
                          type: "offer",
                          fromId: userId,
                          toId: remoteId,
                          sdp: offer,
                        });
                      }
                    })
                    .catch(() => {});
                }
              }
            }, 2500),
          );
        }
      };
    },
    [peerName, sendSignal, userId],
  );

  const ensurePeer = useCallback(
    async (remoteId: string) => {
      const existing = pcsRef.current.get(remoteId);
      if (existing) return existing;
      const stream = localStreamRef.current;
      if (!stream) throw new Error("Camera is not ready.");
      const pc = await createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      bindPeer(pc, remoteId);
      pcsRef.current.set(remoteId, pc);
      setRemotePeers((current) =>
        current.some((peer) => peer.userId === remoteId)
          ? current
          : [...current, { userId: remoteId, name: peerName(remoteId), stream: null }],
      );
      return pc;
    },
    [bindPeer, peerName],
  );

  const maybeOffer = useCallback(
    async (remoteId: string) => {
      if (remoteId === userId || userId >= remoteId) return;
      const pc = await ensurePeer(remoteId);
      if (pc.signalingState !== "stable") return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (callChannelRef.current) {
        await sendSignal(callChannelRef.current, {
          type: "offer",
          fromId: userId,
          toId: remoteId,
          sdp: offer,
        });
      }
    },
    [ensurePeer, sendSignal, userId],
  );

  const handleSignal = useCallback(
    async (payload: SignalMessage) => {
      if (payload.type === "hangup") {
        if (payload.userId === userId) return;
        if (payload.endAll) {
          await cleanup();
          return;
        }
        closePeer(payload.userId);
        if (pcsRef.current.size === 0) setStatus("Waiting for others…");
        return;
      }
      if (payload.type === "join" || payload.type === "hello") {
        if (payload.userId === userId) return;
        await ensurePeer(payload.userId);
        if (callChannelRef.current && payload.type === "join") {
          await sendSignal(callChannelRef.current, {
            type: "hello",
            callId: payload.callId,
            userId,
          });
        }
        await maybeOffer(payload.userId);
        return;
      }
      if (payload.type === "offer") {
        if (payload.toId !== userId) return;
        const pc = await ensurePeer(payload.fromId);
        await pc.setRemoteDescription(payload.sdp);
        await flushIce(payload.fromId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (callChannelRef.current) {
          await sendSignal(callChannelRef.current, {
            type: "answer",
            fromId: userId,
            toId: payload.fromId,
            sdp: answer,
          });
        }
        const activeId = sessionRef.current?.call.id ?? incomingRef.current?.call.id;
        if (activeId) await setCallStatus(activeId, "active");
        return;
      }
      if (payload.type === "answer") {
        if (payload.toId !== userId) return;
        const pc = pcsRef.current.get(payload.fromId);
        if (!pc) return;
        await pc.setRemoteDescription(payload.sdp);
        await flushIce(payload.fromId, pc);
        const callId = sessionRef.current?.call.id;
        if (callId) await setCallStatus(callId, "active");
        return;
      }
      if (payload.type === "ice") {
        if (payload.toId !== userId) return;
        const pc = pcsRef.current.get(payload.fromId);
        if (!pc || !pc.remoteDescription) {
          const queued = pendingIce.current.get(payload.fromId) ?? [];
          queued.push(payload.candidate);
          pendingIce.current.set(payload.fromId, queued);
          return;
        }
        await pc.addIceCandidate(payload.candidate);
      }
    },
    [cleanup, closePeer, ensurePeer, flushIce, maybeOffer, sendSignal, userId],
  );

  const handleSignalRef = useRef(handleSignal);
  handleSignalRef.current = handleSignal;

  const joinCallChannel = useCallback(
    async (call: LokrCall) => {
      if (callChannelRef.current) {
        await supabase.removeChannel(callChannelRef.current);
        callChannelRef.current = null;
      }
      const channel = supabase.channel(callChannelName(call.id), {
        config: { broadcast: { ack: true } },
      });
      channel.on("broadcast", { event: "signal" }, ({ payload }) => {
        void handleSignalRef.current(payload as SignalMessage);
      });
      await new Promise<void>((resolve) => {
        channel.subscribe((state) => {
          if (state === "SUBSCRIBED") resolve();
        });
      });
      callChannelRef.current = channel;
      return channel;
    },
    [supabase],
  );

  const enterCall = useCallback(
    async (call: LokrCall, peers: CallPeer[], role: "caller" | "callee") => {
      rememberPeers(peers);
      const stream = await getCallMedia();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setRemotePeers(
        peers
          .filter((peer) => peer.id !== userId)
          .map((peer) => ({ userId: peer.id, name: peer.display_name, stream: null })),
      );
      const channel = await joinCallChannel(call);
      sessionRef.current = { call, role };
      setSession({ call, role });
      await sendSignal(channel, { type: "join", callId: call.id, userId });
      if (role === "caller") {
        setStatus("Calling…");
        if (ringTimerRef.current) window.clearTimeout(ringTimerRef.current);
        ringTimerRef.current = window.setTimeout(() => {
          const connected = [...pcsRef.current.values()].some(
            (pc) => pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed",
          );
          if (!connected) void hangup();
        }, 45000);
      } else {
        setStatus("Joining…");
        await setCallStatus(call.id, "active");
      }
    },
    [hangup, joinCallChannel, rememberPeers, sendSignal, userId],
  );

  const startVideoCall = useCallback(
    async (conversationId: string, peers: CallPeer[]) => {
      if (sessionRef.current) return "A call is already in progress.";
      const others = peers.filter((peer) => peer.id !== userId);
      if (others.length === 0) return "Video calls need at least one other person.";
      setStatus("Starting call…");
      const started = await startCallAction(conversationId);
      if (started.error || !started.call) {
        setStatus("");
        return started.error ?? "We could not start that call.";
      }
      try {
        await enterCall(started.call, peers, "caller");
        const invite: SignalMessage = {
          type: "invite",
          callId: started.call.id,
          conversationId,
          fromId: userId,
        };
        for (const peer of others) {
          const signal = supabase.channel(signalChannelName(peer.id));
          await new Promise<void>((resolve) => {
            signal.subscribe((state) => {
              if (state === "SUBSCRIBED") resolve();
            });
          });
          await sendSignal(signal, invite);
          await supabase.removeChannel(signal);
        }
        router.push(`/conversation/${conversationId}`);
        return null;
      } catch {
        await setCallStatus(started.call.id, "ended");
        await cleanup();
        return "Camera or microphone could not be opened.";
      }
    },
    [cleanup, enterCall, router, sendSignal, supabase, userId],
  );

  const joinVideoCall = useCallback(
    async (call: LokrCall, peers: CallPeer[]) => {
      if (sessionRef.current) return "A call is already in progress.";
      try {
        await enterCall(call, peers, "callee");
        router.push(`/conversation/${call.conversation_id}`);
        return null;
      } catch {
        await cleanup();
        return "Camera or microphone could not be opened.";
      }
    },
    [cleanup, enterCall, router],
  );

  const acceptIncoming = useCallback(async () => {
    if (!incoming) return;
    const { call } = incoming;
    const { peers } = await listCallPeers(call.conversation_id);
    setIncoming(null);
    const error = await joinVideoCall(call, peers);
    if (error) setStatus(error);
  }, [incoming, joinVideoCall]);

  const declineIncoming = useCallback(async () => {
    if (!incoming) return;
    const { call } = incoming;
    const channel = supabase.channel(callChannelName(call.id));
    await new Promise<void>((resolve) => {
      channel.subscribe((state) => {
        if (state === "SUBSCRIBED") resolve();
      });
    });
    await sendSignal(channel, { type: "hangup", callId: call.id, userId, endAll: false });
    await supabase.removeChannel(channel);
    setIncoming(null);
  }, [incoming, sendSignal, supabase, userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(signalChannelName(userId));
    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      const message = payload as SignalMessage;
      if (message.type !== "invite") return;
      if (message.fromId === userId) return;
      void (async () => {
        const loaded = await loadCall(message.callId);
        if (!loaded.call || loaded.call.status === "ended") return;
        if (sessionRef.current || incomingRef.current) return;
        const { peers } = await listCallPeers(loaded.call.conversation_id);
        rememberPeers(peers);
        const fromName = namesRef.current.get(loaded.call.caller_id) ?? "Someone";
        setIncoming({ call: loaded.call, fromName });
      })();
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [rememberPeers, supabase, userId]);

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

  const inCall = Boolean(session);

  return (
    <CallContext.Provider
      value={{
        startVideoCall,
        joinVideoCall,
        hangup,
        inCall,
        callConversationId: session?.call.conversation_id ?? null,
        localStream,
        remotePeers,
        micOn,
        camOn,
        toggleMic,
        toggleCam,
        status,
      }}
    >
      {children}
      {incoming && !session ? (
        <div className="fixed inset-x-0 top-4 z-50 mx-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-[#3F3F3F] bg-background p-5 shadow-xl">
          <p className="font-heading text-lg text-[#F8F8F7]">Incoming call</p>
          <p className="mt-1 text-muted-foreground">
            {incoming.fromName} started a video call. Answer to open your screen.
          </p>
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
    </CallContext.Provider>
  );
}

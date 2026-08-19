"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useCall } from "@/components/CallProvider";
import { Button } from "@/components/ui/button";

function CallTile({
  stream,
  label,
  muted = false,
  waiting,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  waiting?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) void video.play().catch(() => {});
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-[#2A2A2A]">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        playsInline
        muted={muted}
      />
      {!stream ? (
        <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-sm text-[#F8F8F7]">
          {waiting ?? "Calling…"}
        </div>
      ) : null}
      <p className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-1 text-sm text-[#F8F8F7]">
        {label}
      </p>
    </div>
  );
}

export function ConversationCall({ conversationId }: { conversationId: string }) {
  const call = useCall();
  if (!call?.inCall || call.callConversationId !== conversationId) return null;

  const tileCount = 1 + call.remotePeers.length;
  const gridClass =
    tileCount <= 1
      ? "grid-cols-1"
      : tileCount === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-2";

  return (
    <div className="max-h-[46vh] overflow-y-auto border-b border-border bg-[#1F1F1F] px-4 py-4">
      <div className={`grid gap-3 ${gridClass}`}>
        <CallTile stream={call.localStream} label="You" muted waiting="Starting your camera…" />
        {call.remotePeers.map((peer) => (
          <CallTile
            key={peer.userId}
            stream={peer.stream}
            label={peer.name}
            waiting={`Waiting for ${peer.name}…`}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-[#C9C2B6]">{call.status || "Private call"}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={call.toggleMic}
          aria-label={call.micOn ? "Mute" : "Unmute"}
        >
          {call.micOn ? <Mic /> : <MicOff />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={call.toggleCam}
          aria-label={call.camOn ? "Turn camera off" : "Turn camera on"}
        >
          {call.camOn ? <Video /> : <VideoOff />}
        </Button>
        <Button type="button" variant="destructive" onClick={() => void call.hangup()}>
          <PhoneOff />
          End call
        </Button>
      </div>
    </div>
  );
}

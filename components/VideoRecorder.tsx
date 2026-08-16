"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { getCallMedia, stopStream } from "@/lib/webrtc";
import { blobToFile, createVideoRecorder, MAX_VIDEO_SECONDS } from "@/lib/video-recording";
import { SendVideoDialog } from "@/components/SendVideoDialog";

export function VideoRecorder({
  workspaceId,
  conversationId,
}: {
  workspaceId: string;
  conversationId: string;
}) {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      stopStream(streamRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  async function openRecorder() {
    setError(null);
    try {
      const stream = await getCallMedia();
      cancelledRef.current = false;
      streamRef.current = stream;
      setOpen(true);
      setSeconds(0);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError("Camera or microphone could not be opened.");
    }
  }

  function closeRecorder() {
    cancelledRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    stopStream(streamRef.current);
    streamRef.current = null;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
    setOpen(false);
    setRecording(false);
    setSeconds(0);
  }

  function start() {
    const stream = streamRef.current;
    if (!stream) return;
    const { recorder, chunks, mimeType } = createVideoRecorder(stream);
    recorder.onstop = () => {
      if (cancelledRef.current) return;
      const blob = new Blob(chunks, { type: mimeType });
      setFile(blobToFile(blob, mimeType));
      setRecording(false);
      cancelledRef.current = true;
      stopStream(streamRef.current);
      streamRef.current = null;
      setOpen(false);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
    setSeconds(0);
    tickRef.current = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);
    timerRef.current = window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, MAX_VIDEO_SECONDS * 1000);
  }

  function stop() {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => void openRecorder()}>
        <Video />
        Record video
      </Button>
      {error ? (
        <Alert variant="destructive" className="mt-3">
          {error}
        </Alert>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#3F3F3F] bg-background p-5">
            <h2 className="font-heading text-xl text-[#F8F8F7]">Record a private video</h2>
            <p className="mt-1 text-sm text-[#A39E96]">
              Up to {MAX_VIDEO_SECONDS / 60} minutes. The file stays in locked storage.
            </p>
            <video
              ref={videoRef}
              className="mt-4 aspect-video w-full rounded-lg bg-[#2A2A2A] object-cover"
              autoPlay
              muted
              playsInline
            />
            <p className="mt-2 text-sm text-[#A39E96]">
              {recording ? `Recording ${seconds}s` : "Camera preview"}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeRecorder}>
                Cancel
              </Button>
              {recording ? (
                <Button type="button" variant="destructive" onClick={stop}>
                  <Circle className="fill-current" />
                  Stop
                </Button>
              ) : (
                <Button type="button" onClick={start}>
                  <Circle />
                  Start recording
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {file ? (
        <SendVideoDialog
          file={file}
          workspaceId={workspaceId}
          defaultConversationId={conversationId}
          onClose={() => setFile(null)}
        />
      ) : null}
    </>
  );
}

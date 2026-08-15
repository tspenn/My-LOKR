import { MAX_VIDEO_SECONDS } from "@/lib/files";

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

export function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function recorderExtension(mime: string) {
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}

export function createVideoRecorder(stream: MediaStream) {
  const mimeType = pickRecorderMime();
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_200_000 })
    : new MediaRecorder(stream, { videoBitsPerSecond: 1_200_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  return { recorder, chunks, mimeType: recorder.mimeType || mimeType || "video/webm" };
}

export function mixCallStreams(
  localVideo: HTMLVideoElement,
  remoteVideo: HTMLVideoElement | null,
  localStream: MediaStream,
  remoteStream: MediaStream | null,
): { stream: MediaStream; stop: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { stream: localStream, stop() {} };
  }

  let running = true;
  const draw = () => {
    if (!running) return;
    ctx.fillStyle = "#1F1F1F";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (remoteVideo && remoteVideo.readyState >= 2) {
      ctx.drawImage(remoteVideo, 0, 0, 640, 720);
      if (localVideo.readyState >= 2) ctx.drawImage(localVideo, 640, 0, 640, 720);
    } else if (localVideo.readyState >= 2) {
      ctx.drawImage(localVideo, 0, 0, 1280, 720);
    }
    requestAnimationFrame(draw);
  };
  draw();

  const output = canvas.captureStream(24);
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  if (localStream.getAudioTracks().length > 0) {
    audioContext.createMediaStreamSource(localStream).connect(destination);
  }
  if (remoteStream && remoteStream.getAudioTracks().length > 0) {
    audioContext.createMediaStreamSource(remoteStream).connect(destination);
  }
  destination.stream.getAudioTracks().forEach((track) => output.addTrack(track));

  return {
    stream: output,
    stop() {
      running = false;
      void audioContext.close();
      output.getTracks().forEach((track) => track.stop());
    },
  };
}

export function blobToFile(blob: Blob, mimeType: string) {
  const ext = recorderExtension(mimeType);
  return new File([blob], `lokr-video-${Date.now()}.${ext}`, {
    type: mimeType.split(";")[0] || "video/webm",
  });
}

export { MAX_VIDEO_SECONDS };

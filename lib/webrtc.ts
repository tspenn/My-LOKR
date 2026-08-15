import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const STUN_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return STUN_SERVERS;

  try {
    const { url, key } = getSupabaseEnv();
    const res = await fetch(`${url}/functions/v1/ice-servers-mylokr`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: key,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return STUN_SERVERS;
    const body = (await res.json()) as { iceServers?: RTCIceServer[] };
    if (Array.isArray(body.iceServers) && body.iceServers.length > 0) {
      return body.iceServers;
    }
  } catch {
    // STUN-only still allows many LAN and open-network calls.
  }
  return STUN_SERVERS;
}

const PEER_CONFIG = {
  iceCandidatePoolSize: 4,
  iceTransportPolicy: "all" as const,
};

export async function createPeerConnection() {
  const iceServers = await fetchIceServers();
  return new RTCPeerConnection({
    ...PEER_CONFIG,
    iceServers,
  });
}

export async function refreshPeerIceServers(pc: RTCPeerConnection) {
  const iceServers = await fetchIceServers();
  pc.setConfiguration({
    ...PEER_CONFIG,
    iceServers,
  });
}

export async function getCallMedia() {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 24, max: 30 },
      facingMode: "user",
    },
  });
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export type LokrCall = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  status: "ringing" | "active" | "ended";
  created_at: string;
  ended_at: string | null;
};

export type CallPeer = {
  id: string;
  display_name: string;
};

export type RemotePeer = {
  userId: string;
  name: string;
  stream: MediaStream | null;
};

export type SignalMessage =
  | { type: "invite"; callId: string; conversationId: string; fromId: string }
  | { type: "join"; callId: string; userId: string }
  | { type: "hello"; callId: string; userId: string }
  | { type: "offer"; fromId: string; toId: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; fromId: string; toId: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; fromId: string; toId: string; candidate: RTCIceCandidateInit }
  | { type: "hangup"; callId: string; userId: string; endAll?: boolean };

export function signalChannelName(userId: string) {
  return `lokr-signal:${userId}`;
}

export function callChannelName(callId: string) {
  return `lokr-call:${callId}`;
}

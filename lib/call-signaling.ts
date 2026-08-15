export type LokrCall = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  status: "ringing" | "active" | "ended";
  created_at: string;
  ended_at: string | null;
};

export type SignalMessage =
  | { type: "invite"; callId: string; conversationId: string; fromId: string }
  | { type: "join"; callId: string }
  | { type: "offer"; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; candidate: RTCIceCandidateInit }
  | { type: "hangup"; callId: string };

export function signalChannelName(userId: string) {
  return `lokr-signal:${userId}`;
}

export function callChannelName(callId: string) {
  return `lokr-call:${callId}`;
}

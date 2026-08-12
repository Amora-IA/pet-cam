export type SignalPayload =
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; candidate: RTCIceCandidateInit };

export type ClientMessage =
  | { type: "join"; room: string; role: "host" | "viewer"; id: string; token?: string }
  | { type: "signal"; room: string; to: string; payload: SignalPayload };

export type ServerMessage =
  | { type: "viewer-joined"; viewerId: string }
  | { type: "host-available" }
  | { type: "peer-left"; id: string }
  | { type: "signal"; from: string; payload: SignalPayload }
  | { type: "error"; message: string };

export interface CameraStatusMessage {
  isMotion: boolean;
  isRecording: boolean;
  motionLevel: number;
  cameraLabel: string;
}

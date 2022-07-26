export type AnswerMessage = { type: "answer" };
export type DisconnectPlayerMessage = {
  playerId: number;
  reason: string;
  type: "disconnectPlayer";
};
export type IceCandidateMessage = { type: "iceCandidate" };
export type OfferMessage = { type: "offer" };
export type PlayerConnectedMessage = {
  dataChannel: boolean;
  playerId: number;
  sfu: boolean;
  type: "playerConnected";
};
export type PlayerDisconnectedMessage = {
  playerId: number;
  type: "playerDisconnected";
};
export type PingMessage = { time: string; type: "ping" };
export type StatsMessage = { data: object; type: "stats" };
export type FromStreamerMessage =
  | (AnswerMessage & { playerId: number })
  | (DisconnectPlayerMessage & { playerId: number })
  | (IceCandidateMessage & { playerId: number })
  | (OfferMessage & { playerId: number })
  | PingMessage;
export type ToStreamerMessage =
  | (AnswerMessage & { playerId: number })
  | (IceCandidateMessage & { playerId: number })
  | PlayerDisconnectedMessage
  | PlayerConnectedMessage;

export type FromPlayerMessage =
  | AnswerMessage
  | IceCandidateMessage
  | StatsMessage;
export type ToPlayerMessage =
  | AnswerMessage
  | IceCandidateMessage
  | OfferMessage
  | StatsMessage;

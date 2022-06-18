export type AnswerMessage = { type: "answer" };
export type DisconnectPlayerMessage = {
  playerId: string;
  reason: string;
  type: "disconnectPlayer";
};
export type IceCandidateMessage = { type: "iceCandidate" };
export type OfferMessage = { type: "offer" };
export type PlayerConnectedMessage = {
  dataChannel: boolean;
  playerId: string;
  sfu: boolean;
  type: "playerConnected";
};
export type PlayerDisconnectedMessage = {
  playerId: string;
  type: "playerDisconnected";
};
export type PingMessage = { time: string; type: "ping" };
export type StatsMessage = { data: object; type: "stats" };
export type FromStreamerMessage =
  | (AnswerMessage & { playerId: string })
  | (DisconnectPlayerMessage & { playerId: string })
  | (IceCandidateMessage & { playerId: string })
  | (OfferMessage & { playerId: string })
  | PingMessage;
export type ToStreamerMessage =
  | (AnswerMessage & { playerId: string })
  | (IceCandidateMessage & { playerId: string })
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

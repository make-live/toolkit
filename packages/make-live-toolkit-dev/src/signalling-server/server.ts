// Copyright Epic Games, Inc. All Rights Reserved.

// Adapted from EpicGames/PixelStreamingInfrastructure.

import { IncomingMessage } from "http";
import omit from "lodash.omit";
import { WebSocket, WebSocketServer } from "ws";
import type {
  FromPlayerMessage,
  FromStreamerMessage,
  ToPlayerMessage,
  ToStreamerMessage,
} from "./messages";

// `clientConfig` is send to Streamer and Players
// Example of STUN server setting
// let clientConfig = {peerConnectionOptions: { 'iceServers': [{'urls': ['stun:34.250.222.95:19302']}] }};
const clientConfig = { type: "config", peerConnectionOptions: {} };

export const createSignallingServer = () => {
  let nextPlayerID = 1;
  const players = new Map<number, { ws: WebSocket; id: number }>();
  let streamer: WebSocket | undefined;

  const disconnectAllPlayers = (code?: number, reason?: string) => {
    const clone = new Map(players);
    for (const player of clone.values()) {
      player.ws.close(code, reason);
    }
  };

  const handleStreamerDisconnected = () => {
    disconnectAllPlayers();
  };

  const onPlayerDisconnected = (playerId: number) => {
    try {
      players.delete(playerId);
      sendMessageToStreamer({
        playerId,
        type: "playerDisconnected",
      });
      sendPlayersCount();
    } catch (err) {
      console.log(`ERROR:: onPlayerDisconnected error: ${err}`);
    }
  };

  const handlePlayerConnection = (ws: WebSocket, req: IncomingMessage) => {
    // Reject connection if streamer is not connected
    if (streamer == null || streamer.readyState != 1 /* OPEN */) {
      console.log("Streamer is not connected", streamer?.readyState);
      ws.close(1013 /* Try again later */, "Streamer is not connected");
      return;
    }

    const playerId = nextPlayerID++;
    console.log(`player ${playerId} (${req.socket.remoteAddress}) connected`);
    players.set(playerId, { ws, id: playerId });

    ws.on("message", (data) => {
      const msgRaw = data.toString();

      let msg: FromPlayerMessage;
      try {
        msg = JSON.parse(msgRaw);
      } catch (err) {
        console.error(
          `cannot parse player ${playerId} message: ${msgRaw}\nError: ${err}`,
        );
        ws.close(1008, "Cannot parse");
        return;
      }

      if (msg.type == "answer") {
        sendMessageToStreamer({ ...msg, playerId });
      } else if (msg.type == "iceCandidate") {
        sendMessageToStreamer({ ...msg, playerId });
      } else if (msg.type == "stats") {
        console.log(`player ${playerId}: stats\n${msg.data}`);
      } else {
        console.error(`player ${playerId}: unsupported message type: ${msg}`);
        ws.close(1008, "Unsupported message type");
        return;
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`player ${playerId} connection closed: ${code} - ${reason}`);
      onPlayerDisconnected(playerId);
    });

    ws.on("error", (error) => {
      console.error(`player ${playerId} connection error: ${error}`);
      ws.close(1006 /* abnormal closure */, JSON.stringify(error));
      onPlayerDisconnected(playerId);
    });

    ws.send(JSON.stringify(clientConfig));

    sendMessageToStreamer({
      type: "playerConnected",
      playerId: playerId,
      dataChannel: true,
      sfu: false,
    });
    sendPlayersCount();
  };

  const handleStreamerConnection = (ws: WebSocket, req: IncomingMessage) => {
    console.log(`Streamer connected: ${req.socket.remoteAddress}`);

    ws.on("message", (data) => {
      const msgRaw = data.toString();
      let msg: FromStreamerMessage;
      try {
        msg = JSON.parse(msgRaw);
      } catch (err) {
        console.error(
          `cannot parse Streamer message: ${msgRaw}\nError: ${err}`,
        );
        streamer?.close(1008, "Cannot parse");
        return;
      }

      try {
        // just send pings back to sender
        if (msg.type == "ping") {
          const rawMsg = JSON.stringify({ type: "pong", time: msg.time });
          ws.send(rawMsg);
          return;
        }

        // Convert incoming playerId to a string if it is an integer, if needed. (We support receiving it as an int or string).
        const playerId = msg.playerId;

        if (msg.type == "offer") {
          sendMessageToPlayer(playerId, omit(msg, "playerId"));
        } else if (msg.type == "answer") {
          sendMessageToPlayer(playerId, omit(msg, "playerId"));
        } else if (msg.type == "iceCandidate") {
          sendMessageToPlayer(playerId, msg);
        } else if (msg.type == "disconnectPlayer") {
          const player = players.get(playerId);
          if (player) {
            player.ws.close(1011 /* internal error */, msg.reason);
          }
        } else {
          console.error(`unsupported Streamer message type: ${msg}`);
          streamer?.close(1008, "Unsupported message type");
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error(`ERROR: ws.on message error: ${err.message}`);
        }
      }
    });

    ws.on("close", (code, reason) => {
      console.error(`streamer disconnected: ${code} - ${reason}`);
      handleStreamerDisconnected();
    });

    ws.on("error", (error) => {
      console.error(`streamer connection error: ${error}`);
      handleStreamerDisconnected();
      try {
        ws.close(1006 /* abnormal closure */, JSON.stringify(error));
      } catch (err) {
        if (err instanceof Error) {
          console.error(`ERROR: ws.on error: ${err.message}`);
        }
      }
    });

    streamer = ws;
    streamer.send(JSON.stringify(clientConfig));
  };

  const sendMessageToPlayer = (playerId: number, msg: ToPlayerMessage) => {
    const player = players.get(playerId);
    if (!player) {
      return;
    }

    const rawMsg = JSON.stringify(msg);
    player.ws.send(rawMsg);
  };

  const sendMessageToStreamer = (msg: ToStreamerMessage) => {
    const rawMsg = JSON.stringify(msg);
    if (streamer != null && streamer.readyState == WebSocket.OPEN) {
      streamer.send(rawMsg);
    } else {
      console.error(
        "sendMessageToStreamer: No streamer connected!\nMSG: %s",
        rawMsg,
      );
    }
  };

  const sendPlayersCount = () => {
    const playerCountMsg = JSON.stringify({
      type: "playerCount",
      count: players.size,
    });
    for (const p of players.values()) {
      p.ws.send(playerCountMsg);
    }
  };

  const streamerWebSocketServer = new WebSocketServer({
    backlog: 1,
    noServer: true,
  });

  streamerWebSocketServer.on("connection", handleStreamerConnection);

  const playerWebSocketServer = new WebSocketServer({
    noServer: true,
  });
  playerWebSocketServer.on("connection", handlePlayerConnection);

  return {
    playerWebSocketServer,
    streamerWebSocketServer,
  };
};

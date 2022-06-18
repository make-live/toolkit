// Copyright Epic Games, Inc. All Rights Reserved.
//-- Server side logic. Serves pixel streaming WebRTC-based page, proxies data back to Streamer --//

import chalk from "chalk";
import { randomUUID } from "crypto";
import omit from "lodash.omit";
import WebSocket from "ws";
import {
  FromPlayerMessage,
  FromStreamerMessage,
  ToPlayerMessage,
  ToStreamerMessage,
} from "./messages";

// `clientConfig` is send to Streamer and Players
// Example of STUN server setting
// let clientConfig = {peerConnectionOptions: { 'iceServers': [{'urls': ['stun:34.250.222.95:19302']}] }};
const clientConfig = { type: "config", peerConnectionOptions: {} };

type CreateServersArgs = {
  playerPort: number;
  streamerPort: number;
};

export const createServers = ({
  playerPort,
  streamerPort,
}: CreateServersArgs) => {
  console.log(
    chalk.cyan(
      `Running Cirrus - The Pixel Streaming reference implementation signalling server for Unreal Engine 5.0.`,
    ),
  );

  let streamer: WebSocket; // WebSocket connected to Streamer
  const players = new Map<string, { ws: WebSocket; id: string }>(); // playerId <-> player, where player is either a web-browser or a native webrtc player

  function logIncoming(sourceName: string, msg: unknown) {
    console.log(chalk.blue("\x1b[37m-> %s\x1b[34m: %s", sourceName, msg));
  }

  function logOutgoing(destName: string, msg: unknown) {
    console.log(chalk.green("\x1b[37m<- %s\x1b[32m: %s", destName, msg));
  }
  // normal peer to peer signalling goes to streamer. SFU streaming signalling goes to the sfu
  function sendMessageToStreamer(msg: ToStreamerMessage) {
    const rawMsg = JSON.stringify(msg);
    if (streamer && streamer.readyState == WebSocket.OPEN) {
      logOutgoing("Streamer", rawMsg);
      streamer.send(rawMsg);
    } else {
      console.error(
        "sendMessageToController: No streamer connected!\nMSG: %s",
        rawMsg,
      );
    }
  }

  function sendMessageToPlayer(playerId: string, msg: ToPlayerMessage) {
    const player = players.get(playerId);
    if (!player) {
      console.log(
        `dropped message ${msg.type} as the player ${playerId} is not found`,
      );
      return;
    }
    const playerName = `player ${playerId}`;
    const rawMsg = JSON.stringify(msg);
    logOutgoing(playerName, rawMsg);
    player.ws.send(rawMsg);
  }

  console.log(
    chalk.green(
      `WebSocket listening for Streamer connections on :${streamerPort}`,
    ),
  );
  const streamerServer = new WebSocket.Server({
    port: streamerPort,
    backlog: 1,
  });
  streamerServer.on("connection", (ws, req) => {
    console.log(
      chalk.green(`Streamer connected: ${req.connection.remoteAddress}`),
    );

    ws.on("message", (data) => {
      const msgRaw = data.toString();
      let msg: FromStreamerMessage;
      try {
        msg = JSON.parse(msgRaw);
      } catch (err) {
        console.error(
          `cannot parse Streamer message: ${msgRaw}\nError: ${err}`,
        );
        streamer.close(1008, "Cannot parse");
        return;
      }

      logIncoming("Streamer", msgRaw);

      try {
        // just send pings back to sender
        if (msg.type == "ping") {
          const rawMsg = JSON.stringify({ type: "pong", time: msg.time });
          logOutgoing("Streamer", rawMsg);
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
          streamer.close(1008, "Unsupported message type");
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error(`ERROR: ws.on message error: ${err.message}`);
        }
      }
    });

    function onStreamerDisconnected() {
      disconnectAllPlayers();
    }

    ws.on("close", (code, reason) => {
      console.error(`streamer disconnected: ${code} - ${reason}`);
      onStreamerDisconnected();
    });

    ws.on("error", (error) => {
      console.error(`streamer connection error: ${error}`);
      onStreamerDisconnected();
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
  });

  console.log(
    chalk.green(
      `WebSocket listening for Players connections on :${playerPort}`,
    ),
  );
  const playerServer = new WebSocket.Server({ port: playerPort });
  playerServer.on("connection", (ws, req) => {
    // Reject connection if streamer is not connected
    if (!streamer || streamer.readyState != 1 /* OPEN */) {
      ws.close(1013 /* Try again later */, "Streamer is not connected");
      return;
    }

    const playerId = randomUUID();
    console.log(
      chalk.green(
        `player ${playerId} (${req.connection.remoteAddress}) connected`,
      ),
    );
    players.set(playerId, { ws: ws, id: playerId });

    function sendPlayersCount() {
      const playerCountMsg = JSON.stringify({
        type: "playerCount",
        count: players.size,
      });
      for (const p of players.values()) {
        p.ws.send(playerCountMsg);
      }
    }

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

      logIncoming(`player ${playerId}`, msgRaw);

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

    function onPlayerDisconnected() {
      try {
        players.delete(playerId);
        sendMessageToStreamer({
          playerId,
          type: "playerDisconnected",
        });
        sendPlayersCount();
      } catch (err) {
        console.log(chalk.red(`ERROR:: onPlayerDisconnected error: ${err}`));
      }
    }

    ws.on("close", (code, reason) => {
      console.log(
        chalk.yellow(
          `player ${playerId} connection closed: ${code} - ${reason}`,
        ),
      );
      onPlayerDisconnected();
    });

    ws.on("error", (error) => {
      console.error(`player ${playerId} connection error: ${error}`);
      ws.close(1006 /* abnormal closure */, JSON.stringify(error));
      onPlayerDisconnected();
    });

    ws.send(JSON.stringify(clientConfig));

    sendMessageToStreamer({
      type: "playerConnected",
      playerId: playerId,
      dataChannel: true,
      sfu: false,
    });
    sendPlayersCount();
  });

  function disconnectAllPlayers(code?: number, reason?: string) {
    console.log("killing all players");
    const clone = new Map(players);
    for (const player of clone.values()) {
      player.ws.close(code, reason);
    }
  }
};

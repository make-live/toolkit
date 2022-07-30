import { createServer } from "http";
import { createApp } from "./app";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { networkInterfaces } from "os";
import { createSignallingServer } from "./signalling-server";
import chalk from "chalk";

const args = yargs(hideBin(process.argv))
  .scriptName("make-live-dev")
  .usage("$0 [args]")
  .options({
    "player-port": {
      default: 7090,
      describe: "Port to listen for player connections on",
      type: "number",
    },
    port: {
      default: 9000,
      describe: "Port to use for the server itself",
      type: "number",
    },
    "streamer-port": {
      default: 8888,
      describe: "Port to listen for streamer connections on",
      type: "number",
    },
  })
  .help()
  .parseSync();

const address =
  Object.values(networkInterfaces())
    .flat()
    .find((ip) => String(ip?.family).includes("4") && !ip?.internal)?.address ??
  "localhost";

const { playerWebSocketServer, streamerWebSocketServer } =
  createSignallingServer();

const playerHttpServer = createServer();
playerHttpServer.on("upgrade", function upgrade(request, socket, head) {
  playerWebSocketServer.handleUpgrade(request, socket, head, (ws) => {
    playerWebSocketServer.emit("connection", ws, request);
  });
});

const streamerHttpServer = createServer();
streamerHttpServer.on("upgrade", function upgrade(request, socket, head) {
  streamerWebSocketServer.handleUpgrade(request, socket, head, (ws) => {
    streamerWebSocketServer.emit("connection", ws, request);
  });
});

const app = createApp(`ws://${address}:${args["playerPort"]}`);

playerHttpServer.listen(args.playerPort, () => {
  console.log(
    `Listening on ws://${address}:${args.playerPort} for player connections.`,
  );
});
streamerHttpServer.listen(args.streamerPort, () => {
  console.log(
    `Listening on ws://${address}:${args.streamerPort} for streamer connections.`,
  );
  const launchParams = `-PixelStreamingURL=ws://${address}:${args.streamerPort} -AllowPixelStreamingCommands`;
  console.log(
    `Launch parameters for UE application: ${chalk.bold(launchParams)}`,
  );
});
app.listen(args.port, () => {
  console.log(
    `Listening on http://localhost:${args.port} (http://${address}:${args.port}) for toolkit connections.`,
  );
});

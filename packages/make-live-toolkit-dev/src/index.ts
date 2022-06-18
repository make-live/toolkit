import yargs from "yargs";
import { createServers } from "./server";

const args = yargs
  .scriptName("pirate-parser")
  .usage("$0 [args]")
  .options({
    "player-port": {
      default: 8000,
      describe: "Port to use for player connections",
      type: "number",
    },
    "streamer-port": {
      default: 8888,
      describe: "Port to use for streamer connections",
      type: "number",
    },
  })
  .help().argv;

createServers({
  playerPort: args["player-port"],
  streamerPort: args["streamer-port"],
});

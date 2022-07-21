import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createServers } from "./server";

const args = yargs(hideBin(process.argv))
  .scriptName("make-live-dev")
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
  .help()
  .parseSync();

createServers({
  playerPort: args["player-port"],
  streamerPort: args["streamer-port"],
});

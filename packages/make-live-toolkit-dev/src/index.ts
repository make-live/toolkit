import { createApp } from "./app";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const args = yargs(hideBin(process.argv))
  .scriptName("make-live-dev")
  .usage("$0 [args]")
  .options({
    "player-port": {
      default: 80,
      describe: "Port to use for player connections",
      type: "number",
    },
    port: {
      default: 9000,
      describe: "Port to use for the server itself",
      type: "number",
    },
  })
  .help()
  .parseSync();

const app = createApp(args["player-port"]);
app.listen(args["port"], () => {
  console.log(`Listening on http://localhost:${args.port}`);
});

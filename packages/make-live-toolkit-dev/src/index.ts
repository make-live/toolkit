import { createApp } from "./app";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const args = yargs(hideBin(process.argv))
  .scriptName("make-live-dev")
  .usage("$0 [args]")
  .options({
    "player-url": {
      default: "ws://localhost:80",
      describe: "URL of Signalling Server player socket",
      type: "string",
    },
    port: {
      default: 9000,
      describe: "Port to use for the server itself",
      type: "number",
    },
  })
  .help()
  .parseSync();

const app = createApp(args["player-url"]);
app.listen(args["port"], () => {
  console.log(`Listening on http://localhost:${args.port}`);
});

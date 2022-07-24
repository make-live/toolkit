import { createApp } from "./app";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { networkInterfaces } from "os";

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

const address =
  Object.values(networkInterfaces())
    .flat()
    .find((ip) => String(ip?.family).includes("4") && !ip?.internal)?.address ??
  "localhost";

const app = createApp(args["player-url"]);
app.listen(args["port"], () => {
  console.log(
    `Listening on http://localhost:${args.port} (http://${address}:${args.port})`,
  );
});

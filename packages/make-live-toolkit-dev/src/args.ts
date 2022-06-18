import yargs from "yargs";

yargs
  .scriptName("pirate-parser")
  .usage("$0 [args]")
  .option("port", {
    default: "8000",
    describe: "Port to use for player connections",
    type: "string",
  })
  .help().argv;

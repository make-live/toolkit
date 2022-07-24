import { describe, expect, it } from "@jest/globals";
import { ConsoleCommand, InteractionCommand, isValidCommand } from "./commands";

describe("isValidCommand", () => {
  it("returns `true` for `CONSOLE_COMMAND` command", () => {
    const command: ConsoleCommand = {
      data: "stat fps",
      type: "CONSOLE_COMMAND",
    };

    const result = isValidCommand(command);

    expect(result).toBe(true);
  });

  it("returns `true` for `INTERACTION_COMMAND` command", () => {
    const command: InteractionCommand = {
      data: "stat fps",
      type: "INTERACTION_COMMAND",
    };

    const result = isValidCommand(command);

    expect(result).toBe(true);
  });

  it("returns `false` for `unknown` command", () => {
    const command = { type: "unknown" };

    const result = isValidCommand(command);

    expect(result).toBe(false);
  });
});

import { Command, isValidCommand } from "@make-live/toolkit";
import { useWindowEventListener as _useWindowEventListener } from "rooks";

const parseCommand = (command: unknown): Command | undefined => {
  if (!isValidCommand(command)) {
    return;
  }

  return command;
};

const useWindowEventListener = _useWindowEventListener as <
  K extends keyof WindowEventMap,
>(
  type: K,
  listener: (ev: WindowEventMap[K]) => unknown,
  listenerOptions?: unknown,
  isLayoutEffect?: boolean,
) => void;

export const useCommands = (onCommand: (command: Command) => void) => {
  useWindowEventListener("message", (ev) => {
    const command = parseCommand(ev.data);

    if (command != null) {
      onCommand(command);
    }
  });
};

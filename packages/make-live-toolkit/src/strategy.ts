import { Command } from "./commands";

export interface Strategy {
  prepare: (
    container: HTMLDivElement,
    url: string | URL,
    onData: (data: unknown) => void,
  ) => void;
  sendCommand: (command: Command) => void;
}

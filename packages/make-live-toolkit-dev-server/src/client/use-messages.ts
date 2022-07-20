import {
  joinLauncherMessage,
  LauncherMessage,
  sendCommandMessage,
} from "@make-live/toolkit";
import { useWindowEventListener as _useWindowEventListener } from "rooks";

const parseLauncherMessage = (
  message: unknown,
): LauncherMessage | undefined => {
  const joinResult = joinLauncherMessage.safeParse(message);

  if (joinResult.success) {
    return joinResult.data;
  }

  const sendCommand = sendCommandMessage.safeParse(message);

  if (sendCommand.success) {
    return sendCommand.data;
  }
};

const useWindowEventListener = _useWindowEventListener as <
  K extends keyof WindowEventMap,
>(
  type: K,
  listener: (ev: WindowEventMap[K]) => unknown,
  listenerOptions?: unknown,
  isLayoutEffect?: boolean,
) => void;

export const useSubscribe = (onMessage: (message: LauncherMessage) => void) => {
  useWindowEventListener("message", (ev) => {
    const message = parseLauncherMessage(ev.data);

    if (message != null) {
      onMessage(message);
    }
  });
};

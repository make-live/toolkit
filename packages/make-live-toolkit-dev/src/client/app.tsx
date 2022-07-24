import { Event } from "@make-live/toolkit";
import {
  ComponentProps,
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Config, Status } from "../types";
import { getAudioPermission } from "./audio";
import createClient, {
  ControlSchemeType,
  CreateClientArgs,
  ResponseEventListener,
} from "./client";
import playIcon from "./icons/play.svg";
import { useCommands } from "./use-commands";

const sendEvent = (event: Event) => {
  parent.postMessage(event, "*");
};

const App: FC = () => {
  const [config, setConfig] = useState<Config>();
  const [status, setStatus] = useState<Status>("DISCONNECTED");
  const clientRef = useRef<ReturnType<typeof createClient>>();

  const handleCommands = useCallback<Parameters<typeof useCommands>[0]>(
    (command) => {
      console.debug(`Received: ${command.type}`);
      switch (command.type) {
        case "CONSOLE_COMMAND": {
          clientRef.current?.emitCommand({
            ConsoleCommand: command.data,
          });
          break;
        }
      }
    },
    [],
  );

  const handleStatusChange = useCallback<(status: Status) => void>((status) => {
    setStatus(status);

    switch (status) {
      case "CONNECTED": {
        sendEvent({
          type: "CONNECT",
        });
        break;
      }
      case "DISCONNECTED": {
        sendEvent({
          type: "DISCONNECT",
        });
        break;
      }
    }
  }, []);

  const handlePlayClick = useCallback<
    ComponentProps<typeof Start>["onPlayClick"]
  >(() => {
    getAudioPermission();
    handleStatusChange("CONNECTED");
  }, [handleStatusChange]);

  const handleClientDisconnect = useCallback<
    CreateClientArgs["onDisconnect"]
  >(() => {
    clientRef.current?.removeResponseEventListener("default");
    handleStatusChange("DISCONNECTED");
  }, [handleStatusChange]);

  const handleResponseEvent = useCallback<ResponseEventListener>((response) => {
    sendEvent({
      data: response,
      type: "RESPONSE",
    });
  }, []);

  useEffect(() => {
    if (clientRef.current == null) {
      clientRef.current = createClient({
        mouseMode: ControlSchemeType.LockedMouse,
        onDisconnect: handleClientDisconnect,
      });

      clientRef.current.addResponseEventListener(
        "default",
        handleResponseEvent,
      );
    }
  }, []);

  useEffect(() => {
    const getConfig = async () => {
      const response = await fetch("/config");
      const json = (await response.json()) as Config;

      setConfig(json);
    };

    getConfig();
  }, []);

  useEffect(() => {
    if (status === "CONNECTED" && config != null) {
      clientRef.current?.initialize();
      clientRef.current?.connect(config.playerURL);
    }
  }, [status, config]);

  useCommands(handleCommands);

  return (
    <div className="w-full h-full">
      {status === "DISCONNECTED" ? (
        <Start onPlayClick={handlePlayClick} />
      ) : status === "CONNECTED" ? (
        <div className="w-full h-full relative" id="player" />
      ) : null}
    </div>
  );
};

type StartProps = {
  onPlayClick: () => void;
};

const Start: FC<StartProps> = ({ onPlayClick }) => {
  return (
    <div className="flex flex-col h-full w-full bg-ml-primary gap-2">
      <div className="flex-1 flex justify-center items-end">
        <h1 className="font-bold text-2xl lg:text-6xl text-center max-w-5xl px-6 py-3 mx-5 text-white">
          Make Live
        </h1>
      </div>
      <div className="flex-1 flex justify-center items-start">
        <button
          className="appearance-none w-16 lg:w-24 hover:animate-pulse animate-[wiggle_0.8s_ease-in-out_infinite]"
          onClick={onPlayClick}
          type="button">
          <img alt="Launch" src={playIcon} />
        </button>
      </div>
    </div>
  );
};

export default App;

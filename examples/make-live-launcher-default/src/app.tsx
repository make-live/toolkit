import {
  createJoinLauncherMessage,
  createSendCommandMessage,
  MessageListener,
  Status,
} from "@make-live/toolkit";
import { useInstance, useMessages } from "@make-live/toolkit-react";
import {
  cloneElement,
  ComponentProps,
  FC,
  ReactElement,
  useCallback,
  useState,
} from "react";

type Props = {
  Container: ReactElement<ComponentProps<"div">, "div">;
};

const App: FC<Props> = ({ Container }) => {
  const instance = useInstance();
  const [status, setStatus] = useState<Status>("START");
  const [launching, setIsLaunching] = useState(false);
  const handleLaunchClick = useCallback<
    NonNullable<ComponentProps<"button">["onClick"]>
  >(() => {
    setIsLaunching(true);
    instance?.sendMessage(createJoinLauncherMessage());
  }, [instance]);
  const handleShowFPS = useCallback<
    NonNullable<ComponentProps<"button">["onClick"]>
  >(() => {
    instance?.sendMessage(
      createSendCommandMessage({
        ConsoleCommand: "stat fps",
      }),
    );
  }, [instance]);
  const handleMessage = useCallback<MessageListener>((message) => {
    switch (message.type) {
      case "PLAYER_STATUS": {
        setStatus(message.status);
      }
    }
  }, []);
  useMessages(handleMessage);

  return (
    <div className="w-full h-full bg-black">
      {cloneElement(Container, { className: "w-full h-full" })}
      {status === "START" ? (
        <div className="h-full w-full absolute inset-0 flex flex-col items-center justify-center">
          <button
            className="text-white p-4 rounded-md bg-blue-700 disabled:bg-gray-500"
            disabled={launching}
            onClick={handleLaunchClick}>
            Launch
          </button>
        </div>
      ) : status === "LOADING" ? (
        <div className="h-full w-full absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-white font-md">Loading</div>
        </div>
      ) : status === "READY" ? (
        <div className="bottom-0 h-10 absolute flex flex-col items-center justify-center">
          <button
            className="text-white p-2 rounded-md bg-blue-700"
            onClick={handleShowFPS}>
            Show FPS
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default App;

import { EventListener } from "@make-live/toolkit";
import { useEvents, useInstance, Viewport } from "@make-live/toolkit-react";
import { ComponentProps, FC, useCallback, useState } from "react";
import { BiBarChart, BiFullscreen, BiExitFullscreen } from "react-icons/bi";
import { useFullscreen } from "rooks";
import IconButton from "./components/icon-button";

const App: FC = () => {
  const instance = useInstance();
  const [show, setShow] = useState(false);

  const handleShowFPS = useCallback<
    NonNullable<ComponentProps<"button">["onClick"]>
  >(() => {
    instance?.sendCommand({
      data: "stat fps",
      type: "CONSOLE_COMMAND",
    });
  }, [instance]);

  const handleEvents = useCallback<EventListener>((event) => {
    switch (event.type) {
      case "CONNECT": {
        setShow(true);
        break;
      }
      case "DISCONNECT": {
        setShow(false);
        break;
      }
    }
  }, []);
  useEvents(handleEvents);
  const {
    exit: exitFullScreen,
    isEnabled: isFullScreenEnabled,
    isFullscreen,
    request: requestFullScreen,
  } = useFullscreen();
  const handleFullScreenClick = useCallback(() => {
    if (isFullscreen) {
      exitFullScreen();
    } else {
      requestFullScreen();
    }
  }, [isFullscreen, requestFullScreen, exitFullScreen]);

  return (
    <div className="w-full h-full relative">
      <Viewport className="w-full h-full" />
      {show ? (
        <div className="absolute top-0 right-0 h-min w-min p-2 flex gap-2 items-center">
          <IconButton onClick={handleShowFPS} title="FPS" type="button">
            <BiBarChart color="white" size={24} />
          </IconButton>
          {isFullScreenEnabled && (
            <IconButton onClick={handleFullScreenClick} type="button">
              {isFullscreen ? (
                <BiExitFullscreen color="white" size={24} />
              ) : (
                <BiFullscreen color="white" size={24} />
              )}
            </IconButton>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default App;

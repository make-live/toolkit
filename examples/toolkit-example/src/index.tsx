import { createInstance } from "@make-live/toolkit";

const url = "http://localhost:9000";

const isFullScreenEnabled = () =>
  // @ts-expect-error webkit fullscreen
  document.webkitFullscreenEnabled ?? document.fullscreenEnabled;
const requestFullscreen = (element: HTMLElement) => {
  if ("webkitRequestFullscreen" in element) {
    // @ts-expect-error webkit fullscreen
    element.webkitRequestFullscreen();
  } else {
    element.requestFullscreen();
  }
};
const exitFullscreen = () => {
  if ("webkitRequestFullscreen" in document) {
    // @ts-expect-error webkit fullscreen
    document.webkitExitFullscreen();
  } else {
    document.exitFullscreen();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("root") as HTMLDivElement | null;
  const viewport = document.getElementById("viewport") as HTMLDivElement | null;
  const ui = document.getElementById("ui") as HTMLDivElement | null;
  const fpsButton = document.getElementById(
    "fps-button",
  ) as HTMLButtonElement | null;
  const fullScreenButton = document.getElementById(
    "fullscreen-button",
  ) as HTMLButtonElement | null;

  if (
    root == null ||
    viewport == null ||
    ui == null ||
    fpsButton == null ||
    fullScreenButton == null
  ) {
    console.log("Missing required HTML elements");
    return;
  }

  const instance = createInstance({
    url,
    container: viewport,
  });

  instance.addEventListener((event) => {
    switch (event.type) {
      case "CONNECT": {
        ui.classList.remove("hidden");
        ui.classList.add("flex");
        break;
      }
      case "DISCONNECT": {
        ui.classList.remove("flex");
        ui.classList.add("hidden");
        break;
      }
      case "RESPONSE": {
        break;
      }
    }
  });

  fpsButton.onclick = () => {
    instance.sendCommand({
      data: "stat fps",
      type: "CONSOLE_COMMAND",
    });
  };

  fullScreenButton.onclick = () => {
    if (!isFullScreenEnabled()) {
      return;
    }

    if (document.fullscreenElement == null) {
      requestFullscreen(document.body);
    } else {
      exitFullscreen();
    }
  };
});

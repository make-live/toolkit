import { Strategy } from "./strategy";

const generateIFrame = (url: URL): HTMLIFrameElement => {
  const iframe = document.createElement("iframe");
  iframe.src = url.toString();
  iframe.style.position = "absolute";
  iframe.style.bottom = "0";
  iframe.style.left = "0";
  iframe.style.right = "0";
  iframe.style.top = "0";
  iframe.height = "100%";
  iframe.width = "100%";

  return iframe;
};

export const createIFrameStrategy = (): Strategy => {
  let iframe: HTMLIFrameElement | undefined;

  return {
    prepare: (container, url, onEvent) => {
      if (container == null) {
        throw new Error("Missing 'container'. Must be a `HTMLDivElement`.");
      }
      if (url == null) {
        throw new Error("Missing 'url'.");
      }

      const customURL = new URL(url);
      customURL.searchParams.set("custom", "true");

      container.style.position = "relative";
      iframe = generateIFrame(customURL);
      window.addEventListener("message", (e) => {
        onEvent(e.data);
      });

      container.appendChild(iframe);
    },
    sendCommand: (command) => {
      if (iframe == null || iframe.contentWindow == null) {
        throw new Error("No HTMLIFrameElement ready");
      }

      iframe.contentWindow.postMessage(command, "*");
    },
  };
};

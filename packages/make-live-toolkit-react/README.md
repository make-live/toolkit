# @make-live/toolkit-react

An npm module to help Make Live customers create a custom React UI for their hosted experience.

> Please see [@make-live/toolkit](../make-live-toolkit/README.md) for details on the events and commands available to you.

## Install

The Make Live Toolkit can be integrated into an existing website. Ideally, we recommend setting up a new website with something like [Parcel](https://parceljs.org) or [Vite](https://vitejs.dev). You can find a working example application built using Parcel and the Make Live React Toolkit [here](./examples/toolkit-react-example).

To install with npm:

```sh
npm install --save @make-live/toolkit @make-live/toolkit-react react react-dom
```

To install with Yarn:

```sh
yarn add @make-live/toolkit @make-live/toolkit-react react react-dom
```

## Example (using Tailwind for CSS)

The following example show how to use the various APIs available to you as part of this module:

- Connection/disconnection
- Send console commands and custom interaction commands into Unreal Engine
- Receiving responses back from Unreal Engine

```js
import {
  MakeLiveProvider,
  useEvents,
  useInstance,
  Viewport,
} from "@make-live/toolkit-react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";

const App = () => {
  // Gets us access to the Make Live "instance" that
  // is the code running in your website to communicate
  // with Make Live.
  const instance = useInstance();
  // Used to keep track of whether to show our custom UI.
  const [show, setShow] = useState(false);

  // We can handle events from Make Live so we can
  // show/hide our custom UI.
  const handleEvents = useCallback((event) => {
    switch (event.type) {
      // This event lets you know if Make Live is ready for your UI to be displayed.
      case "CONNECT": {
        setShow(true);
        break;
      }
      // This event lets you know if Make Live has disconnected from the server.
      case "DISCONNECT": {
        setShow(false);
        break;
      }
      // This event is fired when UE is has sent data back out
      case "RESPONSE": {
        const data = JSON.parse(event.data);

        // Do something with `data`…
        break;
      }
    }
  }, []);
  useEvents(handleEvents);

  // Shows the Make Live viewing area with some small
  // text overlaid in the top-right corner.
  return (
    <div className="w-full h-full relative">
      <Viewport className="w-full h-full" />
      {show ? (
        <div className="absolute top-0 right-0 h-min w-min p-2 flex gap-2 items-center">
          <button
            onClick={() => {
              // Example of sending a console command.
              instance.sendCommand({
                data: "stat fps",
                type: "CONSOLE_COMMAND",
              });
            }}>
            FPS
          </button>
          <button
            onClick={() => {
              // Example of sending a custom interaction to your UE project.
              instance.sendCommand({
                data: "CustomEvent",
                type: "INTERACTION_COMMAND",
              });
            }}>
            Custom Command
          </button>
        </div>
      ) : null}
    </div>
  );
};

// Where the React app is being rendered into.
const root = document.getElementById("root");

// What application are we wrapping?
// You'll need some way of swapping this out for
// a Make Live URL in production.
// This can be done many ways so it's worth checking
// the docs of whatever website/tool you're using.
// This `localhost` used here is the default location
// the Make Live Development server runs at for local
// development.
const url = "http://localhost:9000";

createRoot(root).render(
  <MakeLiveProvider url={url}>
    <App />
  </MakeLiveProvider>,
);
```

## Local Development Workflow

To enable you to work on your custom UI locally you can use the [@make-live/toolkit-dev](../make-live-toolkit-dev) module. This will run the necessary servers to enable your local Unreal Engine application to use Pixel Streaming. There are a few steps you need to go through.

Note that you do not have to run everything on the same computer. For example, you can run your Unreal Engine application on Windows and develop your custom UI on MacOS/Linux. Everything will work fine as long as they are on the same local network.

1. Add the Pixel Streaming plugin to your Unreal Engine application
1. Run [@make-live/toolkit-dev](../make-live-toolkit-dev) by using the command `npx @make-live/toolkit-dev`
1. Take note of the launch parameters and toolkit connection URL it writes out to the console and add the launch parameters in Unreal Engine. You'll need to keep this running to handle the connections between Unreal Engine and your custom UI.
1. In your custom UI use the toolkit connection URL when creating `MakeLiveProvider`.
1. Run your custom UI server and you should see "Make Live" along with a play button. Press the play button to start connecting.

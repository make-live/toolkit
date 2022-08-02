# @make-live/toolkit

An npm module to help Make Live customers create a custom HTML UI for their hosted experience.

## Install

The Make Live Toolkit can be integrated into an existing website. Ideally, we recommend setting up a new website with something like [Parcel](https://parceljs.org) or [Vite](https://vitejs.dev). You can find a working example application built using Parcel and the Make Live Toolkit [here](./examples/toolkit-example).

To install with npm:

```sh
npm install --save @make-live/toolkit
```

To install with Yarn:

```sh
yarn add @make-live/toolkit
```

## Local Development Workflow

To enable you to work on your custom UI locally you can use the [@make-live/toolkit-dev](../make-live-toolkit-dev) module. This will run the necessary servers to enable your local Unreal Engine application to use Pixel Streaming. There are a few steps you need to go through.

Note that you do not have to run everything on the same computer. For example, you can run your Unreal Engine application on Windows and develop your custom UI on MacOS/Linux. Everything will work fine as long as they are on the same local network.

1. Add the Pixel Streaming plugin to your Unreal Engine application
1. Run [@make-live/toolkit-dev](../make-live-toolkit-dev) by using the command `npx @make-live/toolkit-dev`
1. Take note of the launch parameters and toolkit connection URL it writes out to the console and add the launch parameters in Unreal Engine. You'll need to keep this running to handle the connections between Unreal Engine and your custom UI.
1. In your custom UI use the toolkit connection URL when calling `createInstance`.
1. Run your custom UI server and you should see "Make Live" along with a play button. Press the play button to start connecting.

## Commands

There are two different type of commands your application can send at the moment.

### `CONSOLE_COMMAND`

This command enables you to use the Unreal Engine console to run commands. Please see the [Unreal Engine documentation](https://docs.unrealengine.com/5.0/en-US/customizing-the-player-web-page-in-unreal-engine/#usingtheemitcommandfunction) for further details.

```js
instance.sendCommand({
  data: "stat fps",
  type: "CONSOLE_COMMAND",
});
```

### `INTERACTION_COMMAND`

This command enables you to use send a customer Unreal Engine command that is bespoke to your application. For example, a command that turns a light on or off, or changes the time of day, the possibilities are endless. Please see the [Unreal Engine documentation](https://docs.unrealengine.com/5.0/en-US/customizing-the-player-web-page-in-unreal-engine/#usingtheemituiinteractionfunction) for further details.

```js
instance.sendCommand({
  data: "MyCustomEvent",
  type: "INTERACTION_COMMAND",
});

instance.sendCommand({
  data: {
    LoadLevel: "/Game/Maps/Level_2",
    PlayerCharacter: {
      Name: "Shinbi",
      Skin: "Dynasty",
    },
  },
  type: "INTERACTION_COMMAND",
});
```

## Events

There are a variety of events your application can receive. Some of these are related to Make Live itself.

You can listen for events by calling the `addEventListener` function on the `MakeLiveInstance` object. You can add multiple event listeners if required so you can separate concerns in a larger application and just listen for a subset of events.

```js
const instance = createInstance({
  url,
  container: viewport,
});

instance.addEventListener((event) => {
  /// do something with `event`…
});
```

### `CONNECT`

This event is from Make Live itself and is broadcast when it's time for your application to come to life. Typically, you would enable/show your UI once receiving this as the user is able to interact with the experience.

```js
instance.addEventListener((event) => {
  if (event.type === "CONNECT") {
    /// show UI or start other tasks
  }
});
```

### `DISCONNECT`

This event is from Make Live itself and is broadcast when it's time for your application shut down. Typically, you would disable/hide your UI once receiving this as the user is unable to interact with the experience. Examples of when this could happen are there the user's session expiring or some other issue causing your experience to no longer continue.

```js
instance.addEventListener((event) => {
  if (event.type === "DISCONNECT") {
    /// show UI or start other tasks
  }
});
```

### `RESPONSE`

This event is from your Unreal Engine application (via Make Live) and is broadcast when your application wants to alert the UI to something interesting. Maybe the user has entered a certain area and you need to change the UI to show different controls or data? For more information please see the [Unreal Engine documentation](https://docs.unrealengine.com/5.0/en-US/customizing-the-player-web-page-in-unreal-engine/#communicatingfromue4totheplayerpage).

```js
instance.addEventListener((event) => {
  if (event.type === "RESPONSE") {
    // RESPONSE event data will always be a JSON `string`.
    const data = JSON.parse(event.data);
    /// do something with the data
  }
});
```

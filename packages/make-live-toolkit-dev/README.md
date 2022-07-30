# @make-live/toolkit-dev

An npm module to help Make Live customers run a pixel streamed Unreal Engine application locally. It runs a simplified signalling server along with another server that emulates Make Live itself.

Reading the [Unreal Engine documentation on Pixel Streaming](https://docs.unrealengine.com/5.0/en-US/pixel-streaming-in-unreal-engine/) is beneficial.

## Install

You can run the module with npx without installing:

```sh
npx @make-live/toolkit-dev
```

To install with npm:

```sh
npm install --save-dev @make-live/toolkit-dev
```

To install with Yarn:

```sh
yarn add --dev @make-live/toolkit-dev
```

## Usage

| Argument          | Description                                                                                                             | Type   | Default |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| `--port`          | Port for the Make Live emulation server to use. This is what you will connect to in your custom UI.                     | number | 9000    |
| `--streamer-port` | Port that Unreal Engine applications connect to.                                                                        | number | 8888    |
| `--player-port`   | Port that players will connect to. Used internally by the Make Live emulation server but changeable to avoid conflicts. | number | 7090    |

The required arguments to use for your Unreal Engine application will be output to the console. You can put these in these in the Advanced Settings of Unreal Engine so that they are used when [running in Standalone Game mode](https://docs.unrealengine.com/5.0/en-US/play-in-editor-settings-in-unreal-engine/#playinstandalonegame). The URL to use for your application will be output too. This is what you need to pass to the Make Live Toolkit when you call `createInstance` in the base toolkit or on the `MakeLiveProvider` if using the React Toolkit.

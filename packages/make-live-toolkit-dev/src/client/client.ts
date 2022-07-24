/* eslint-disable @typescript-eslint/no-var-requires */
// Copyright Epic Games, Inc. All Rights Reserved.
const WebRtcPlayer = require("./web-rtc-player");

export type CreateClientArgs = {
  mouseMode: ControlSchemeType;
  onDisconnect: () => void;
};

export enum ControlSchemeType {
  // A mouse can lock inside the WebRTC player so the user can simply move the
  // mouse to control the orientation of the camera. The user presses the
  // Escape key to unlock the mouse.
  LockedMouse = 0,

  // A mouse can hover over the WebRTC player so the user needs to click and
  // drag to control the orientation of the camera.
  HoveringMouse = 1,
}

export type ResponseEventListener = (response: string) => void;

const createClient = ({ mouseMode, onDisconnect }: CreateClientArgs) => {
  // Window events for a gamepad connecting
  const haveEvents = "GamepadEvent" in window;
  const controllers: Record<
    string,
    { currentState: Gamepad; prevState: Gamepad }
  > = {};

  let webRtcPlayerObj: typeof WebRtcPlayer | null = null;
  const print_inputs = false;
  let ws: WebSocket | undefined;
  const WS_OPEN_STATE = 1;

  let matchViewportResolution: boolean | undefined;
  // TODO: Remove this - workaround because of bug causing UE to crash when switching resolutions too quickly
  let lastTimeResized = new Date().getTime();
  let resizeTimeout: number | undefined;

  const responseEventListeners = new Map<string, ResponseEventListener>();

  // If the user focuses on a UE4 input widget then we show them a button to open
  // the on-screen keyboard. JavaScript security means we can only show the
  // on-screen keyboard in response to a user interaction.
  let editTextButton: HTMLButtonElement | undefined = undefined;

  // A hidden input text box which is used only for focusing and opening the
  // on-screen keyboard.
  let hiddenInput: HTMLInputElement | undefined = undefined;

  function scanGamepads() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (gamepad != null && gamepad.index in controllers) {
        controllers[gamepad.index].currentState = gamepad;
      }
    }
  }

  function updateStatus() {
    scanGamepads();
    // Iterate over multiple controllers in the case the mutiple gamepads are connected
    for (const j in controllers) {
      const controller = controllers[j];
      const controllerIndex = parseInt(j, 10);
      const currentState = controller.currentState;
      const prevState = controller.prevState;
      // Iterate over buttons
      for (let i = 0; i < currentState.buttons.length; i++) {
        const currButton = currentState.buttons[i];
        const prevButton = prevState.buttons[i];
        // Button 6 is actually the left trigger, send it to UE as an analog axis
        // Button 7 is actually the right trigger, send it to UE as an analog axis
        // The rest are normal buttons. Treat as such
        if (currButton.pressed && !prevButton.pressed) {
          // New press
          if (i == 6) {
            emitControllerAxisMove(controllerIndex, 5, currButton.value);
          } else if (i == 7) {
            emitControllerAxisMove(controllerIndex, 6, currButton.value);
          } else {
            emitControllerButtonPressed(controllerIndex, i, 0);
          }
        } else if (!currButton.pressed && prevButton.pressed) {
          // release
          if (i == 6) {
            emitControllerAxisMove(controllerIndex, 5, 0);
          } else if (i == 7) {
            emitControllerAxisMove(controllerIndex, 6, 0);
          } else {
            emitControllerButtonReleased(controllerIndex, i);
          }
        } else if (currButton.pressed && prevButton.pressed) {
          // repeat press / hold
          if (i == 6) {
            emitControllerAxisMove(controllerIndex, 5, currButton.value);
          } else if (i == 7) {
            emitControllerAxisMove(controllerIndex, 6, currButton.value);
          } else {
            emitControllerButtonPressed(controllerIndex, i, 1);
          }
        }
        // Last case is button isn't currently pressed and wasn't pressed before. This doesn't need an else block
      }
      // Iterate over gamepad axes
      for (let i = 0; i < currentState.axes.length; i += 2) {
        const x = parseFloat(currentState.axes[i].toFixed(4));
        // https://w3c.github.io/gamepad/#remapping Gamepad broweser side standard mapping has positive down, negative up. This is downright disgusting. So we fix it.
        const y = -parseFloat(currentState.axes[i + 1].toFixed(4));
        if (i === 0) {
          // left stick
          // axis 1 = left horizontal
          emitControllerAxisMove(controllerIndex, 1, x);
          // axis 2 = left vertical
          emitControllerAxisMove(controllerIndex, 2, y);
        } else if (i === 2) {
          // right stick
          // axis 3 = right horizontal
          emitControllerAxisMove(controllerIndex, 3, x);
          // axis 4 = right vertical
          emitControllerAxisMove(controllerIndex, 4, y);
        }
      }
      controllers[j].prevState = currentState;
    }
    requestAnimationFrame(updateStatus);
  }

  function emitControllerButtonPressed(
    controllerIndex: number,
    buttonIndex: number,
    isRepeat: number,
  ) {
    const Data = new DataView(new ArrayBuffer(4));
    Data.setUint8(0, MessageType.GamepadButtonPressed);
    Data.setUint8(1, controllerIndex);
    Data.setUint8(2, buttonIndex);
    Data.setUint8(3, isRepeat);
    sendInputData(Data.buffer);
  }

  function emitControllerButtonReleased(
    controllerIndex: number,
    buttonIndex: number,
  ) {
    const Data = new DataView(new ArrayBuffer(3));
    Data.setUint8(0, MessageType.GamepadButtonReleased);
    Data.setUint8(1, controllerIndex);
    Data.setUint8(2, buttonIndex);
    sendInputData(Data.buffer);
  }

  function emitControllerAxisMove(
    controllerIndex: number,
    axisIndex: number,
    analogValue: number,
  ) {
    const Data = new DataView(new ArrayBuffer(11));
    Data.setUint8(0, MessageType.GamepadAnalog);
    Data.setUint8(1, controllerIndex);
    Data.setUint8(2, axisIndex);
    Data.setFloat64(3, analogValue, true);
    sendInputData(Data.buffer);
  }

  function gamepadConnectHandler(e: GamepadEvent) {
    console.log("Gamepad connect handler");
    const gamepad = e.gamepad;
    controllers[gamepad.index] = {
      currentState: gamepad,
      prevState: gamepad,
    };
    console.log("gamepad: " + gamepad.id + " connected");
    requestAnimationFrame(updateStatus);
  }

  function gamepadDisconnectHandler(e: GamepadEvent) {
    console.log("Gamepad disconnect handler");
    console.log("gamepad: " + e.gamepad.id + " disconnected");
    delete controllers[e.gamepad.index];
  }

  function setupHtmlEvents() {
    //Window events
    global.addEventListener("resize", resizePlayerStyle, true);
    global.addEventListener("orientationchange", onOrientationChange);

    //Gamepad events
    if (haveEvents) {
      global.addEventListener("gamepadconnected", gamepadConnectHandler);
      global.addEventListener("gamepaddisconnected", gamepadDisconnectHandler);
    }
  }

  function setOverlay(
    htmlClass: string,
    htmlElement?: HTMLElement,
    onClickFunction?: (ev: MouseEvent) => void,
  ) {
    let videoPlayOverlay = document.getElementById("videoPlayOverlay");
    if (!videoPlayOverlay) {
      const playerDiv = document.getElementById("player");
      videoPlayOverlay = document.createElement("div");
      videoPlayOverlay.id = "videoPlayOverlay";
      playerDiv.appendChild(videoPlayOverlay);
    }

    // Remove existing html child elements so we can add the new one
    while (videoPlayOverlay.lastChild) {
      videoPlayOverlay.removeChild(videoPlayOverlay.lastChild);
    }

    if (htmlElement) videoPlayOverlay.appendChild(htmlElement);

    if (onClickFunction) {
      videoPlayOverlay.addEventListener(
        "click",
        function onOverlayClick(event) {
          onClickFunction(event);
          videoPlayOverlay.removeEventListener("click", onOverlayClick);
        },
      );
    }

    // Remove existing html classes so we can set the new one
    const cl = videoPlayOverlay.classList;
    for (let i = cl.length - 1; i >= 0; i--) {
      cl.remove(cl[i]);
    }

    videoPlayOverlay.classList.add(htmlClass);
  }

  function playVideoStream() {
    if (webRtcPlayerObj && webRtcPlayerObj.video) {
      webRtcPlayerObj.video.play();

      requestInitialSettings();
      hideOverlay();
    } else {
      console.error(
        "Could not player video stream because webRtcPlayerObj.video was not valid.",
      );
    }
  }

  function hideOverlay() {
    setOverlay("hiddenState");
  }

  function sendInputData(data) {
    if (webRtcPlayerObj) {
      webRtcPlayerObj.send(data);
    }
  }

  function addResponseEventListener(
    name: string,
    listener: ResponseEventListener,
  ) {
    responseEventListeners.set(name, listener);
  }

  function removeResponseEventListener(name: string) {
    responseEventListeners.delete(name);
  }

  // Must be kept in sync with PixelStreamingProtocol::EToPlayerMsg C++ enum.
  const ToClientMessageType = {
    QualityControlOwnership: 0,
    Response: 1,
    Command: 2,
    FreezeFrame: 3,
    UnfreezeFrame: 4,
    VideoEncoderAvgQP: 5,
    LatencyTest: 6,
    InitialSettings: 7,
    FileExtension: 8,
    FileMimeType: 9,
    FileContents: 10,
  };

  function setupWebRtcPlayer(htmlElement: HTMLDivElement, config) {
    webRtcPlayerObj = new WebRtcPlayer(config);
    htmlElement.appendChild(webRtcPlayerObj.video);

    webRtcPlayerObj.onWebRtcOffer = function (offer) {
      if (ws && ws.readyState === WS_OPEN_STATE) {
        const offerStr = JSON.stringify(offer);
        console.log(
          "%c[Outbound SS message (offer)]",
          "background: lightgreen; color: black",
          offer,
        );
        ws.send(offerStr);
      }
    };

    webRtcPlayerObj.onWebRtcCandidate = function (candidate) {
      if (ws && ws.readyState === WS_OPEN_STATE) {
        ws.send(
          JSON.stringify({
            type: "iceCandidate",
            candidate: candidate,
          }),
        );
      }
    };

    webRtcPlayerObj.onWebRtcAnswer = function (answer) {
      if (ws && ws.readyState === WS_OPEN_STATE) {
        const answerStr = JSON.stringify(answer);
        console.log(
          "%c[Outbound SS message (answer)]",
          "background: lightgreen; color: black",
          answer,
        );
        ws.send(answerStr);
      }
    };

    webRtcPlayerObj.onVideoInitialised = function () {
      if (ws && ws.readyState === WS_OPEN_STATE) {
        resizePlayerStyle();
        playVideoStream();
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    webRtcPlayerObj.onDataChannelConnected = function () {};

    webRtcPlayerObj.onNewVideoTrack = function (streams) {
      if (
        webRtcPlayerObj.video &&
        webRtcPlayerObj.video.srcObject &&
        webRtcPlayerObj.onVideoInitialised
      ) {
        webRtcPlayerObj.onVideoInitialised();
      }
    };

    webRtcPlayerObj.onDataChannelMessage = function (data) {
      const view = new Uint8Array(data);

      if (view[0] === ToClientMessageType.Response) {
        const response = new TextDecoder("utf-16").decode(data.slice(1));
        for (const listener of responseEventListeners.values()) {
          listener(response);
        }
      } else if (view[0] === ToClientMessageType.Command) {
        const commandAsString = new TextDecoder("utf-16").decode(data.slice(1));
        console.log(commandAsString);
        const command = JSON.parse(commandAsString);
        if (command.command === "onScreenKeyboard") {
          showOnScreenKeyboard(command);
        }
      } else if (view[0] === ToClientMessageType.VideoEncoderAvgQP) {
        //console.log(`received VideoEncoderAvgQP ${VideoEncoderQP}`);
      } else if (view[0] == ToClientMessageType.LatencyTest) {
        const latencyTimingsAsString = new TextDecoder("utf-16").decode(
          data.slice(1),
        );
        console.log("Got latency timings from UE.");
        console.log(latencyTimingsAsString);
        const latencyTimingsFromUE = JSON.parse(latencyTimingsAsString);
        if (webRtcPlayerObj) {
          webRtcPlayerObj.latencyTestTimings.SetUETimings(latencyTimingsFromUE);
        }
        // eslint-disable-next-line no-empty
      } else if (view[0] == ToClientMessageType.InitialSettings) {
        // eslint-disable-next-line no-empty
      } else if (view[0] == ToClientMessageType.FileExtension) {
        // eslint-disable-next-line no-empty
      } else if (view[0] == ToClientMessageType.FileMimeType) {
        // eslint-disable-next-line no-empty
      } else if (view[0] == ToClientMessageType.FileContents) {
      } else {
        console.error(`unrecognized data received, packet ID ${view[0]}`);
      }
    };

    registerInputs(webRtcPlayerObj.video);

    // On a touch device we will need special ways to show the on-screen keyboard.
    if ("ontouchstart" in document.documentElement) {
      createOnScreenKeyboardHelpers(htmlElement);
    }

    //createWebRtcOffer();

    return webRtcPlayerObj.video;
  }

  function onWebRtcOffer(webRTCData) {
    webRtcPlayerObj.receiveOffer(webRTCData);
  }

  function onWebRtcAnswer(webRTCData) {
    webRtcPlayerObj.receiveAnswer(webRTCData);
  }

  function onWebRtcIce(iceCandidate) {
    if (webRtcPlayerObj) {
      webRtcPlayerObj.handleCandidateFromServer(iceCandidate);
    }
  }

  let styleCursor = "default";

  const inputOptions = {
    // The control scheme controls the behaviour of the mouse when it interacts
    // with the WebRTC player.
    controlScheme: mouseMode,

    // Browser keys are those which are typically used by the browser UI. We
    // usually want to suppress these to allow, for example, UE4 to show shader
    // complexity with the F5 key without the web page refreshing.
    suppressBrowserKeys: true,

    // UE4 has a faketouches option which fakes a single finger touch when the
    // user drags with their mouse. We may perform the reverse; a single finger
    // touch may be converted into a mouse drag UE4 side. This allows a
    // non-touch application to be controlled partially via a touch device.
    fakeMouseWithTouches: false,
  };

  function resizePlayerStyleToArbitrarySize(playerElement) {
    //Video is now 100% of the playerElement, so set the playerElement style
    playerElement.style = "px; cursor: " + styleCursor + ";";
  }

  function resizePlayerStyle() {
    const playerElement = document.getElementById("player");

    if (!playerElement) return;

    updateVideoStreamSize();

    resizePlayerStyleToArbitrarySize(playerElement);

    setupMouseAndFreezeFrame(playerElement);
  }

  function setupMouseAndFreezeFrame(playerElement) {
    // Calculating and normalizing positions depends on the width and height of
    // the player.
    playerElementClientRect = playerElement.getBoundingClientRect();
    setupNormalizeAndQuantize();
  }

  function updateVideoStreamSize() {
    if (!matchViewportResolution) {
      return;
    }

    const now = new Date().getTime();
    if (now - lastTimeResized > 1000) {
      const playerElement = document.getElementById("player");
      if (!playerElement) return;

      const descriptor = {
        ConsoleCommand:
          "setres " +
          playerElement.clientWidth +
          "x" +
          playerElement.clientHeight,
      };
      emitCommand(descriptor);
      console.log(descriptor);
      lastTimeResized = new Date().getTime();
    } else {
      console.log("Resizing too often - skipping");
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateVideoStreamSize, 1000);
    }
  }

  // Fix for bug in iOS where windowsize is not correct at instance or orientation change
  // https://github.com/dimsemenov/PhotoSwipe/issues/1315
  let _orientationChangeTimeout: number | undefined;

  function onOrientationChange() {
    clearTimeout(_orientationChangeTimeout);
    _orientationChangeTimeout = setTimeout(function () {
      resizePlayerStyle();
    }, 500);
  }

  // Must be kept in sync with PixelStreamingProtocol::EToUE4Msg C++ enum.
  const MessageType = {
    /**********************************************************************/

    /*
     * Control Messages. Range = 0..49.
     */
    IFrameRequest: 0,
    RequestQualityControl: 1,
    FpsRequest: 2,
    AverageBitrateRequest: 3,
    StartStreaming: 4,
    StopStreaming: 5,
    LatencyTest: 6,
    RequestInitialSettings: 7,

    /**********************************************************************/

    /*
     * Input Messages. Range = 50..89.
     */

    // Generic Input Messages. Range = 50..59.
    UIInteraction: 50,
    Command: 51,

    // Keyboard Input Message. Range = 60..69.
    KeyDown: 60,
    KeyUp: 61,
    KeyPress: 62,

    // Mouse Input Messages. Range = 70..79.
    MouseEnter: 70,
    MouseLeave: 71,
    MouseDown: 72,
    MouseUp: 73,
    MouseMove: 74,
    MouseWheel: 75,

    // Touch Input Messages. Range = 80..89.
    TouchStart: 80,
    TouchEnd: 81,
    TouchMove: 82,

    // Gamepad Input Messages. Range = 90..99
    GamepadButtonPressed: 90,
    GamepadButtonReleased: 91,
    GamepadAnalog: 92,

    /**************************************************************************/
  };

  // A generic message has a type and a descriptor.
  function emitDescriptor(messageType: number, descriptor: object) {
    // Convert the dscriptor object into a JSON string.
    const descriptorAsString = JSON.stringify(descriptor);

    // Add the UTF-16 JSON string to the array byte buffer, going two bytes at
    // a time.
    const data = new DataView(
      new ArrayBuffer(1 + 2 + 2 * descriptorAsString.length),
    );
    let byteIdx = 0;
    data.setUint8(byteIdx, messageType);
    byteIdx++;
    data.setUint16(byteIdx, descriptorAsString.length, true);
    byteIdx += 2;
    for (let i = 0; i < descriptorAsString.length; i++) {
      data.setUint16(byteIdx, descriptorAsString.charCodeAt(i), true);
      byteIdx += 2;
    }
    sendInputData(data.buffer);
  }

  // A UI interation will occur when the user presses a button powered by
  // JavaScript as opposed to pressing a button which is part of the pixel
  // streamed UI from the UE4 client.
  function emitUIInteraction(descriptor: object) {
    emitDescriptor(MessageType.UIInteraction, descriptor);
  }

  // A build-in command can be sent to UE4 client. The commands are defined by a
  // JSON descriptor and will be executed automatically.
  // The currently supported commands are:
  //
  // 1. A command to run any console command:
  //    "{ ConsoleCommand: <string> }"
  //
  // 2. A command to change the resolution to the given width and height.
  //    "{ Resolution.Width: <value>, Resolution.Height: <value> } }"
  //
  /**
   *
   * @param {object} descriptor
   */
  function emitCommand(descriptor: object) {
    emitDescriptor(MessageType.Command, descriptor);
  }

  function requestInitialSettings() {
    sendInputData(new Uint8Array([MessageType.RequestInitialSettings]).buffer);
  }

  let playerElementClientRect = undefined;
  let normalizeAndQuantizeUnsigned = undefined;
  let normalizeAndQuantizeSigned = undefined;
  let unquantizeAndDenormalizeUnsigned = undefined;

  function setupNormalizeAndQuantize() {
    const playerElement = document.getElementById("player");
    const videoElement = playerElement.getElementsByTagName("video");

    if (playerElement && videoElement.length > 0) {
      const playerAspectRatio =
        playerElement.clientHeight / playerElement.clientWidth;
      const videoAspectRatio =
        videoElement[0].videoHeight / videoElement[0].videoWidth;

      // Unsigned XY positions are the ratio (0.0..1.0) along a viewport axis,
      // quantized into an uint16 (0..65536).
      // Signed XY deltas are the ratio (-1.0..1.0) along a viewport axis,
      // quantized into an int16 (-32767..32767).
      // This allows the browser viewport and client viewport to have a different
      // size.
      // Hack: Currently we set an out-of-range position to an extreme (65535)
      // as we can't yet accurately detect mouse enter and leave events
      // precisely inside a video with an aspect ratio which causes mattes.
      if (playerAspectRatio > videoAspectRatio) {
        if (print_inputs) {
          console.log(
            "Setup Normalize and Quantize for playerAspectRatio > videoAspectRatio",
          );
        }
        const ratio = playerAspectRatio / videoAspectRatio;
        // Unsigned.
        normalizeAndQuantizeUnsigned = (x, y) => {
          const normalizedX = x / playerElement.clientWidth;
          const normalizedY =
            ratio * (y / playerElement.clientHeight - 0.5) + 0.5;
          if (
            normalizedX < 0.0 ||
            normalizedX > 1.0 ||
            normalizedY < 0.0 ||
            normalizedY > 1.0
          ) {
            return {
              inRange: false,
              x: 65535,
              y: 65535,
            };
          } else {
            return {
              inRange: true,
              x: normalizedX * 65536,
              y: normalizedY * 65536,
            };
          }
        };
        unquantizeAndDenormalizeUnsigned = (x, y) => {
          const normalizedX = x / 65536;
          const normalizedY = (y / 65536 - 0.5) / ratio + 0.5;
          return {
            x: normalizedX * playerElement.clientWidth,
            y: normalizedY * playerElement.clientHeight,
          };
        };
        // Signed.
        normalizeAndQuantizeSigned = (x, y) => {
          const normalizedX = x / (0.5 * playerElement.clientWidth);
          const normalizedY = (ratio * y) / (0.5 * playerElement.clientHeight);
          return {
            x: normalizedX * 32767,
            y: normalizedY * 32767,
          };
        };
      } else {
        if (print_inputs) {
          console.log(
            "Setup Normalize and Quantize for playerAspectRatio <= videoAspectRatio",
          );
        }
        const ratio = videoAspectRatio / playerAspectRatio;
        // Unsigned.
        normalizeAndQuantizeUnsigned = (x: number, y: number) => {
          const normalizedX =
            ratio * (x / playerElement.clientWidth - 0.5) + 0.5;
          const normalizedY = y / playerElement.clientHeight;
          if (
            normalizedX < 0.0 ||
            normalizedX > 1.0 ||
            normalizedY < 0.0 ||
            normalizedY > 1.0
          ) {
            return {
              inRange: false,
              x: 65535,
              y: 65535,
            };
          } else {
            return {
              inRange: true,
              x: normalizedX * 65536,
              y: normalizedY * 65536,
            };
          }
        };
        unquantizeAndDenormalizeUnsigned = (x: number, y: number) => {
          const normalizedX = (x / 65536 - 0.5) / ratio + 0.5;
          const normalizedY = y / 65536;
          return {
            x: normalizedX * playerElement.clientWidth,
            y: normalizedY * playerElement.clientHeight,
          };
        };
        // Signed.
        normalizeAndQuantizeSigned = (x: number, y: number) => {
          const normalizedX = (ratio * x) / (0.5 * playerElement.clientWidth);
          const normalizedY = y / (0.5 * playerElement.clientHeight);
          return {
            x: normalizedX * 32767,
            y: normalizedY * 32767,
          };
        };
      }
    }
  }

  function emitMouseMove(x: number, y: number, deltaX: number, deltaY: number) {
    if (print_inputs) {
      console.log(`x: ${x}, y:${y}, dX: ${deltaX}, dY: ${deltaY}`);
    }
    const coord = normalizeAndQuantizeUnsigned(x, y);
    const delta = normalizeAndQuantizeSigned(deltaX, deltaY);
    const Data = new DataView(new ArrayBuffer(9));
    Data.setUint8(0, MessageType.MouseMove);
    Data.setUint16(1, coord.x, true);
    Data.setUint16(3, coord.y, true);
    Data.setInt16(5, delta.x, true);
    Data.setInt16(7, delta.y, true);
    sendInputData(Data.buffer);
  }

  function emitMouseDown(button, x, y) {
    if (print_inputs) {
      console.log(`mouse button ${button} down at (${x}, ${y})`);
    }
    const coord = normalizeAndQuantizeUnsigned(x, y);
    const Data = new DataView(new ArrayBuffer(6));
    Data.setUint8(0, MessageType.MouseDown);
    Data.setUint8(1, button);
    Data.setUint16(2, coord.x, true);
    Data.setUint16(4, coord.y, true);
    sendInputData(Data.buffer);
  }

  function emitMouseUp(button, x, y) {
    if (print_inputs) {
      console.log(`mouse button ${button} up at (${x}, ${y})`);
    }
    const coord = normalizeAndQuantizeUnsigned(x, y);
    const Data = new DataView(new ArrayBuffer(6));
    Data.setUint8(0, MessageType.MouseUp);
    Data.setUint8(1, button);
    Data.setUint16(2, coord.x, true);
    Data.setUint16(4, coord.y, true);
    sendInputData(Data.buffer);
  }

  function emitMouseWheel(delta, x, y) {
    if (print_inputs) {
      console.log(`mouse wheel with delta ${delta} at (${x}, ${y})`);
    }
    const coord = normalizeAndQuantizeUnsigned(x, y);
    const Data = new DataView(new ArrayBuffer(7));
    Data.setUint8(0, MessageType.MouseWheel);
    Data.setInt16(1, delta, true);
    Data.setUint16(3, coord.x, true);
    Data.setUint16(5, coord.y, true);
    sendInputData(Data.buffer);
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
  const MouseButton = {
    MainButton: 0, // Left button.
    AuxiliaryButton: 1, // Wheel button.
    SecondaryButton: 2, // Right button.
    FourthButton: 3, // Browser Back button.
    FifthButton: 4, // Browser Forward button.
  };

  // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
  const MouseButtonsMask = {
    PrimaryButton: 1, // Left button.
    SecondaryButton: 2, // Right button.
    AuxiliaryButton: 4, // Wheel button.
    FourthButton: 8, // Browser Back button.
    FifthButton: 16, // Browser Forward button.
  };

  // If the user has any mouse buttons pressed then release them.
  function releaseMouseButtons(buttons, x, y) {
    if (buttons & MouseButtonsMask.PrimaryButton) {
      emitMouseUp(MouseButton.MainButton, x, y);
    }
    if (buttons & MouseButtonsMask.SecondaryButton) {
      emitMouseUp(MouseButton.SecondaryButton, x, y);
    }
    if (buttons & MouseButtonsMask.AuxiliaryButton) {
      emitMouseUp(MouseButton.AuxiliaryButton, x, y);
    }
    if (buttons & MouseButtonsMask.FourthButton) {
      emitMouseUp(MouseButton.FourthButton, x, y);
    }
    if (buttons & MouseButtonsMask.FifthButton) {
      emitMouseUp(MouseButton.FifthButton, x, y);
    }
  }

  // If the user has any mouse buttons pressed then press them again.
  function pressMouseButtons(buttons, x, y) {
    if (buttons & MouseButtonsMask.PrimaryButton) {
      emitMouseDown(MouseButton.MainButton, x, y);
    }
    if (buttons & MouseButtonsMask.SecondaryButton) {
      emitMouseDown(MouseButton.SecondaryButton, x, y);
    }
    if (buttons & MouseButtonsMask.AuxiliaryButton) {
      emitMouseDown(MouseButton.AuxiliaryButton, x, y);
    }
    if (buttons & MouseButtonsMask.FourthButton) {
      emitMouseDown(MouseButton.FourthButton, x, y);
    }
    if (buttons & MouseButtonsMask.FifthButton) {
      emitMouseDown(MouseButton.FifthButton, x, y);
    }
  }

  function registerInputs(playerElement) {
    if (!playerElement) return;

    registerMouseEnterAndLeaveEvents(playerElement);
    registerTouchEvents(playerElement);
  }

  function createOnScreenKeyboardHelpers(htmlElement) {
    if (document.getElementById("hiddenInput") === null) {
      hiddenInput = document.createElement("input");
      hiddenInput.id = "hiddenInput";
      hiddenInput.maxLength = 0;
      htmlElement.appendChild(hiddenInput);
    }

    if (document.getElementById("editTextButton") === null) {
      editTextButton = document.createElement("button");
      editTextButton.id = "editTextButton";
      editTextButton.innerHTML = "edit text";
      htmlElement.appendChild(editTextButton);

      // Hide the 'edit text' button.
      editTextButton.classList.add("hiddenState");

      editTextButton.addEventListener("click", function () {
        // Show the on-screen keyboard.
        hiddenInput.focus();
      });
    }
  }

  function showOnScreenKeyboard(command) {
    if (command.showOnScreenKeyboard) {
      // Show the 'edit text' button.
      editTextButton.classList.remove("hiddenState");
      // Place the 'edit text' button near the UE4 input widget.
      const pos = unquantizeAndDenormalizeUnsigned(command.x, command.y);
      editTextButton.style.top = pos.y.toString() + "px";
      editTextButton.style.left = (pos.x - 40).toString() + "px";
    } else {
      // Hide the 'edit text' button.
      editTextButton.classList.add("hiddenState");
      // Hide the on-screen keyboard.
      hiddenInput.blur();
    }
  }

  function registerMouseEnterAndLeaveEvents(playerElement) {
    playerElement.onmouseenter = function (e) {
      if (print_inputs) {
        console.log("mouse enter");
      }
      const Data = new DataView(new ArrayBuffer(1));
      Data.setUint8(0, MessageType.MouseEnter);
      sendInputData(Data.buffer);
      playerElement.pressMouseButtons(e);
    };

    playerElement.onmouseleave = function (e) {
      if (print_inputs) {
        console.log("mouse leave");
      }
      const Data = new DataView(new ArrayBuffer(1));
      Data.setUint8(0, MessageType.MouseLeave);
      sendInputData(Data.buffer);
      playerElement.releaseMouseButtons(e);
    };
  }

  // A locked mouse works by the user clicking in the browser player and the
  // cursor disappears and is locked. The user moves the cursor and the camera
  // moves, for example. The user presses escape to free the mouse.
  function registerLockedMouseEvents(playerElement) {
    let x = playerElement.width / 2;
    let y = playerElement.height / 2;

    playerElement.requestPointerLock =
      playerElement.requestPointerLock || playerElement.mozRequestPointerLock;
    document.exitPointerLock =
      document.exitPointerLock || document.mozExitPointerLock;

    playerElement.onclick = function () {
      playerElement.requestPointerLock();
    };

    // Respond to lock state change events
    document.addEventListener("pointerlockchange", lockStateChange, false);
    document.addEventListener("mozpointerlockchange", lockStateChange, false);

    function lockStateChange() {
      if (
        document.pointerLockElement === playerElement ||
        document.mozPointerLockElement === playerElement
      ) {
        console.log("Pointer locked");
        document.addEventListener("mousemove", updatePosition, false);
      } else {
        console.log("The pointer lock status is now unlocked");
        document.removeEventListener("mousemove", updatePosition, false);
      }
    }

    function updatePosition(e) {
      x += e.movementX;
      y += e.movementY;
      emitMouseMove(x, y, e.movementX, e.movementY);
    }

    playerElement.onmousedown = function (e) {
      emitMouseDown(e.button, x, y);
    };

    playerElement.onmouseup = function (e) {
      emitMouseUp(e.button, x, y);
    };

    playerElement.onmousewheel = function (e) {
      emitMouseWheel(e.wheelDelta, x, y);
    };

    playerElement.pressMouseButtons = function (e) {
      pressMouseButtons(e.buttons, x, y);
    };

    playerElement.releaseMouseButtons = function (e) {
      releaseMouseButtons(e.buttons, x, y);
    };
  }

  // A hovering mouse works by the user clicking the mouse button when they want
  // the cursor to have an effect over the video. Otherwise the cursor just
  // passes over the browser.
  function registerHoveringMouseEvents(playerElement) {
    styleCursor = "none"; // We will rely on UE4 client's software cursor.
    //styleCursor = 'default';  // Showing cursor

    playerElement.onmousemove = function (e) {
      emitMouseMove(e.offsetX, e.offsetY, e.movementX, e.movementY);
      e.preventDefault();
    };

    playerElement.onmousedown = function (e) {
      emitMouseDown(e.button, e.offsetX, e.offsetY);
      e.preventDefault();
    };

    playerElement.onmouseup = function (e) {
      emitMouseUp(e.button, e.offsetX, e.offsetY);
      e.preventDefault();
    };

    // When the context menu is shown then it is safest to release the button
    // which was pressed when the event happened. This will guarantee we will
    // get at least one mouse up corresponding to a mouse down event. Otherwise
    // the mouse can get stuck.
    // https://github.com/facebook/react/issues/5531
    playerElement.oncontextmenu = function (e) {
      emitMouseUp(e.button, e.offsetX, e.offsetY);
      e.preventDefault();
    };

    if ("onmousewheel" in playerElement) {
      playerElement.onmousewheel = function (e) {
        emitMouseWheel(e.wheelDelta, e.offsetX, e.offsetY);
        e.preventDefault();
      };
    } else {
      playerElement.addEventListener(
        "DOMMouseScroll",
        function (e) {
          emitMouseWheel(e.detail * -120, e.offsetX, e.offsetY);
          e.preventDefault();
        },
        false,
      );
    }

    playerElement.pressMouseButtons = function (e) {
      pressMouseButtons(e.buttons, e.offsetX, e.offsetY);
    };

    playerElement.releaseMouseButtons = function (e) {
      releaseMouseButtons(e.buttons, e.offsetX, e.offsetY);
    };
  }

  function registerTouchEvents(playerElement: HTMLDivElement) {
    // We need to assign a unique identifier to each finger.
    // We do this by mapping each Touch object to the identifier.
    const fingers = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    const fingerIds: Record<string, number | undefined> = {};

    function rememberTouch(touch: Touch) {
      const finger = fingers.pop();
      if (finger === undefined) {
        console.log("exhausted touch indentifiers");
      }
      fingerIds[touch.identifier] = finger;
    }

    function forgetTouch(touch: Touch) {
      fingers.push(fingerIds[touch.identifier]);
      fingers.sort((a, b) => b - a);
      delete fingerIds[touch.identifier];
    }

    function emitTouchData(type: number, touches: TouchList) {
      const data = new DataView(new ArrayBuffer(2 + 7 * touches.length));
      data.setUint8(0, type);
      data.setUint8(1, touches.length);
      let byte = 2;
      for (let t = 0; t < touches.length; t++) {
        const touch = touches[t];
        const x = touch.clientX - playerElement.offsetLeft;
        const y = touch.clientY - playerElement.offsetTop;
        if (print_inputs) {
          console.log(`F${fingerIds[touch.identifier]}=(${x}, ${y})`);
        }
        const coord = normalizeAndQuantizeUnsigned(x, y);
        data.setUint16(byte, coord.x, true);
        byte += 2;
        data.setUint16(byte, coord.y, true);
        byte += 2;
        data.setUint8(byte, fingerIds[touch.identifier], true);
        byte += 1;
        data.setUint8(byte, 255 * touch.force, true); // force is between 0.0 and 1.0 so quantize into byte.
        byte += 1;
        data.setUint8(byte, coord.inRange ? 1 : 0, true); // mark the touch as in the player or not
        byte += 1;
      }

      sendInputData(data.buffer);
    }

    if (inputOptions.fakeMouseWithTouches) {
      let finger = undefined;

      playerElement.ontouchstart = function (e) {
        if (finger === undefined) {
          const firstTouch = e.changedTouches[0];
          finger = {
            id: firstTouch.identifier,
            x: firstTouch.clientX - playerElementClientRect.left,
            y: firstTouch.clientY - playerElementClientRect.top,
          };
          // Hack: Mouse events require an enter and leave so we just
          // enter and leave manually with each touch as this event
          // is not fired with a touch device.
          playerElement.onmouseenter(e);
          emitMouseDown(MouseButton.MainButton, finger.x, finger.y);
        }
        e.preventDefault();
      };

      playerElement.ontouchend = function (e) {
        for (let t = 0; t < e.changedTouches.length; t++) {
          const touch = e.changedTouches[t];
          if (touch.identifier === finger.id) {
            const x = touch.clientX - playerElementClientRect.left;
            const y = touch.clientY - playerElementClientRect.top;
            emitMouseUp(MouseButton.MainButton, x, y);
            // Hack: Manual mouse leave event.
            playerElement.onmouseleave(e);
            finger = undefined;
            break;
          }
        }
        e.preventDefault();
      };

      playerElement.ontouchmove = function (e) {
        for (let t = 0; t < e.touches.length; t++) {
          const touch = e.touches[t];
          if (touch.identifier === finger.id) {
            const x = touch.clientX - playerElementClientRect.left;
            const y = touch.clientY - playerElementClientRect.top;
            emitMouseMove(x, y, x - finger.x, y - finger.y);
            finger.x = x;
            finger.y = y;
            break;
          }
        }
        e.preventDefault();
      };
    } else {
      playerElement.ontouchstart = function (e) {
        // Assign a unique identifier to each touch.
        for (let t = 0; t < e.changedTouches.length; t++) {
          rememberTouch(e.changedTouches[t]);
        }

        if (print_inputs) {
          console.log("touch start");
        }
        emitTouchData(MessageType.TouchStart, e.changedTouches);
        e.preventDefault();
      };

      playerElement.ontouchend = function (e) {
        if (print_inputs) {
          console.log("touch end");
        }
        emitTouchData(MessageType.TouchEnd, e.changedTouches);

        // Re-cycle unique identifiers previously assigned to each touch.
        for (let t = 0; t < e.changedTouches.length; t++) {
          forgetTouch(e.changedTouches[t]);
        }
        e.preventDefault();
      };

      playerElement.ontouchmove = function (e) {
        if (print_inputs) {
          console.log("touch move");
        }
        emitTouchData(MessageType.TouchMove, e.touches);
        e.preventDefault();
      };
    }
  }

  // Browser keys do not have a charCode so we only need to test keyCode.
  function isKeyCodeBrowserKey(keyCode: number) {
    // Function keys or tab key.
    return (keyCode >= 112 && keyCode <= 123) || keyCode === 9;
  }

  // Must be kept in sync with JavaScriptKeyCodeToFKey C++ array. The index of the
  // entry in the array is the special key code given below.
  const SpecialKeyCodes = {
    BackSpace: 8,
    Shift: 16,
    Control: 17,
    Alt: 18,
    RightShift: 253,
    RightControl: 254,
    RightAlt: 255,
  };

  // We want to be able to differentiate between left and right versions of some
  // keys.
  function getKeyCode(e: KeyboardEvent) {
    if (e.keyCode === SpecialKeyCodes.Shift && e.code === "ShiftRight")
      return SpecialKeyCodes.RightShift;
    else if (e.keyCode === SpecialKeyCodes.Control && e.code === "ControlRight")
      return SpecialKeyCodes.RightControl;
    else if (e.keyCode === SpecialKeyCodes.Alt && e.code === "AltRight")
      return SpecialKeyCodes.RightAlt;
    else return e.keyCode;
  }

  function registerKeyboardEvents() {
    document.onkeydown = function (e) {
      if (print_inputs) {
        console.log(`key down ${e.keyCode}, repeat = ${e.repeat}`);
      }
      sendInputData(
        new Uint8Array([MessageType.KeyDown, getKeyCode(e), e.repeat]).buffer,
      );
      // Backspace is not considered a keypress in JavaScript but we need it
      // to be so characters may be deleted in a UE4 text entry field.
      if (e.keyCode === SpecialKeyCodes.BackSpace) {
        document.onkeypress({
          charCode: SpecialKeyCodes.BackSpace,
        });
      }
      if (inputOptions.suppressBrowserKeys && isKeyCodeBrowserKey(e.keyCode)) {
        e.preventDefault();
      }
    };

    document.onkeyup = function (e) {
      if (print_inputs) {
        console.log(`key up ${e.keyCode}`);
      }
      sendInputData(new Uint8Array([MessageType.KeyUp, getKeyCode(e)]).buffer);
      if (inputOptions.suppressBrowserKeys && isKeyCodeBrowserKey(e.keyCode)) {
        e.preventDefault();
      }
    };

    document.onkeypress = function (e) {
      if (print_inputs) {
        console.log(`key press ${e.charCode}`);
      }
      const data = new DataView(new ArrayBuffer(3));
      data.setUint8(0, MessageType.KeyPress);
      data.setUint16(1, e.charCode, true);
      sendInputData(data.buffer);
    };
  }

  function connect(url: string) {
    "use strict";

    ws = new WebSocket(url);

    ws.onmessage = function (event) {
      const msg = JSON.parse(event.data);
      if (msg.type === "config") {
        console.log(
          "%c[Inbound SS (config)]",
          "background: lightblue; color: black",
          msg,
        );
        onConfig(msg);
      } else if (msg.type === "playerCount") {
        console.log(
          "%c[Inbound SS (playerCount)]",
          "background: lightblue; color: black",
          msg,
        );
      } else if (msg.type === "offer") {
        console.log(
          "%c[Inbound SS (offer)]",
          "background: lightblue; color: black",
          msg,
        );
        onWebRtcOffer(msg);
      } else if (msg.type === "answer") {
        console.log(
          "%c[Inbound SS (answer)]",
          "background: lightblue; color: black",
          msg,
        );
        onWebRtcAnswer(msg);
      } else if (msg.type === "iceCandidate") {
        onWebRtcIce(msg.candidate);
      } else if (msg.type === "warning" && msg.warning) {
        console.warn(msg.warning);
      } else {
        console.error("Invalid SS message type", msg.type);
      }
    };

    ws.onerror = function (event) {
      console.log(`WS error: ${JSON.stringify(event)}`);
    };

    ws.onclose = function (event) {
      console.log(`WS closed: ${JSON.stringify(event.code)} - ${event.reason}`);
      ws = undefined;

      // destroy `webRtcPlayerObj` if any
      const playerDiv = document.getElementById("player");
      if (webRtcPlayerObj) {
        playerDiv.removeChild(webRtcPlayerObj.video);
        webRtcPlayerObj.close();
        webRtcPlayerObj = undefined;
      }

      onDisconnect();
    };
  }

  // Config data received from WebRTC sender via the Cirrus web server
  function onConfig(config) {
    const playerDiv = document.getElementById("player");
    const playerElement = setupWebRtcPlayer(playerDiv, config);
    resizePlayerStyle();

    switch (inputOptions.controlScheme) {
      case ControlSchemeType.HoveringMouse:
        registerHoveringMouseEvents(playerElement);
        break;
      case ControlSchemeType.LockedMouse:
        registerLockedMouseEvents(playerElement);
        break;
      default:
        console.log(
          `ERROR: Unknown control scheme ${inputOptions.controlScheme}`,
        );
        registerLockedMouseEvents(playerElement);
        break;
    }
  }

  let initialized = false;

  const initialize = (
    controlScheme: number = ControlSchemeType.LockedMouse,
  ) => {
    if (!initialized) {
      inputOptions.controlScheme = controlScheme;
      setupHtmlEvents();
      registerKeyboardEvents();
      initialized = true;
    }
  };

  return {
    addResponseEventListener,
    connect,
    emitCommand,
    emitUIInteraction,
    initialize,
    removeResponseEventListener,
  };
};

export default createClient;

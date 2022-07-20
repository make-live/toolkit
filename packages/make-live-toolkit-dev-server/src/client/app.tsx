import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useIntervalWhen } from "rooks";
import { useSubscribe } from "./use-messages";
import { PlayerMessage, Status } from "@make-live/toolkit";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const createClient = require("./client");

const sendMessage = (message: PlayerMessage) => {
  parent.postMessage(message, "*");
};

const App: FC = () => {
  const [status, setStatus] = useState<Status>("START");
  const [isLaunching, setIsLaunching] = useState(false);
  const clientRef = useRef<ReturnType<typeof createClient>>();

  const handleSubscribe = useCallback<Parameters<typeof useSubscribe>[0]>(
    (message) => {
      console.debug(`Received: ${message.type}`);
      switch (message.type) {
      }
    },
    [],
  );

  useEffect(() => {
    if (status === "READY") {
      clientRef.current = createClient();
      clientRef.current?.load("ws://localhost:8888/player");
    }
  }, [status]);

  useSubscribe(handleSubscribe);
  useIntervalWhen(
    () => {
      const getStatus = async () => {
        const response = await fetch("http://localhost:8888/status");

        const json = (await response.json()) as PlayerMessage;

        setStatus(json.status);

        sendMessage(json);
      };

      getStatus();
    },
    2000,
    isLaunching,
  );

  if (status === "READY") {
    return (
      <div className="w-full h-full" id="playerUI">
        <div id="player" />
        <div id="overlay" className="overlay text-light bg-dark">
          <div id="overlayHeader">
            <div id="qualityStatus" className="greyStatus">
              ●
            </div>
            <div id="overlayButton">+</div>
          </div>
          <div id="overlaySettings">
            <div id="showFPS" className="setting">
              <div className="settings-text">Show FPS</div>
              <label className="btn-overlay">
                <input
                  type="button"
                  id="show-fps-button"
                  className="overlay-button btn-flat"
                  defaultValue="Toggle"
                />
              </label>
            </div>
            <div id="fillWindow" className="setting">
              <div className="settings-text">
                Enlarge display to fill window
              </div>
              <label className="tgl-switch">
                <input
                  type="checkbox"
                  id="enlarge-display-to-fill-window-tgl"
                  className="tgl tgl-flat"
                  defaultChecked
                />
                <div className="tgl-slider" />
              </label>
            </div>
            <div id="qualityControlOwnership" className="setting">
              <div className="settings-text">Is quality controller?</div>
              <label className="tgl-switch">
                <input
                  type="checkbox"
                  id="quality-control-ownership-tgl"
                  className="tgl tgl-flat"
                />
                <div className="tgl-slider" />
              </label>
            </div>
            <div id="matchViewportResolution" className="setting">
              <div className="settings-text">Match viewport resolution</div>
              <label className="tgl-switch">
                <input
                  type="checkbox"
                  id="match-viewport-res-tgl"
                  className="tgl tgl-flat"
                />
                <div className="tgl-slider" />
              </label>
            </div>
            <div id="preferSFU" className="setting">
              <div className="settings-text">Prefer SFU</div>
              <label className="tgl-switch">
                <input
                  type="checkbox"
                  id="prefer-sfu-tgl"
                  className="tgl tgl-flat"
                />
                <div className="tgl-slider" />
              </label>
            </div>
            <div id="useMic" className="setting">
              <div className="settings-text">Use microphone</div>
              <label className="tgl-switch">
                <input
                  type="checkbox"
                  id="use-mic-tgl"
                  className="tgl tgl-flat"
                />
                <div className="tgl-slider" />
              </label>
            </div>
            <div id="forceTURN" className="setting">
              <div className="settings-text">Force TURN</div>
              <label className="tgl-switch">
                <input
                  type="checkbox"
                  id="force-turn-tgl"
                  className="tgl tgl-flat"
                />
                <div className="tgl-slider" />
              </label>
            </div>
            <section id="encoderSettings">
              <div id="encoderSettingsHeader" className="settings-text">
                <div>Encoder Settings</div>
              </div>
              <div id="encoderParamsContainer" className="collapse">
                <div className="form-group">
                  <label htmlFor="encoder-min-qp-text">Min QP</label>
                  <input
                    type="number"
                    className="form-control"
                    id="encoder-min-qp-text"
                    defaultValue={0}
                    min={0}
                    max={51}
                  />
                  <label htmlFor="encoder-max-qp-text">Max QP</label>
                  <input
                    type="number"
                    className="form-control"
                    id="encoder-max-qp-text"
                    defaultValue={51}
                    min={0}
                    max={51}
                  />
                  <br />
                  <input
                    id="encoder-params-submit"
                    className="overlay-button btn-flat"
                    type="button"
                    defaultValue="Apply"
                  />
                </div>
              </div>
            </section>
            <section id="webRTCSettings">
              <div id="webRTCSettingsHeader" className="settings-text">
                <div>WebRTC Settings</div>
              </div>
              <div id="webrtcParamsContainer" className="collapse">
                <div className="form-group">
                  <label htmlFor="webrtc-fps-text">FPS</label>
                  <input
                    type="number"
                    className="form-control"
                    id="webrtc-fps-text"
                    defaultValue={60}
                    min={1}
                    max={999}
                  />
                  <label htmlFor="webrtc-min-bitrate-text">
                    Min bitrate (kbps)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="webrtc-min-bitrate-text"
                    defaultValue={0}
                    min={0}
                    max={100000}
                  />
                  <label htmlFor="webrtc-max-bitrate-text">
                    Max bitrate (kbps)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    id="webrtc-max-bitrate-text"
                    defaultValue={0}
                    min={0}
                    max={100000}
                  />
                  <br />
                  <input
                    id="webrtc-params-submit"
                    className="overlay-button btn-flat"
                    type="button"
                    defaultValue="Apply"
                  />
                </div>
              </div>
            </section>
            <section id="streamSettings">
              <div id="streamSettingsHeader" className="settings-text">
                <div>Stream Settings</div>
              </div>
              <div id="streamSettingsContainer" className="collapse">
                <div className="form-group">
                  <div className="settings-text">Player stream</div>
                  <select className="form-control" id="stream-select" />
                  <div className="settings-text">Player track</div>
                  <select className="form-control" id="track-select" />
                </div>
              </div>
            </section>
            <br />
            <section id="statsPanel">
              <div className="setting settings-text">
                <div>Show Stats</div>
                <label className="tgl-switch">
                  <input
                    type="checkbox"
                    id="show-stats-tgl"
                    className="tgl tgl-flat"
                    defaultChecked
                  />
                  <div className="tgl-slider" />
                </label>
              </div>
              <div id="statsContainer" className="statsContainer">
                <div id="stats" className="stats" />
              </div>
            </section>
            <section id="latencyTest">
              <div className="setting settings-text">
                <div>Latency Report</div>
                <label className="btn-overlay">
                  <input
                    type="button"
                    id="test-latency-button"
                    className="overlay-button btn-flat"
                    defaultValue="Get Report"
                  />
                </label>
              </div>
              <div id="latencyStatsContainer" className="statsContainer">
                <div id="LatencyStats" className="stats">
                  No report yet...
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default App;

import { describe, expect, it, jest } from "@jest/globals";
import { createIFrameStrategy } from "./iframe-strategy";

describe("createIFrameStrategy", () => {
  it("returns iframeStrategy", () => {
    const strategy = createIFrameStrategy();

    expect(strategy).toMatchInlineSnapshot(`
      Object {
        "prepare": [Function],
      }
    `);
  });

  it("throws an error when container is not passed to `prepare`", () => {
    const strategy = createIFrameStrategy();

    expect(() =>
      strategy.prepare(
        undefined as unknown as HTMLDivElement,
        "http://localhost:8888",
        jest.fn(),
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Missing 'container'. Must be a \`HTMLDivElement\`."`,
    );
  });

  it("throws an error when `url` is not passed to `prepare`", () => {
    const strategy = createIFrameStrategy();

    expect(() =>
      strategy.prepare(
        document.createElement("div"),
        undefined as unknown as string,
        jest.fn(),
      ),
    ).toThrowErrorMatchingInlineSnapshot(`"Missing 'url'."`);
  });

  it("appends iframe to `container` when `prepare` is called", () => {
    const strategy = createIFrameStrategy();
    const container = document.createElement("div");
    strategy.prepare(container, "http://localhost:8888", jest.fn());

    expect(container).toMatchInlineSnapshot(`
      <div
        style="position: relative;"
      >
        <iframe
          height="100%"
          src="http://localhost:8888/?custom=true"
          style="position: absolute; bottom: 0px; left: 0px; right: 0px; top: 0px;"
          width="100%"
        />
      </div>
    `);
  });

  it("listens to `message` event on window for events", () => {
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");
    const onEventMock = jest.fn();
    const strategy = createIFrameStrategy();
    const container = document.createElement("div");
    strategy.prepare(container, "http://localhost:8888", onEventMock);

    const handler = addEventListenerSpy.mock.calls[0][1];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    handler({ data: "event" });

    expect(onEventMock).toBeCalledTimes(1);
    expect(onEventMock).toBeCalledWith("event");
  });
});

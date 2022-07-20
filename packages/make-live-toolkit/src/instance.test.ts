import { describe, expect, it, jest } from "@jest/globals";
import { createIFrameStrategy } from "./iframe-strategy";
import { createInstance } from "./instance";
import { Strategy } from "./strategy";
import { isValidEvent } from "./events";

jest.mock("./events");
jest.mock("./iframe-strategy");

const isValidEventMock = jest.mocked(isValidEvent);

const createIFrameStrategyMock = jest.mocked(createIFrameStrategy);
createIFrameStrategyMock.mockImplementation(() => ({
  prepare: jest.fn(),
}));

describe("createInstance", () => {
  it("throws an error when `container` is missing", () => {
    expect(() =>
      createInstance({
        container: undefined as unknown as HTMLDivElement,
        strategy: { prepare: jest.fn<Strategy["prepare"]>() },
        url: "http://localhost:8888",
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Missing 'container'. Must be a \`HTMLDivElement\`."`,
    );
  });

  it("throws an error when `container` is not an HTMLDivElement", () => {
    expect(() =>
      createInstance({
        container: document.createElement("span") as HTMLDivElement,
        strategy: { prepare: jest.fn<Strategy["prepare"]>() },
        url: "http://localhost:8888",
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Missing 'container'. Must be a \`HTMLDivElement\`."`,
    );
  });

  it("throws an error when `url` is missing", () => {
    expect(() =>
      createInstance({
        container: document.createElement("div"),
        strategy: { prepare: jest.fn<Strategy["prepare"]>() },
        url: undefined as unknown as string,
      }),
    ).toThrowErrorMatchingInlineSnapshot(`"Missing 'url'"`);
  });

  it("uses IFrameStrategy by default", () => {
    createInstance({
      container: document.createElement("div"),
      url: "http://localhost:8888",
    });

    expect(createIFrameStrategyMock).toBeCalledTimes(1);
  });

  it("calls `prepare` on the strategy", () => {
    const strategyMock = { prepare: jest.fn<Strategy["prepare"]>() };

    createInstance({
      container: document.createElement("div"),
      strategy: strategyMock,
      url: "http://localhost:8888",
    });

    expect(strategyMock.prepare).toBeCalledTimes(1);
    expect(strategyMock.prepare).toBeCalledWith(
      expect.any(HTMLDivElement),
      "http://localhost:8888",
      expect.any(Function),
    );
  });

  it("returns an instance", () => {
    const strategyMock = { prepare: jest.fn<Strategy["prepare"]>() };

    const instance = createInstance({
      container: document.createElement("div"),
      strategy: strategyMock,
      url: "http://localhost:8888",
    });

    expect(instance).toMatchInlineSnapshot(`
      Object {
        "addEventListener": [Function],
        "url": "http://localhost:8888/",
      }
    `);
  });

  it("discards invalid events", () => {
    const strategyMock = { prepare: jest.fn<Strategy["prepare"]>() };
    const eventListenerMock = jest.fn();
    isValidEventMock.mockReturnValue(false);
    const instance = createInstance({
      container: document.createElement("div"),
      strategy: strategyMock,
      url: "http://localhost:8888",
    });
    instance.addEventListener(eventListenerMock);

    const handler = strategyMock.prepare.mock.calls[0][2];
    handler({ type: "unknown" });

    expect(isValidEventMock).toBeCalledTimes(1);
    expect(isValidEventMock).toBeCalledWith({ type: "unknown" });
    expect(eventListenerMock).not.toBeCalled();
  });

  it("broadcasts valid event to each listener", () => {
    const strategyMock = { prepare: jest.fn<Strategy["prepare"]>() };
    const eventListenerMock1 = jest.fn();
    const eventListenerMock2 = jest.fn();
    const eventListenerMock3 = jest.fn();
    isValidEventMock.mockReturnValue(true);
    const instance = createInstance({
      container: document.createElement("div"),
      strategy: strategyMock,
      url: "http://localhost:8888",
    });
    instance.addEventListener(eventListenerMock1);
    instance.addEventListener(eventListenerMock2);
    instance.addEventListener(eventListenerMock3);

    const handler = strategyMock.prepare.mock.calls[0][2];
    handler({ type: "valid" });

    expect(isValidEventMock).toBeCalledTimes(1);
    expect(isValidEventMock).toBeCalledWith({ type: "valid" });
    expect(eventListenerMock1).toBeCalledTimes(1);
    expect(eventListenerMock1).toBeCalledWith({ type: "valid" });
    expect(eventListenerMock2).toBeCalledTimes(1);
    expect(eventListenerMock2).toBeCalledWith({ type: "valid" });
    expect(eventListenerMock3).toBeCalledTimes(1);
    expect(eventListenerMock3).toBeCalledWith({ type: "valid" });
  });

  it("does not broadcast valids event to removed listeners", () => {
    const strategyMock = { prepare: jest.fn<Strategy["prepare"]>() };
    const eventListenerMock1 = jest.fn();
    const eventListenerMock2 = jest.fn();
    const eventListenerMock3 = jest.fn();
    isValidEventMock.mockReturnValue(true);
    const instance = createInstance({
      container: document.createElement("div"),
      strategy: strategyMock,
      url: "http://localhost:8888",
    });
    instance.addEventListener(eventListenerMock1);
    const unsubscribe2 = instance.addEventListener(eventListenerMock2);
    const unsubscribe3 = instance.addEventListener(eventListenerMock3);

    const handler = strategyMock.prepare.mock.calls[0][2];
    handler({ type: "valid" });
    unsubscribe2();
    unsubscribe3();
    handler({ type: "valid" });

    expect(eventListenerMock1).toBeCalledTimes(2);
    expect(eventListenerMock1).toBeCalledWith({ type: "valid" });
    expect(eventListenerMock2).toBeCalledTimes(1);
    expect(eventListenerMock2).toBeCalledWith({ type: "valid" });
    expect(eventListenerMock3).toBeCalledTimes(1);
    expect(eventListenerMock3).toBeCalledWith({ type: "valid" });
  });
});

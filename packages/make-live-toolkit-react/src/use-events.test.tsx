import { EventListener, Instance } from "@make-live/toolkit";
import MakeLiveContext from "./context";
import { renderHook } from "./test-utils";
import useEvents from "./use-events";

describe("useEvents", () => {
  it("calls `addEventListener` on `instance`", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const listener = () => {};
    const addEventListenerMock = jest.fn<
      ReturnType<Instance["addEventListener"]>,
      Parameters<Instance["addEventListener"]>
    >();
    addEventListenerMock.mockImplementationOnce(() => jest.fn());

    renderHook(() => useEvents(listener), {
      wrapper: ({ children }) => (
        <MakeLiveContext.Provider
          value={{
            instance: {
              addEventListener: addEventListenerMock,
              url: new URL("http://localhost:8888"),
            },
            setContainer: jest.fn(),
          }}>
          {children}
        </MakeLiveContext.Provider>
      ),
    });

    expect(addEventListenerMock).toBeCalledTimes(1);
    expect(addEventListenerMock).toBeCalledWith(listener);
  });

  it("calls `unsubscribe` when unmounting", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const listener = () => {};
    const addEventListenerMock = jest.fn<
      ReturnType<Instance["addEventListener"]>,
      Parameters<Instance["addEventListener"]>
    >();
    const unsubscribe = jest.fn();
    addEventListenerMock.mockImplementationOnce(() => unsubscribe);

    const { unmount } = renderHook(() => useEvents(listener), {
      wrapper: ({ children }) => (
        <MakeLiveContext.Provider
          value={{
            instance: {
              addEventListener: addEventListenerMock,
              url: new URL("http://localhost:8888"),
            },
            setContainer: jest.fn(),
          }}>
          {children}
        </MakeLiveContext.Provider>
      ),
    });

    unmount();

    expect(unsubscribe).toBeCalledTimes(1);
    expect(unsubscribe).toBeCalledWith();
  });

  it("calls `unsubscribe` when `eventListener` changes", async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const listener1: EventListener = () => {};
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const listener2: EventListener = () => {};
    const addEventListenerMock = jest.fn<
      ReturnType<Instance["addEventListener"]>,
      Parameters<Instance["addEventListener"]>
    >();
    const unsubscribe1 = jest.fn();
    const unsubscribe2 = jest.fn();
    addEventListenerMock
      .mockImplementationOnce(() => unsubscribe1)
      .mockImplementationOnce(() => unsubscribe2);

    const { rerender } = renderHook(({ listener }) => useEvents(listener), {
      initialProps: { listener: listener1 },
      wrapper: ({ children }) => (
        <MakeLiveContext.Provider
          value={{
            instance: {
              addEventListener: addEventListenerMock,
              url: new URL("http://localhost:8888"),
            },
            setContainer: jest.fn(),
          }}>
          {children}
        </MakeLiveContext.Provider>
      ),
    });

    expect(addEventListenerMock).toBeCalledTimes(1);
    expect(addEventListenerMock).toBeCalledWith(listener1);

    rerender({ listener: listener2 });

    expect(addEventListenerMock).toBeCalledTimes(2);
    expect(addEventListenerMock).toBeCalledWith(listener2);
    expect(unsubscribe1).toBeCalledTimes(1);
    expect(unsubscribe1).toBeCalledWith();
  });
});

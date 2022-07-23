import { Instance } from "@make-live/toolkit";
import MakeLiveContext from "./context";
import { renderHook } from "./test-utils";
import useInstance from "./use-instance";

describe("useInstance", () => {
  it("returns instance if it exists", () => {
    const { result } = renderHook(() => useInstance(), {
      wrapper: ({ children }) => (
        <MakeLiveContext.Provider
          value={{
            instance: "instance" as unknown as Instance,
            setContainer: jest.fn(),
          }}>
          {children}
        </MakeLiveContext.Provider>
      ),
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "current": "instance",
      }
    `);
  });

  it("returns undefined if instance does not exist", () => {
    const { result } = renderHook(() => useInstance(), {
      wrapper: ({ children }) => (
        <MakeLiveContext.Provider
          value={{
            setContainer: jest.fn(),
          }}>
          {children}
        </MakeLiveContext.Provider>
      ),
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "current": undefined,
      }
    `);
  });
});

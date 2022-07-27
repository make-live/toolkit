import { createInstance } from "@make-live/toolkit";
import { useContext, useEffect, useRef } from "react";
import MakeLiveContext from "./context";
import MakeLiveProvider from "./provider";
import { render, screen } from "./test-utils";

jest.mock("@make-live/toolkit");

const createInstanceMock = jest.mocked(createInstance);

describe("Provider", () => {
  it("renders children", async () => {
    render(
      <MakeLiveProvider url="http://localhost:8888">
        <div>Content</div>
      </MakeLiveProvider>,
    );

    expect(screen.queryByText("Content")).toBeInTheDocument();
  });

  it("creates a context", async () => {
    expect.assertions(1);
    const Child = () => {
      const context = useContext(MakeLiveContext);

      expect(context).toMatchInlineSnapshot(`
        Object {
          "instance": undefined,
          "setContainer": [Function],
        }
      `);

      return <div>Content</div>;
    };

    render(
      <MakeLiveProvider url="http://localhost:8888">
        <Child />
      </MakeLiveProvider>,
    );
  });

  it("creates an instance when `setContainer` is called", async () => {
    createInstanceMock.mockImplementation(() => ({
      addEventListener: jest.fn(),
      sendCommand: jest.fn(),
      url: new URL("http://localhost:8888"),
    }));

    expect.assertions(4);

    const Child = () => {
      const context = useContext(MakeLiveContext);
      const containerRef = useRef<HTMLDivElement>(null);
      const renderCount = useRef<number>(1);

      useEffect(() => {
        if (containerRef.current != null) {
          context.setContainer(containerRef.current);
        }

        renderCount.current += 1;
      }, []);

      if (renderCount.current === 1) {
        expect(context).toMatchInlineSnapshot(`
          Object {
            "instance": undefined,
            "setContainer": [Function],
          }
        `);
      }

      if (renderCount.current === 2) {
        expect(context).toMatchInlineSnapshot(`
          Object {
            "instance": Object {
              "addEventListener": [MockFunction],
              "sendCommand": [MockFunction],
              "url": "http://localhost:8888/",
            },
            "setContainer": [Function],
          }
        `);
      }

      return <div ref={containerRef}>Content</div>;
    };

    render(
      <MakeLiveProvider url="http://localhost:8888">
        <Child />
      </MakeLiveProvider>,
    );

    expect(createInstanceMock).toBeCalledTimes(1);
    expect(createInstanceMock).toBeCalledWith({
      container: expect.any(HTMLDivElement),
      url: "http://localhost:8888",
    });
  });
});

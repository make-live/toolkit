import MakeLiveContext from "./context";
import Viewport from "./viewport";
import { render } from "./test-utils";

describe("Viewport", () => {
  it("calls `setContainer`", async () => {
    const setContainerMock = jest.fn();

    render(
      <MakeLiveContext.Provider
        value={{
          setContainer: setContainerMock,
        }}>
        <Viewport />
      </MakeLiveContext.Provider>,
    );

    expect(setContainerMock).toBeCalledTimes(1);
    expect(setContainerMock).toBeCalledWith(expect.any(HTMLDivElement));
  });
});

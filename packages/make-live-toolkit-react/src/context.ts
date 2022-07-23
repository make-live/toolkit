import { Instance } from "@make-live/toolkit";
import { createContext, useContext } from "react";

export type MakeLiveContextType = {
  instance?: Instance;
  setContainer: (container: HTMLDivElement) => void;
};

const MakeLiveContext = createContext<MakeLiveContextType>({
  instance: undefined,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setContainer: () => {},
});

export const useMakeLiveContext = () => useContext(MakeLiveContext);

export default MakeLiveContext;

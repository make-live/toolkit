import { Instance } from "@make-live/toolkit";
import { createContext } from "react";

export type MakeLiveContextType = {
  instance?: Instance;
};

const MakeLiveContext = createContext<MakeLiveContextType>({
  instance: undefined,
});

export default MakeLiveContext;

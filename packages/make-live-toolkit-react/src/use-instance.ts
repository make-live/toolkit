import { Instance } from "@make-live/toolkit";
import { useContext } from "react";
import MakeLiveContext from "./context";

const useInstance = (): Instance | undefined => {
  const makeLiveContext = useContext(MakeLiveContext);

  return makeLiveContext.instance;
};

export default useInstance;

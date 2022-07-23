import { createInstance, Instance } from "@make-live/toolkit";
import { FC, ReactNode, useCallback, useRef, useState } from "react";
import MakeLiveContext, { MakeLiveContextType } from "./context";

type Props = {
  children: ReactNode;
  url: string;
};

const MakeLiveProvider: FC<Props> = ({ children, url }) => {
  const containerRef = useRef<HTMLDivElement>();
  const [instance, setInstance] = useState<Instance>();

  const setContainer = useCallback<MakeLiveContextType["setContainer"]>(
    (container) => {
      containerRef.current = container;

      setInstance(
        createInstance({
          container,
          url,
        }),
      );
    },
    [],
  );

  return (
    <MakeLiveContext.Provider value={{ instance, setContainer }}>
      {children}
    </MakeLiveContext.Provider>
  );
};

export default MakeLiveProvider;

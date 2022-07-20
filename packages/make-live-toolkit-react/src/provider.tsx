import { createInstance, Instance } from "@make-live/toolkit";
import {
  ComponentProps,
  FC,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import MakeLiveContext from "./context";

type Props = {
  children: (props: {
    Container: ReactElement<ComponentProps<"div">, "div">;
  }) => ReactNode;
  url: string;
};

const MakeLiveProvider: FC<Props> = ({ children, url }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<Instance>();

  useEffect(() => {
    if (containerRef.current != null) {
      setInstance(
        createInstance({
          container: containerRef.current,
          url,
        }),
      );
    }
  }, []);

  return (
    <MakeLiveContext.Provider value={{ instance }}>
      {children({
        Container: <div ref={containerRef}></div>,
      })}
    </MakeLiveContext.Provider>
  );
};

export default MakeLiveProvider;

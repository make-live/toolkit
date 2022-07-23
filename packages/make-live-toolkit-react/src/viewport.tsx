import { FC, useEffect, useRef } from "react";
import { useMakeLiveContext } from "./context";

type Props = {
  className?: string;
};

const Viewport: FC<Props> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const context = useMakeLiveContext();

  useEffect(() => {
    if (containerRef.current != null) {
      context.setContainer(containerRef.current);
    }
  }, []);

  return <div className={className} ref={containerRef} />;
};

export default Viewport;

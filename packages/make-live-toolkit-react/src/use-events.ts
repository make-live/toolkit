import { EventListener } from "@make-live/toolkit";
import { useEffect } from "react";
import useInstance from "./use-instance";

const useEvents = (eventListener: EventListener) => {
  const instance = useInstance();

  useEffect(() => {
    if (instance == null) {
      return;
    }

    const unsubscribe = instance.addEventListener(eventListener);

    return () => {
      unsubscribe();
    };
  }, [instance, eventListener]);
};

export default useEvents;

import { EventListener } from "@make-live/toolkit";
import { useEffect } from "react";
import useInstance from "./use-instance";

const useMessages = (messageListener: EventListener) => {
  const instance = useInstance();

  useEffect(() => {
    if (instance == null) {
      return;
    }

    const unsubscribe = instance.addEventListener(messageListener);

    return () => {
      unsubscribe();
    };
  }, [instance, messageListener]);

  if (instance == null) {
    return;
  }

  return "START";
};

export default useMessages;

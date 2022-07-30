import { z } from "zod";

export const connectEvent = z.object({
  type: z.literal("CONNECT"),
});

export const disconnectEvent = z.object({
  type: z.literal("DISCONNECT"),
});

export const responseEvent = z.object({
  data: z.string(),
  type: z.literal("RESPONSE"),
});

export type ConnectEvent = z.infer<typeof connectEvent>;
export type DisconnectEvent = z.infer<typeof disconnectEvent>;
export type ResponseEvent = z.infer<typeof responseEvent>;
export type Event = ConnectEvent | DisconnectEvent | ResponseEvent;
export type EventListener = (event: Event) => void;
export type Subscription = () => void;

export const isValidEvent = (data: unknown): data is Event => {
  const foundSchema = [connectEvent, disconnectEvent, responseEvent].find(
    (schema) => {
      const result = schema.safeParse(data);

      return result.success;
    },
  );

  return foundSchema != null;
};

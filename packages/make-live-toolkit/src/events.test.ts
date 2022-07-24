import { describe, expect, it } from "@jest/globals";
import {
  ConnectEvent,
  DisconnectEvent,
  isValidEvent,
  ResponseEvent,
} from "./events";

describe("isValidEvent", () => {
  it("returns `true` for `CONNECT` event", () => {
    const event: ConnectEvent = { type: "CONNECT" };

    const result = isValidEvent(event);

    expect(result).toBe(true);
  });

  it("returns `true` for `DISCONNECT` event", () => {
    const event: DisconnectEvent = { type: "DISCONNECT" };

    const result = isValidEvent(event);

    expect(result).toBe(true);
  });

  it("returns `true` for `RESPONSE` event", () => {
    const event: ResponseEvent = { data: "MyEvent", type: "RESPONSE" };

    const result = isValidEvent(event);

    expect(result).toBe(true);
  });

  it("returns `false` for `unknown` event", () => {
    const event = { type: "unknown" };

    const result = isValidEvent(event);

    expect(result).toBe(false);
  });
});

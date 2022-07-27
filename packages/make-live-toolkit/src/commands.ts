import { z } from "zod";

export const consoleCommand = z.object({
  data: z.string().min(1),
  type: z.literal("CONSOLE_COMMAND"),
});

export type ConsoleCommand = z.infer<typeof consoleCommand>;

export const interactionCommand = z.object({
  data: z.union([z.string().min(1), z.object({}).passthrough()]),
  type: z.literal("INTERACTION_COMMAND"),
});

export type InteractionCommand = z.infer<typeof interactionCommand>;

export type Command = ConsoleCommand | InteractionCommand;

export const isValidCommand = (data: unknown): data is Command => {
  const foundSchema = [consoleCommand, interactionCommand].find((schema) => {
    const result = schema.safeParse(data);

    return result.success;
  });

  return foundSchema != null;
};

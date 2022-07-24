import { z } from "zod";

export const consoleCommand = z.object({
  data: z.string(),
  type: z.literal("CONSOLE_COMMAND"),
});

export type ConsoleCommand = z.infer<typeof consoleCommand>;

export type Command = ConsoleCommand;

export const isValidCommand = (data: unknown): data is Command => {
  const foundSchema = [consoleCommand].find((schema) => {
    const result = schema.safeParse(data);

    return result.success;
  });

  return foundSchema != null;
};

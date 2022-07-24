import compression from "compression";
import express, { json, static as expressStatic } from "express";
import path from "path";

const root = require.resolve("@make-live/toolkit-dev/package.json");

export const createApp = (playerPort: number) => {
  const app = express();
  app.use(compression());
  app.use(expressStatic(path.join(root, "../dist/client")));
  app.use(json());

  app.get("/config", (req, res) => {
    res.json({
      playerURL: `ws://localhost:${playerPort}`,
    });
  });

  return app;
};

import compression from "compression";
import express, { json, static as expressStatic } from "express";
import path from "path";

const root = require.resolve("@make-live/toolkit-dev-server/package.json");

console.log(path.join(root, "../dist/client"));

export const createApp = () => {
  const app = express();
  app.use(compression());
  app.use(expressStatic(path.join(root, "../dist/client")));
  app.use(json());

  return app;
};

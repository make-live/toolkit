import { MakeLiveProvider } from "@make-live/toolkit-react";
import { createRoot } from "react-dom/client";
import App from "./app";

createRoot(document.getElementById("root")!).render(
  <MakeLiveProvider url="http://localhost:9000">
    <App />
  </MakeLiveProvider>,
);

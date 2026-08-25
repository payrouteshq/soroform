import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Soroform Vite example: could not find #root element.");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => {
        registration.update();
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      })
      .catch((error) => {
        console.warn("Service worker registration failed.", error);
      });
  });
}

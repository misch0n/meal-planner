import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { DBProvider } from "./store/DB";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DBProvider>
      <App />
    </DBProvider>
  </StrictMode>,
);

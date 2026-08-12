import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ViewerApp } from "./ViewerApp.tsx";

const params = new URLSearchParams(window.location.search);
const room = params.get("room");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {room ? <ViewerApp initialRoom={room} useStun={params.get("stun") === "1"} /> : <App />}
  </StrictMode>
);

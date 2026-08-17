import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ViewerApp } from "./ViewerApp.tsx";
import { I18nProvider } from "./i18n/I18nContext.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

const params = new URLSearchParams(window.location.search);
const room = params.get("room");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        {room ? <ViewerApp initialRoom={room} useStun={params.get("stun") === "1"} /> : <App />}
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>
);

// Tells the plain-JS diagnostic script in index.html that the bundle at
// least got this far — if it never sees this flag, it shows the reason why.
(window as unknown as { __petwatchMounted?: boolean }).__petwatchMounted = true;

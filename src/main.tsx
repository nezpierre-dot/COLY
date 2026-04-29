import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config"; // Initialize i18next before any component renders
import { initWebVitals } from "./lib/webVitals";

// --- PWA Service Worker safety guard ---
// In Lovable preview iframes (or any iframe / preview host), unregister any
// existing service workers and skip registration. This prevents stale shells
// from being served and avoids navigation interference inside the editor.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if ((isPreviewHost || isInIframe) && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
}

// --- Web Vitals monitoring (LCP/CLS/INP/FCP/TTFB) ---
initWebVitals();

createRoot(document.getElementById("root")!).render(<App />);

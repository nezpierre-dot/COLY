import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // CRITICAL: Disable SW in dev so it never runs in the Lovable preview iframe.
      devOptions: {
        enabled: false,
      },
      includeAssets: ["favicon.ico", "icons/*.png"],
      workbox: {
        // Never cache OAuth redirects nor internal helper routes
        navigateFallbackDenylist: [/^\/~oauth/, /^\/sw\.js/, /^\/service-worker\.js/],
        // Always revalidate the HTML shell — never lock devices on a stale build
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-shell",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Supabase API: NetworkFirst with a tiny offline fallback window
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Static images: stale-while-revalidate is safer than CacheFirst (auto-refreshes silently)
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Fonts
            urlPattern: /\.(woff2?|ttf|otf)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: {
        name: "Nidit",
        short_name: "Nidit",
        description: "Partagez vos trajets, économisez & protégez la planète 🌍",
        theme_color: "#0066FF",
        background_color: "#0A1F3D",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "fr",
        icons: [
          { src: "/icons/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          { src: "/icons/pwa-512x512.png", sizes: "512x512", type: "image/png", form_factor: "narrow", label: "Nidit Dashboard" },
        ],
        categories: ["travel", "shopping", "logistics"],
      },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes("node_modules")) {
            if (id.includes("react-router") || id.includes("/react/") || id.includes("/react-dom/")) return "vendor-react";
            if (id.includes("@tanstack")) return "vendor-query";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("mapbox-gl") || id.includes("react-map-gl")) return "vendor-map";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("date-fns")) return "vendor-dates";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("sonner")) return "vendor-toast";
            return "vendor";
          }
          // Feature-based chunks (loaded only when needed)
          if (id.includes("/features/admin/")) return "feature-admin";
          if (id.includes("/features/finance/")) return "feature-finance";
          if (id.includes("/features/needit/")) return "feature-needit";
          if (id.includes("/features/voyage/")) return "feature-voyage";
          if (id.includes("/features/shipment/")) return "feature-shipment";
          if (id.includes("/features/chat/")) return "feature-chat";
          if (id.includes("/features/tracking/")) return "feature-tracking";
          if (id.includes("/features/disputes/")) return "feature-disputes";
          if (id.includes("/features/support/")) return "feature-support";
          if (id.includes("/features/legal/")) return "feature-legal";
          if (id.includes("/features/auth/")) return "feature-auth";
          if (id.includes("/features/account/")) return "feature-account";
        },
      },
    },
    // Larger threshold to silence warnings for our intentional vendor splits
    chunkSizeWarningLimit: 800,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));

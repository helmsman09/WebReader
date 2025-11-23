import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  build: {
    outDir: "dist"
  },
  server: {
    // Allow the extension pages (chrome-extension://...) to access Vite dev server
    cors: {
      origin: [/chrome-extension:\/\//]
    }
  }
});

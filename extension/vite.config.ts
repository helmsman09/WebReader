import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        background: resolve(__dirname, "src/background.ts"),
        contentScript: resolve(__dirname, "src/contentScript.ts")
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background.js";
          if (chunk.name === "contentScript") return "contentScript.js";
          return "[name].js";
        }
      }
    }
  }
});

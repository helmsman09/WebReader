import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",  // 👈 listen on LAN
    port: 5173,       // optional, but explicit
  },
});

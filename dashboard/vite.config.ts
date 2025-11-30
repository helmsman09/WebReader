import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",  // 👈 listen on LAN
    port: 5173,       // optional, but explicit
    proxy: {
      // anything starting with /media will be proxied to 4000 (backend port)
      '/media': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // if backend route is also /media/*, no rewrite needed
        // rewrite: (path) => path,
      },
    },
  },
});

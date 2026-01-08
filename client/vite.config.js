import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": "http://localhost:3001",
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001"
    }
  },
  // Все роуты обрабатываются через index.html (SPA fallback)
  appType: "spa"
});

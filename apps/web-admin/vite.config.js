import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiBaseUrl = process.env.VITE_API_BASE_URL || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/media": {
        target: apiBaseUrl,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});

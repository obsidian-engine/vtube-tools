import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist/client",
  },
  server: {
    proxy: {
      // ローカル開発: vite(5173) → wrangler dev(8787)
      "/api": "http://localhost:8787",
    },
  },
});

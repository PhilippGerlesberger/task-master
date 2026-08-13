import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind to 0.0.0.0 so container and LAN can reach it
    port: 5173,
    strictPort: false
  },
  preview: {
    host: true,
    port: 5173
  },
  build: {
    outDir: "dist",
    sourcemap: true
  },
  resolve: {
    alias: {
      // optional: make local imports nicer in editor; pnpm workspace will still provide the package
      // "@shared-types": path.resolve(__dirname, "../../packages/shared-types/src")
    }
  }
});

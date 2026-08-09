import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
      "@ethio/ha-sdk": path.resolve(
        rootDir,
        "../../packages/ha-sdk/src/index.ts",
      ),
      "@ethio/plugin-sdk": path.resolve(
        rootDir,
        "../../packages/plugin-sdk/src/index.ts",
      ),
      "@ethio/core": path.resolve(rootDir, "../../packages/core/src/index.ts"),
      "@ethio/teamtracker": path.resolve(
        rootDir,
        "../../packages/teamtracker/src/index.ts",
      ),
      "@ethio/sinksar": path.resolve(
        rootDir,
        "../../packages/sinksar/src/index.ts",
      ),
    },
  },
  server: {
    // Bind IPv4 so cloudflared's http://127.0.0.1:5180 origin works
    // (macOS often listens on ::1 only when host is unset).
    host: "127.0.0.1",
    port: 5180,
    strictPort: false,
    // Allow Cloudflare Quick Tunnel / named tunnel hostnames
    allowedHosts: true,
  },
});

import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "react-native-mmkv": path.resolve(__dirname, "src/lib/mmkv.fake.ts"),
    },
  },
});

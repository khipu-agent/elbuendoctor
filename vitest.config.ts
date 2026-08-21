import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Base de datos aislada para tests: no toca data/demo-db.json del seed.
    env: {
      EBD_DATA_DIR: path.join(__dirname, ".test-data"),
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});

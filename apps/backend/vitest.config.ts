import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const thisDir = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(thisDir, ".env"), override: false });
loadDotenv({ path: resolve(thisDir, "../../.env"), override: false });

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    globalSetup: ["tests/globalSetup.ts"],
    fileParallelism: false,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["src/infrastructure/postgres/generated/**"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
});

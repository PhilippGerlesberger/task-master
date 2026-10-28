import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

const thisDir = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(thisDir, ".env") });
loadDotenv({ path: resolve(thisDir, "../../.env"), override: false });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});

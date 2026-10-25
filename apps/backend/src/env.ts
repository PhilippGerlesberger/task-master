import dotenv from "dotenv";
dotenv.config();

const persistence = process.env.PERSISTENCE ?? "json";
if (persistence !== "json" && persistence !== "postgres") {
  throw new Error('PERSISTENCE must be either "json" or "postgres".');
}

const databaseUrl = process.env.DATABASE_URL ?? "";
if (persistence === "postgres" && databaseUrl.length === 0) {
  throw new Error("DATABASE_URL is required when PERSISTENCE=postgres.");
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  PERSISTENCE: persistence,
  DATABASE_URL: databaseUrl,
  DATABASE_URL_TEST: process.env.DATABASE_URL_TEST ?? "",
  SPRINT_LENGTH_DAYS: Number(process.env.SPRINT_LENGTH_DAYS ?? 14)
};

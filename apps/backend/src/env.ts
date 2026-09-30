import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  SPRINT_LENGTH_DAYS: Number(process.env.SPRINT_LENGTH_DAYS ?? 14)
};

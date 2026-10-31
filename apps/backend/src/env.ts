import { z } from "zod";
import "./loadEnv.js";

const envSchema = z
    .object({
        NODE_ENV: z.string().default("development"),
        PORT: z.coerce.number().int().min(1).max(65535).default(4000),
        CORS_ORIGIN: z.string().default("http://localhost:5173"),
        PERSISTENCE: z.enum(["json", "postgres"]).default("json"),
        DATABASE_URL: z.string().default(""),
        DATABASE_URL_TEST: z.string().default(""),
        SPRINT_LENGTH_DAYS: z.coerce.number().int().positive().default(14)
    })
    .superRefine((value, context) => {
        if (value.PERSISTENCE === "postgres" && value.DATABASE_URL.trim().length === 0) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["DATABASE_URL"],
                message: "DATABASE_URL is required when PERSISTENCE=postgres."
            });
        }
    });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
    const parsed = envSchema.safeParse(source);
    if (parsed.success) {
        return parsed.data;
    }

    const invalidVariables = parsed.error.issues.map((issue) => {
        const key = issue.path[0] ?? "ENV";
        return `${String(key)}: ${issue.message}`;
    });

    throw new Error(`Invalid environment variables:\n- ${invalidVariables.join("\n- ")}`);
}

export const env = parseEnv(process.env);

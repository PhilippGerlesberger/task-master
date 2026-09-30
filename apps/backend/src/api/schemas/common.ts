import { z } from "zod";
import type { DateKey } from "../../domain/shared/types.js";

export const idParamSchema = z.object({
    id: z.string().min(1)
});

export const dateKeySchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format")
    .transform((value) => value as DateKey);
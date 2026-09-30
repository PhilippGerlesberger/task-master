import { z } from "zod";
import { idParamSchema } from "./common.js";

export const createListSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    parentId: z.string().min(1).optional()
});

export const moveListSchema = z.object({
    parentListId: z.string().min(1).optional()
});

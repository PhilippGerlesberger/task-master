import { z } from "zod";
import { ItemStatus, Priority, RepetitionKind } from "../../domain/shared/types.js";
import { dateKeySchema, idParamSchema } from "./common.js";

const scheduleSchema = z.object({
    startDate: dateKeySchema.optional(),
    endDate: dateKeySchema.optional(),
    defaultEndTime: z.string().optional()
});

export const createTaskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    listIds: z.array(z.string().min(1)).min(1),
    priority: z.nativeEnum(Priority).optional(),
    estimate: z.number().min(0).optional(),
    repetition: z
        .object({
            kind: z.nativeEnum(RepetitionKind),
            interval: z.number().int().min(1).optional(),
            monthlyAnchor: z.enum(["SAME_DAY", "END_OF_MONTH"]).optional(),
            count: z.number().int().min(1).optional(),
            endDate: dateKeySchema.optional()
        })
        .optional(),
    schedule: scheduleSchema.optional()
});

export const updateTaskStatusSchema = z.object({
    status: z.nativeEnum(ItemStatus)
});

export const taskListParamSchema = z.object({
    id: z.string().min(1),
    listId: z.string().min(1)
});
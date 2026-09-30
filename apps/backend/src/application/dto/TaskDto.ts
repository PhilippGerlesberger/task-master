import type { TaskItem } from "../../domain/backlogItem/TaskItem.js";

export interface TaskDto {
    id: string;
    title: string;
    description?: string;
    status: string;
    listIds: string[];
    priority?: number;
    estimate?: number;
}

export function toTaskDto(task: TaskItem): TaskDto {
    return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        listIds: [...task.listIds],
        priority: task.priority,
        estimate: task.estimate
    };
}
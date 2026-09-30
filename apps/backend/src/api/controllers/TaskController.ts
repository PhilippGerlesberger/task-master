import type { FastifyReply, FastifyRequest } from "fastify";
import type { BacklogService } from "../../application/services/BacklogService.js";
import type { CreateTaskItemInput } from "../../domain/backlogItem/BacklogItem.types.js";
import type { ItemId } from "../../domain/shared/types.js";
import { toTaskDto } from "../../application/dto/TaskDto.js";
import {
    createTaskSchema,
    taskListParamSchema,
    updateTaskStatusSchema
} from "../schemas/taskSchemas.js";
import { idParamSchema } from "../schemas/common.js";

export class TaskController {
    constructor(private readonly backlogService: BacklogService) {}

    async getAll(): Promise<unknown> {
        const backlog = await this.backlogService.loadBacklog();
        return backlog.getAllTasks().map(toTaskDto);
    }

    async create(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<unknown> {
        const body = createTaskSchema.parse(request.body);
        const input: CreateTaskItemInput = {
            ...body,
            listIds: body.listIds.map((listId) => listId as ItemId)
        };

        const backlog = await this.backlogService.loadBacklog();
        const task = backlog.addTask(input);
        await this.backlogService.saveBacklog(backlog);

        return reply.code(201).send(toTaskDto(task));
    }

    async updateStatus(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<unknown> {
        const params = idParamSchema.parse(request.params);
        const body = updateTaskStatusSchema.parse(request.body);

        const backlog = await this.backlogService.loadBacklog();
        backlog.updateTaskStatus(params.id as ItemId, body.status);
        await this.backlogService.saveBacklog(backlog);

        return reply.code(204).send();
    }

    async assignToList(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
        const params = taskListParamSchema.parse(request.params);

        const backlog = await this.backlogService.loadBacklog();
        backlog.assignTaskToList(params.id as ItemId, params.listId as ItemId);
        await this.backlogService.saveBacklog(backlog);

        return reply.code(204).send();
    }

    async removeFromList(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
        const params = taskListParamSchema.parse(request.params);

        const backlog = await this.backlogService.loadBacklog();
        backlog.removeTaskFromList(params.id as ItemId, params.listId as ItemId);
        await this.backlogService.saveBacklog(backlog);

        return reply.code(204).send();
    }

    async remove(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
        const params = idParamSchema.parse(request.params);

        const backlog = await this.backlogService.loadBacklog();
        backlog.removeItem(params.id as ItemId);
        await this.backlogService.saveBacklog(backlog);

        return reply.code(204).send();
    }
}

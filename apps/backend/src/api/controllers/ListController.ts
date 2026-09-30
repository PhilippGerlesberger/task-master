import type { FastifyReply, FastifyRequest } from "fastify";
import type { BacklogService } from "../../application/services/BacklogService.js";
import type { CreateListItemInput } from "../../domain/backlogItem/BacklogItem.types.js";
import { toListDto } from "../../application/dto/ListDto.js";
import type { ItemId } from "../../domain/shared/types.js";
import { createListSchema, moveListSchema } from "../schemas/listSchemas.js";
import { idParamSchema } from "../schemas/common.js";

export class ListController {
    constructor(private readonly backlogService: BacklogService) {}

    async getAll(): Promise<unknown> {
        const backlog = await this.backlogService.loadBacklog();
        return backlog.getAllLists().map(toListDto);
    }

    async create(
        request: FastifyRequest,
        reply: FastifyReply
    ): Promise<unknown> {
        const body = createListSchema.parse(request.body);
        const input: CreateListItemInput = {
            title: body.title,
            description: body.description,
            parentId: body.parentId as ItemId | undefined
        };

        const backlog = await this.backlogService.loadBacklog();
        const list = backlog.addList(input);
        await this.backlogService.saveBacklog(backlog);

        return reply.code(201).send(toListDto(list));
    }

    async move(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
        const params = idParamSchema.parse(request.params);
        const body = moveListSchema.parse(request.body);

        const backlog = await this.backlogService.loadBacklog();
        backlog.moveList(params.id as ItemId, body.parentListId as ItemId | undefined);
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

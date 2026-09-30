import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { IBacklogRepository } from "../application/ports/IBacklogRepository.js";
import { env } from "../env.js";
import { registerErrorHandler } from "./middlewares/errorHandler.js";
import { registerRoutes } from "./routes.js";

export interface CreateAppDependencies {
    backlogRepository: IBacklogRepository;
}

export function createApp(dependencies: CreateAppDependencies): FastifyInstance {
    const app = Fastify({ logger: false });
    app.register(cors, {
        origin: env.CORS_ORIGIN,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
    });

    registerRoutes(app, dependencies.backlogRepository);
    registerErrorHandler(app);

    return app;
}

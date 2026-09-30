import type { FastifyInstance } from "fastify";
import { DomainError } from "../../domain/shared/errors.js";
import { ZodError } from "zod";

export function registerErrorHandler(app: FastifyInstance): void {
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof ZodError) {
            return reply.code(400).send({ message: "Validation failed", issues: error.issues });
        }

        if (error instanceof DomainError) {
            return reply.code(400).send({ message: error.message });
        }

        app.log.error(error);
        return reply.code(500).send({ message: "Internal Server Error" });
    });
}
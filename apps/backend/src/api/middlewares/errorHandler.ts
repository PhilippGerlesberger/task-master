import type { FastifyInstance } from "fastify";
import { DomainError } from "../../domain/shared/errors.js";
import { InfrastructureError } from "../../application/errors.js";
import { ZodError } from "zod";

export function registerErrorHandler(app: FastifyInstance): void {
    app.setErrorHandler((error, request, reply) => {
        if (error instanceof ZodError) {
            return reply.code(400).send({ message: "Validation failed", issues: error.issues });
        }

        if (error instanceof DomainError) {
            return reply.code(400).send({ message: error.message });
        }

        if (error instanceof InfrastructureError) {
            request.log.error({ err: error, cause: error.cause }, "Infrastructure error");
            return reply.code(500).send({ message: "Internal Server Error" });
        }

        request.log.error({ err: error }, "Unhandled application error");
        return reply.code(500).send({ message: "Internal Server Error" });
    });
}
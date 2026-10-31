import { env } from "../env.js";
import { createPrismaClient } from "../infrastructure/postgres/createPrismaClient.js";
import { ensureInboxList } from "../infrastructure/postgres/ensureInboxList.js";
import { PostgresBacklogRepository } from "../infrastructure/repositories/PostgresBacklogRepository.js";
import { JsonBacklogRepository } from "../infrastructure/repositories/JsonBacklogRepository.js";
import { createApp } from "./app.js";

const prisma = env.PERSISTENCE === "postgres" ? createPrismaClient(env.DATABASE_URL) : undefined;
const backlogRepository = prisma ? new PostgresBacklogRepository(prisma) : new JsonBacklogRepository();

const app = createApp({ backlogRepository, logger: true });

if (prisma) {
    app.addHook("onClose", async () => {
        await prisma.$disconnect();
    });
}

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, "Shutting down server");
    try {
        await app.close();
        process.exit(0);
    } catch (error) {
        app.log.error({ err: error }, "Failed to shut down server");
        process.exit(1);
    }
};

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

try {
    if (prisma) {
        // Keep startup hardening in place; the authoritative invariant is Backlog.ensureInboxList.
        await ensureInboxList(prisma);
    }

    await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (error) {
    app.log.error({ err: error }, "Server startup failed");
    console.error("Server startup failed.", error);
    if (prisma) {
        await prisma.$disconnect();
    }
    process.exit(1);
}

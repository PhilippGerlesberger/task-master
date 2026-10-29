import { PrismaClient } from "@prisma/client";
import { env } from "../env.js";
import { ensureInboxList } from "../infrastructure/postgres/ensureInboxList.js";
import { PostgresBacklogRepository } from "../infrastructure/repositories/PostgresBacklogRepository.js";
import { JsonBacklogRepository } from "../infrastructure/repositories/JsonBacklogRepository.js";
import { createApp } from "./app.js";

const prisma = env.PERSISTENCE === "postgres" ? new PrismaClient() : undefined;
const backlogRepository =
    env.PERSISTENCE === "postgres" && prisma
        ? new PostgresBacklogRepository(prisma)
        : new JsonBacklogRepository();

const app = createApp({ backlogRepository });

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
        app.log.error(error);
        process.exit(1);
    }
};

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

try {
    if (prisma) {
        await ensureInboxList(prisma);
    }

    await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (error) {
    app.log.error(error);
    if (prisma) {
        await prisma.$disconnect();
    }
    process.exit(1);
}

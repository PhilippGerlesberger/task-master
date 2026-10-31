import type { PrismaClient } from "./generated/client.js";
import { INBOX_LIST_ID } from "../../domain/shared/constants.js";

export async function ensureInboxList(prisma: Pick<PrismaClient, "list">): Promise<void> {
    const now = new Date();

    await prisma.list.upsert({
        where: { id: INBOX_LIST_ID },
        update: {},
        create: {
            id: INBOX_LIST_ID,
            title: "Inbox",
            archived: false,
            createdAt: now,
            updatedAt: now
        }
    });
}

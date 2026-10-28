import { INBOX_LIST_ID } from "../../domain/shared/constants.js";

type ListUpsertClient = {
    list: {
        upsert(args: {
            where: { id: string };
            update: Record<string, unknown>;
            create: {
                id: string;
                title: string;
                archived: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        }): Promise<unknown>;
    };
};

export async function ensureInboxList(prisma: ListUpsertClient): Promise<void> {
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

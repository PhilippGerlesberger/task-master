import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "../src/loadEnv.js";
import { INBOX_LIST_ID } from "../src/domain/shared/constants.js";
import { ensureInboxList } from "../src/infrastructure/postgres/ensureInboxList.js";
import { createPrismaClient } from "../src/infrastructure/postgres/createPrismaClient.js";
import { JsonBacklogRepository } from "../src/infrastructure/repositories/JsonBacklogRepository.js";
import { PostgresBacklogRepository } from "../src/infrastructure/repositories/PostgresBacklogRepository.js";

type ImportOptions = {
    databaseUrl: string;
    jsonFilePath: string;
    force: boolean;
};

export function isImportTargetEmpty(listIds: readonly string[], taskCount: number): boolean {
    return taskCount === 0 && listIds.every((id) => id === INBOX_LIST_ID);
}

export async function importJsonToPostgres(options: ImportOptions): Promise<{ importedLists: number; importedTasks: number }> {
    const prisma = createPrismaClient(options.databaseUrl);

    try {
        const [taskCount, listRows] = await prisma.$transaction([
            prisma.task.count(),
            prisma.list.findMany({ select: { id: true } })
        ]);

        if (!options.force && !isImportTargetEmpty(listRows.map((row) => row.id), taskCount)) {
            throw new Error("Refusing import: target database is not empty (only a sole inbox row is allowed). Use --force to override.");
        }

        const sourceRepository = new JsonBacklogRepository(options.jsonFilePath);
        const targetRepository = new PostgresBacklogRepository(prisma);
        const items = await sourceRepository.loadBacklogItems();
        await targetRepository.saveBacklogItems(items);
        await ensureInboxList(prisma);

        const importedLists = items.filter((item) => item.kind === "list").length;
        const importedTasks = items.filter((item) => item.kind === "task").length;
        return { importedLists, importedTasks };
    } finally {
        await prisma.$disconnect();
    }
}

function parseArguments(argv: readonly string[]): { force: boolean; jsonFilePath: string } {
    const force = argv.includes("--force");
    const fileArgIndex = argv.findIndex((argument) => argument === "--file");

    if (fileArgIndex >= 0 && !argv[fileArgIndex + 1]) {
        throw new Error("Missing value for --file.");
    }

    const jsonFilePath = fileArgIndex >= 0 ? resolve(argv[fileArgIndex + 1]) : resolve(process.cwd(), "data", "backlog.json");
    return { force, jsonFilePath };
}

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is required for db:import-json.");
    }

    const { force, jsonFilePath } = parseArguments(process.argv.slice(2));
    const result = await importJsonToPostgres({
        databaseUrl,
        jsonFilePath,
        force
    });

    console.log(`Imported ${result.importedLists} lists and ${result.importedTasks} tasks from ${jsonFilePath}.`);
}

const isDirectRun = process.argv[1] ? resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url)) : false;
if (isDirectRun) {
    main().catch((error: unknown) => {
        console.error(error);
        process.exit(1);
    });
}

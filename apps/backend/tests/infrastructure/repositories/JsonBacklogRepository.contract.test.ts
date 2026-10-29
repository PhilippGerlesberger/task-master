import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { JsonBacklogRepository } from "../../../src/infrastructure/repositories/JsonBacklogRepository.js";
import { runBacklogRepositoryContract } from "./backlogRepository.contract.js";

runBacklogRepositoryContract("JsonBacklogRepository", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "task-master-json-contract-"));
    const filePath = join(tempDir, "backlog.json");

    return {
        repository: new JsonBacklogRepository(filePath),
        cleanup: async () => {
            await rm(tempDir, { recursive: true, force: true });
        }
    };
});

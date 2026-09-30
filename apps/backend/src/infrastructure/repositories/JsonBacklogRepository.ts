import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DomainError } from "../../domain/shared/errors.js";
import type { BacklogItem } from "../../domain/backlogItem/BacklogItem.types.js";
import { emptyBacklogDocument, toDomain, toPersistence, type JsonBacklogDocument } from "./mappers/backlog.mapper.js";

export class JsonBacklogRepository {
	constructor(private readonly filePath = resolve(process.cwd(), "data", "backlog.json")) {}

	async loadBacklogItems(): Promise<BacklogItem[]> {
		const document = await this.readDocument();
		return toDomain(document);
	}

	async saveBacklogItems(items: BacklogItem[]): Promise<void> {
		const document = toPersistence(items);

		await mkdir(dirname(this.filePath), { recursive: true });
		await writeFile(this.filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
	}

	private async readDocument(): Promise<JsonBacklogDocument> {
		try {
			const rawContent = await readFile(this.filePath, "utf8");
			if (rawContent.trim().length === 0) {
				return emptyBacklogDocument();
			}

			const parsed = JSON.parse(rawContent) as JsonBacklogDocument;

			if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
				throw new DomainError("Unsupported backlog document format.");
			}

			return parsed;
		} catch (error) {
			if (this.isFileMissingError(error)) {
				return emptyBacklogDocument();
			}

			if (error instanceof DomainError) {
				throw error;
			}

			throw new DomainError("Failed to read backlog document.");
		}
	}

	private isFileMissingError(error: unknown): boolean {
		return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
	}
}

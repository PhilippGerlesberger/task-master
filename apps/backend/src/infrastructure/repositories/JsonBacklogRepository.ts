import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DomainError } from "../../domain/shared/errors.js";
import { InfrastructureError } from "../../application/errors.js";
import type { BacklogItem } from "../../domain/backlogItem/BacklogItem.types.js";
import { emptyBacklogDocument, toDomain, toPersistence, type JsonBacklogDocument } from "./mappers/backlog.mapper.js";

export class JsonBacklogRepository {
	constructor(private readonly filePath = resolve(process.cwd(), "data", "backlog.json")) {}

	async loadBacklogItems(): Promise<BacklogItem[]> {
		try {
			const document = await this.readDocument();
			return toDomain(document);
		} catch (error) {
			if (error instanceof InfrastructureError) {
				throw error;
			}

			if (error instanceof DomainError) {
				throw new InfrastructureError("Backlog document contains invalid data.", { cause: error });
			}

			throw new InfrastructureError("Failed to load backlog document.", { cause: error });
		}
	}

	async saveBacklogItems(items: BacklogItem[]): Promise<void> {
		try {
			const document = toPersistence(items);
			await mkdir(dirname(this.filePath), { recursive: true });
			await writeFile(this.filePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
		} catch (error) {
			throw new InfrastructureError("Failed to write backlog document.", { cause: error });
		}
	}

	private async readDocument(): Promise<JsonBacklogDocument> {
		try {
			const rawContent = await readFile(this.filePath, "utf8");
			if (rawContent.trim().length === 0) {
				return emptyBacklogDocument();
			}

			let parsed: JsonBacklogDocument;
			try {
				parsed = JSON.parse(rawContent) as JsonBacklogDocument;
			} catch (error) {
				throw new InfrastructureError("Backlog document is not valid JSON.", { cause: error });
			}

			if (parsed.version !== 1 || !Array.isArray(parsed.items)) {
				throw new InfrastructureError("Unsupported backlog document format.");
			}

			return parsed;
		} catch (error) {
			if (this.isFileMissingError(error)) {
				return emptyBacklogDocument();
			}

			if (error instanceof InfrastructureError) {
				throw error;
			}

			throw new InfrastructureError("Failed to read backlog document.", { cause: error });
		}
	}

	private isFileMissingError(error: unknown): boolean {
		return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
	}
}

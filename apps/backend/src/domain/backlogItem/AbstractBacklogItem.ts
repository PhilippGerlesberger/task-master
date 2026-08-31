import type { ItemId } from "../shared/types.js";
import { DomainError } from "../shared/errors.js";

export abstract class AbstractBacklogItem {
    readonly id: ItemId;
    readonly createdAt: Date;
    abstract readonly kind: "task" | "list";

    private _title: string;
    private _archived: boolean;
    private _updatedAt: Date;

    protected constructor(props: {
        id: ItemId; title: string; createdAt: Date
    }) {
        this.id = props.id;
        this.createdAt = props.createdAt;
        this._title = props.title.trim();
        this._archived = false;
        this._updatedAt = props.createdAt;
    }

    get title(): string { return this._title; }
    get archived(): boolean { return this._archived; }
    get updatedAt(): Date { return this._updatedAt; }

    rename(newTitle: string): void {
        const trimmedTitle = newTitle.trim();
        if (!trimmedTitle) {
            throw new DomainError("Title must not be empty.");
        }
        this._title = trimmedTitle;
        this.touch();
    }

    archive(): void {
        if (this._archived) return;
        this._archived = true;
        this.touch();
    }

    unarchive(): void {
        if (!this._archived) return;
        this._archived = false;
        this.touch();
    }

    protected touch(): void {
        this._updatedAt = new Date();
    }
}
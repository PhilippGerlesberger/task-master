import { AbstractBacklogItem } from "./AbstractBacklogItem.js";
import { ItemStatus, Priority, RepetitionKind } from "../shared/types.js";
import { validateTaskCreation } from "./BacklogItem.validate.js";
import { generateItemId } from "../shared/utils.js";
import type { ItemId } from "../shared/types.js";
import { RepetitionPattern } from "../shared/valueObjects.js";
import { Schedule } from "../shared/valueObjects.js";
import type { CreateTaskItemInput } from "./BacklogItem.types.js";
import { DomainError } from "../shared/errors.js";


export class TaskItem extends AbstractBacklogItem {
    readonly kind = "task" as const;

    private _description?: string | undefined;
    private _listIds: ItemId[];

    private _priority: Priority | undefined;
    private _estimate: number | undefined;
    
    private _repetition: RepetitionPattern;
    private _schedule?: Schedule;

    private _status: ItemStatus;
    private _persistentCompleted: boolean;

    private constructor(props: {
        id: ItemId; title: string; createdAt: Date;
        description?: string | undefined; listIds: ItemId[];
        priority?: Priority; estimate?: number;
        repetition: RepetitionPattern; schedule?: Schedule;
    }) {
        super(props);
        this._description = props.description;
        this._listIds = [...props.listIds];

        this._priority = props.priority ?? undefined;
        this._estimate = props.estimate ?? undefined;

        this._repetition = props.repetition;
        this._schedule = props.schedule;

        this._status = ItemStatus.TODO;
        this._persistentCompleted = false;
    }

    static create(input: CreateTaskItemInput): TaskItem {
        validateTaskCreation(input);
        return new TaskItem({
            id: generateItemId(),
            title: input.title,
            createdAt: new Date(),

            description: input.description,
            listIds: input.listIds,

            priority: input.priority,
            estimate: input.estimate,

            repetition: input.repetition
              ? RepetitionPattern.create(input.repetition)
              : RepetitionPattern.create({ kind: RepetitionKind.NONE }),
            schedule: input.schedule ? Schedule.create(input.schedule) : undefined
        });
    }

    get description(): string | undefined { return this._description; }
    get persistentCompleted(): boolean { return this._persistentCompleted; }
    get status(): ItemStatus { return this._status; }
    get priority(): Priority | undefined { return this._priority; }
    get listIds(): readonly ItemId[] { return this._listIds; }

    addToList(listId: ItemId): void {
        if (!this._listIds.includes(listId)) this._listIds.push(listId);
        this.touch();
    }

    removeFromList(listId: ItemId): void {
        if (this._listIds.length === 1 && this._listIds[0] === listId) {
            throw new DomainError("A task must belong to at least one list. Move it to another list first.");
        }
        this._listIds = this._listIds.filter(id => id !== listId);
        this.touch();
    }

    get estimate(): number | undefined { return this._estimate; }
    get repetition(): RepetitionPattern { return this._repetition; }
    get schedule(): Schedule | undefined { return this._schedule; }

    markDone(): void {
        this._status = ItemStatus.DONE;
        this.touch();
    }

    markInProgress(): void {
        this._status = ItemStatus.IN_PROGRESS;
        this.touch();
    }

    markTodo(): void {
        this._status = ItemStatus.TODO;
        this.touch();
    }
}
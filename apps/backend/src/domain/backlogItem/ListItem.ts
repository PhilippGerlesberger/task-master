import { AbstractBacklogItem } from "./AbstractBacklogItem.js";
import { validateListCreation } from "./BacklogItem.validate.js";
import { generateItemId } from "../shared/utils.js";
import type { ItemId } from "../shared/types.js";
import type { CreateListItemInput } from "./BacklogItem.types.js";
import { DomainError } from "../shared/errors.js";


export class ListItem extends AbstractBacklogItem {
    readonly kind = "list" as const;
    private _parentListId?: ItemId;
    private _childListIds: ItemId[] = [];

    private constructor(props: {
        id: ItemId;
        title: string;
        createdAt: Date;
        description?: string;
        parentId?: ItemId
    }) {
        super(props);
        this._childListIds = [];
        this._parentListId = props.parentId;
    }

    static create(input: CreateListItemInput): ListItem {
        validateListCreation(input);
        return new ListItem({
            id: generateItemId(),
            title: input.title,
            createdAt: new Date(),
            description: input.description,
            parentId: input.parentId
        });
    }

    get parentListId(): ItemId | undefined { return this._parentListId; }
    get childListIds(): readonly ItemId[] { return this._childListIds; }

    moveTo(parentListId?: ItemId): void {
        if (parentListId === this.id) {
            throw new DomainError("A list cannot be its own parent.");
        }
        if (this._childListIds.includes(parentListId!)) {
            throw new DomainError("A list cannot be moved to one of its child lists.");
        }

        if (this._parentListId === parentListId) return;
        
        this._parentListId = parentListId;
        this.touch();
    }

    addChildList(childListId: ItemId): void {
        if (childListId === this.id) {
            throw new DomainError("A list cannot contain itself.");
        }
        if (this._childListIds.includes(childListId)) return;

        this._childListIds.push(childListId);
        this.touch();
    }

    removeChildList(childListId: ItemId): void {
        if (!this._childListIds.includes(childListId)) return;

        this._childListIds = this._childListIds.filter(id => id !== childListId);
        this.touch();
    }
    
}
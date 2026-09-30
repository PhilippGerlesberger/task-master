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
        updatedAt?: Date;
        archived?: boolean;
        parentListId?: ItemId;
        childListIds?: ItemId[];
    }) {
        super(props);
        this._childListIds = [...(props.childListIds ?? [])];
        this._parentListId = props.parentListId;
    }

    static create(input: CreateListItemInput): ListItem {
        validateListCreation(input);
        return new ListItem({
            id: generateItemId(),
            title: input.title,
            createdAt: new Date(),
            updatedAt: new Date(),
            archived: false,
            parentListId: input.parentId,
            childListIds: []
        });
    }

    static reconstitute(props: {
        id: ItemId;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        archived: boolean;
        parentListId?: ItemId;
        childListIds?: ItemId[];
    }): ListItem {
        return new ListItem({
            id: props.id,
            title: props.title,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt,
            archived: props.archived,
            parentListId: props.parentListId,
            childListIds: props.childListIds ?? []
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
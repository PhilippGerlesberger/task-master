import { DomainError } from "../shared/errors.js";
import { ItemStatus, type ItemId } from "../shared/types.js";
import type { BacklogItem, CreateListItemInput, CreateTaskItemInput } from "../backlogItem/BacklogItem.types.js";
import { ListItem } from "../backlogItem/ListItem.js";
import { TaskItem } from "../backlogItem/TaskItem.js";

export class Backlog {
    private readonly items: Map<ItemId, BacklogItem> = new Map();

    constructor(backlogItems: BacklogItem[] = []) {
        for (const item of backlogItems) {
            this.addItemInternal(item, true);
        }
    }

    static fromItems(items: BacklogItem[]): Backlog {
        return new Backlog(items);
    }

    addItem(item: BacklogItem): void {
        this.addItemInternal(item, true);
    }

    removeItem(itemId: ItemId): void {
        const item = this.items.get(itemId);
        if (!item) {
            return;
        }

        if (item.kind === "list") {
            const attachedTasks = this.getAllTasks().filter((task) => task.listIds.includes(itemId));
            if (attachedTasks.length > 0) {
                throw new DomainError("Cannot remove a list that still has tasks assigned to it.");
            }

            if (item.childListIds.length > 0) {
                throw new DomainError("Cannot remove a list that still has child lists.");
            }

            const parentId = item.parentListId;
            if (parentId) {
                const parent = this.getList(parentId);
                if (parent) {
                    parent.removeChildList(itemId);
                }
            }
        }

        this.items.delete(itemId);
    }

    getItem(itemId: ItemId): BacklogItem | undefined {
        return this.items.get(itemId);
    }

    getAllItems(): BacklogItem[] {
        return [...this.items.values()];
    }

    getAllLists(): ListItem[] {
        return this.getAllItems().filter((item): item is ListItem => item.kind === "list");
    }

    getAllTasks(): TaskItem[] {
        return this.getAllItems().filter((item): item is TaskItem => item.kind === "task");
    }

    getRootLists(): ListItem[] {
        return this.getAllLists().filter((list) => list.parentListId === undefined);
    }

    getChildren(listId: ItemId): ListItem[] {
        const list = this.getList(listId);
        if (!list) {
            return [];
        }

        return list.childListIds
            .map((childId) => this.getList(childId))
            .filter((child): child is ListItem => child !== undefined);
    }

    getTasksInList(listId: ItemId): TaskItem[] {
        return this.getAllTasks().filter((task) => task.listIds.includes(listId));
    }

    assignTaskToList(taskId: ItemId, listId: ItemId): void {
        const task = this.getTask(taskId);
        const list = this.getList(listId);

        if (!task) {
            throw new DomainError("Task does not exist.");
        }
        if (!list) {
            throw new DomainError("List does not exist.");
        }

        task.addToList(listId);
    }

    removeTaskFromList(taskId: ItemId, listId: ItemId): void {
        const task = this.getTask(taskId);
        const list = this.getList(listId);

        if (!task) {
            throw new DomainError("Task does not exist.");
        }
        if (!list) {
            throw new DomainError("List does not exist.");
        }

        if (task.listIds.length === 1 && task.listIds[0] === listId) {
            throw new DomainError("A task must belong to at least one list.");
        }

        task.removeFromList(listId);
    }

    moveList(listId: ItemId, newParentId?: ItemId): void {
        const list = this.getList(listId);
        if (!list) {
            throw new DomainError("List does not exist.");
        }

        if (newParentId !== undefined && newParentId === listId) {
            throw new DomainError("A list cannot be its own parent.");
        }

        if (newParentId !== undefined) {
            const newParent = this.getList(newParentId);
            if (!newParent) {
                throw new DomainError("Parent list does not exist.");
            }

            if (this.isAncestor(listId, newParentId)) {
                throw new DomainError("A list cannot be moved into one of its descendants.");
            }

            this.addChildList(newParentId, listId);
            return;
        }

        if (list.parentListId !== undefined) {
            const currentParent = this.getList(list.parentListId);
            currentParent?.removeChildList(listId);
            list.moveTo(undefined);
        }
    }

    addChildList(parentId: ItemId, childId: ItemId): void {
        const parent = this.getList(parentId);
        const child = this.getList(childId);

        if (!parent) {
            throw new DomainError("Parent list does not exist.");
        }
        if (!child) {
            throw new DomainError("Child list does not exist.");
        }

        if (parentId === childId) {
            throw new DomainError("A list cannot contain itself.");
        }

        if (this.isAncestor(childId, parentId)) {
            throw new DomainError("Creating this relationship would create a cycle.");
        }

        if (child.parentListId !== undefined && child.parentListId !== parentId) {
            const previousParent = this.getList(child.parentListId);
            previousParent?.removeChildList(childId);
        }

        parent.addChildList(childId);
        child.moveTo(parentId);
    }

    removeChildList(parentId: ItemId, childId: ItemId): void {
        const parent = this.getList(parentId);
        const child = this.getList(childId);

        if (!parent) {
            throw new DomainError("Parent list does not exist.");
        }
        if (!child) {
            throw new DomainError("Child list does not exist.");
        }

        parent.removeChildList(childId);
        child.moveTo(undefined);
    }

    addTask(input: CreateTaskItemInput): TaskItem {
        const task = TaskItem.create(input);
        this.addItemInternal(task, true);
        return task;
    }

    addList(input: CreateListItemInput): ListItem {
        const list = ListItem.create(input);
        this.addItemInternal(list, true);
        return list;
    }

    updateTaskStatus(taskId: ItemId, status: ItemStatus): void {
        const task = this.getTask(taskId);
        if (!task) {
            throw new DomainError("Task does not exist.");
        }

        if (status === ItemStatus.DONE) {
            task.markDone();
        } else if (status === ItemStatus.IN_PROGRESS) {
            task.markInProgress();
        } else {
            task.markTodo();
        }
    }

    toPersistenceModel(): BacklogItem[] {
        return this.getAllItems();
    }

    private addItemInternal(item: BacklogItem, validateReferenceGraph: boolean): void {
        if (this.items.has(item.id)) {
            throw new DomainError("An item with this id already exists.");
        }

        if (validateReferenceGraph) {
            this.validateItemReference(item);
        }

        this.items.set(item.id, item);

        if (item.kind === "list" && item.parentListId !== undefined) {
            const parent = this.getList(item.parentListId);
            if (!parent) {
                throw new DomainError("List references a non-existing parent list.");
            }

            this.addChildList(parent.id, item.id);
        }
    }

    private validateItemReference(item: BacklogItem): void {
        if (item.kind === "task") {
            for (const listId of item.listIds) {
                const referenced = this.items.get(listId);
                if (!referenced || referenced.kind !== "list") {
                    throw new DomainError("Task references a non-existing or invalid list.");
                }
            }

            if (item.listIds.length === 0) {
                throw new DomainError("A task must belong to at least one list.");
            }
            return;
        }

        if (item.parentListId !== undefined) {
            const parent = this.items.get(item.parentListId);
            if (!parent || parent.kind !== "list") {
                throw new DomainError("List references a non-existing or invalid parent list.");
            }
        }

        for (const childId of item.childListIds) {
            const child = this.items.get(childId);
            if (!child || child.kind !== "list") {
                throw new DomainError("List references a non-existing or invalid child list.");
            }
        }

        if (item.parentListId === item.id) {
            throw new DomainError("A list cannot be its own parent.");
        }

        if (item.parentListId !== undefined && this.getList(item.parentListId) !== undefined) {
            const parent = this.getList(item.parentListId)!;
            if (this.isAncestor(item.id, parent.id)) {
                throw new DomainError("A list cannot contain itself in its own ancestry.");
            }
        }
    }

    private getList(listId: ItemId): ListItem | undefined {
        const item = this.items.get(listId);
        return item?.kind === "list" ? item : undefined;
    }

    private getTask(taskId: ItemId): TaskItem | undefined {
        const item = this.items.get(taskId);
        return item?.kind === "task" ? item : undefined;
    }

    private isAncestor(candidateAncestorId: ItemId, targetId: ItemId): boolean {
        let current = this.getList(targetId);
        while (current) {
            if (current.id === candidateAncestorId) {
                return true;
            }
            current = current.parentListId ? this.getList(current.parentListId) : undefined;
        }
        return false;
    }
}
import { describe, expect, it } from "vitest";
import { Backlog } from "../../../src/domain/backlog/Backlog.js";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import { DomainError } from "../../../src/domain/shared/errors.js";
import { ItemStatus, type ItemId } from "../../../src/domain/shared/types.js";

function createList(title: string, parentId?: ItemId) {
    return ListItem.create({ title, parentId });
}

function createTask(title: string, listId: ItemId) {
    return TaskItem.create({ title, listIds: [listId] });
}

describe("Backlog", () => {
    it("adds an item and exposes it by id", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");

        backlog.addItem(list);

        expect(backlog.getItem(list.id)).toBe(list);
        expect(backlog.getAllItems()).toEqual([list]);
    });

    it("rejects duplicate ids", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");
        backlog.addItem(list);

        expect(() => backlog.addItem(list)).toThrow(DomainError);
    });

    it("removes a task and cleans up task references", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);

        backlog.addItem(list);
        backlog.addItem(task);

        backlog.removeItem(task.id);

        expect(backlog.getItem(task.id)).toBeUndefined();
    });

    it("rejects adding a task when its list reference does not exist", () => {
        const backlog = new Backlog();
        const task = TaskItem.create({ title: "Write tests", listIds: ["missing-list" as ItemId] });

        expect(() => backlog.addItem(task)).toThrow(DomainError);
    });

    it("rejects adding a task when its list reference points to a task instead of a list", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);

        backlog.addItem(list);
        backlog.addItem(task);

        const invalidTask = TaskItem.create({ title: "Broken reference", listIds: [task.id] });

        expect(() => backlog.addItem(invalidTask)).toThrow(DomainError);
    });

    it("adds list relationships and returns root lists", () => {
        const backlog = new Backlog();
        const root = createList("Root");
        const child = createList("Child", root.id);

        backlog.addItem(root);
        backlog.addItem(child);

        expect(backlog.getRootLists()).toEqual([root]);
        expect(backlog.getChildren(root.id)).toEqual([child]);
    });

    it("prevents cycles in list hierarchy", () => {
        const backlog = new Backlog();
        const root = createList("Root");
        const child = createList("Child", root.id);

        backlog.addItem(root);
        backlog.addItem(child);

        expect(() => backlog.addChildList(child.id, root.id)).toThrow(DomainError);
    });

    it("assigns a task to a list and lists tasks in that list", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);

        backlog.addItem(list);
        backlog.addItem(task);

        expect(backlog.getTasksInList(list.id)).toEqual([task]);
    });

    it("rejects removing the last list assignment from a task", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);

        backlog.addItem(list);
        backlog.addItem(task);

        expect(() => backlog.removeTaskFromList(task.id, list.id)).toThrow(DomainError);
    });

    it("rejects deleting a list that still has tasks assigned to it", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);

        backlog.addItem(list);
        backlog.addItem(task);

        expect(() => backlog.removeItem(list.id)).toThrow(DomainError);
    });

    it("rejects cyclic list graphs loaded from persisted data", () => {
        const rootId = "root-1" as ItemId;
        const childId = "child-1" as ItemId;
        const now = new Date("2026-08-30T10:00:00.000Z");

        const root = ListItem.reconstitute({
            id: rootId,
            title: "Root",
            createdAt: now,
            updatedAt: now,
            archived: false,
            parentListId: childId,
            childListIds: [childId]
        });

        const child = ListItem.reconstitute({
            id: childId,
            title: "Child",
            createdAt: now,
            updatedAt: now,
            archived: false,
            parentListId: rootId,
            childListIds: [rootId]
        });

        expect(() => new Backlog([root, child])).toThrow(DomainError);
    });

    it("moves a list under another parent and updates child relations", () => {
        const backlog = new Backlog();
        const parentA = createList("A");
        const parentB = createList("B");
        const child = createList("Child", parentA.id);

        backlog.addItem(parentA);
        backlog.addItem(parentB);
        backlog.addItem(child);

        backlog.moveList(child.id, parentB.id);

        expect(child.parentListId).toBe(parentB.id);
        expect(backlog.getChildren(parentA.id)).toEqual([]);
        expect(backlog.getChildren(parentB.id)).toEqual([child]);
    });

    it("creates a backlog from a list of items", () => {
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);

        const backlog = Backlog.fromItems([list, task]);

        expect(backlog.getItem(list.id)).toBe(list);
        expect(backlog.getItem(task.id)).toBe(task);
    });

    it("returns empty children for a missing list", () => {
        const backlog = new Backlog();
        expect(backlog.getChildren("missing-list" as ItemId)).toEqual([]);
    });

    it("ignores removal when item does not exist", () => {
        const backlog = new Backlog();
        expect(() => backlog.removeItem("missing-item" as ItemId)).not.toThrow();
    });

    it("rejects deleting a list that still has child lists", () => {
        const backlog = new Backlog();
        const parent = createList("Parent");
        const child = createList("Child", parent.id);

        backlog.addItem(parent);
        backlog.addItem(child);

        expect(() => backlog.removeItem(parent.id)).toThrow(DomainError);
    });

    it("removes parent references when deleting a child list", () => {
        const backlog = new Backlog();
        const parent = createList("Parent");
        const child = createList("Child", parent.id);

        backlog.addItem(parent);
        backlog.addItem(child);

        backlog.removeItem(child.id);

        expect(backlog.getChildren(parent.id)).toEqual([]);
    });

    it("validates task and list existence when assigning tasks", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");
        backlog.addItem(list);

        expect(() => backlog.assignTaskToList("missing-task" as ItemId, list.id)).toThrow(DomainError);

        const task = createTask("Write tests", list.id);
        backlog.addItem(task);

        expect(() => backlog.assignTaskToList(task.id, "missing-list" as ItemId)).toThrow(DomainError);
    });

    it("removes task-list assignments when task belongs to multiple lists", () => {
        const backlog = new Backlog();
        const listA = createList("Inbox");
        const listB = createList("Today");
        const task = createTask("Write tests", listA.id);

        backlog.addItem(listA);
        backlog.addItem(listB);
        backlog.addItem(task);
        backlog.assignTaskToList(task.id, listB.id);

        backlog.removeTaskFromList(task.id, listA.id);

        expect(task.listIds).toEqual([listB.id]);
    });

    it("validates task and list existence when removing task-list assignments", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);
        backlog.addItem(list);
        backlog.addItem(task);

        expect(() => backlog.removeTaskFromList("missing-task" as ItemId, list.id)).toThrow(DomainError);
        expect(() => backlog.removeTaskFromList(task.id, "missing-list" as ItemId)).toThrow(DomainError);
    });

    it("validates moveList preconditions", () => {
        const backlog = new Backlog();
        const root = createList("Root");
        backlog.addItem(root);

        expect(() => backlog.moveList("missing-list" as ItemId, root.id)).toThrow(DomainError);
        expect(() => backlog.moveList(root.id, root.id)).toThrow(DomainError);
        expect(() => backlog.moveList(root.id, "missing-parent" as ItemId)).toThrow(DomainError);
    });

    it("rejects moving a list into one of its descendants", () => {
        const backlog = new Backlog();
        const root = createList("Root");
        const child = createList("Child", root.id);

        backlog.addItem(root);
        backlog.addItem(child);

        expect(() => backlog.moveList(root.id, child.id)).toThrow(DomainError);
    });

    it("moves a child list back to root when parent is undefined", () => {
        const backlog = new Backlog();
        const root = createList("Root");
        const child = createList("Child", root.id);
        backlog.addItem(root);
        backlog.addItem(child);

        backlog.moveList(child.id, undefined);

        expect(child.parentListId).toBeUndefined();
        expect(backlog.getChildren(root.id)).toEqual([]);
    });

    it("validates addChildList and removeChildList input lists", () => {
        const backlog = new Backlog();
        const root = createList("Root");
        const child = createList("Child");
        backlog.addItem(root);
        backlog.addItem(child);

        expect(() => backlog.addChildList("missing-parent" as ItemId, child.id)).toThrow(DomainError);
        expect(() => backlog.addChildList(root.id, "missing-child" as ItemId)).toThrow(DomainError);
        expect(() => backlog.removeChildList("missing-parent" as ItemId, child.id)).toThrow(DomainError);
        expect(() => backlog.removeChildList(root.id, "missing-child" as ItemId)).toThrow(DomainError);
    });

    it("updates task status transitions", () => {
        const backlog = new Backlog();
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);
        backlog.addItem(list);
        backlog.addItem(task);

        backlog.updateTaskStatus(task.id, ItemStatus.IN_PROGRESS);
        expect(task.status).toBe(ItemStatus.IN_PROGRESS);

        backlog.updateTaskStatus(task.id, ItemStatus.DONE);
        expect(task.status).toBe(ItemStatus.DONE);

        backlog.updateTaskStatus(task.id, ItemStatus.TODO);
        expect(task.status).toBe(ItemStatus.TODO);
    });

    it("rejects status updates for missing tasks", () => {
        const backlog = new Backlog();
        expect(() => backlog.updateTaskStatus("missing-task" as ItemId, ItemStatus.DONE)).toThrow(DomainError);
    });
});

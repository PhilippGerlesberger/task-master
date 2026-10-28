import { DomainError } from "../../../domain/shared/errors.js";
import type { ItemId } from "../../../domain/shared/types.js";
import type { BacklogItem } from "../../../domain/backlogItem/BacklogItem.types.js";

export function orderItemsForBacklog(items: BacklogItem[]): BacklogItem[] {
    const orderedItems: BacklogItem[] = [];
    const visiting = new Set<ItemId>();
    const visited = new Set<ItemId>();
    const byId = new Map<ItemId, BacklogItem>(items.map((item) => [item.id, item]));

    const visit = (item: BacklogItem): void => {
        if (visited.has(item.id)) {
            return;
        }

        if (visiting.has(item.id)) {
            throw new DomainError("Backlog contains a cyclic list hierarchy.");
        }

        visiting.add(item.id);

        if (item.kind === "list" && item.parentListId !== undefined) {
            const parent = byId.get(item.parentListId);
            if (!parent) {
                throw new DomainError("List references a non-existing parent list.");
            }

            visit(parent);
        }

        if (item.kind === "task") {
            for (const listId of item.listIds) {
                const list = byId.get(listId);
                if (!list) {
                    throw new DomainError("Task references a non-existing list.");
                }

                visit(list);
            }
        }

        visiting.delete(item.id);
        visited.add(item.id);
        orderedItems.push(item);
    };

    for (const item of items) {
        visit(item);
    }

    return orderedItems;
}

import { InfrastructureError } from "../../application/errors.js";

export type ListHierarchyRow = {
    id: string;
    parent_list_id: string | null;
};

export function sortListRowsByDepth<T extends ListHierarchyRow>(
    rows: readonly T[],
    direction: "parents-first" | "children-first"
): T[] {
    if (rows.length === 0) {
        return [];
    }

    const byId = new Map<string, T>(rows.map((row) => [row.id, row]));
    const depthCache = new Map<string, number>();
    const visiting = new Set<string>();

    const resolveDepth = (row: T): number => {
        const cachedDepth = depthCache.get(row.id);
        if (cachedDepth !== undefined) {
            return cachedDepth;
        }

        if (visiting.has(row.id)) {
            throw new InfrastructureError("List hierarchy contains a cycle.");
        }

        visiting.add(row.id);
        let depth = 0;

        if (row.parent_list_id !== null) {
            const parent = byId.get(row.parent_list_id);
            if (parent) {
                depth = resolveDepth(parent) + 1;
            }
        }

        visiting.delete(row.id);
        depthCache.set(row.id, depth);
        return depth;
    };

    const sorted = [...rows].sort((left, right) => {
        const leftDepth = resolveDepth(left);
        const rightDepth = resolveDepth(right);

        if (leftDepth !== rightDepth) {
            return direction === "parents-first" ? leftDepth - rightDepth : rightDepth - leftDepth;
        }

        return left.id.localeCompare(right.id);
    });

    return sorted;
}

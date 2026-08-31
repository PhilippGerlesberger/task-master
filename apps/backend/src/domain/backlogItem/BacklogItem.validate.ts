import type { CreateTaskItemInput, CreateListItemInput } from "./BacklogItem.types.js";
import { DomainError } from "../shared/errors.js";

function validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
        throw new DomainError("BacklogItem requires a non-empty title.");
    }
}

export function validateListCreation(input: CreateListItemInput): void {
    validateTitle(input.title);
}

export function validateTaskCreation(input: CreateTaskItemInput): void {
    validateTitle(input.title);
    if (!input.listIds || input.listIds.length === 0) {
        throw new DomainError("A task must belong to at least one list.");
    }
}
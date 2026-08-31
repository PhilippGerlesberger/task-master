/**
 * Shared domain types used across the domain layer.
 * These types define structural primitives and repeat-pattern flags.
 */

export type Branded<T, Brand extends string> = T & { __brand: Brand };

/**
 * Unique identifier for domain entities.
 * Treated as an opaque branded string to prevent accidental misuse.
 */
export type ItemId = Branded<string, "ItemId">;

/**
 * Normalized date key in YYYY-MM-DD format.
 * Used for daily grouping, occurrence mapping, and persistence.
 */
export type DateKey = Branded<string, "DateKey">;

/**
 * Repeat pattern for items that generate occurrences.
 * Defines how the occurrence generator expands items over time.
 */
export enum RepetitionKind {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY"
}

/**
 * Lifecycle state of a BacklogItem.
 * Used for planning, execution, and completion tracking.
 */
export enum ItemStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE"
}

/**
 * Importance level of a BacklogItem.
 * Influences sorting, scheduling, and prioritization logic.
 */
export enum Priority {
  VERY_LOW = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  VERY_HIGH = 5
}
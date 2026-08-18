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

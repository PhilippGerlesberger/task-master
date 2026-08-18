/**
 * Domain-level value objects representing meaningful concepts.
 * These values carry semantics and may influence domain behavior.
 */

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

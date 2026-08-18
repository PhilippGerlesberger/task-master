/**
 * Base error type for domain-level failures.
 * Allows consistent error handling across domain services.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * Error thrown when a domain entity enters an invalid state.
 * Used for enforcing invariants and domain rules.
 */
export class InvalidItemStateError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidItemStateError";
  }
}

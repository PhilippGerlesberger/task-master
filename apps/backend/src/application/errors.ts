export class InfrastructureError extends Error {
    readonly cause?: unknown;

    constructor(message: string, options?: { cause?: unknown }) {
        super(message);
        this.name = "InfrastructureError";
        this.cause = options?.cause;
    }
}

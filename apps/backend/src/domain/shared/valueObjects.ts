import { DateKey, RepetitionKind } from "./types.js";
import { DomainError } from "./errors.js";
/**
 * Domain-level value objects representing meaningful concepts.
 * These values carry semantics and may influence domain behavior.
 */

export class Schedule {
    private constructor(
        readonly startDate?: DateKey,
        readonly endDate?: DateKey,
        readonly defaultEndTime?: string
    ) {}

    static create(props: { startDate?: DateKey; endDate?: DateKey; defaultEndTime?: string }): Schedule {
        if (props.startDate && props.endDate && props.endDate < props.startDate) {
        throw new DomainError("endDate must not be before startDate.");
        }
        return new Schedule(props.startDate, props.endDate, props.defaultEndTime);
    }
}
export class RepetitionPattern {
    private constructor(
        readonly kind: RepetitionKind,
        readonly interval: number,
        readonly monthlyAnchor?: "SAME_DAY" | "END_OF_MONTH",
        readonly count?: number,
        readonly endDate?: DateKey
    ) {}

    static create(props: {
        kind: RepetitionKind; interval?: number;
        monthlyAnchor?: "SAME_DAY" | "END_OF_MONTH";
        count?: number; endDate?: DateKey;
    }): RepetitionPattern {
        if (props.kind === RepetitionKind.NONE) {
            if (props.interval !== undefined || props.count !== undefined || props.endDate !== undefined || props.monthlyAnchor !== undefined) {
                throw new DomainError("No repetition fields allowed when kind is NONE.");
            }
            return new RepetitionPattern(RepetitionKind.NONE, 0);
        }

        if (props.monthlyAnchor !== undefined && props.kind !== RepetitionKind.MONTHLY && props.kind !== RepetitionKind.YEARLY) {
            throw new DomainError("monthlyAnchor is only valid for MONTHLY or YEARLY.");
        }

        const interval = props.interval ?? 1;
        if (!Number.isInteger(interval) || interval < 1) {
            throw new DomainError("interval must be a positive integer.");
        }
        if (props.count !== undefined && (!Number.isInteger(props.count) || props.count < 1)) {
            throw new DomainError("count must be a positive integer.");
        }

        const isMonthlyOrYearly = props.kind === RepetitionKind.MONTHLY || props.kind === RepetitionKind.YEARLY;

        return new RepetitionPattern(
            props.kind,
            interval,
            isMonthlyOrYearly ? (props.monthlyAnchor ?? "SAME_DAY") : undefined,
            props.count,
            props.endDate
        );
    }
}
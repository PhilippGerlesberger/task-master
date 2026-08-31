// tests/domain/shared/RepetitionPattern.test.ts
import { describe, it, expect } from "vitest";
import { RepetitionPattern } from "../../../src/domain/shared/valueObjects.js";
import { RepetitionKind } from "../../../src/domain/shared/types.js";
import { DomainError } from "../../../src/domain/shared/errors.js";
import type { DateKey } from "../../../src/domain/shared/types.js";

describe("RepetitionPattern.create - kind: NONE", () => {
    it("creates NONE with interval 0 and no other fields", () => {
        const pattern = RepetitionPattern.create({ kind: RepetitionKind.NONE });
        expect(pattern.kind).toBe(RepetitionKind.NONE);
        expect(pattern.interval).toBe(0);
        expect(pattern.count).toBeUndefined();
        expect(pattern.endDate).toBeUndefined();
    });

    it.each([
        { interval: 2 },
        { count: 5 },
        { endDate: "2026-12-31" as DateKey },
        { monthlyAnchor: "END_OF_MONTH" as const }
    ])("rejects NONE with %j set", (extra) => {
        expect(() => RepetitionPattern.create({ kind: RepetitionKind.NONE, ...extra })).toThrow(DomainError);
    });
});

describe("RepetitionPattern.create - interval boundary values", () => {
    it("defaults interval to 1 when omitted", () => {
        expect(RepetitionPattern.create({ kind: RepetitionKind.DAILY }).interval).toBe(1);
    });

    it.each([-1, 0])("rejects interval <= 0 (%d)", (interval) => {
        expect(() => RepetitionPattern.create({ kind: RepetitionKind.DAILY, interval })).toThrow(DomainError);
    });

    it.each([1, 2])("accepts a valid positive interval (%d)", (interval) => {
        expect(RepetitionPattern.create({ kind: RepetitionKind.DAILY, interval }).interval).toBe(interval);
    });

    it("accepts Number.MAX_SAFE_INTEGER as interval (kein Domain-Limit, UI darf enger begrenzen)", () => {
        const pattern = RepetitionPattern.create({ kind: RepetitionKind.DAILY, interval: Number.MAX_SAFE_INTEGER });
        expect(pattern.interval).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("rejects a non-integer interval", () => {
        expect(() => RepetitionPattern.create({ kind: RepetitionKind.DAILY, interval: 1.5 })).toThrow(DomainError);
    });
});

describe("RepetitionPattern.create - count boundary values", () => {
    it.each([-1, 0])("rejects count <= 0 (%d)", (count) => {
        expect(() => RepetitionPattern.create({ kind: RepetitionKind.DAILY, count })).toThrow(DomainError);
    });

    it("accepts count together with endDate (Semantik: wer zuerst greift, gewinnt)", () => {
        const pattern = RepetitionPattern.create({ kind: RepetitionKind.DAILY, count: 8, endDate: "2026-09-05" as DateKey });
        expect(pattern.count).toBe(8);
        expect(pattern.endDate).toBe("2026-09-05" as DateKey);
    });
});

describe("RepetitionPattern.create - monthlyAnchor", () => {
    it("defaults monthlyAnchor to SAME_DAY for MONTHLY", () => {
        expect(RepetitionPattern.create({ kind: RepetitionKind.MONTHLY }).monthlyAnchor).toBe("SAME_DAY");
    });

    it("accepts END_OF_MONTH for YEARLY", () => {
        const pattern = RepetitionPattern.create({ kind: RepetitionKind.YEARLY, monthlyAnchor: "END_OF_MONTH" });
        expect(pattern.monthlyAnchor).toBe("END_OF_MONTH");
    });

    it("rejects monthlyAnchor for DAILY", () => {
        expect(() => RepetitionPattern.create({ kind: RepetitionKind.DAILY, monthlyAnchor: "SAME_DAY" })).toThrow(DomainError);
    });

    it("leaves monthlyAnchor undefined for WEEKLY", () => {
        expect(RepetitionPattern.create({ kind: RepetitionKind.WEEKLY }).monthlyAnchor).toBeUndefined();
    });
});
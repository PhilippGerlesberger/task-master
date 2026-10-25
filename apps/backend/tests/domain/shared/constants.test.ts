import { describe, expect, it } from "vitest";
import { INBOX_LIST_ID } from "../../../src/domain/shared/constants.js";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("INBOX_LIST_ID", () => {
    it("is a valid UUID", () => {
        expect(INBOX_LIST_ID).toMatch(UUID_V4_REGEX);
    });
});

import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/env.js";

describe("parseEnv", () => {
    it("applies defaults", () => {
        const parsed = parseEnv({});

        expect(parsed).toEqual({
            NODE_ENV: "development",
            PORT: 4000,
            CORS_ORIGIN: "http://localhost:5173",
            PERSISTENCE: "json",
            DATABASE_URL: "",
            DATABASE_URL_TEST: "",
            SPRINT_LENGTH_DAYS: 14
        });
    });

    it("rejects invalid PERSISTENCE", () => {
        expect(() => parseEnv({ PERSISTENCE: "sqlite" })).toThrow("PERSISTENCE");
    });

    it("requires DATABASE_URL when PERSISTENCE=postgres", () => {
        expect(() => parseEnv({ PERSISTENCE: "postgres" })).toThrow("DATABASE_URL");
    });

    it("rejects invalid PORT", () => {
        expect(() => parseEnv({ PORT: "70000" })).toThrow("PORT");
    });
});

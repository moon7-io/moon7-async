import { describe, test, expect } from "vitest";
import { TimeoutError, RetryError } from "~/error";

describe("Error classes", () => {
    describe("TimeoutError", () => {
        test("should create TimeoutError with default message", () => {
            const error = new TimeoutError();
            expect(error.message).toBe("Timeout");
            expect(error.name).toBe("TimeoutError");
            expect(error instanceof Error).toBe(true);
        });

        test("should create TimeoutError with custom message", () => {
            const message = "Operation timed out after 5000ms";
            const error = new TimeoutError(message);
            expect(error.message).toBe(message);
            expect(error.name).toBe("TimeoutError");
        });
    });

    describe("RetryError", () => {
        test("should create RetryError with default message", () => {
            const error = new RetryError();
            expect(error.message).toBe("Retry failed");
            expect(error.name).toBe("RetryError");
            expect(error instanceof Error).toBe(true);
            expect(error.lastError).toBeUndefined();
        });

        test("should create RetryError with custom message", () => {
            const message = "Failed after 3 retries";
            const error = new RetryError(message);
            expect(error.message).toBe(message);
            expect(error.name).toBe("RetryError");
        });

        test("should store the last error", () => {
            const lastError = new Error("Network error");
            const error = new RetryError("Failed after 3 retries", lastError);
            expect(error.lastError).toBe(lastError);
        });
    });
});

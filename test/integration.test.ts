import { describe, test, expect, vi } from "vitest";
import { sleep, withRetry, withTimeout, TimeoutError, Mutex, TaskPool } from "~/index";

describe("Integration tests", () => {
    test("withTimeout should work with withRetry", async () => {
        // This test verifies that withTimeout and withRetry compose correctly
        const fn = vi
            .fn()
            .mockRejectedValueOnce(new Error("attempt 1 failed"))
            .mockImplementationOnce(async () => {
                await sleep(500);
                return "success";
            });

        const retryFn = withRetry(fn, 3, () => 10);
        const timeoutFn = withTimeout(retryFn, 1000);

        const result = await timeoutFn();
        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledTimes(2);
    });

    test("withTimeout should fail fast with withRetry", async () => {
        // This test verifies that timeout takes precedence over retry
        const fn = vi.fn().mockImplementation(async () => {
            await sleep(300);
            return "success";
        });

        const retryFn = withRetry(fn, 5, () => 10);
        const timeoutFn = withTimeout(retryFn, 200);

        await expect(timeoutFn()).rejects.toThrow(TimeoutError);
        expect(fn).toHaveBeenCalledTimes(1); // Should fail before retrying
    });

    test("should handle complex nested async operations", async () => {
        const mutex = new Mutex();
        const taskPool = new TaskPool<string>(2);

        const tasks = [
            async () => {
                return await mutex.use(async () => {
                    await sleep(10);
                    return "task1";
                });
            },
            async () => {
                return await mutex.use(async () => {
                    await sleep(10);
                    return "task2";
                });
            },
        ];

        const results = await taskPool.submitAll(tasks);
        expect(results).toEqual(["task1", "task2"]);
    });
});

import { describe, test, expect, vi } from "vitest";
import { Mutex } from "~/mutex";

describe("Mutex", () => {
    test("should allow only one operation at a time", async () => {
        const mutex = new Mutex();
        const order: number[] = [];

        // Start multiple operations that use the mutex
        const operation1 = mutex.use(async () => {
            order.push(1);
            await new Promise(resolve => setTimeout(resolve, 10));
            order.push(2);
            return "result1";
        });

        const operation2 = mutex.use(async () => {
            order.push(3);
            await new Promise(resolve => setTimeout(resolve, 10));
            order.push(4);
            return "result2";
        });

        const operation3 = mutex.use(async () => {
            order.push(5);
            await new Promise(resolve => setTimeout(resolve, 10));
            order.push(6);
            return "result3";
        });

        // Wait for all operations to complete
        const [result1, result2, result3] = await Promise.all([operation1, operation2, operation3]);

        // Verify that operations were executed sequentially, not in parallel
        expect(order).toEqual([1, 2, 3, 4, 5, 6]);
        expect(result1).toBe("result1");
        expect(result2).toBe("result2");
        expect(result3).toBe("result3");
    });

    test("should release mutex even if operation fails", async () => {
        const mutex = new Mutex();
        const error = new Error("operation failed");

        // First operation will fail
        const operation1 = mutex
            .use(async () => {
                throw error;
            })
            .catch(e => e);

        // Second operation should still work
        const operation2 = mutex.use(async () => {
            return "success";
        });

        const [result1, result2] = await Promise.all([operation1, operation2]);

        expect(result1).toBe(error);
        expect(result2).toBe("success");
    });

    describe("acquire", () => {
        test("should acquire and release lock manually", async () => {
            const mutex = new Mutex();
            const release = await mutex.acquire();

            // While we hold the lock, another acquire should wait
            const acquirePromise = mutex.acquire();

            // The promise should not resolve immediately
            const isResolved = await Promise.race([
                acquirePromise.then(() => true),
                Promise.resolve(false)
                    .then(() => new Promise(r => setTimeout(r, 10)))
                    .then(() => false),
            ]);

            expect(isResolved).toBe(false);

            // Release the lock
            release();

            // Now the second acquire should resolve
            const release2 = await acquirePromise;
            release2(); // Clean up
        });

        test("should allow sequential operations with manual acquire/release", async () => {
            const mutex = new Mutex();

            const executeTask = async (id: number): Promise<string> => {
                const release = await mutex.acquire();
                try {
                    return `task ${id} completed`;
                } finally {
                    release();
                }
            };

            const results = await Promise.all([executeTask(1), executeTask(2), executeTask(3)]);

            expect(results).toEqual(["task 1 completed", "task 2 completed", "task 3 completed"]);
        });
    });

    describe("use", () => {
        test("should execute function with exclusive access", async () => {
            const mutex = new Mutex();
            const sharedResource = { value: 0 };

            const incrementAsync = async () => {
                const currentValue = sharedResource.value;
                await new Promise(resolve => setTimeout(resolve, 10));
                sharedResource.value = currentValue + 1;
            };

            // Without mutex, this would result in race conditions
            await Promise.all([mutex.use(incrementAsync), mutex.use(incrementAsync), mutex.use(incrementAsync)]);

            expect(sharedResource.value).toBe(3);
        });

        test("should return function result", async () => {
            const mutex = new Mutex();
            const fn = vi.fn().mockResolvedValue("result");

            const result = await mutex.use(fn);

            expect(fn).toHaveBeenCalledTimes(1);
            expect(result).toBe("result");
        });
    });
});

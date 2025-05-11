import { describe, test, expect, vi } from "vitest";
import { Semaphore } from "~/semaphore";

describe("Semaphore", () => {
    test("should create a semaphore with the specified capacity", () => {
        const capacity = 3;
        const semaphore = new Semaphore(capacity);
        expect(semaphore.capacity).toBe(capacity);
        expect(semaphore.permits).toBe(capacity);
        expect(semaphore.used).toBe(0);
    });

    test("should throw error if capacity is invalid", () => {
        expect(() => new Semaphore(0)).toThrow("Semaphore capacity must be a positive integer");
        expect(() => new Semaphore(-1)).toThrow("Semaphore capacity must be a positive integer");
        expect(() => new Semaphore(1.5)).toThrow("Semaphore capacity must be a positive integer");
    });

    describe("tryAcquire", () => {
        test("should acquire permit when available", () => {
            const semaphore = new Semaphore(2);
            const release = semaphore.tryAcquire();

            expect(release).not.toBeNull();
            expect(semaphore.used).toBe(1);
            expect(semaphore.permits).toBe(1);
        });

        test("should return null when no permits available", () => {
            const semaphore = new Semaphore(1);
            const release1 = semaphore.tryAcquire();
            const release2 = semaphore.tryAcquire();

            expect(release1).not.toBeNull();
            expect(release2).toBeNull();
            expect(semaphore.used).toBe(1);
            expect(semaphore.permits).toBe(0);
        });

        test("should release permit when release function is called", () => {
            const semaphore = new Semaphore(2);
            const release = semaphore.tryAcquire();

            expect(semaphore.used).toBe(1);

            const result = release!();

            expect(result).toBe(true);
            expect(semaphore.used).toBe(0);
            expect(semaphore.permits).toBe(2);
        });

        test("should return false when release is called multiple times", () => {
            const semaphore = new Semaphore(1);
            const release = semaphore.tryAcquire();

            const result1 = release!();
            const result2 = release!();

            expect(result1).toBe(true);
            expect(result2).toBe(false);
            expect(semaphore.used).toBe(0);
        });
    });

    describe("acquire", () => {
        test("should acquire permit immediately when available", async () => {
            const semaphore = new Semaphore(2);
            const acquiredRelease = await semaphore.acquire();

            expect(semaphore.used).toBe(1);
            expect(semaphore.permits).toBe(1);

            // Clean up
            acquiredRelease();
        });

        test("should queue acquisition when no permits available", async () => {
            const semaphore = new Semaphore(1);
            const release1 = await semaphore.acquire();

            // Second acquire should queue
            const acquirePromise = semaphore.acquire();
            expect(semaphore.used).toBe(1);

            // Release the first permit
            release1();

            // Second acquire should complete now
            const release2 = await acquirePromise;
            expect(semaphore.used).toBe(1);

            // Cleanup
            release2();
            expect(semaphore.used).toBe(0);
        });

        test("should handle multiple queued acquisitions in order", async () => {
            const semaphore = new Semaphore(1);
            const release1 = await semaphore.acquire();

            const order: number[] = [];

            // Queue two more acquisitions
            const promise2 = semaphore.acquire().then(release => {
                order.push(2);
                return release;
            });

            const promise3 = semaphore.acquire().then(release => {
                order.push(3);
                return release;
            });

            // Release the first permit
            order.push(1);
            release1();

            // Wait for the second acquisition and release it
            const release2 = await promise2;
            release2();

            // Wait for the third acquisition and release it
            const release3 = await promise3;
            release3();

            expect(order).toEqual([1, 2, 3]);
            expect(semaphore.used).toBe(0);
        });
    });

    describe("use", () => {
        test("should acquire permit, execute function, and release permit", async () => {
            const semaphore = new Semaphore(1);
            const fn = vi.fn().mockResolvedValue("result");

            const result = await semaphore.use(fn);

            expect(fn).toHaveBeenCalledTimes(1);
            expect(result).toBe("result");
            expect(semaphore.used).toBe(0);
        });

        test("should release permit even if function throws", async () => {
            const semaphore = new Semaphore(1);
            const error = new Error("test error");
            const fn = vi.fn().mockRejectedValue(error);

            await expect(semaphore.use(fn)).rejects.toThrow(error);

            expect(fn).toHaveBeenCalledTimes(1);
            expect(semaphore.used).toBe(0);
        });

        test("should queue function execution when no permits available", async () => {
            const semaphore = new Semaphore(1);
            const order: number[] = [];

            const promise1 = semaphore.use(async () => {
                order.push(1);
                await new Promise(resolve => setTimeout(resolve, 10));
                order.push(2);
                return "result1";
            });

            const promise2 = semaphore.use(async () => {
                order.push(3);
                order.push(4);
                return "result2";
            });

            const [result1, result2] = await Promise.all([promise1, promise2]);

            expect(result1).toBe("result1");
            expect(result2).toBe("result2");
            expect(order).toEqual([1, 2, 3, 4]);
            expect(semaphore.used).toBe(0);
        });
    });
});

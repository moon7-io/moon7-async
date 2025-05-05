import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
    sleep,
    delay,
    defer,
    fromAsyncIterator,
    lift,
    withTimeout,
    withRetry,
    expBackoff,
    future,
    TimeoutError,
    RetryError,
} from "~/index";

describe("async utilities", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("sleep", () => {
        test("should resolve after the specified time", async () => {
            const promise = sleep(1000);
            vi.advanceTimersByTime(1000);
            await promise;
            expect(vi.getTimerCount()).toBe(0);
        });
    });

    describe("delay", () => {
        test("should delay function execution and return its result", async () => {
            const fn = vi.fn().mockReturnValue("result");
            const promise = delay(1000, fn);

            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1000);
            const result = await promise;

            expect(fn).toHaveBeenCalledTimes(1);
            expect(result).toBe("result");
        });

        test("should pass arguments to the function", async () => {
            const fn = vi.fn().mockReturnValue("result");
            const promise = delay(1000, fn, "arg1", "arg2");

            vi.advanceTimersByTime(1000);
            await promise;

            expect(fn).toHaveBeenCalledWith("arg1", "arg2");
        });
    });

    describe("defer", () => {
        test("should defer function execution until next tick", async () => {
            const fn = vi.fn().mockReturnValue("result");
            const promise = defer(fn);

            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(0);
            const result = await promise;

            expect(fn).toHaveBeenCalledTimes(1);
            expect(result).toBe("result");
        });

        test("should pass arguments to the function", async () => {
            const fn = vi.fn().mockReturnValue("result");
            const promise = defer(fn, "arg1", "arg2");

            vi.advanceTimersByTime(0);
            await promise;

            expect(fn).toHaveBeenCalledWith("arg1", "arg2");
        });
    });

    describe("fromAsyncIterator", () => {
        test("should collect all values from an async iterator", async () => {
            async function* generator() {
                yield 1;
                yield 2;
                yield 3;
            }

            const result = await fromAsyncIterator(generator());
            expect(result).toEqual([1, 2, 3]);
        });

        test("should return empty array for empty iterator", async () => {
            async function* emptyGenerator() {
                // Empty generator
            }

            const result = await fromAsyncIterator(emptyGenerator());
            expect(result).toEqual([]);
        });
    });

    describe("lift", () => {
        test("should convert a function to work with promises", async () => {
            const add = (a: number, b: number) => a + b;
            const liftedAdd = lift(add);

            const result = await liftedAdd(Promise.resolve(2), Promise.resolve(3));
            expect(result).toBe(5);
        });

        test("should handle multiple promised arguments", async () => {
            const concat = (a: string, b: string, c: string) => a + b + c;
            const liftedConcat = lift(concat);

            const result = await liftedConcat(Promise.resolve("hello"), Promise.resolve(" "), Promise.resolve("world"));
            expect(result).toBe("hello world");
        });
    });

    describe("withTimeout", () => {
        test("should resolve if the function completes within timeout", async () => {
            const fn = async () => {
                await sleep(500);
                return "result";
            };

            const wrappedFn = withTimeout(fn, 1000);
            const promise = wrappedFn();

            vi.advanceTimersByTime(500);
            const result = await promise;

            expect(result).toBe("result");
        });

        test("should reject with TimeoutError if the function exceeds timeout", async () => {
            const fn = async () => {
                await sleep(1500);
                return "result";
            };

            const wrappedFn = withTimeout(fn, 1000);
            const promise = wrappedFn();

            vi.advanceTimersByTime(1000);

            await expect(promise).rejects.toThrow(TimeoutError);
        });

        test("should propagate errors from the wrapped function", async () => {
            // This test covers the onFail callback in withTimeout
            const customError = new Error("Custom error");
            const fn = async () => {
                await sleep(100);
                throw customError;
            };

            const wrappedFn = withTimeout(fn, 1000);
            const promise = wrappedFn();

            vi.advanceTimersByTime(100);

            await expect(promise).rejects.toThrow("Custom error");
            await expect(promise).rejects.toBe(customError);
        });
    });

    describe("withRetry", () => {
        test("should return result if function succeeds on first try", async () => {
            const fn = vi.fn().mockResolvedValue("success");
            const retryFn = withRetry(fn, 3);

            const result = await retryFn();

            expect(result).toBe("success");
            expect(fn).toHaveBeenCalledTimes(1);
        });

        test("should retry until success", async () => {
            // Use real timers for this test
            vi.useRealTimers();

            const fn = vi
                .fn()
                .mockRejectedValueOnce(new Error("fail 1"))
                .mockRejectedValueOnce(new Error("fail 2"))
                .mockResolvedValue("success");

            const retryFn = withRetry(fn, 3, () => 10); // Use small timeout for faster test

            const result = await retryFn();

            expect(result).toBe("success");
            expect(fn).toHaveBeenCalledTimes(3);
        }, 10000);

        test("should throw RetryError after all attempts fail", async () => {
            // Use real timers for this test
            vi.useRealTimers();

            const testError = new Error("fail");
            const fn = vi.fn().mockRejectedValue(testError);

            const retryFn = withRetry(fn, 3, () => 10); // Use small timeout for faster test

            await expect(retryFn()).rejects.toThrow(RetryError);
            await expect(retryFn()).rejects.toHaveProperty("lastError", testError);
            expect(fn).toHaveBeenCalledTimes(6); // 3 calls for each of the two expect tests
        }, 10000);
    });

    describe("expBackoff", () => {
        test("should return exponential backoff values", () => {
            const backoff = expBackoff(100);

            expect(backoff(0)).toBe(100); // 2^0 * 100 = 100
            expect(backoff(1)).toBe(200); // 2^1 * 100 = 200
            expect(backoff(2)).toBe(400); // 2^2 * 100 = 400
            expect(backoff(3)).toBe(800); // 2^3 * 100 = 800
        });

        test("should never return less than the minimum value", () => {
            const backoff = expBackoff(250);

            expect(backoff(0)).toBe(250);
            expect(backoff(1)).toBe(500);
            expect(backoff(2)).toBe(1000);
        });
    });

    describe("future", () => {
        test("should create a promise with resolve and reject functions", async () => {
            const [promise, resolve, reject] = future<string>();

            expect(promise).toBeInstanceOf(Promise);
            expect(typeof resolve).toBe("function");
            expect(typeof reject).toBe("function");

            resolve("success");
            const result = await promise;

            expect(result).toBe("success");
        });

        test("should allow rejection of the promise", async () => {
            const [promise, , reject] = future<string>();
            const error = new Error("test error");

            reject(error);

            await expect(promise).rejects.toThrow(error);
        });
    });
});

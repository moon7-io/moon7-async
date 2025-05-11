import { RetryError, TimeoutError } from "~/error";

export type Fn<A extends any[] = any[], R = any> = (...args: A) => R;
export type AsyncFn<A extends any[] = any[], R = any> = (...args: A) => Promise<R>;
export type GenFn<A extends any[] = any[], R = any> = (...args: A) => IterableIterator<R>;
export type PromiseType<T, Else = never> = T extends Promise<infer P> ? P : Else;

export type Resolver<T> = (value: T | PromiseLike<T>) => void;
export type Rejecter = (reason?: any) => void;

type MapPromise<T> = { [K in keyof T]: Promise<T[K]> };

/**
 * Use within an async function.
 * `await` this to have non-blocking sleep before resuming flow.
 *
 * @example
 * await sleep(1000);           // sleeps for 1 second
 * await sleep(1000, "hello");  // sleeps for 1 second, resolves to "hello"
 */
export function sleep(ms: number): Promise<void>;
export function sleep<T>(ms: number, value: T): Promise<T>;
export function sleep<T>(ms: number, value?: T): Promise<T> {
    return new Promise(pass => setTimeout(() => pass(value as T), ms));
}

/**
 * Use within an async function.
 * `await` this to have non-blocking sleep before throwing a TimeoutError.
 *
 * @example
 * await timeout(1000);       // sleeps for 1 second and throws a TimeoutError
 */
export function timeout<T = void>(ms: number, error?: any): Promise<T> {
    return new Promise((_, fail) => setTimeout(() => fail(error ?? new TimeoutError()), ms));
}

/**
 * Calls a function after some delay.
 *
 * @example
 * // delay a value
 * const x = await delay(5000, () => "hello");
 *
 * // delay a function call, with closure args
 * const x = await delay(5000, () => fetchPost(userId, postId));
 *
 * // delay a function call, with eager args
 * const x = await delay(5000, fetchPost, userId, postId);
 */
export function delay<F extends Fn>(ms: number, fn: F, ...args: Parameters<F>): Promise<ReturnType<F>> {
    return new Promise(pass => setTimeout(() => pass(fn(...args)), ms));
}

/**
 * Defers invoking a function until the current call stack has cleared.
 */
export function defer<F extends Fn>(fn: F, ...args: Parameters<F>): Promise<ReturnType<F>> {
    return delay(0, fn, ...args);
}

/**
 * Collects all the values in an async iterator into a promised array.
 */
export async function fromAsyncIterator<T>(it: AsyncGenerator<T>): Promise<T[]> {
    const result: T[] = [];
    for await (const x of it) {
        result.push(x);
    }
    return result;
}

/**
 * Takes in a function that works with values, and returns a function
 * that works with promises.
 */
export function lift<A extends any[], R>(fn: (...args: A) => R) {
    return async (...args: MapPromise<A>) => fn(...(await Promise.all(args)));
}

/**
 * Decorate an async function to add a timeout
 * @example
 * let fetchUserWithTimeout = withTimeout(fetchUser, 5000);
 */
export function withTimeout<A extends any[], R>(asyncFn: (...args: A) => Promise<R>, timeoutInMs: number) {
    return (...args: A): Promise<R> => {
        return new Promise<R>((pass, fail) => {
            const timerId = setTimeout(() => fail(new TimeoutError()), timeoutInMs);
            const onPass = (value: R) => {
                clearTimeout(timerId);
                pass(value);
            };
            const onFail = (error: any) => {
                clearTimeout(timerId);
                fail(error);
            };
            asyncFn(...args).then(onPass, onFail);
        });
    };
}

/**
 * Decorate an async function to add retries if calling the function fails
 *
 * @example
 * let fetchUserWithRetry = withRetry(fetchUser, 5, i => i * 2);
 */
export function withRetry<A extends any[], R>(fn: (...args: A) => Promise<R>, tries: number, wait?: Wait) {
    wait = wait ?? expBackoff(MINIMUM_RETRY_WAIT_TIME);

    return async (...args: A): Promise<R> => {
        let lastError: any;
        for (let i = 0; i < tries; i++) {
            try {
                return await fn(...args);
            } catch (ex) {
                lastError = ex;
                await sleep(wait(i));
            }
        }
        throw new RetryError(`Failed after ${tries} attempts`, lastError);
    };
}

/**
 * The wait function.
 * Given the attempt `i`, return the duration in ms to wait.
 */
export type Wait = (i: number) => number;

export const DEFAULT_RETRIES = 3;
export const MINIMUM_RETRY_WAIT_TIME = 250;

export function expBackoff(minRetryWaitTime: number = MINIMUM_RETRY_WAIT_TIME): Wait {
    return i => {
        const backoff = Math.floor(Math.pow(2, i) * minRetryWaitTime);
        return Math.max(backoff, minRetryWaitTime);
    };
}

/**
 * A promise that resolves to a value.
 * This is useful for creating a promise that can be resolved later.
 *
 * @example
 * const [promise, resolve] = future();
 * resolve("hello");
 * const value = await promise; // "hello"
 */
export function future<T>(): [Promise<T>, Resolver<T>, Rejecter] {
    let resolve: Resolver<T>;
    let reject: Rejecter;
    const promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return [promise, resolve!, reject!];
}

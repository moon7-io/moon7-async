import { Release, Semaphore } from "~/semaphore";

/**
 * A Mutex is a synchronization primitive that ensures only one asynchronous operation
 * can access a shared resource at a time.
 *
 * It is implemented using a Semaphore with a capacity of 1.
 *
 * @example
 * const mutex = new Mutex();
 * async function criticalSection() {
 *     const release = await mutex.acquire();
 *     try {
 *         // critical section code
 *     } finally {
 *         release();
 *     }
 * }
 *
 * @example
 * const mutex = new Mutex();
 * mutex.use(() => fetchData());
 * mutex.use(() => fetchData());
 * mutex.use(() => fetchData());
 * mutex.use(() => fetchData());
 * // Data is fetched sequentially, not in parallel
 */
export class Mutex {
    private semaphore = new Semaphore(1);

    public async acquire(): Promise<Release> {
        return this.semaphore.acquire();
    }

    public async use<T>(fn: () => Promise<T> | T): Promise<T> {
        return this.semaphore.use(fn);
    }
}

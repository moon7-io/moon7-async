import { future } from "~/async";

export type Callback = () => void;
export type Release = () => boolean;

/**
 * A semaphore implementation that limits concurrent access to resources.
 * Provides fair scheduling by serving requests in the order they are received.
 */
export class Semaphore {
    public readonly capacity: number;
    private count: number = 0;
    private queue: Callback[] = [];

    /**
     * Creates a new semaphore with the specified capacity.
     * @param capacity Maximum number of concurrent operations allowed
     */
    public constructor(capacity: number) {
        if (capacity <= 0 || !Number.isInteger(capacity)) {
            throw new Error("Semaphore capacity must be a positive integer");
        }
        this.capacity = capacity;
    }

    public get used(): number {
        return this.count;
    }

    public get permits(): number {
        return this.capacity - this.count;
    }

    /**
     * Attempts to acquire a permit without waiting.
     * @returns A release function if successful, null otherwise
     */
    public tryAcquire(): Release | null {
        if (this.count < this.capacity) {
            this.count++;
            return this.release();
        }
        return null;
    }

    /**
     * Acquires a permit from the semaphore.
     * @returns A function that releases the permit when called
     */
    public async acquire(): Promise<Release> {
        if (this.count < this.capacity) {
            this.count++;
            return this.release();
        }

        const [promise, resolve] = future<Release>();
        this.queue.push(() => {
            this.count++;
            resolve(this.release());
        });

        return promise;
    }

    private release(): Release {
        let released = false;
        return () => {
            if (released || this.count <= 0) {
                return false;
            }

            released = true;
            this.count--;

            if (this.queue.length > 0 && this.count < this.capacity) {
                const next = this.queue.shift();
                if (next) next();
            }

            return true;
        };
    }

    public async use<T>(fn: () => Promise<T> | T): Promise<T> {
        const release = await this.acquire();
        try {
            return await fn();
        } finally {
            release();
        }
    }
}

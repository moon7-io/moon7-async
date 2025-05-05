import { Semaphore } from "~/semaphore";

/**
 * A simple task pool that limits the number of concurrent tasks.
 */
export class TaskPool<T> {
    private semaphore: Semaphore;

    constructor(concurrency: number) {
        this.semaphore = new Semaphore(concurrency);
    }

    public get concurrency(): number {
        return this.semaphore.capacity;
    }

    public get tasks(): number {
        return this.semaphore.used;
    }

    public async submit(task: () => Promise<T>): Promise<T> {
        return this.semaphore.use(task);
    }

    public async submitAll(tasks: Array<() => Promise<T>>): Promise<T[]> {
        return Promise.all(tasks.map((task) => this.submit(task)));
    }
}

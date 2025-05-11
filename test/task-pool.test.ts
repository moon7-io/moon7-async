import { describe, test, expect, vi } from "vitest";
import { TaskPool } from "~/task-pool";

describe("TaskPool", () => {
    test("should create a task pool with the specified concurrency", () => {
        const concurrency = 3;
        const pool = new TaskPool<string>(concurrency);
        expect(pool.concurrency).toBe(concurrency);
        expect(pool.tasks).toBe(0);
    });

    describe("submit", () => {
        test("should execute a single task", async () => {
            const pool = new TaskPool<string>(2);
            const task = vi.fn().mockResolvedValue("result");

            const result = await pool.submit(task);

            expect(task).toHaveBeenCalledTimes(1);
            expect(result).toBe("result");
            expect(pool.tasks).toBe(0);
        });

        test("should limit concurrent task execution", async () => {
            const pool = new TaskPool<number>(2);
            const executingTasks = { count: 0, max: 0 };

            const createTask = (id: number) => async () => {
                executingTasks.count++;
                executingTasks.max = Math.max(executingTasks.max, executingTasks.count);

                await new Promise(resolve => setTimeout(resolve, 10));

                executingTasks.count--;
                return id;
            };

            // Submit 5 tasks that should be executed with max concurrency of 2
            const results = await Promise.all([
                pool.submit(createTask(1)),
                pool.submit(createTask(2)),
                pool.submit(createTask(3)),
                pool.submit(createTask(4)),
                pool.submit(createTask(5)),
            ]);

            expect(results).toEqual([1, 2, 3, 4, 5]);
            expect(executingTasks.max).toBe(2);
            expect(executingTasks.count).toBe(0);
            expect(pool.tasks).toBe(0);
        });

        test("should handle task errors without affecting the pool", async () => {
            const pool = new TaskPool<string>(2);
            const error = new Error("task failed");

            const task = vi.fn().mockRejectedValue(error);

            await expect(pool.submit(task)).rejects.toThrow(error);
            expect(task).toHaveBeenCalledTimes(1);
            expect(pool.tasks).toBe(0);
        });
    });

    describe("submitAll", () => {
        test("should execute all tasks and return results in order", async () => {
            const pool = new TaskPool<number>(2);

            const tasks = [
                vi.fn().mockResolvedValue(1),
                vi.fn().mockResolvedValue(2),
                vi.fn().mockResolvedValue(3),
                vi.fn().mockResolvedValue(4),
                vi.fn().mockResolvedValue(5),
            ];

            const results = await pool.submitAll(tasks);

            expect(results).toEqual([1, 2, 3, 4, 5]);
            tasks.forEach(task => {
                expect(task).toHaveBeenCalledTimes(1);
            });
            expect(pool.tasks).toBe(0);
        });

        test("should limit concurrent execution of all tasks", async () => {
            const pool = new TaskPool<number>(2);
            const executingTasks = { count: 0, max: 0 };

            const createTask = (id: number) => async () => {
                executingTasks.count++;
                executingTasks.max = Math.max(executingTasks.max, executingTasks.count);

                await new Promise(resolve => setTimeout(resolve, 10));

                executingTasks.count--;
                return id;
            };

            const tasks = [createTask(1), createTask(2), createTask(3), createTask(4), createTask(5)];

            const results = await pool.submitAll(tasks);

            expect(results).toEqual([1, 2, 3, 4, 5]);
            expect(executingTasks.max).toBe(2);
            expect(executingTasks.count).toBe(0);
            expect(pool.tasks).toBe(0);
        });

        test("should handle errors in any task", async () => {
            const pool = new TaskPool<number>(2);
            const error = new Error("task failed");

            const tasks = [
                async () => 1,
                async () => {
                    throw error;
                },
                async () => 3,
            ];

            await expect(pool.submitAll(tasks)).rejects.toThrow(error);
            expect(pool.tasks).toBe(0);
        });

        test("should handle empty task list", async () => {
            const pool = new TaskPool<number>(2);

            const results = await pool.submitAll([]);

            expect(results).toEqual([]);
            expect(pool.tasks).toBe(0);
        });
    });
});

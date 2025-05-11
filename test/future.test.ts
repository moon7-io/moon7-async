import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

export type Pass<V> = (value: V) => void;
export type Fail = (error: any) => void;
export type Abort = () => void;
export type Future<T> = (pass: Pass<T>, fail: Fail) => void;

function _pass<T>(value: T): Future<T> {
    return delay(0, value);
}

function delay<T>(ms: number, value: T): Future<T> {
    return pass => {
        setTimeout(() => pass(value as T), ms);
    };
}

function consume<T>(future: Future<T>, onPass?: Pass<T>, onFail?: Fail): Abort {
    let isDone = false;

    const pass: Pass<T> = (value: T) => {
        if (isDone) return;
        isDone = true;
        onPass?.(value);
    };

    const fail: Fail = error => {
        if (isDone) return;
        isDone = true;
        onFail?.(error);
    };

    const abort: Abort = () => {
        if (isDone) return;
        isDone = true;
        onFail?.(new Error("Aborted"));
    };

    try {
        future(pass, fail);
    } catch (error) {
        fail(error);
    }
    return abort;
}

function map<T, U>(future: Future<T>, fn: (value: T) => U): Future<U> {
    return (pass, fail) => future(value => pass(fn(value)), fail);
}

describe("future", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test("future", () => {
        const future = map(delay(500, "hello"), x => x.length);

        const onPass = vi.fn();
        const onFail = vi.fn();

        consume(future, onPass, onFail);

        vi.advanceTimersByTime(1000);
        expect(onPass).toHaveBeenCalledWith(5);
        expect(onFail).not.toHaveBeenCalled();
    });
});

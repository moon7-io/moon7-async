/// <reference types="vite/client" />
export {};

declare global {
    const setTimeout: (fn: () => any, ms: number) => number;
}

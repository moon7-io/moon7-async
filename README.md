# @moon7/async

A lightweight, powerful utility library for managing asynchronous operations in JavaScript and TypeScript applications.

[![npm version](https://img.shields.io/npm/v/@moon7/async.svg)](https://www.npmjs.com/package/@moon7/async)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Promise utilities** - Create deferred promises, add timeouts, and implement retries with backoff strategies
- 🔒 **Concurrency controls** - Semaphore, Mutex, and TaskPool for managing concurrent operations
- ⏱️ **Timing functions** - Sleep, delay, and defer for precise timing control
- 🔄 **Iterator helpers** - Utilities for working with asynchronous iterators
- 🧩 **Functional utilities** - Lift synchronous functions to work with promises

## Installation

```bash
# Using npm
npm install @moon7/async

# Using yarn
yarn add @moon7/async

# Using pnpm
pnpm add @moon7/async
```

## Usage

### Timing Functions

```typescript
import { sleep, delay, defer } from '@moon7/async';

// Sleep for a specific duration
async function example() {
    await sleep(1000); // pause for 1 second
}

// Delay a function call
const result = await delay(2000, () => 'Hello after 2 seconds');

// Delay with arguments
const multiply = (a, b) => a * b;
const product = await delay(1000, multiply, 5, 7);

// Defer execution until the call stack clears
const deferred = await defer(() => 'Executed after current call stack');
```

### Deferred Promises with `future()`

```typescript
import { future } from '@moon7/async';

// Create a promise that can be resolved externally
const [promise, resolve, reject] = future();

// Now you can resolve it from anywhere
setTimeout(() => resolve('Completed!'), 3000);

// Use the promise
const result = await promise;
```

### Adding Timeouts to Operations

```typescript
import { withTimeout } from '@moon7/async';

async function slowOperation() {
    // Some potentially slow API call or operation
    return 'Result';
}

// Create a version with a 5-second timeout
const timedOperation = withTimeout(slowOperation, 5000);

try {
    const result = await timedOperation();
} catch (error) {
    // Will throw a TimeoutError if operation takes longer than 5 seconds
}
```

### Retry Failed Operations

```typescript
import { withRetry, expBackoff } from '@moon7/async';

async function unreliableOperation() {
    // Operation that might fail occasionally
    if (Math.random() < 0.7) throw new Error('Random failure');
    return 'Success!';
}

// Retry up to 5 times with exponential backoff
const reliableOperation = withRetry(unreliableOperation, 5, expBackoff(500));

try {
    const result = await reliableOperation();
} catch (error) {
    // Will only fail if all 5 attempts fail
}
```

### Concurrency Control with Semaphore

#### Example 1: Using `acquire` and release function

```typescript
import { Semaphore } from '@moon7/async';

// Allow maximum 3 concurrent operations
const semaphore = new Semaphore(3);

async function controlledFetch(url) {
    // Acquire returns a release function
    const release = await semaphore.acquire();
    
    try {
        // Perform the fetch operation
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } finally {
        // Call the release function to release the permit
        release();
    }
}

// These will execute with controlled concurrency
const urls = ['url1', 'url2', 'url3', 'url4', 'url5', 'url6'];
const results = await Promise.all(urls.map(url => controlledFetch(url)));
// Only 3 URLs will be fetched at a time
```

#### Example 2: Using the `use` method

```typescript
import { Semaphore } from '@moon7/async';

// Allow maximum 3 concurrent operations
const semaphore = new Semaphore(3);

async function controlledFetch(url) {
    // The use method automatically acquires and releases
    return semaphore.use(async () => {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    });
}

// These will execute with controlled concurrency
const urls = ['url1', 'url2', 'url3', 'url4', 'url5', 'url6'];
const results = await Promise.all(urls.map(url => controlledFetch(url)));
// Only 3 URLs will be fetched at a time
```

#### Example 3: Using `tryAcquire` for non-blocking operations

```typescript
import { Semaphore } from '@moon7/async';

// Allow maximum 2 concurrent operations
const semaphore = new Semaphore(2);

function processNonCriticalTask(task) {
    // Try to acquire a permit without waiting
    const release = semaphore.tryAcquire();
    
    if (release) {
        try {
            // Process the task...
            return `Completed: ${task}`;
        } finally {
            // Release the permit
            release();
        }
    } else {
        return `Skipped: ${task}`;
    }
}

// These will execute immediately if permits are available
// or be skipped if all permits are in use
const tasks = ['task1', 'task2', 'task3', 'task4', 'task5'];
const results = tasks.map(task => processNonCriticalTask(task));
```

### Mutual Exclusion with Mutex

```typescript
import { Mutex } from '@moon7/async';

// Ensure only one operation happens at a time
const mutex = new Mutex();

async function safeUpdate(data) {
    return mutex.use(async () => {
        // This critical section will only be accessed by one caller at a time
        // Perfect for updating shared resources without race conditions
        return updateSharedResource(data);
    });
}
```

### Managing Tasks with TaskPool

```typescript
import { TaskPool } from '@moon7/async';

// Process up to 4 tasks concurrently
const pool = new TaskPool(4);

const tasks = [
    () => fetchData('endpoint1'),
    () => fetchData('endpoint2'),
    () => fetchData('endpoint3'),
    () => fetchData('endpoint4'),
    () => fetchData('endpoint5'),
    () => fetchData('endpoint6'),
    () => fetchData('endpoint7')
];

// Submit all tasks to the pool - only 4 will run at once
const results = await pool.submitAll(tasks);
```

### Working with Async Iterators

```typescript
import { fromAsyncIterator } from '@moon7/async';

async function* generateValues() {
    yield 1;
    yield 2;
    yield 3;
}

// Collect all values into an array
const values = await fromAsyncIterator(generateValues());
console.log(values); // [1, 2, 3]
```

### Functional Programming with Promises

```typescript
import { lift } from '@moon7/async';

// Original function works with values
function add(a, b, c) {
    return a + b + c;
}

// Lifted function works with promises
const addAsync = lift(add);

// Now we can pass promises as arguments
const result = await addAsync(
    Promise.resolve(1),
    Promise.resolve(2),
    Promise.resolve(3)
);
console.log(result); // 6
```

## API Reference

### Timing Functions

- `sleep(ms: number): Promise<void>` - Pauses execution for the specified milliseconds
- `delay<F extends Fn>(ms: number, fn: F, ...args: Parameters<F>): Promise<ReturnType<F>>` - Delays a function call
- `defer<F extends Fn>(fn: F, ...args: Parameters<F>): Promise<ReturnType<F>>` - Defers a function until the call stack clears

### Promise Utilities

- `future<T>(): [Promise<T>, Resolver<T>, Rejecter]` - Creates a promise that can be resolved or rejected externally
- `withTimeout<A extends any[], R>(asyncFn: (...args: A) => Promise<R>, timeoutInMs: number)` - Adds a timeout to an async function
- `withRetry<A extends any[], R>(fn: (...args: A) => Promise<R>, tries: number, wait?: Wait)` - Adds retry capability
- `expBackoff(minRetryWaitTime: number): Wait` - Creates an exponential backoff strategy

### Concurrency Control

- `Semaphore` - Limits the number of concurrent operations
- `Mutex` - Ensures exclusive access to a resource
- `TaskPool` - Manages a pool of concurrent tasks

### Async Utilities

- `fromAsyncIterator<T>(it: AsyncGenerator<T>): Promise<T[]>` - Collects async iterator values into an array
- `lift<A extends any[], R>(fn: (...args: A) => R)` - Lifts a function to work with promises

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
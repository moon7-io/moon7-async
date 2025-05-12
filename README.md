# 🌙 @moon7/async

[![npm version](https://img.shields.io/npm/v/@moon7/async.svg)](https://www.npmjs.com/package/@moon7/async)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A lightweight, powerful utility library for managing asynchronous operations in JavaScript and TypeScript applications.

## ✨ Features

- 🚀 **Promise utilities** - Create deferred promises, add timeouts, and implement retries with backoff strategies
- 🔒 **Concurrency controls** - Semaphore, Mutex, and TaskPool for managing concurrent operations
- ⏱️ **Timing functions** - Sleep, delay, and defer for precise timing control
- 🔄 **Iterator helpers** - Utilities for working with asynchronous iterators
- 🧩 **Functional utilities** - Lift synchronous functions to work with promises

## 📦 Installation

```bash
# Using npm
npm install @moon7/async

# Using yarn
yarn add @moon7/async

# Using pnpm
pnpm add @moon7/async
```

## 🚀 Usage

### ⏱️ Timing Functions

```typescript
import { sleep, delay, nextTick, timeout } from '@moon7/async';

// Sleep for a specific duration
await sleep(1000);

// Sleep with a return value
const result = await sleep(1000, 'Hello');
// Print the result
console.log(result);

// Create a timeout that will throw after the specified time
try {
    await timeout(5000);
} catch (error) {
    // Will throw a TimeoutError after 5 seconds
}

// Timeout with a custom error
try {
    await timeout(5000, new Error('Custom timeout message'));
} catch (error) {
    // Will throw the custom error after 5 seconds
}

// Delay a function call
const delayedResult = await delay(2000, () => 'Hello after 2 seconds');

// Delay with arguments
const multiply = (a, b) => a * b;
const product = await delay(1000, multiply, 5, 7);

// Execute after the current call stack clears
const deferred = await nextTick(() => 'Executed after current call stack');
```

### 🔄 Deferred Promises with `deferred()`

```typescript
import { deferred } from '@moon7/async';

// Create a promise that can be resolved externally
const [promise, resolve, reject] = deferred();

// Now you can resolve it from anywhere
setTimeout(() => resolve('Completed!'), 3000);

// Use the promise
const result = await promise;
```

### ⏳ Adding Timeouts to Operations

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

### 🔁 Retry Failed Operations

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

### 🚦 Concurrency Control with Semaphore

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

### 🔒 Mutual Exclusion with Mutex

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

### 🧩 Managing Tasks with TaskPool

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

### 🔄 Working with Async Iterators

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

### 🧰 Functional Programming with Promises

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

## 📚 API Reference

| Export                              | Description                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| **⏱️ Timing Functions**              |                                                                                     |
| `sleep(ms, value?)`                 | Pauses execution for the specified milliseconds with optional return value          |
| `timeout(ms)`                       | Creates a promise that rejects with a TimeoutError after the specified milliseconds |
| `delay(ms, fn, ...args)`            | Delays a function call                                                              |
| `nextTick(fn, ...args)`             | Executes a function after the current call stack clears                             |
| **🔄 Promise Utilities**             |                                                                                     |
| `deferred()`                        | Creates a promise that can be resolved or rejected externally                       |
| `withTimeout(asyncFn, timeoutInMs)` | Adds a timeout to an async function                                                 |
| `withRetry(fn, tries, wait)`        | Adds retry capability                                                               |
| `expBackoff(minRetryWaitTime)`      | Creates an exponential backoff strategy                                             |
| **🚦 Concurrency Control**           |                                                                                     |
| `Semaphore`                         | Limits the number of concurrent operations                                          |
| `Mutex`                             | Ensures exclusive access to a resource                                              |
| `TaskPool`                          | Manages a pool of concurrent tasks                                                  |
| **🛠️ Async Utilities**               |                                                                                     |
| `fromAsyncIterator(it)`             | Collects async iterator values into an array                                        |
| `lift(fn)`                          | Lifts a function to work with promises                                              |

## 🔗 Related Libraries

| Library                                                     | Description                                                                     | npm                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [@moon7/async](https://github.com/moon7-io/moon7-async)     | Asynchronous utilities for managing promises, concurrent operations, and timing | [![npm version](https://img.shields.io/npm/v/@moon7/async.svg)](https://www.npmjs.com/package/@moon7/async)     |
| [@moon7/inspect](https://github.com/moon7-io/moon7-inspect) | Runtime type checking with powerful, composable type inspectors                 | [![npm version](https://img.shields.io/npm/v/@moon7/inspect.svg)](https://www.npmjs.com/package/@moon7/inspect) |
| [@moon7/result](https://github.com/moon7-io/moon7-result)   | Functional error handling with Result and Maybe types                           | [![npm version](https://img.shields.io/npm/v/@moon7/result.svg)](https://www.npmjs.com/package/@moon7/result)   |
| [@moon7/signals](https://github.com/moon7-io/moon7-signals) | Reactive programming with Signals, Sources, and Streams                         | [![npm version](https://img.shields.io/npm/v/@moon7/signals.svg)](https://www.npmjs.com/package/@moon7/signals) |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is released under the MIT License. See the [LICENSE](https://github.com/moon7-io/moon7-async/blob/main/LICENSE) file for details.

## 🌟 Acknowledgements

Created and maintained by [Munir Hussin](https://github.com/profound7).

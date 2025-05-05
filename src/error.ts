export class TimeoutError extends Error {
    constructor(message = "Timeout") {
        super(message);
        this.name = "TimeoutError";
    }
}

export class RetryError extends Error {
    constructor(
        message = "Retry failed",
        public readonly lastError?: Error
    ) {
        super(message);
        this.name = "RetryError";
    }
}

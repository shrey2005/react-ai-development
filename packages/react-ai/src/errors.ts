export class AITimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super('TIMEOUT_ERROR');
    this.name = 'AITimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AIHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP_ERROR: ${status}`);
    this.name = 'AIHttpError';
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AITimeoutError extends Error {
  timeoutMs: number;
  constructor(timeoutMs: number) {
    super('TIMEOUT_ERROR');
    this.name = 'AITimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class AITimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`);
    this.name = 'AITimeoutError';
  }
}

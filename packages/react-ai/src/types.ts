export type AIStatus = 'idle' | 'pending' | 'streaming' | 'success' | 'error' | 'cancelled';

export interface UseAIOptions {
  endpoint: string;
  retry?: number;
  retryDelay?: number;
  timeout?: number;
  streaming?: boolean;
}

export interface UseAIReturn<T> {
  data: T | null;
  error: Error | null;
  status: AIStatus;
  isPending: boolean;
  isStreaming: boolean;
  isSuccess: boolean;
  isError: boolean;
  isCancelled: boolean;
  isTimeout: boolean;
  retryAttempt: number;
  generate: (prompt: string) => Promise<void>;
  reset: () => void;
  cancel: () => void;
}

export type AIStatus = 'idle' | 'pending' | 'success' | 'error';

export interface UseAIOptions {
    endpoint: string;
}

export interface UseAIReturn<T> {
  data: T | null;
  error: Error | null;
  status: AIStatus;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  generate: (prompt: string) => Promise<void>;
  reset: () => void;
}
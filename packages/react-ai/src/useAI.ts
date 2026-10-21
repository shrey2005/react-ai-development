import { useState, useCallback, useRef, useEffect } from 'react';
import type { AIStatus, UseAIOptions, UseAIReturn } from './types';

export function useAI<T>(options: UseAIOptions): UseAIReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<AIStatus>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancel();
    }
  }, [cancel]);

  const generate = useCallback(async (prompt: string) => {
    cancel();

    setStatus('pending');
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`HTTP_ERROR: ${res.status}`);
      }

      const json = await res.json();

      if (controller.signal.aborted) return;

      setData(json.data);
      setStatus('success');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('cancelled');
        return;
      }

      setError(err instanceof Error ? err : new Error('UNKNOWN_ERROR'));
      setStatus('error');
    }
    finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [options.endpoint, cancel]);

  const reset = useCallback(() => {
    cancel();
    setData(null);
    setError(null);
    setStatus('idle');
  }, []);

  return {
    data,
    error,
    status,
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    isCancelled: status === 'cancelled',
    generate,
    reset,
    cancel
  };
}
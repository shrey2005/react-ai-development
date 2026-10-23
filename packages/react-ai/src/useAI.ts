import { useState, useCallback, useRef, useEffect } from 'react';
import type { AIStatus, UseAIOptions, UseAIReturn } from './types';
import { AITimeoutError } from './errors';

const isRetriableError = (status?: number) => {
  if (!status) return true;
  return [400, 429, 500, 502, 503, 504].includes(status);
};

const delay = (ms: number, signal: AbortSignal): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
};

export function useAI<T>(options: UseAIOptions): UseAIReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<AIStatus>('idle');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isTimeout, setIsTimeout] = useState(false);
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
    };
  }, [cancel]);

  const generate = useCallback(async (prompt: string) => {
    cancel();

    setStatus('pending');
    setError(null);
    setIsTimeout(false);
    setRetryAttempt(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let currentAttempt = 0;
    const maxRetries = options.retry ?? 0;
    const baseDelay = options.retryDelay ?? 1000;
    const timeoutMs = options.timeout;

    while (currentAttempt <= maxRetries) {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      if (timeoutMs !== undefined && timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          controller.abort(new DOMException('Timeout', 'TimeoutError'));
        }, timeoutMs);
      }

      try {
        const res = await fetch(options.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        });

        // Clear the timeout guard as soon as we have a response.
        if (timeoutId !== null) clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP_ERROR: ${res.status}`);
        }

        const json = await res.json();

        // Guard against state updates after an abort that raced with json().
        if (controller.signal.aborted) return;

        setData(json.data);
        setStatus('success');
        return;
      } catch (err: unknown) {
        // Always clear the per-attempt timeout on any exit path.
        if (timeoutId !== null) clearTimeout(timeoutId);

        // ----------------------------------------------------------------
        // TimeoutError — abort() was called by our own timer.
        // No retries; surface a typed AITimeoutError immediately.
        // ----------------------------------------------------------------
        if (
          err instanceof DOMException &&
          err.name === 'TimeoutError'
        ) {
          const timeoutErr = new AITimeoutError(timeoutMs!);
          setError(timeoutErr);
          setIsTimeout(true);
          setStatus('error');
          abortControllerRef.current = null;
          return;
        }

        // ----------------------------------------------------------------
        // AbortError — triggered by cancel() or component unmount.
        // ----------------------------------------------------------------
        if (err instanceof Error && err.name === 'AbortError') {
          setStatus('cancelled');
          abortControllerRef.current = null;
          return;
        }

        // ----------------------------------------------------------------
        // Retriable / non-retriable HTTP / network errors.
        // ----------------------------------------------------------------
        const retriable = isRetriableError((err as any)?.status);
        if (!retriable || currentAttempt >= maxRetries) {
          setError(err instanceof Error ? err : new Error('UNKNOWN_ERROR'));
          setStatus('error');
          abortControllerRef.current = null;
          return;
        }

        currentAttempt++;
        setRetryAttempt(currentAttempt);

        // Exponential back-off between retries; abortable so cancel() works.
        try {
          await delay(baseDelay * Math.pow(2, currentAttempt - 1), controller.signal);
        } catch (delayErr) {
          if (delayErr instanceof DOMException && delayErr.name === 'AbortError') {
            setStatus('cancelled');
            abortControllerRef.current = null;
            return;
          }
        }
      }
      finally {
        if (abortControllerRef.current === controller && currentAttempt > maxRetries) {
          abortControllerRef.current = null;
        }
      }
    }
  }, [options.endpoint, options.retry, options.retryDelay, options.timeout, cancel]);

  const reset = useCallback(() => {
    cancel();
    setData(null);
    setError(null);
    setStatus('idle');
    setRetryAttempt(0);
    setIsTimeout(false);
  }, [cancel]);

  return {
    data,
    error,
    status,
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
    isCancelled: status === 'cancelled',
    isTimeout,
    retryAttempt,
    generate,
    reset,
    cancel,
  };
}
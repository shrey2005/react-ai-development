import { useState, useCallback, useRef, useEffect } from 'react';
import type { AIStatus, UseAIOptions, UseAIReturn } from './types';
import { AITimeoutError, AIHttpError } from './errors';

const isRetriableError = (status?: number): boolean => {
  if (!status) return true;
  return [408, 429, 500, 502, 503, 504].includes(status);
};

const delay = (ms: number, signal: AbortSignal): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
};

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  if (typeof err === 'object' && err !== null && 'name' in err && (err as { name: unknown }).name === 'AbortError') {
    return true;
  }
  return false;
}

function isTimeoutError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'TimeoutError') return true;
  if (err instanceof Error && err.name === 'TimeoutError') return true;
  if (typeof err === 'object' && err !== null && 'name' in err && (err as { name: unknown }).name === 'TimeoutError') {
    return true;
  }
  return false;
}

function getErrorStatus(err: unknown): number | undefined {
  if (err instanceof AIHttpError) return err.status;
  if (typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status: unknown }).status === 'number') {
    return (err as { status: number }).status;
  }
  return undefined;
}

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
      setStatus('cancelled');
    }
  }, []);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  const generate = useCallback(
    async (prompt: string) => {
      cancel();

      setData(null);
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
            body: JSON.stringify({
              prompt,
              ...(options.streaming !== undefined ? { streaming: options.streaming } : {}),
            }),
            signal: controller.signal,
          });

          // Clear the timeout guard as soon as we have a response.
          if (timeoutId !== null) clearTimeout(timeoutId);

          if (!res.ok) {
            throw new AIHttpError(res.status);
          }

          if (options.streaming) {
            if (!res.body) {
              throw new Error('Response body is null');
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            setStatus('streaming');

            const abortHandler = () => {
              try {
                reader.cancel().catch(() => {
                  // Ignore cancellation rejection
                });
              } catch {
                // Ignore synchronous cancellation errors
              }
            };
            controller.signal.addEventListener('abort', abortHandler, { once: true });

            try {
              while (true) {
                if (controller.signal.aborted) break;
                const { done, value } = await reader.read();
                if (done || controller.signal.aborted) break;

                const chunk = decoder.decode(value, { stream: true });
                setData((prev) => ((prev ?? '') + chunk) as unknown as T);
                setStatus('streaming');
              }
            } catch (readErr: unknown) {
              if (isAbortError(readErr) || controller.signal.aborted) {
                setStatus('cancelled');
                abortControllerRef.current = null;
                return;
              }
              throw readErr;
            } finally {
              controller.signal.removeEventListener('abort', abortHandler);
            }

            if (controller.signal.aborted) {
              setStatus('cancelled');
              abortControllerRef.current = null;
              return;
            }

            setStatus('success');
            return;
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
          if (isTimeoutError(err)) {
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
          if (isAbortError(err) || controller.signal.aborted) {
            setStatus('cancelled');
            abortControllerRef.current = null;
            return;
          }

          // ----------------------------------------------------------------
          // Retriable / non-retriable HTTP / network errors.
          // ----------------------------------------------------------------
          const errorStatus = getErrorStatus(err);
          const retriable = isRetriableError(errorStatus);
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
          } catch (delayErr: unknown) {
            if (isAbortError(delayErr) || controller.signal.aborted) {
              setStatus('cancelled');
              abortControllerRef.current = null;
              return;
            }
          }
        } finally {
          if (abortControllerRef.current === controller && currentAttempt > maxRetries) {
            abortControllerRef.current = null;
          }
        }
      }
    },
    [options.endpoint, options.retry, options.retryDelay, options.timeout, options.streaming, cancel]
  );

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
    isStreaming: status === 'streaming',
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

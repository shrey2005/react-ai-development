import { useState, useCallback } from 'react';
import type { AIStatus, UseAIOptions, UseAIReturn } from './types';

export function useAI<T>(options: UseAIOptions): UseAIReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<AIStatus>('idle');

  const generate = useCallback(async (prompt: string) => {
    setStatus('pending');
    setError(null);
    
    try {
      const res = await fetch(options.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP_ERROR: ${res.status}`);
      }
      
      const json = await res.json();
      setData(json.data);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('UNKNOWN_ERROR'));
      setStatus('error');
    }
  }, [options.endpoint]);

  const reset = useCallback(() => {
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
    generate,
    reset
  };
}
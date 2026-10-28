import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAI, AITimeoutError, AIHttpError } from '../src/index';

const mockedFetch = vi.fn();
global.fetch = mockedFetch;

describe('useAI Phase 1', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('exports all library symbols properly', () => {
        expect(typeof useAI).toBe('function');
        expect(typeof AITimeoutError).toBe('function');
        expect(typeof AIHttpError).toBe('function');

        const timeoutErr = new AITimeoutError(5000);
        expect(timeoutErr).toBeInstanceOf(Error);
        expect(timeoutErr).toBeInstanceOf(AITimeoutError);
        expect(timeoutErr.timeoutMs).toBe(5000);
        expect(timeoutErr.message).toBe('TIMEOUT_ERROR');

        const httpErr = new AIHttpError(503);
        expect(httpErr).toBeInstanceOf(Error);
        expect(httpErr).toBeInstanceOf(AIHttpError);
        expect(httpErr.status).toBe(503);
        expect(httpErr.message).toBe('HTTP_ERROR: 503');
    });

    it('transitions idle -> pending -> success', async () => {
        mockedFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: 'Hello World' }),
        });

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai' }));

        expect(result.current.status).toBe('idle');

        await act(async () => {
            await result.current.generate('Hello');
        });

        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual('Hello World');
        expect(result.current.isPending).toBe(false);
    });

    it('reset state correctly', async () => {
        const { result } = renderHook(() => useAI({ endpoint: '/api/ai' }));

        act(() => {
            result.current.reset();
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.data).toBe(null);
    });
});

describe('useAI Phase 2', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handle explicit cancellation', async () => {
        mockedFetch.mockImplementationOnce(() => new Promise((_, reject) => {
            setTimeout(() => {
                reject(new DOMException('Aborted', 'AbortError'));
            }, 100);
        }));

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai' }));

        act(() => {
            result.current.generate('Hello');
        });

        expect(result.current.status).toBe('pending');

        await act(async () => {
            result.current.cancel();
            await new Promise(r => setTimeout(r, 200));
        });

        expect(result.current.status).toBe('cancelled');
        expect(result.current.isCancelled).toBe(true);
        expect(result.current.isPending).toBe(false);
    });

    it('cancles pending request on unnmount', () => {
        const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

        const { result, unmount } = renderHook(() => useAI({ endpoint: '/api/ai' }));

        act(() => {
            result.current.generate('Hello');
        });

        unmount();

        expect(abortSpy).toHaveBeenCalled();
    });
});

describe('useAI Phase 3 retry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retires on 500 and succeed', async () => {
        mockedFetch.mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce({ ok: true, json: async () => ({ data: 'Success' }) });
        const { result } = renderHook(() => useAI({ endpoint: '/api/ai', retry: 1, retryDelay: 10 }));

        let promise: Promise<void> | null = null;
        act(() => {
            promise = result.current.generate('Hello');
        });

        await act(async () => {
            await promise;
        });

        expect(mockedFetch).toHaveBeenCalledTimes(2);
        expect(result.current.status).toBe('success');
        expect(result.current.retryAttempt).toBe(1);
        expect(result.current.data).toBe('Success');
    });

    it('exhausts retries and errors', async () => {
        mockedFetch.mockResolvedValue({ ok: false, status: 500 });

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai', retry: 2, retryDelay: 10 }));

        let promise: Promise<void> | null = null;
        act(() => {
            promise = result.current.generate('Hello');
        });

        await act(async () => {
            await promise;
        });

        expect(mockedFetch).toHaveBeenCalledTimes(3);
        expect(result.current.status).toBe('error');
        expect(result.current.retryAttempt).toBe(2);
    });

    it('does not retry 400 client errors', async () => {
        mockedFetch.mockResolvedValue({ ok: false, status: 400 });

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai', retry: 2, retryDelay: 10 }));

        let promise: Promise<void> | null = null;
        act(() => {
            promise = result.current.generate('Hello');
        });

        await act(async () => {
            await promise;
        });

        expect(mockedFetch).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('error');
        expect(result.current.retryAttempt).toBe(0);
    });

    it('aborts on timeout and skips retry', async () => {
        mockedFetch.mockImplementationOnce((_url: unknown, init: RequestInit) => new Promise((resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
                reject(new DOMException('Timeout', 'TimeoutError'));
            });
            setTimeout(() => {
                resolve({ ok: true, json: async () => ({ data: 'Late' }) });
            }, 200);
        }));

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai', retry: 2, timeout: 50 }));

        let promise: Promise<void> | null = null;
        act(() => {
            promise = result.current.generate('Hello');
        });

        await act(async () => {
            await promise;
        });

        expect(mockedFetch).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('error');
        expect(result.current.error?.message).toBe('TIMEOUT_ERROR');
        expect(result.current.retryAttempt).toBe(0);
    });

    it('handles cancellation during backoff delay', async () => {
        mockedFetch.mockResolvedValueOnce({ ok: false, status: 500 });

        const { result } = renderHook(() =>
            useAI({ endpoint: '/api/ai', retry: 2, retryDelay: 500 })
        );

        act(() => {
            result.current.generate('Backoff abort');
        });

        // Wait past initial fetch failure to enter retry delay
        await act(async () => {
            await new Promise(r => setTimeout(r, 50));
        });

        expect(result.current.retryAttempt).toBe(1);

        // Cancel during backoff delay sleep
        await act(async () => {
            result.current.cancel();
            await new Promise(r => setTimeout(r, 50));
        });

        expect(result.current.status).toBe('cancelled');
        expect(result.current.isCancelled).toBe(true);
    });
});

describe('useAI Phase 5 streaming', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('mocks fetch returning ReadableStream, validates chunk accumulation and streaming status transition', async () => {
        const encoder = new TextEncoder();
        const chunks = ['Hello', ' ', 'Streaming', ' ', 'World!'];

        const stream = new ReadableStream({
            start(controller) {
                for (const chunk of chunks) {
                    controller.enqueue(encoder.encode(chunk));
                }
                controller.close();
            }
        });

        mockedFetch.mockResolvedValueOnce({
            ok: true,
            body: stream,
        });

        const { result } = renderHook(() =>
            useAI({ endpoint: '/api/ai/generate', streaming: true })
        );

        expect(result.current.status).toBe('idle');
        expect(result.current.isStreaming).toBe(false);

        let promise: Promise<void> | null = null;
        act(() => {
            promise = result.current.generate('Stream prompt');
        });

        await act(async () => {
            await promise;
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isStreaming).toBe(false);
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toBe('Hello Streaming World!');
    });

    it('validates chunk accumulation and streaming status during stream consumption', async () => {
        const encoder = new TextEncoder();
        let streamController: ReadableStreamDefaultController<Uint8Array>;

        const stream = new ReadableStream({
            start(controller) {
                streamController = controller;
            }
        });

        mockedFetch.mockResolvedValueOnce({
            ok: true,
            body: stream,
        });

        const { result } = renderHook(() =>
            useAI({ endpoint: '/api/ai/generate', streaming: true })
        );

        let promise: Promise<void> | null = null;
        act(() => {
            promise = result.current.generate('Test incremental');
        });

        await act(async () => {
            streamController!.enqueue(encoder.encode('Chunk 1'));
        });

        expect(result.current.status).toBe('streaming');
        expect(result.current.isStreaming).toBe(true);
        expect(result.current.data).toBe('Chunk 1');

        await act(async () => {
            streamController!.enqueue(encoder.encode(' Chunk 2'));
        });

        expect(result.current.status).toBe('streaming');
        expect(result.current.isStreaming).toBe(true);
        expect(result.current.data).toBe('Chunk 1 Chunk 2');

        await act(async () => {
            streamController!.close();
            await promise;
        });

        expect(result.current.status).toBe('success');
        expect(result.current.isStreaming).toBe(false);
        expect(result.current.data).toBe('Chunk 1 Chunk 2');
    });

    it('handles AbortError during streaming and breaks loop', async () => {
        const encoder = new TextEncoder();
        let streamController: ReadableStreamDefaultController<Uint8Array>;

        const stream = new ReadableStream({
            start(controller) {
                streamController = controller;
            }
        });

        mockedFetch.mockResolvedValueOnce({
            ok: true,
            body: stream,
        });

        const { result } = renderHook(() =>
            useAI({ endpoint: '/api/ai/generate', streaming: true })
        );

        act(() => {
            result.current.generate('Test abort during stream');
        });

        await act(async () => {
            streamController!.enqueue(encoder.encode('Initial'));
        });

        expect(result.current.status).toBe('streaming');
        expect(result.current.data).toBe('Initial');

        await act(async () => {
            result.current.cancel();
        });

        expect(result.current.status).toBe('cancelled');
        expect(result.current.isCancelled).toBe(true);
        expect(result.current.isStreaming).toBe(false);
    });

    it('throws error when streaming response body is null', async () => {
        mockedFetch.mockResolvedValueOnce({
            ok: true,
            body: null,
        });

        const { result } = renderHook(() =>
            useAI({ endpoint: '/api/ai/generate', streaming: true })
        );

        let promise: Promise<void> | null = null;
        act(() => {
            promise = result.current.generate('Null body test');
        });

        await act(async () => {
            await promise;
        });

        expect(result.current.status).toBe('error');
        expect(result.current.error?.message).toBe('Response body is null');
    });

    it('handles unexpected reader stream errors', async () => {
        const stream = new ReadableStream({
            start(controller) {
                controller.error(new Error('Stream broken'));
            }
        });

        mockedFetch.mockResolvedValueOnce({
            ok: true,
            body: stream,
        });

        const { result } = renderHook(() =>
            useAI({ endpoint: '/api/ai/generate', streaming: true })
        );

        let promise: Promise<void> | null = null;
        act(() => {
            promise = result.current.generate('Stream error test');
        });

        await act(async () => {
            await promise;
        });

        expect(result.current.status).toBe('error');
        expect(result.current.error?.message).toBe('Stream broken');
    });
});

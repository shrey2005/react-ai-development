import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAI } from '../src/useAI';

global.fetch = vi.fn();

describe('useAI Phase 1', () => {
    it('transitions idle -> pending -> success', async () => {
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: 'Hello World' }),
        });

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai' }));

        expect(result.current.status).toBe('idle');

        await act(async () => {
            await result.current.generate('Hello');
        })

        expect(result.current.status).toBe('success');
        expect(result.current.data).toEqual('Hello World');
        expect(result.current.isPending).toBe(false);

    });

    it("reset state correctly", async () => {
        const { result } = renderHook(() => useAI({ endpoint: '/api/ai' }));

        act(() => {
            result.current.reset();
        })

        expect(result.current.status).toBe('idle');
        expect(result.current.data).toBe(null);
    })
})

describe('useAI Phase 2', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handle explicit cancellation', async () => {
        let resolveFetch = null;
        fetch.mockImplementationOnce(() => new Promise((resolve, reject) => {
            resolveFetch = resolve;

            setTimeout(() => {
                reject(new DOMException('Aborted', 'AbortError'));
            }, 100)
        }));

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai' }));

        act(() => {
            result.current.generate("Hello");
        })

        expect(result.current.status).toBe('pending');

        act(() => {
            result.current.cancel();
        })

        await new Promise(r => setTimeout(r, 200));

        expect(result.current.status).toBe('cancelled');
        expect(result.current.isCancelled).toBe(true);
        expect(result.current.isPending).toBe(false);
    })

    it('cancles pending request on unnmount', () => {
        let abortSpy = vi.spyOn(AbortController.prototype, 'abort');

        const { result, unmount } = renderHook(() => useAI({ endpoint: '/api/ai' }));

        act(() => {
            result.current.generate("Hello");
        })

        unmount();

        expect(abortSpy).toHaveBeenCalled();
    })

})

describe("useAI Phase 3 retry", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("retires on 500 and succeed", async () => {
        fetch.mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce({ ok: true, json: async () => ({ data: 'Success' }) });
        const { result } = renderHook(() => useAI({ endpoint: '/api/ai', retry: 1, retryDelay: 10 }))

        let promise = null
        act(() => {
            promise = result.current.generate("Hello");
        })

        await act(async () => {
            await promise;
        });

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(result.current.status).toBe('success');
        expect(result.current.retryAttempt).toBe(1);
        expect(result.current.data).toBe('Success');
    });

    it("exhausts retries and errors", async () => {
        fetch.mockResolvedValue({ ok: false, status: 500 });

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai', retry: 2, retryDelay: 10 }));

        let promise = null;
        act(() => {
            promise = result.current.generate("Hello");
        })

        await act(async () => {
            await promise;
        })

        expect(fetch).toHaveBeenCalledTimes(3);
        expect(result.current.status).toBe('error');
        expect(result.current.retryAttempt).toBe(2);
    })

    it("does not retry 400 client errors", async () => {
        fetch.mockResolvedValue({ ok: false, status: 400 })

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai', retry: 2, retryDelay: 10 }))

        let promise = null;
        act(() => {
            promise = result.current.generate("Hello");
        })

        await act(async () => {
            await promise;
        })

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('error');
        expect(result.current.retryAttempt).toBe(0);
    })

    it("aborts on timeout and skips retry", async () => {
        fetch.mockResolvedValue({ ok: true, json: async () => ({ data: 'Late' }) })

        const { result } = renderHook(() => useAI({ endpoint: '/api/ai', retry: 2, timeout: 50 }))

        let promise = null;
        act(() => {
            promise = result.current.generate("Hello");
        })

        await act(async () => {
            await promise;
        })

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('error');
        expect(result.current.error?.message).toBe('TIMEOUT_ERROR');
        expect(result.current.retryAttempt).toBe(0);
    })
})
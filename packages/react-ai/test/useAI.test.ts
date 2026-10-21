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
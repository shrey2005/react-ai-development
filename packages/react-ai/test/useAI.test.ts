import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
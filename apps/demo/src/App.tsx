import { useState } from 'react';
import { useAI } from '@shrey/react-ai';

export default function App() {
    const [prompt, setPrompt] = useState('');
    const { data, status, error, isPending, isStreaming, generate, reset, cancel, retryAttempt } = useAI({
        endpoint: 'http://localhost:8000/api/ai/generate',
        retry: 2,
        retryDelay: 2000,
        timeout: 3000,
        streaming: true,
    });

    const isBusy = isPending || isStreaming;

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>React AI Phase 5 Demo</h1>
            <div>
                <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isBusy}
                    placeholder="Ask Gemini..."
                />
                <button onClick={() => generate(prompt)} disabled={isBusy || !prompt}>
                    {isBusy ? 'Generating...' : 'Generate'}
                </button>
                <button onClick={cancel} disabled={!isBusy}>
                    Cancel
                </button>
                <button onClick={reset}>Reset</button>
            </div>

            <p>
                <strong>Status: </strong>{status} {retryAttempt > 0 && `(Retry ${retryAttempt}/2)`}
            </p>
            {error && <p style={{ color: 'red' }}><strong>Error: </strong>{error.message}</p>}
            {data && (
                <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                    <strong>Response: </strong>
                    <p>{data}</p>
                </div>
            )}
        </div>
    );
}

import { useState } from 'react';
import { useAI } from '@shrey/react-ai';

export default function App() {
    const [prompt, setPrompt] = useState('');
    const { data, status, error, isPending, generate, reset, cancel } = useAI({
        endpoint: 'http://localhost:8000/api/ai/generate',
    })

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>React AI Phase 2 Demo</h1>
            <div>
                <input value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={isPending} placeholder="Ask Gemini..." />
                <button onClick={() => generate(prompt)} disabled={isPending || !prompt}>{isPending ? 'Generating...' : 'Generate'}</button>
                <button onClick={cancel} disabled={!isPending}>
                    Cancel
                </button>
                <button onClick={reset}>Reset</button>
            </div>

            <p><strong>Status: </strong>{status}</p>
            {error && <p style={{ color: 'red' }}><strong>Error: </strong>{error.message}</p>}
            {data && (
                <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                    <strong>Response: </strong>
                    <p>{data}</p>
                </div>
            )}
        </div>
    )
}
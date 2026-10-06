import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@shrey/react-ai': path.resolve(__dirname, '../../packages/react-ai/src/index.ts')
        }
    }
});
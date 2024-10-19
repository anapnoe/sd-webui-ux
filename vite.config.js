import {defineConfig} from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: path.resolve(__dirname, 'javascript/src/index.js'), // Change this to your entry point
            output: {
                dir: path.resolve(__dirname, 'javascript/dist'),
                format: 'es',
                entryFileNames: 'index.js', // Name your output bundle
                manualChunks: () => 'index.js', // Creates a single output file
            },
        },
        outDir: 'dist', // Output directory
    },
});

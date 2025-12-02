import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'codemirror-vendor': [
            '@uiw/react-codemirror',
            '@codemirror/view',
            '@codemirror/state',
            '@codemirror/lang-markdown',
          ],
          'mermaid-vendor': ['mermaid'],
          'utils-vendor': ['marked', 'dompurify', 'html2canvas', 'jspdf'],
        },
      },
    },
  },
})

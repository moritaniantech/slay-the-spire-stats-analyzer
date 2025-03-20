import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'electron-store', 'sqlite3', 'path', 'fs'],
              output: {
                format: 'cjs'
              }
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            minify: false,
            sourcemap: 'inline',
            rollupOptions: {
              external: ['electron', 'path', 'fs'],
              output: {
                format: 'cjs'
              }
            },
          },
        },
        onstart(options) {
          options.reload();
        },
      },
    ]),
    renderer(),
  ],
  build: {
    rollupOptions: {
      external: ['electron-store', 'sqlite3', 'path', 'fs']
    }
  },
  optimizeDeps: {
    exclude: ['sqlite3', 'path', 'fs']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  json: {
    stringify: true,
  },
})

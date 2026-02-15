import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// copyAssets 関数は完全に削除

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProd = mode === 'production';
  const isDev = mode === 'development';
  // isServe, isBuild, sourcemap は renderer の設定にないので一旦削除（必要なら後で追加）
  
  console.log(`[vite.config] モード: ${mode}, コマンド: ${command}, 本番環境: ${isProd}`);
  
  return {
    plugins: [
      react(),
      electron([
        {
          entry: 'electron/main.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: [
                  'electron',
                  'electron-store',
                  'electron-log',
                  'sqlite3',
                  'chokidar',
                  'path',
                  'fs'
                ],
                output: {
                  format: 'cjs',
                  inlineDynamicImports: true
                }
              },
            },
            resolve: {
              alias: {
                // electron-store のエイリアスは残す (もし使っていれば)
                // 'electron-store': require.resolve('electron-store') 
              }
            },
            optimizeDeps: {
              // exclude: ['electron-store'] // 同上
            }
          },
        },
        {
          entry: 'electron/preload.ts',
          vite: {
            build: {
              outDir: 'dist-electron',
              minify: isProd, // 本番環境でのみ minify
              sourcemap: isDev ? 'inline' : false, // 開発環境でのみ sourcemap
              rollupOptions: {
                external: [
                  'electron',
                  'electron-store',
                  'electron-log',
                  'chokidar',
                  'path',
                  'fs'
                ],
                output: {
                  format: 'cjs',
                  inlineDynamicImports: true
                }
              },
            }
          },
          onstart(options) {
            options.reload();
          },
        },
      ]),
      renderer(), // renderer プラグインの設定も確認が必要なら後で
    ],
    base: '/',
    define: {
      '__ASSET_BASE_PATH__': JSON.stringify(isProd ? 'asset://' : '/assets/'),
      '__IS_DEVELOPMENT__': isDev,
      '__IS_PRODUCTION__': isProd
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        external: ['electron-store', 'sqlite3', 'chokidar', 'path', 'fs'],
        output: {
          format: 'cjs',
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
        }
      },
      assetsInlineLimit: 0,
      sourcemap: isDev, // 開発環境でのみ sourcemap
    },
    optimizeDeps: {
      exclude: ['sqlite3', 'chokidar', 'path', 'fs']
    },
    resolve: {
      alias: {
        '@': 'src'
      },
    },
    json: {
      stringify: true,
    },
  }
})

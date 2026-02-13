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
    assetsInclude: ['src/assets/**/*'],
    base: '/',
    define: {
      '__ASSET_BASE_PATH__': JSON.stringify(isProd ? 'asset://' : '/src/assets/'),
      '__IS_DEVELOPMENT__': isDev,
      '__IS_PRODUCTION__': isProd
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        external: ['electron-store', 'sqlite3', 'path', 'fs'],
        output: {
          format: 'cjs',
          assetFileNames: (assetInfo) => {
            console.log('[assetFileNames] assetInfo.name:', assetInfo.name);
            // src/assets/ からのファイルは dist/assets/ 以下に配置
            if (assetInfo.name && assetInfo.name.startsWith('src/assets/')) {
              const relativePath = assetInfo.name.substring('src/assets/'.length);
              return `assets/${relativePath}`;
            }
            // public ディレクトリ内のアセットは Vite が dist のルートに構造を維持してコピーするため、
            // ここで特別な処理は不要。Vite のデフォルトの挙動に任せる。
            // もし public/assets/foo.png があったら、dist/assets/foo.png になる。
            // getAssetUrl('/assets/foo.png') で参照できるようになる。
            
            // 上記以外のアセット（例: CSSから参照される画像など）はデフォルトの命名規則
            return 'assets/[name]-[hash][extname]';
          },
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
        }
      },
      assetsInlineLimit: 0, 
      sourcemap: isDev, // 開発環境でのみ sourcemap
    },
    optimizeDeps: {
      exclude: ['sqlite3', 'path', 'fs']
    },
    resolve: {
      alias: {
        '@': 'src',
        'assets': 'src/assets'
      },
    },
    json: {
      stringify: true,
    },
  }
})

# StS Stats Analyzer

Slay the Spire のプレイデータを解析・可視化する Electron デスクトップアプリケーション。

## 技術スタック
- 言語: TypeScript 5.8
- フレームワーク: Electron 35 + React 19 + Vite 6
- 状態管理: Zustand 5 + Redux Toolkit 2
- UI: TailwindCSS 3 + DaisyUI 5 + Framer Motion
- DB: sqlite3（ネイティブモジュール）
- i18n: i18next
- チャート: Chart.js + react-chartjs-2

## コマンド
- 開発: `yarn electron:dev`（Vite + Electron 同時起動）
- ビルド: `yarn build`（Vite のみ）
- 型チェック: `tsc -b --noEmit`
- 型チェック+ビルド: `yarn build:typecheck`
- Windows ビルド: `yarn build:win`
- macOS ビルド: `yarn build:mac`
- 全プラットフォーム: `yarn build:all`
- リント: `yarn lint`

## ディレクトリ構成
```
electron/           # メインプロセス
  main.ts           # エントリポイント（IPC ハンドラ、asset:// プロトコル）
  preload.ts        # IPC ブリッジ
  utils/            # ファイル操作、アセット検証、バックアップ
src/                # レンダラープロセス
  App.tsx            # ルートコンポーネント（ルーティング、Layout）
  main.tsx           # エントリポイント（フォント読み込み）
  store.ts           # Zustand + Redux ストア
  components/        # React コンポーネント
  services/          # StatsService（統計計算）
  utils/             # アセットURL生成、環境検出、キャラクター正規化
  types/             # 型定義
public/assets/      # アセット（唯一のソース）
resources/          # ビルド時にコピーされるアセット
```

## コーディング規約
- コメント: 日本語
- 命名: React コンポーネントは PascalCase、関数・変数は camelCase
- アセットアクセス: `asset://` プロトコル（Electron）、`/assets/`（開発）
- ルーティング: `file://` → HashRouter、`http://` → BrowserRouter

## 重要な設計判断
- `public/assets/` がアセットの唯一のソース（`src/assets/` は廃止済み）
- ビルド設定は `electron-builder.json` に一元化（`package.json` の `build` 不使用）
- electron-store でユーザー設定を永続化
- `getAssetUrl()` 同期関数でアセットURL生成（IPC 不要）
- コード分割: RunDetail/PlayDetail/CardList/RelicList/NeowBonusList を React.lazy 化

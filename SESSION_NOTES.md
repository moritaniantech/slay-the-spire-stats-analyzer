# SESSION NOTES

### [2026-02-19] 脆弱性対応・CI整備 — 未使用依存19パッケージ削除・Dependabot/セキュリティスキャン導入

- **決定事項**:
  - 未使用パッケージ（typeorm, crypto-browserify 等19件）は完全削除
  - 推移的依存の脆弱性は yarn resolutions で強制バージョン指定
  - Dependabot は npm + GitHub Actions を週次チェック、patch/minor は自動マージ
  - セキュリティスキャンは gitleaks + Semgrep + Trivy の3ジョブ構成

- **実装した内容**:
  - `package.json` — 未使用19パッケージ削除、react-router-dom/vite/electron/glob 更新、resolutions追加（js-yaml, lodash, tar-fs, tmp）
  - `.github/dependabot.yml`（新規）— npm + GitHub Actions 週次更新チェック、minor/patch グループ化
  - `.github/workflows/dependabot-auto-merge.yml`（新規）— patch/minor 自動マージ、major は手動レビュー
  - `.github/workflows/security-scan.yml`（新規）— gitleaks/Semgrep/Trivy 週次スキャン、SARIF でGitHub Security連携

- **脆弱性対応結果**:
  - 解消: 20/26件（Critical 2件含む — pbkdf2, sha.js は未使用パッケージ削除で解消）
  - 残存: 6件（tar@6 x4 + ajv@6 x1 + tailwindcss oxide tar — ビルドツール推移的依存、上流対応待ち）
  - 削除パッケージ: typeorm, crypto-browserify, stream-browserify, buffer, util, vite-plugin-node-polyfills, reflect-metadata, @npmcli/arborist, @npmcli/fs, @npmcli/package-json, @electron/remote, electron-is-dev, @emotion/is-prop-valid, @emotion/react, @headlessui/react, html-react-parser, react-switch, @eslint/config-array, @eslint/object-schema
  - 2ファイル変更: +123 / -1947行

- **コミット**: 40b79d6（脆弱性対応）, cfb38b8（CI整備）

- **未解決の課題**:
  - 残存脆弱性6件（tar@6, ajv@6 — ビルドツール推移的依存）
  - `window.electron` レガシー参照の整理
  - README にスクリーンショットを追加
  - auto-update の E2E テスト（次回リリース時）

- **次のステップ**:
  - `window.electron` レガシー参照の調査・整理（Medium priority）
  - README にスクリーンショット追加（Low priority）
  - 次回リリース時に auto-update の E2E テスト

### [2026-02-19] コードレビュー指摘の修正 — セキュリティ・リソースクリーンアップ・型定義統一

- **決定事項**:
  - `app-getPath` は許可リスト方式（userData, appData, temp, desktop, documents, downloads のみ）
  - `debug-resources` は `app.isPackaged` チェックで本番無効化（内部パス情報を返さない）
  - `set-theme` は light/dark のみ受け付けるバリデーション追加
  - `fs-readFile` のディレクトリ境界チェックを `startsWith` → `relative()` 方式に改善
  - 型定義は `src/vite-env.d.ts` を唯一の正本とし、他ファイルの重複定義を削除
  - CI permissions は workflow 全体 `contents: read`、release job のみ `contents: write`
  - ログレベルは本番 `info`、開発 `debug` に分離

- **実装した内容**:
  - `electron/main.ts` — app-getPath 許可リスト、debug-resources 本番無効化、set-theme バリデーション、fs-readFile `relative()` 境界チェック、ログレベル調整、UpdateHandler.destroy() 呼び出し
  - `electron/updater.ts` — `safeSend()` メソッド（isDestroyed チェック）、`removeAllListeners()` 重複防止、`setInterval` 戻り値保存+`destroy()` でクリーンアップ、`ipcMain.handle` try-catch 二重登録防止、エラーオブジェクトのサニタイズ、ログレベル調整
  - `electron/preload.ts` — 本番 console.log 2行削除、コメントアウト型チェックコード削除
  - `src/vite-env.d.ts` — IElectronAPI に `onNewRunDetected` 追加、正本としてコメント明記
  - `src/global.d.ts` — electronAPI 重複定義を削除、Viteグローバル・レガシーAPI・__APP_SETTINGS__ のみ残す
  - `src/types/electron-api.d.ts` — Window 拡張を削除、FilePickerOptions/FilePickerResult モジュール宣言のみ残す
  - `.github/workflows/release.yml` — workflow permissions `contents: read`、release job に `permissions: contents: write`、verify ステップの exit 修正（サブシェル問題解消）
  - `src/components/UpdateNotification.tsx` — エラー時の progress リセット追加
  - 削除: `src/components/Settings.tsx`（未使用）、`src/types/electron.d.ts`、`src/types/globals.d.ts`

- **Codexレビュー結果**: WARNING 1 / GOOD 8
  - WARNING 1: fs-readFile の `startsWith` ディレクトリ境界チェック不足 → `relative()` 方式に修正済み

- **ビルド結果**:
  - TypeScript 型チェック: エラー 0件
  - Vite ビルド: 成功
  - 変更ファイル: 11ファイル、+153 / -522行

- **コミット**: a438844

- **未解決の課題**:
  - Dependabot が31件の脆弱性を検出（4 critical, 13 high, 7 moderate, 7 low）
  - asset-protocol の `ReferenceError: Cannot access 'o' before initialization`（既存問題）
  - README にスクリーンショットを追加（未着手）
  - auto-update のダウンロード→再起動 E2E テスト（次回リリース時に検証）
  - `window.electron`（レガシーAPI）が environment.ts, ImageAsset.tsx で参照されているが preload.ts では公開されていない（デッドコードの可能性）

- **次のステップ**:
  - Dependabot の脆弱性対応（特に critical 4件）
  - `window.electron` レガシー参照の調査・整理
  - 次回リリース時に auto-update の E2E テスト
  - README にスクリーンショットを追加

### [2026-02-18] auto-update 修正・実機テスト・バージョン表示

- **決定事項**:
  - `artifactName` を明示的にハイフン区切りで指定（`productName` のスペースがドット/ハイフンに不一致変換される問題を回避）
  - リポジトリを private → public に変更（`releases.atom` への未認証アクセスに必要）
  - `autoDownload = true` に変更（バックグラウンド自動ダウンロード方式、UIはダウンロード完了後に「再起動して更新」ボタンのみ）
  - GitHub Releases で auto-update は十分に対応可能（CDN 不要、GitHub 自体が Fastly CDN 経由で配信）
  - 実際の設定ページは `App.tsx` 内の `SettingsPage`（`Settings.tsx` は未使用の重複コンポーネント）

- **実装した内容**:
  - `electron-builder.json` — `mac.artifactName` を `StS-Stats-Analyzer-${version}-${arch}.${ext}` に変更、`nsis.artifactName` を追加
  - `.github/workflows/release.yml` — `Verify latest YAML URLs match build artifacts` 検証ステップを追加
  - `README.md` — ダウンロードファイル名をハイフン区切りに更新
  - `electron/updater.ts` — `autoDownload = true` に変更、`download-update` IPCハンドラ追加
  - `src/components/UpdateNotification.tsx` — DaisyUI toast スタイルに全面改修（ダウンロード中→再起動の2状態）
  - `electron/main.ts` — `app-getVersion` IPCハンドラ追加
  - `electron/preload.ts` — `downloadUpdate`, `getAppVersion` メソッド追加
  - `src/App.tsx` — `SettingsPage` にバージョン表示を追加
  - 型定義5ファイル — `downloadUpdate`, `getAppVersion` 追加

- **Codexレビュー結果**:
  - v1.2.1（ファイル名修正）: WARNING 1 / INFO 1 / GOOD 3 → 全対応済み
  - v1.2.2（UI改善）: WARNING 2 / INFO 2 / GOOD 2 → WARNING 2件対応済み

- **リリース**:
  - v1.2.1: auto-update ファイル名不一致修正 — CI 成功、全アセット名一致確認
  - v1.2.2: UpdateNotification UI 改善（DaisyUI、ダウンロードボタン）— CI 成功
  - v1.2.3: autoDownload=true、UIシンプル化 — CI 成功

- **実機テスト結果**:
  - v1.2.0 インストール → releases.atom 404（private リポジトリ）→ public 化で解決
  - v1.2.0 再起動 → v1.2.1 検出成功（`isUpdateAvailable: true`）
  - v1.2.3 インストール → 最新版のため `isUpdateAvailable: false`（正常）
  - 開発サーバーで設定画面バージョン表示を確認

- **コミット**: 95fc30f, 454d22e, dd0d256, eb74090, e48a33b

- **未解決の課題**:
  - Dependabot が32件の脆弱性を検出（4 critical, 13 high, 8 moderate, 7 low）— public 化で有効に
  - asset-protocol の `ReferenceError: Cannot access 'o' before initialization`（既存問題、auto-update とは無関係）
  - `src/components/Settings.tsx` が未使用（`App.tsx` 内の `SettingsPage` と重複）— 削除候補
  - README にスクリーンショットを追加（未着手）
  - auto-update のダウンロード→再起動フローの完全な E2E テストは未実施（v1.2.3 が最新のため次回リリース時に検証）

- **次のステップ**:
  - Dependabot の脆弱性対応（特に critical 4件）
  - 次回リリース時に auto-update の E2E テスト（ダウンロード→再起動→バージョン更新の確認）
  - README にスクリーンショットを追加
  - `Settings.tsx` の削除（未使用コンポーネント整理）

### [2026-02-17] 公開リリース運用整備 — ビルド安定化・CI修正・自動アップデート・ドキュメント

- **決定事項**:
  - `extraResources` を `public/assets` に直接向け、`resources/assets` への `cp` ステップを廃止
  - CI を build ジョブ（matrix）と release ジョブ（単一）に分離し、リリースアップロード競合を解消
  - build ジョブから `GH_TOKEN`/`GITHUB_TOKEN` を除去し、electron-builder の自動 publish を防止
  - `UpdateHandler` は `loadURL`/`loadFile` より前に初期化（レースコンディション防止）
  - macOS 署名はスキップ（ユーザー指示）。`zip` ターゲットなら unsigned でも auto-update 動作

- **実装した内容**:
  - `electron-builder.json` — `extraResources` を `public/assets` に変更、`asarUnpack` から `resources/assets` 削除、`publish`（GitHub provider）追加
  - `package.json` — `build:win`/`build:mac`/`build:all` から `rimraf && mkdir && cp` ステップ削除
  - `.github/workflows/release.yml` — build/release ジョブ分離、`actions/upload-artifact@v4` + `actions/download-artifact@v4` でアーティファクト受け渡し、`softprops/action-gh-release@v2` で一括リリース、アップロード対象に `.zip`/`.yml`/`.blockmap` 追加
  - `electron/main.ts` — `import { UpdateHandler } from './updater'` 追加、ダミー `check-for-updates` ハンドラ削除、自動更新無効化コメント削除、`createWindow()` 内で `initializeIpcHandlers()` 直後に `new UpdateHandler(window)` 追加
  - `README.md` — エンドユーザー向けにリライト（ダウンロード、使い方、FAQ、開発者向け折りたたみ）
  - `CHANGELOG.md`（新規）— v1.0.0〜v1.1.0 + Unreleased、Keep a Changelog 形式
  - `.github/ISSUE_TEMPLATE/bug_report.yml`（新規）— OS/バージョン/再現手順/ログ添付
  - `.github/ISSUE_TEMPLATE/feature_request.yml`（新規）— 機能説明/ユースケース

- **Codexレビュー結果**: CRITICAL 2 / WARNING 1 / GOOD 4
  - CRITICAL 1: UpdateHandler 初期化レース → 修正済み（loadURL 前に移動）
  - CRITICAL 2: macOS 未署名で auto-update 不可 → スキップ（ユーザー指示、zip なら動作）
  - WARNING 1: build ジョブで publish 発火リスク → 修正済み（GH_TOKEN 除去）

- **ビルド結果**:
  - TypeScript 型チェック: エラー 0件
  - macOS ビルド: 成功（DMG 333MB, ZIP 326MB, blockmap x2, latest-mac.yml）
  - Windows ビルド: 成功（EXE 218MB, blockmap, latest.yml）
  - `cp` ステップなしでビルド正常完了を確認

- **コミット**: 654fc72

- **未解決の課題**:
  - Viteビルドのchunkサイズ警告（536KB > 500KB）— 前回と同等
  - macOS 署名なしでの auto-update 動作は実機テスト未実施
  - CI ワークフローの動作確認は次回タグ push 時

- **次のステップ**:
  - バージョンバンプ（v1.2.0）してタグ push → CI ワークフローの動作確認
  - macOS での auto-update 実機テスト（v1.1.0 → v1.2.0）
  - README にスクリーンショットを追加

### [2026-02-16] v1.1.0 機能追加 — データ永続化・自動更新・UI改善（Agent Teams）

- **決定事項**:
  - フォルダパスは electron-store に永続化（`runFolderPath`）
  - 起動時は `get-all-runs` で自動データロード、FolderSelector はパス表示のみ（二重読み込み防止）
  - chokidar でファイル監視、`new-run-detected` IPC で新ラン通知
  - 重複判定は `id` ベースのみ（timestamp 単独では誤除外の可能性）
  - ナビゲーションはタブのみ（サイドバーは既に削除済みだった）

- **実装した内容**:
  - `electron/main.ts` — StoreSchema 拡張、`get-all-runs`/`get-run-folder` 実装、`select-folder` にパス保存+監視開始
  - `electron/utils/fileUtils.ts` — `findRunFiles()`/`parseRunFile()` 共通ヘルパー抽出、`load-run-files` リファクタ
  - `electron/watcher.ts`（新規）— chokidar ファイル監視モジュール
  - `electron/preload.ts` — `onNewRunDetected` IPC ブリッジ追加
  - `src/store.ts` — `addRun` メソッド追加（重複チェック + キャッシュクリア + Redux 同期）
  - `src/App.tsx` — リロードハンドラ削除、新ラン検出リスナー追加、FolderSelector を Layout に移動、HomePage 簡素化
  - `src/global.d.ts`, `src/types/electron-api.d.ts` — `onNewRunDetected` 型定義
  - `src/components/FolderSelector.tsx` — コンパクトバースタイルに変更
  - `src/components/RunList.tsx` — デバウンスフィルタ、空状態メッセージ、フィルタリセット、クリーンアップ追加
  - `package.json` — chokidar を dependencies に移動
  - `vite.config.ts` — chokidar を external に追加
  - `CLAUDE.md` 新規作成

- **Codexレビュー結果**: CRITICAL 0 / WARNING 3 / INFO 2 / GOOD 4
  - WARNING 1: get-all-runs で0件だと監視未開始 → 修正済み（startWatching を早期実行）
  - WARNING 2: 起動時二重読み込み → 修正済み（FolderSelector は起動時パス表示のみ）
  - WARNING 3: timestamp 重複判定 → 修正済み（id ベースのみに変更）
  - INFO 1: デバウンスクリーンアップ漏れ → 修正済み
  - INFO 2: IPC入力パスの境界チェック → 今回は見送り（既存の load-run-files と同等）

- **ビルド結果**:
  - TypeScript 型チェック: エラー 0件
  - Vite ビルド: 成功（メインバンドル 536KB）
  - 変更ファイル: 15ファイル、+534 / -342行

- **Agent Teams**: feature-v1.1（3 teammate: feat-backend/Sonnet, feat-store/Sonnet, feat-ui/Sonnet）

- **コミット**: 54b38be, 19ddbbc, b99b405, 805ac38, c984719

- **未解決の課題**:
  - Viteビルドのchunkサイズ警告（536KB > 500KB）— 前回と同等
  - IPC入力パスの境界チェック（Codex INFO指摘、load-run-files に上限設定）
  - Windowsでの実機テストが必要（データ永続化・自動更新の動作確認）

- **次のステップ**:
  - v1.1.0 バージョンバンプ
  - Windowsでの実機テスト
  - 必要に応じてリリースビルド

### [2026-02-15] パフォーマンス最適化 — Agent Teams 並列実装

- **決定事項**:
  - `getAssetFallbackUrl`（IPC）は全て `getAssetUrl`（同期）に置換可能（同じ `asset://` URLを返すため）
  - MutationObserver による全DOM監視は不要（`index.html` に `<html lang="ja">` 記述済み）
  - Codex WARNING 3件は「現在の実装では実害なし」として対応保留

- **実装した内容**:
  - `src/components/Card.tsx` — 5つの `useState` + async `useEffect`（IPC×5回）→ 1つの `useMemo` + `getAssetUrl`（同期・IPC 0回）
  - `src/services/StatsService.ts` — WeakMap でキャラクターインデックスキャッシュ（1200回→4回のfilter）、正規化済み master_deck/relics Set キャッシュ（60,000回→0回のSet再生成）
  - `src/main.tsx` — `initializeFonts`（MutationObserver全DOM監視）完全削除、`loadFonts` を `for+await` 直列 → `Promise.allSettled` 並列化
  - `src/App.tsx` — RunDetail/PlayDetail/CardList/RelicList/NeowBonusList を `React.lazy` + `Suspense` でコード分割、`scanAllAssetReferences` 診断スキャン削除
  - 未使用 import 整理（`getAssetFallbackUrl`, `scanAllAssetReferences`, `isDevelopment`, `isProduction`, `FilePickerOptions`, `CharacterStats`, `createEmptyCharacterStats`, `useStore`, `getEnvironmentInfo`）

- **Codexレビュー結果**: CRITICAL 0 / WARNING 3 / INFO 2 / GOOD 4
  - WARNING 1: Card.tsx `asset://` フォールバック弱化 → 実害なし（既存動作と同等）
  - WARNING 2: main.tsx フォント `asset://` フォールバック欠如 → 実害なし（全環境で動作確認済み）
  - WARNING 3: WeakMap キャッシュが破壊的更新に弱い → 実害なし（`setRuns` は常に新配列生成）

- **ビルド結果**:
  - TypeScript 型チェック: エラー 0件
  - Vite ビルド: 成功（初期バンドル 730KB+ → 538KB、26%削減）
  - チャンク分割: RunDetail 13.3KB, PlayDetail 17.6KB, CardList 13.7KB, RelicList 16.6KB, NeowBonusList 20.9KB, Card 6.6KB

- **Agent Teams**: perf-opt（3 teammate: perf-renderer/Sonnet, perf-stats/Sonnet, perf-startup/Sonnet）

- **コミット**: a42ab7b, b8b5877 (version bump), 07e100a (CI fix)

- **リリース**:
  - GitHub Draft リリース6件を削除（2025-03-20の古いDraft）
  - v1.0.3 リリース作成: https://github.com/moritaniantech/slay-the-spire-stats-analyzer/releases/tag/v1.0.3
  - macOS Universal DMG (333MB) + ZIP (326MB)、Windows x64 Setup (218MB)

- **CI修正**:
  - `.github/workflows/release.yml` — Node.js 20 → 22 に更新
  - 原因: `@electron/notarize@3.0.1` が Node.js >= 22.12.0 を要求
  - v1.0.0〜v1.0.3 の CI 失敗は全てこの問題（ローカルビルドで対応済み）

- **未解決の課題**:
  - Codex指摘の `asset://` フォールバック強化は将来対応可能（現時点で実害なし）
  - `buildCharacterIndex` を1パス分配に最適化可能（Codex INFO指摘、現時点で十分高速）
  - Suspense fallback要素の共通化（Codex INFO指摘、保守性改善）
  - Viteビルドのchunkサイズ警告（538KB > 500KB）— まだ少し超過
  - CI修正（Node.js 22化）は次回タグpush時に検証される

- **次のステップ**:
  - Windowsでの実機テスト（パフォーマンス改善の体感確認）
  - 必要に応じて `manualChunks` 設定で残りのバンドルサイズ最適化
  - コード署名なしの配布に関する対応検討

### [2026-02-14] アセット移行復旧 + Windows表示修正

- **決定事項**:
  - アセットの唯一のソースは `public/assets/`（`src/assets/` は完全廃止）
  - Electron環境では `asset://` プロトコル、開発環境では `/assets/` でアクセス
  - ビルド設定は `electron-builder.json` に一元化（`package.json` の `build` セクション削除）
  - Electron本番環境では `HashRouter` を使用（`file://` プロトコル対応）
  - コード署名は将来の一般配布時に対応予定

- **実装した内容**:
  - TSエラー28件を全修正（0件に）
    - `src/App.tsx` - loadRuns参照削除、型修正、到達不能コード削除
    - `src/store.ts` - Run型に `neow_cost` 追加
    - `src/components/Dashboard.tsx` - `useState<Run[]>` 型注釈追加
    - `src/components/Card.tsx` - 条件式修正
    - `src/components/common/AssetImage.tsx` - null→undefined変換
    - `src/components/PlayDetail.tsx` - getAssetUrl null対応（6箇所）
    - `src/components/RunDetail.tsx` - 型不一致修正
    - `src/services/StatsService.ts` - implicit any修正、Map iterator型修正
  - セキュリティ修正
    - `electron/main.ts` - `webSecurity: true` 化、`fs-readFile` ディレクトリ制限追加
    - `electron/preload.ts` - 未使用import・コメントアウトコード削除
  - アセットパス統一
    - `index.html` - フォントパスを `/assets/` に統一（5箇所）
    - `src/components/RelicList.css` - フォントパス修正
    - `src/utils/assetUtils.ts` - getAssetBasePath・isAssetUrl修正
    - `vite.config.ts` - 旧 `src/assets` 参照を完全除去
  - ビルド設定一元化
    - `package.json` - `build` セクション削除
    - `electron-builder.json` - `asar: true`・assetプロトコル追加
  - Windows表示修正
    - `src/App.tsx` - `file://` プロトコル判定で `HashRouter` に切り替え
  - クリーンアップ
    - `src/assets/` ディレクトリ削除
    - `public/src/assets/assets` シンボリックリンク削除
    - `dist-electron/` をgit追跡から除外

- **未解決の課題**:
  - コード署名なし（MDfE で Trojan:Win32/Cinjo.O!cl として誤検出 → 除外設定で対応済み）
  - macOS版もコード署名・公証なし（開発者証明書未設定）
  - Viteビルドのchunkサイズ警告（746KB > 500KB）- コード分割で改善可能

- **次のステップ**:
  - Windowsでの実機テスト継続
  - 必要に応じてコード分割（dynamic import）でバンドルサイズ最適化
  - 一般配布時にコード署名証明書の取得を検討

- **GitHub Release**: v1.0.0 - https://github.com/moritaniantech/slay-the-spire-stats-analyzer/releases/tag/v1.0.0

### [2026-02-14] v1.0.0 バグ修正 — 4件の不具合対応

- **決定事項**:
  - キャラクター名正規化は `src/utils/characterUtils.ts` に集約（`THE_` プレフィックス一般除去）
  - レリック名正規化は camelCase 変換に統一（特殊ケースは明示的マッピング）
  - ページネーションボタンは `btn-md` + `min-w-[2.5rem]` でタッチ操作対応

- **実装した内容**:
  - `src/utils/characterUtils.ts`（新規）- normalizeCharacterName, getCharacterImagePath
  - `src/components/StatsOverview.tsx` - キャラクターグルーピング・画像パス・色判定を正規化
  - `src/components/RunList.tsx` - フィルタ比較・画像パス・表示名を正規化、ページネーション btn-md 化
  - `src/components/RunDetail.tsx` - switch文4箇所 + 画像パスを正規化
  - `src/components/PlayDetail.tsx` - switch文3箇所 + 画像パスを正規化
  - `src/services/StatsService.ts` - calculateCardStats/calculateRelicStats のキャラクターフィルタ修正
  - `src/utils/statsCalculator.ts` - キャラクターフィルタ修正
  - `src/utils/assetUtils.ts` - normalizeRelicName を camelCase 変換に改善 + 特殊ケース追加

- **Codexレビュー結果**: CRITICAL 0 / WARNING 3 / INFO 1 / GOOD 3
  - WARNING 3件はすべて対応済み（Du-Vu Doll特殊ケース, レリックエイリアス, THE_プレフィックス一般化）

- **リリース**:
  - `package.json` バージョンを `1.0.0` → `1.0.1` に更新
  - macOS (Universal): DMG + ZIP ビルド成功（コード署名・公証なし）
  - Windows (x64): NSIS インストーラービルド成功（コード署名なし）

- **未解決の課題**:
  - レリック名のエイリアスはすべて網羅されていない可能性（未知のレリック名は画像表示されない）
  - Windowsでの実機テストが必要
  - コード署名なし（Windows: Defender警告、macOS: 開発元未確認警告）
  - Viteビルドのchunkサイズ警告（747KB > 500KB）

- **次のステップ**:
  - v1.0.1 のWindows実機テスト（Silent画像、レリック画像、ページネーション確認）
  - 必要に応じてコード分割（dynamic import）でバンドルサイズ最適化
  - 一般配布時にコード署名証明書の取得を検討

- **コミット**: d5148f9（バグ修正）, 677073e（バージョンバンプ）
- **GitHub Release**: v1.0.1 - https://github.com/moritaniantech/slay-the-spire-stats-analyzer/releases/tag/v1.0.1

### [2026-02-14] カード統計が全て0.0%になるバグ修正

- **根本原因**:
  - CardList.tsx が `card.id`（`"defect_Genetic Algorithm"` 形式の複合ID）を `calculateCardStats` に渡していた
  - master_deck には素のカード名（`"Genetic Algorithm"`）しかない
  - `normalizeCardId` がクラスプレフィックスを除去しないため、正規化後も `"defect_geneticalgorithm"` vs `"geneticalgorithm"` で不一致
  - レリックは素の名前で渡されるため問題なかった

- **実装した内容**:
  - `src/components/CardList.tsx` - tooltipに渡すカードIDを `card.id` → `card.englishName` に変更（L703, L413）
  - `src/services/StatsService.ts` - `normalizeCardId` にクラスプレフィックス除去を追加、不要な末尾s除去を削除
  - `src/utils/statsCalculator.ts` - 未使用の重複ファイルを削除

- **Codexレビュー結果**: CRITICAL 0 / WARNING 0 / INFO 1 / GOOD 3
  - INFO 1件（handleCardClick内の複合ID）も対応済み

- **コミット**: 8c78ebc
- **GitHub Release**: v1.0.2 - https://github.com/moritaniantech/slay-the-spire-stats-analyzer/releases/tag/v1.0.2

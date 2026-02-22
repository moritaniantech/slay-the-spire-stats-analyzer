# Changelog

このプロジェクトの変更履歴です。[Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠しています。

## [Unreleased]

## [1.3.0] - 2026-02-22

### Added
- ゲームUI風デザインリニューアル — ダークファンタジー背景 + ゴールドアクセント
- README にアプリケーションスクリーンショットを追加
- Dependabot 設定・自動マージワークフロー・セキュリティスキャン CI を導入
- 設定画面にアプリバージョンを表示

### Changed
- DaisyUI primary カラーを navy → gold に変更
- ヘッダーを2段構成に改修（ロゴ+ナビタブ+テーマトグル / 戻る進む+FolderSelector）
- グローバル CSS のトランジション・カーソルルールを最適化
- README をエンドユーザー向けに更新（スクリーンショット付き）

### Fixed
- Semgrep セキュリティ検出 19件を全件解消（コード修正 5件 + nosemgrep 抑制 14件）
- Dependabot 脆弱性アラート全件解消（未使用依存 19パッケージ削除、tar resolutions 追加）
- Code Scanning アラート全件解消
- アセットパスのサニタイズ追加（パストラバーサル防止）
- dangerouslySetInnerHTML の XSS 対策（入力テキストを HTML エスケープ）
- ESLint 202件のエラーを全修正
- インタラクティブ要素のカスタムカーソル維持

### Removed
- 未使用の `@tailwindcss/postcss7-compat` を削除（postcss 脆弱性の根本原因）
- `window.electron` レガシー参照を完全削除
- 未使用コンポーネント `Settings.tsx`、重複型定義ファイルを削除

### Security
- `fs-readFile` ハンドラにシンボリックリンク拒否・判定順序修正を追加
- `app-getPath` を許可リスト方式に変更
- `debug-resources` を本番環境で無効化
- `set-theme` に light/dark バリデーション追加
- CI permissions を最小権限に修正

## [1.2.0] - 2026-02-17

### Added
- 自動アップデート機能（新バージョンを自動検出・通知）
- CI/CD の改善（ビルドとリリースのジョブ分離、blockmap / latest.yml の自動アップロード）
- CHANGELOG.md（Keep a Changelog 形式）
- GitHub Issue テンプレート（バグ報告・機能要望）

### Changed
- アセットコピーの廃止（`extraResources` で `public/assets` を直接参照するように変更）
- ビルドスクリプトの簡素化（`cp -r` ステップを削除）
- README をエンドユーザー向けにリライト

## [1.1.0] - 2026-02-16

### Added
- データ永続化: フォルダパスを自動保存し、次回起動時に復元
- リアルタイム更新: 新しいランファイルを自動検出して即座に反映
- フォルダ監視機能（chokidar によるファイル監視）

### Changed
- FolderSelector をコンパクトなバースタイルに変更
- RunList にデバウンスフィルタ、空状態メッセージ、フィルタリセットを追加

## [1.0.3] - 2026-02-15

### Changed
- パフォーマンス最適化: Card コンポーネントの IPC 呼び出しを同期関数に置換
- StatsService のキャッシュ改善（WeakMap によるインデックスキャッシュ）
- フォント読み込みの並列化（`Promise.allSettled`）
- コード分割: RunDetail / PlayDetail / CardList / RelicList / NeowBonusList を `React.lazy` 化
- 初期バンドルサイズ 26% 削減（730KB → 538KB）

### Removed
- 未使用の MutationObserver による DOM 監視を削除
- `scanAllAssetReferences` 診断スキャンを削除

## [1.0.2] - 2026-02-14

### Fixed
- カード統計が全て 0.0% になるバグを修正
  - CardList が複合ID（`defect_Genetic Algorithm`）を統計関数に渡していたのを素のカード名に修正
  - `normalizeCardId` にクラスプレフィックス除去を追加

## [1.0.1] - 2026-02-14

### Fixed
- Silent（THE_SILENT）のキャラクター画像が表示されない問題を修正
- 一部レリックの画像が表示されない問題を修正（camelCase 正規化に統一）
- ページネーションボタンのタッチ操作対応

## [1.0.0] - 2026-02-14

### Added
- 初回リリース
- プレイデータの読み込みと解析
- キャラクター別統計（勝率、平均スコア、到達階数）
- ラン一覧のフィルタリング・ソート
- 各ランの詳細表示（デッキ構築推移、戦闘ログ）
- カード・レリック使用統計
- Neow ボーナス選択傾向
- 日本語 / 英語対応
- Windows / macOS 対応

[Unreleased]: https://github.com/moritaniantech/slay-the-spire-stats-analyzer/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/moritaniantech/slay-the-spire-stats-analyzer/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/moritaniantech/slay-the-spire-stats-analyzer/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/moritaniantech/slay-the-spire-stats-analyzer/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/moritaniantech/slay-the-spire-stats-analyzer/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/moritaniantech/slay-the-spire-stats-analyzer/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/moritaniantech/slay-the-spire-stats-analyzer/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/moritaniantech/slay-the-spire-stats-analyzer/releases/tag/v1.0.0

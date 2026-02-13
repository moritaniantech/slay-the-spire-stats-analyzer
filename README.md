# Slay the Spire Stats Analyzer

Slay the Spireのプレイデータを分析し、詳細な統計情報を提供するデスクトップアプリケーションです。

## 機能

- プレイデータの自動読み込みと解析
- 詳細な統計情報の表示
- グラフを用いた視覚的なデータ表現
- 多言語対応（i18n）

## 技術スタック

- **フレームワーク**: React + TypeScript + Vite
- **デスクトップ**: Electron
- **スタイリング**: Tailwind CSS + DaisyUI
- **状態管理**: Redux Toolkit + Zustand
- **データベース**: SQLite3 + TypeORM
- **グラフ**: Chart.js + React-ChartJS-2
- **その他**:
  - Framer Motion (アニメーション)
  - React Router (ルーティング)
  - i18next (国際化)

## 開発環境のセットアップ

### 必要条件

- Node.js (最新の安定版)
- Yarn

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/moritaniantech/slay-the-spire-stats-analyzer.git
cd slay-the-spire-stats-analyzer

# 依存関係のインストール
yarn install

# SQLite3のリビルド（必要な場合）
yarn rebuild
```

### 開発用コマンド

```bash
# 開発モードでの起動
yarn electron:dev

# ビルド
yarn build

# リント
yarn lint

# MDCファイルのビルド
yarn buildL:mdc
```

## アプリケーションのビルド

### 開発用ビルド

```bash
# TypeScriptのビルド
yarn build

# Electronアプリケーションのビルド
yarn build:electron
```

### リリース用ビルド

```bash
# Windows向けビルド
yarn build:win

# macOS向けユニバーサルビルド (Intel + Apple Silicon)
yarn build:mac

# 両プラットフォーム向けビルド
yarn build:all
```

ビルドされたアプリケーションは `release/` ディレクトリに以下のように出力されます：

- Windows: `StS Stats Analyzer Setup 1.0.0.exe` (インストーラー)
- macOS: 
  - `StS Stats Analyzer-1.0.0-universal.dmg` (ユニバーサルDMG)
  - `StS Stats Analyzer-1.0.0-universal-mac.zip` (ユニバーサルZIP)

### macOSアプリの公証（Notarization）

macOS用のアプリを公式リリースする場合は、Apple公証（Notarization）プロセスが必要です。
公証を行うには、以下の環境変数を設定後にビルドを実行します：

```bash
export APPLE_ID="your.apple.id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"

# 公証プロセスを含むビルド
yarn build:mac
```

## ライセンス

MIT

## 作者

moritaniantech

## バグ報告・機能要望

バグ報告や機能要望は[GitHub Issues](https://github.com/moritaniantech/slay-the-spire-stats-analyzer/issues)にお願いします。

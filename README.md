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

## ビルド

```bash
# TypeScriptのビルド
yarn build

# Electronアプリケーションのビルド
yarn build:electron
```

## ライセンス

MIT

## 作者

moritaniantech

## バグ報告・機能要望

バグ報告や機能要望は[GitHub Issues](https://github.com/moritaniantech/slay-the-spire-stats-analyzer/issues)にお願いします。

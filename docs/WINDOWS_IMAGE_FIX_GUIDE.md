# Windows環境で画像が表示されない問題の調査報告と修正ガイド

## 問題概要

**症状**: macOSの開発環境・本番環境では画像が正常に表示されるが、Windows本番環境では画像が表示されない

**根本原因**: パスセパレータの不整合とアセットファイル配置の矛盾

---

## 原因分析

### 1. パスセパレータの不整合（最重要）

#### 問題箇所: `src/utils/assetUtils.ts` (130行目)

```typescript
normalized = normalized.replace(/\\/g, '/');
```

この処理でバックスラッシュ(`\`)がすべてフォワードスラッシュ(`/`)に統一されます。

#### 問題箇所: `electron/main.ts` (189-205行目)

```typescript
const winPaths = [
  join(process.resourcesPath, 'app.asar.unpacked', 'assets', normalizedAssetPath),
  join(process.resourcesPath, 'assets', normalizedAssetPath),
  // ...
];
```

Node.jsの`path.join()`はWindowsでは`\`を使用してパスを結合します。

#### 発生する問題

```
1. JavaScript側で統一されたパス: "assets/ui/topPanel/deck.png"
2. path.join()で結合後: "C:\Users\...\resources\assets/ui/topPanel/deck.png"
                                                    ↑ バックスラッシュとスラッシュが混在
3. fs.existsSync()が混在パスで失敗 → ファイルが見つからない
```

### 2. アセットファイル配置の不整合

#### 現在の状態

| ディレクトリ | 状態 | 用途 |
|-------------|------|------|
| `public/assets/` | 画像ファイルあり | Vite開発サーバー用 |
| `src/assets/` | 空（.DS_Storeのみ） | コードが参照しようとしている |
| `resources/assets/` | ビルド時にpublicからコピー | 本番ビルド用 |

#### 問題箇所: `electron/main.ts` (258-259行目)

```typescript
const devPaths = [
  join(app.getAppPath(), 'src', 'assets', normalizedAssetPath), // ← src/assetsは空
  // ...
];
```

開発環境で`src/assets`を最初に検索しているが、実際のファイルは`public/assets`に存在します。

### 3. プロトコルハンドラーのパス解決問題

#### 問題箇所: `electron/main.ts` (780-814行目)

Windows本番環境でのパス解決において、以下の問題があります：

```typescript
pathsToTry.push({
  path: join(process.resourcesPath, requestedAssetPath),
  // requestedAssetPath = "assets/ui/..." の形式（スラッシュ）
  // join結果 = "C:\...\resources\assets/ui/..." （混在）
});
```

### 4. electron-builder.json の設定

```json
{
  "extraResources": [
    {
      "from": "resources/assets",  // ← ビルド前にpublic/assetsからコピーが必要
      "to": "assets",
      "filter": ["**/*"]
    }
  ],
  "asarUnpack": [
    "resources/assets/**/*"  // ← この設定はextraResourcesと矛盾
  ]
}
```

`extraResources`で`resources/assets`→`assets`にコピーしているため、
実際の配置先は`{resources}/assets/`となります。

---

## 修正方法

### 修正1: パスセパレータの正規化（必須）

**ファイル**: `electron/main.ts`

IPCハンドラー`get-asset-path`内でパスを正規化する処理を追加：

```typescript
// 既存のnormalizedAssetPath処理の後に追加
// Windowsでのパス正規化
if (process.platform === 'win32') {
  normalizedAssetPath = normalizedAssetPath.replace(/\//g, '\\');
}
```

または、`path.normalize()`を使用：

```typescript
import { normalize } from 'path';

// パス検索の直前で正規化
for (const candidatePath of winPaths) {
  const normalizedPath = normalize(candidatePath);
  if (fs.existsSync(normalizedPath)) {
    resolvedPath = normalizedPath;
    break;
  }
}
```

### 修正2: プロトコルハンドラーのパス正規化（必須）

**ファイル**: `electron/main.ts` (約845-854行目)

```typescript
// 修正前
for (const pInfo of pathsToTry) {
  if (fs.existsSync(pInfo.path)) {

// 修正後
for (const pInfo of pathsToTry) {
  const normalizedPath = path.normalize(pInfo.path);
  if (fs.existsSync(normalizedPath)) {
    resolvedPath = normalizedPath;
```

### 修正3: アセットディレクトリ構成の統一（推奨）

**方法A**: `public/assets`をすべての基準とする

1. `electron/main.ts`の開発環境パス検索を修正：

```typescript
// 修正前
const devPaths = [
  join(app.getAppPath(), 'src', 'assets', normalizedAssetPath),
  join(app.getAppPath(), 'resources', 'assets', normalizedAssetPath),
  join(app.getAppPath(), 'dist', 'assets', normalizedAssetPath)
];

// 修正後
const devPaths = [
  join(app.getAppPath(), 'public', 'assets', normalizedAssetPath),  // 最優先
  join(app.getAppPath(), 'resources', 'assets', normalizedAssetPath),
  join(app.getAppPath(), 'dist', 'assets', normalizedAssetPath)
];
```

2. ビルドスクリプトで`public/assets`→`resources/assets`へのコピーを確認

**方法B**: `src/assets`ディレクトリを削除し、参照を整理

### 修正4: electron-builder.json の整合性確保

```json
{
  "extraResources": [
    {
      "from": "public/assets",
      "to": "assets",
      "filter": ["**/*"]
    }
  ],
  "asarUnpack": [
    "dist-electron/**/*"
  ]
}
```

`asarUnpack`から`resources/assets/**/*`を削除（extraResourcesでコピーされるため不要）

---

## 修正の優先順位

1. **最優先**: パスセパレータの正規化（修正1, 修正2）
   - これだけで問題が解決する可能性が高い

2. **推奨**: アセットディレクトリ構成の統一（修正3）
   - 将来的な保守性向上のため

3. **任意**: electron-builder.json の整理（修正4）
   - ビルド設定の明確化

---

## 検証方法

修正後、以下の手順で検証してください：

1. **開発環境での確認**
   ```bash
   npm run dev
   ```
   - macOSとWindowsの両方で画像が表示されることを確認

2. **本番ビルドの確認**
   ```bash
   npm run build
   npm run electron:build
   ```
   - Windowsでインストール後、画像が表示されることを確認

3. **デバッグログの確認**
   - `electron/main.ts`のログ出力で、パスが正しく解決されているか確認
   - `[asset-protocol] SUCCESS`のログが出力されることを確認

---

## 参考: 影響を受けるファイル一覧

| ファイル | 行 | 修正内容 |
|---------|-----|---------|
| `electron/main.ts` | 189-225 | Windowsパス検索のセパレータ正規化 |
| `electron/main.ts` | 258-262 | 開発環境パス検索順序の変更 |
| `electron/main.ts` | 780-814 | プロトコルハンドラーのパス正規化 |
| `electron/main.ts` | 845-854 | fs.existsSync呼び出し前の正規化 |
| `src/utils/assetUtils.ts` | 130 | （変更不要、ただし注意点として認識） |
| `electron-builder.json` | 37-54 | extraResources/asarUnpackの整理 |

---

## 補足: なぜmacOSでは動作するのか

1. macOSのパスセパレータは`/`であり、JavaScript側で統一したパスと一致する
2. `path.join()`もmacOSでは`/`を使用する
3. macOSバンドル構造（.app）の標準的なパス解決がより柔軟

---

# 追加調査: Windows本番環境でUI全体が表示されない問題

## 問題概要

**症状**: Windowsの本番アプリでホーム画面、カード一覧、レリック一覧などの機能が表示されない

**根本原因**: 画像パス問題の**副作用**として、アセットチェック機能が失敗し、UI全体がブロックされる

---

## 原因の詳細

### 1. アセットステータスチェック機能（App.tsx）

**問題箇所**: `src/App.tsx` (500-601行目)

アプリ起動時に単一のテスト画像で全体の状態を判定しています：

```typescript
// Line 515
const testAssetPath = 'ui/topPanel/deck.png';

// Line 517
const fileUrl = await window.electronAPI.getFileURLForAsset(testAssetPath);

// Line 526-528: 画像読み込み失敗時
img.onerror = (err) => {
  console.error(`[App] ${platform}: ファイルURLでの画像ロードに失敗:`, err);
  checkWithRegularPath(); // 代替手段を試す
};
```

### 2. エラー時の全UI非表示化（App.tsx）

**問題箇所**: `src/App.tsx` (628-646行目)

```typescript
if (assetStatus === 'error') {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-3xl font-bold mb-4 text-error">アセット読み込みエラー</h1>
      // ... Router全体がレンダリングされない
    </div>
  )
}
```

### 3. 問題発生フロー

```
1. App.tsx マウント時に assetStatus='loading'
   ↓
2. checkAssetLoadStatus() が実行される
   ↓
3. 'ui/topPanel/deck.png' をテスト画像として読み込み試行
   ↓
4. Windows本番環境でパスセパレータ問題により画像が見つからない
   ↓
5. img.onerror が発火 → checkWithRegularPath() を試行
   ↓
6. getImageBase64() も同様にパス問題で失敗
   ↓
7. setAssetStatus('error')
   ↓
8. Router がレンダリングされず、全機能が非表示
```

---

## 修正方法

### 修正5: アセットチェックロジックの改善（App.tsx）

**方法A**: アセットチェックをスキップ（推奨）

```typescript
// 修正前
if (assetStatus === 'error') {
  return (
    <div className="...">
      <h1>アセット読み込みエラー</h1>
      ...
    </div>
  )
}

// 修正後: エラー時もRouterを表示し、個別コンポーネントでエラーハンドリング
// この条件分岐を削除またはコメントアウト
```

**方法B**: より緩いチェック条件を設定

```typescript
// 修正前
img.onerror = (err) => {
  console.error(`[App] ${platform}: ファイルURLでの画像ロードに失敗:`, err);
  checkWithRegularPath();
};

// 修正後: エラー時もUIを表示
img.onerror = (err) => {
  console.warn(`[App] ${platform}: テスト画像の読み込みに失敗しましたが、UIは表示します:`, err);
  setAssetStatus('ready'); // エラーでもUIを表示
};
```

**方法C**: 複数のテスト画像で判定

```typescript
const testAssetPaths = [
  'ui/topPanel/deck.png',
  'images/characters/ironclad.png',
  'images/map/monster.png'
];

let successCount = 0;
for (const path of testAssetPaths) {
  try {
    const fileUrl = await window.electronAPI.getFileURLForAsset(path);
    if (fileUrl) successCount++;
  } catch (e) {}
}

// 1つでも成功すればUIを表示
if (successCount > 0) {
  setAssetStatus('ready');
} else {
  setAssetStatus('error');
}
```

### 修正6: checkWithRegularPath の改善

**ファイル**: `src/App.tsx` (552-598行目)

```typescript
// 修正前
if (!base64Data) {
  console.error('[App] checkWithRegularPath: テストアセット画像のBase64データ取得に失敗。');
  setAssetStatus('error');
  return;
}

// 修正後
if (!base64Data) {
  console.warn('[App] checkWithRegularPath: テストアセット画像のBase64データ取得に失敗。UIは表示を継続します。');
  setAssetStatus('ready'); // 失敗してもUIを表示
  return;
}
```

---

## 修正の優先順位（更新版）

1. **最優先**: パスセパレータの正規化（修正1, 修正2）
   - 根本原因を解決

2. **高優先**: アセットチェックロジックの改善（修正5, 修正6）
   - 画像読み込み失敗時もUI全体を表示

3. **推奨**: アセットディレクトリ構成の統一（修正3）
   - 将来的な保守性向上

4. **任意**: electron-builder.json の整理（修正4）
   - ビルド設定の明確化

---

## 影響を受けるファイル一覧（更新版）

| ファイル | 行 | 修正内容 |
|---------|-----|---------|
| `electron/main.ts` | 189-225 | Windowsパス検索のセパレータ正規化 |
| `electron/main.ts` | 258-262 | 開発環境パス検索順序の変更 |
| `electron/main.ts` | 780-814 | プロトコルハンドラーのパス正規化 |
| `electron/main.ts` | 845-854 | fs.existsSync呼び出し前の正規化 |
| `src/App.tsx` | 500-601 | アセットチェックロジックの緩和 |
| `src/App.tsx` | 628-646 | エラー時のUI表示ブロック解除 |
| `src/utils/assetUtils.ts` | 130 | （変更不要、ただし注意点として認識） |
| `electron-builder.json` | 37-54 | extraResources/asarUnpackの整理 |

---

## 検証方法（更新版）

1. **修正後の動作確認**
   - Windowsでアプリを起動
   - ホーム画面が表示されることを確認
   - カード一覧、レリック一覧ページに遷移できることを確認

2. **コンソールログの確認**
   - DevToolsで `[App]` プレフィックスのログを確認
   - `assetStatus` が `'ready'` になっていることを確認

3. **画像表示の確認**
   - パスセパレータ修正後、画像が正常に表示されることを確認

---

# 最重要: コンポーネントがロードされない根本原因

## 問題概要

**症状**: Windows本番環境でホーム画面、カード一覧、レリック一覧などのコンポーネント自体がロードされない

**根本原因**: `src/assets/`ディレクトリのファイルが削除されているが、インポート文が残っている

---

## 原因の詳細

### 1. 削除されたファイルへのインポート

**問題箇所**: `src/App.tsx` (23-24行目)

```typescript
import allCards from "./assets/cards/allCards.json";   // ← 存在しない
import allRelics from "./assets/relics/relics.json";   // ← 存在しない
```

### 2. 現在のファイル配置状況

| パス | 状態 |
|-----|------|
| `src/assets/` | 空（.DS_Storeのみ） |
| `src/assets/cards/allCards.json` | **削除済み** |
| `src/assets/relics/relics.json` | **削除済み** |
| `public/assets/cards/allCards.json` | 存在する |
| `public/assets/relics/relics.json` | 存在する |

### 3. index.htmlのフォント参照問題

**問題箇所**: `index.html` (26-44行目)

```html
<!-- 存在しないパスを参照 -->
src: url('./src/assets/fonts/jpn/NotoSansCJKjp-Regular.otf')
src: url('./src/assets/fonts/jpn/NotoSansCJKjp-Medium.otf')
src: url('./src/assets/fonts/jpn/NotoSansCJKjp-Bold.otf')
```

### 4. 問題発生フロー

```
1. Viteビルド時に src/assets/cards/allCards.json を探す
   ↓
2. ファイルが存在しないためモジュール解決に失敗
   ↓
3. App.tsx のインポートが失敗
   ↓
4. Reactアプリケーション全体が起動しない
   ↓
5. すべてのコンポーネント（ホーム、カード一覧等）が表示されない
```

---

## 修正方法

### 修正7: JSONインポートパスの修正（最優先・必須）

**ファイル**: `src/App.tsx` (23-24行目)

**方法A**: public/assetsから動的に読み込む（推奨）

```typescript
// 修正前
import allCards from "./assets/cards/allCards.json";
import allRelics from "./assets/relics/relics.json";

// 修正後: 静的インポートを削除し、動的に読み込む
// App.tsx内で fetch または electronAPI を使用して読み込む
const [allCards, setAllCards] = useState<any[]>([]);
const [allRelics, setAllRelics] = useState<any[]>([]);

useEffect(() => {
  const loadData = async () => {
    if (window.electronAPI) {
      // Electron環境: IPCで読み込み
      const cards = await window.electronAPI.loadJsonFile('assets/cards/allCards.json');
      const relics = await window.electronAPI.loadJsonFile('assets/relics/relics.json');
      setAllCards(cards);
      setAllRelics(relics);
    } else {
      // Web環境: fetch で読み込み
      const cardsRes = await fetch('/assets/cards/allCards.json');
      const relicsRes = await fetch('/assets/relics/relics.json');
      setAllCards(await cardsRes.json());
      setAllRelics(await relicsRes.json());
    }
  };
  loadData();
}, []);
```

**方法B**: src/assetsにファイルを復元

```bash
# public/assets から src/assets にファイルをコピー
cp -r public/assets/cards src/assets/
cp -r public/assets/relics src/assets/
cp -r public/assets/fonts src/assets/
# その他必要なファイルも同様にコピー
```

**方法C**: インポートパスをpublicに変更（Vite設定変更が必要）

```typescript
// vite.config.ts で publicDir の設定を確認し、
// インポートパスを調整する必要がある
```

### 修正8: index.htmlのフォントパス修正

**ファイル**: `index.html` (26-44行目)

```html
<!-- 修正前 -->
src: url('./src/assets/fonts/jpn/NotoSansCJKjp-Regular.otf')

<!-- 修正後: public/assets を参照 -->
src: url('./assets/fonts/jpn/NotoSansCJKjp-Regular.otf')

<!-- または、フォントファイルを public/assets/fonts に配置していることを確認 -->
```

---

## 修正の優先順位（最終版）

1. **最優先・必須**: JSONインポートパスの修正（修正7）
   - **これがないとアプリが起動しない**

2. **最優先・必須**: index.htmlのフォントパス修正（修正8）
   - フォント読み込み失敗でUIが崩れる可能性

3. **高優先**: パスセパレータの正規化（修正1, 修正2）
   - 画像読み込み問題の解決

4. **高優先**: アセットチェックロジックの改善（修正5, 修正6）
   - 画像読み込み失敗時もUI全体を表示

5. **推奨**: アセットディレクトリ構成の統一（修正3）
   - 将来的な保守性向上

6. **任意**: electron-builder.json の整理（修正4）
   - ビルド設定の明確化

---

## 影響を受けるファイル一覧（最終版）

| ファイル | 行 | 修正内容 | 優先度 |
|---------|-----|---------|--------|
| `src/App.tsx` | 23-24 | JSONインポートパスの修正 | **最優先** |
| `index.html` | 26-44 | フォントパスの修正 | **最優先** |
| `electron/main.ts` | 189-225 | Windowsパス検索のセパレータ正規化 | 高 |
| `electron/main.ts` | 258-262 | 開発環境パス検索順序の変更 | 高 |
| `electron/main.ts` | 780-814 | プロトコルハンドラーのパス正規化 | 高 |
| `electron/main.ts` | 845-854 | fs.existsSync呼び出し前の正規化 | 高 |
| `src/App.tsx` | 500-601 | アセットチェックロジックの緩和 | 高 |
| `src/App.tsx` | 628-646 | エラー時のUI表示ブロック解除 | 高 |
| `src/utils/assetUtils.ts` | 130 | （変更不要） | - |
| `electron-builder.json` | 37-54 | extraResources/asarUnpackの整理 | 任意 |

---

## 検証手順

1. **ビルドが成功することを確認**
   ```bash
   npm run build
   ```
   - エラーなくビルドが完了すること

2. **開発環境での動作確認**
   ```bash
   npm run dev
   ```
   - ホーム画面が表示されること
   - カード一覧、レリック一覧ページに遷移できること

3. **本番ビルドの確認**
   ```bash
   npm run build && npm run electron:build
   ```
   - Windowsでインストール後、アプリが起動すること
   - 全ての機能が表示されること

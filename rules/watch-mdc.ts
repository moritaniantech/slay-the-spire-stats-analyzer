const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

// rulesディレクトリのパス
const RULES_DIR = path.join(process.cwd(), 'rules');

/**
 * MDCファイルを生成するビルドコマンドを実行する関数
 */
function runBuild(): void {
  console.log('🔄 MDファイルの変更を検知しました。MDCファイルを更新します...');
  
  exec('node -r ts-node/register -r ts-node/register/transpile-only -P rules/tsconfig.json rules/build-mdc.ts', (error: Error | null, stdout: string, stderr: string) => {
    if (error) {
      console.error('❌ エラーが発生しました:', error);
      return;
    }
    
    if (stderr) {
      console.error('⚠️ 警告:', stderr);
    }
    
    console.log('✅ MDCファイルの更新が完了しました！');
    console.log(stdout);
  });
}

// 監視の設定
const watcher = chokidar.watch([
  path.join(RULES_DIR, '**/*.md'),    // すべてのMDファイル
  path.join(RULES_DIR, '**/'),        // すべてのディレクトリ
], {
  ignored: /(^|[\/\\])\../,  // ドットファイルを無視
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {        // ファイル書き込み完了を待機
    stabilityThreshold: 300,
    pollInterval: 100
  }
});

// イベントハンドラーの設定
watcher
  .on('add', (filePath: string) => {
    console.log(`📝 新しいファイルが追加されました: ${filePath}`);
    runBuild();
  })
  .on('change', (filePath: string) => {
    console.log(`📝 ファイルが変更されました: ${filePath}`);
    runBuild();
  })
  .on('unlink', (filePath: string) => {
    console.log(`🗑️ ファイルが削除されました: ${filePath}`);
    runBuild();
  })
  .on('addDir', (dirPath: string) => {
    console.log(`📁 新しいディレクトリが追加されました: ${dirPath}`);
    runBuild();
  })
  .on('unlinkDir', (dirPath: string) => {
    console.log(`🗑️ ディレクトリが削除されました: ${dirPath}`);
    runBuild();
  })
  .on('error', (error: Error) => {
    console.error('⚠️ 監視エラー:', error);
  });

// 初回ビルドを実行
runBuild();

console.log('👀 rulesディレクトリの監視を開始しました...');
console.log('監視対象: すべてのMDファイルとディレクトリ');
console.log('終了するには Ctrl+C を押してください。\n'); 
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Direntの型定義
interface Dirent {
  isDirectory(): boolean;
  name: string;
}

// Cursorのルールファイルが保存されるディレクトリ
const CURSOR_RULES_DIR = path.join(process.cwd(), '.cursor', 'rules');

// rulesディレクトリのパス
const RULES_DIR = path.join(process.cwd(), 'rules');

/**
 * ディレクトリ内のMDファイルを結合してMDCファイルを生成する
 * @param {string} dirPath ディレクトリパス
 * @param {string} outputPath 出力先パス
 */
async function generateMdcFromDirectory(dirPath: string, outputPath: string): Promise<void> {
  try {
    // ディレクトリ名を取得（パスの最後の部分）
    const dirName = path.basename(dirPath);
    
    // ディレクトリ内のすべてのMDファイルを検索
    const mdFiles = await glob(`${dirPath}/**/*.md`);
    
    if (mdFiles.length === 0) {
      console.log(`${dirPath} 内にMDファイルが見つかりませんでした。`);
      return;
    }
    
    // MDファイルを番号順にソート（ファイル名の先頭が数字の場合）
    mdFiles.sort((a: string, b: string) => {
      const aMatch = path.basename(a).match(/^(\d+)/);
      const bMatch = path.basename(b).match(/^(\d+)/);
      
      if (aMatch && bMatch) {
        return parseInt(aMatch[1]) - parseInt(bMatch[1]);
      }
      
      return path.basename(a).localeCompare(path.basename(b));
    });
    
    // MDCファイルの内容を生成
    let mdcContent = `# ${dirName}.mdc\n`;
    
    // 各MDファイルの内容を結合
    for (const mdFile of mdFiles) {
      const content = fs.readFileSync(mdFile, 'utf8');
      const fileName = path.basename(mdFile);
      
      mdcContent += `\n## ${fileName}\n${content}\n\n--\n\n`;
    }
    
    // MDCファイルを書き込み
    fs.writeFileSync(outputPath, mdcContent);
    
    console.log(`Generated ${outputPath} from ${mdFiles.length} files in ${dirPath}`);
  } catch (error) {
    console.error(`Error generating MDC file from ${dirPath}:`, error);
  }
}

/**
 * Cursorのルールディレクトリを初期化する
 */
async function initCursorRulesDir(): Promise<void> {
  try {
    // .cursor/rulesディレクトリが存在しない場合は作成
    if (!fs.existsSync(CURSOR_RULES_DIR)) {
      fs.mkdirSync(CURSOR_RULES_DIR, { recursive: true });
      console.log(`Created directory: ${CURSOR_RULES_DIR}`);
    }
    
    // 既存のMDCファイルをすべて削除
    const existingMdcFiles = await glob(`${CURSOR_RULES_DIR}/*.mdc`);
    for (const file of existingMdcFiles) {
      fs.unlinkSync(file);
      console.log(`Deleted existing MDC file: ${file}`);
    }
  } catch (error) {
    console.error('Error initializing Cursor rules directory:', error);
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  try {
    // Cursorのルールディレクトリを初期化
    await initCursorRulesDir();
    
    // rulesディレクトリ内のすべてのディレクトリを取得
    const entries = fs.readdirSync(RULES_DIR, { withFileTypes: true });
    const directories = entries.filter((entry: Dirent) => entry.isDirectory());
    
    // 各ディレクトリに対してMDCファイルを生成
    for (const dir of directories) {
      const dirPath = path.join(RULES_DIR, dir.name);
      const outputPath = path.join(CURSOR_RULES_DIR, `${dir.name}.mdc`);
      
      await generateMdcFromDirectory(dirPath, outputPath);
    }
    
    console.log('All MDC files have been successfully generated!');
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// スクリプトの実行
main();
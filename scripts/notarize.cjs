/**
 * macOS向けアプリ公証（Notarization）用スクリプト
 * 
 * 環境変数:
 * - APPLE_ID: Apple IDのメールアドレス
 * - APPLE_APP_SPECIFIC_PASSWORD: App用パスワード（Apple IDのセキュリティ設定で生成）
 * - APPLE_TEAM_ID: Apple Developer TeamのID
 */

const { notarize } = require('@electron/notarize');

module.exports = async function notarizing(context) {
  // macOS向けビルドの場合のみ実行
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // 環境変数から認証情報を取得（CI/CD環境などで設定）
  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
  
  // 認証情報が設定されていない場合はスキップ
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.log('公証情報が不足しているため、公証プロセスをスキップします');
    console.log('公証を行うには APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID が必要です');
    return;
  }

  // アプリの情報
  const appName = context.packager.appInfo.productFilename;
  const appBundleId = context.packager.config.appId;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`macOS向けアプリの公証を開始: ${appPath}`);

  try {
    // 公証プロセス実行
    await notarize({
      tool: 'notarytool',
      appPath,
      appBundleId,
      appleId: APPLE_ID,
      appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
      teamId: APPLE_TEAM_ID,
    });
    console.log('公証が完了しました');
  } catch (error) {
    console.error('公証中にエラーが発生しました:', error);
    throw error;
  }
}; 
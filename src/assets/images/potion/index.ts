// ポーション画像のインポート
import { importImage } from '../utils';

const potionImages: { [key: string]: string } = {};

// ポーション画像を手動でインポート
potionImages['Block Potion'] = importImage('./blockPotion.png');
potionImages['Dexterity Potion'] = importImage('./dexterityPotion.png');
potionImages['Energy Potion'] = importImage('./energyPotion.png');
// 他のポーションも同様に追加

export default potionImages; 
// モンスター画像のインポート
import { importImage } from '../utils';

const monsterImages: { [key: string]: string } = {};

// モンスター画像を手動でインポート
// theBottom
monsterImages['Cultist'] = importImage('./theBottom/cultist.png');
monsterImages['JawWorm'] = importImage('./theBottom/jawWorm.png');
monsterImages['Louse'] = importImage('./theBottom/louse.png');
// 他のモンスターも同様に追加

export default monsterImages; 
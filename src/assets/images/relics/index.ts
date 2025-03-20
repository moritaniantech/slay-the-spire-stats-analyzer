// レリック画像のインポート
import { importImage } from '../utils';

const relicImages: { [key: string]: string } = {};

// レリック画像を手動でインポート
relicImages['Burning Blood'] = importImage('./burningBlood.png');
relicImages['Ring of the Snake'] = importImage('./ringOfTheSnake.png');
relicImages['Cracked Core'] = importImage('./crackedCore.png');
// 他のレリックも同様に追加

export default relicImages; 
export function importAll(r: __WebpackModuleApi.RequireContext) {
  const images: { [key: string]: string } = {};
  r.keys().forEach((item: string) => {
    const key = item.replace('./', '').replace(/\.(png|jpe?g|svg)$/, '');
    images[key] = r(item);
  });
  return images;
}

export function importImage(path: string) {
  try {
    return new URL(`${path}`, import.meta.url).href;
  } catch (error) {
    console.error(`Error importing image: ${path}`, error);
    return '';
  }
}

// カードの背景色を定義
export const cardColors = {
  ironclad: '#ff6563',
  silent: '#7fff00',
  defect: '#87ceeb',
  watcher: '#dda0dd',
  colorless: '#808080',
  curse: '#4a0072',
};

// カードのレアリティ色を定義
export const rarityColors = {
  starter: '#ffffff',
  common: '#808080',
  uncommon: '#87ceeb',
  rare: '#ffd700',
  special: '#dda0dd',
  curse: '#4a0072',
}; 
export const KEYWORDS = [
  'Unplayable', 'Ethereal', 'Weak', 'Curse', 'Innate', 'Exhaust', 'Block', 'Vulnerable',
  'Channel', 'Lightning', 'Frost', 'Dark', 'Plasma', 'Evoke', 'Void', 'channeled', 'Channeled',
  'Focus', 'Strength', 'Dexterity', 'Artifact', 'upgrade', 'upgraded', 'Fatal', 'Burn',
  'Poison', 'Shiv', 'Shiv+', 'Wrath', 'Calm', 'Scry', 'Stance', 'Insight', 'Retain',
  'Retained', 'Mark', 'Mantra', 'Smite', 'Miracle', 'Miracle+', 'Safety', 'Intangible',
  'Divinity', 'Expunger', 'Wound', 'Wounds', 'Status', 'Attack', 'Attacks', 'Skill', 'Skills',
  'Power', 'Thorns', 'Gold', 'Potion', 'Rest', '?', 'Boss', 'Uncommon', 'Rare', 'Treasure',
  'Upgrade', 'Relic', 'Relics', 'Shivs', 'Dig', 'Plated Armor', 'Frail', 'Transform', 'Smith',
  'Confused', 'Draw Pile', 'Unplayable Status', 'Weakened', 'Miracles'
];

export const COLORS = {
  KEYWORD: '#F0C944',
  UPGRADE: '#76F900',
  KEYWORD_PURPLE: '#FC87F2',
  KEYWORD_BLUE: '#80D6EF',
  KEYWORD_RED: '#FF666C',
  KEYWORD_GREEN: '#5EFF00',
  RARITY_COMMON: '#FFFFFF',
  RARITY_UNCOMMON: '#80D6EF',
  RARITY_RARE: '#F7CD52',
  RARITY_BOSS: '#FF666C',
  UPGRADED_NAME: '#76F900',
  UPGRADED_VALUE: '#76F900'
} as const;

// レリックのキーワード定義
export const RELIC_KEYWORDS = {
  YELLOW: [
    'Channel', 'Lightning', 'Dark', 'Frost', 'Miracle', 'Miracles', 'Calm', 'Wrath', 'Scry',
    'Attack', 'Attacks', 'Skill', 'Skills', 'Power', 'Block', 'Dexterity', 'Frost', 'Plasma',
    'Poison', 'Power', 'Strength', 'Vulnerable', 'Weak', 'Weakened', 'Focus', 'Intangible',
    'Calm', 'Thorns', 'Gold', 'Mantra', 'Potion', 'Rest', '?', 'Boss', 'Uncommon', 'Rare',
    'Treasure', 'Upgrade', 'Unplayable', 'Exhaust', 'Relic', 'Relics', 'Shivs', 'Dig',
    'Plated Armor', 'Frail', 'Transform', 'Smith', 'Confused', 'Artifact', 'Draw Pile',
    'Unplayable Status', 'Status'
  ],
  RED: ['Curse', 'Curses', 'Burning Blood', 'Wound', 'Wounds'],
  BLUE: ['Cracked Core'],
  GREEN: ['Ring of the Snake'],
  PURPLE: ['Pure Water']
} as const;

// アップグレード時にコストが変更されないカードのリスト
export const COST_UNCHANGED_CARDS = [
  'Meteor Strike',
  'Wraith Form'
] as const; 
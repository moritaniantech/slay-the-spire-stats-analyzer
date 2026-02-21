/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ネイビー基調のカラーパレット（CSS変数を使用）
        navy: {
          base: 'var(--navy-base)',
          dark: 'var(--bg-primary)',
          light: 'var(--navy-light)',
          accent: 'var(--navy-accent)',
          blue: 'var(--navy-blue)',
          border: 'var(--navy-border)',
          hover: 'var(--navy-hover)',
        },
        // ゴールドアクセント（CSS変数参照）
        gold: {
          primary: 'var(--gold-primary)',
          light: 'var(--gold-light)',
          dim: 'var(--gold-dim)',
        },
        // テキストカラー（CSS変数を使用）
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          light: 'var(--text-light)',
        },
        // キャラクターカラー
        character: {
          ironclad: '#ff6563',
          silent: '#7fff00',
          defect: '#87ceeb',
          watcher: '#a600ff',
        },
        // ステータスカラー
        status: {
          success: '#4ade80',
          warning: '#fbbf24',
          error: '#f87171',
          info: '#60a5fa',
        },
        // レアリティカラー
        rarity: {
          common: '#ffffff',
          uncommon: '#80d6ef',
          rare: '#f7cd52',
          boss: '#ff666c',
        },
      },
      boxShadow: {
        'gold-sm': '0 0 4px var(--gold-glow)',
        'gold-md': '0 0 8px var(--gold-glow), 0 0 4px var(--gold-glow)',
        'gold-lg': '0 0 16px var(--gold-glow-strong), 0 0 8px var(--gold-glow)',
        'gold-inset': 'inset 0 0 12px var(--gold-glow)',
      },
    },
  },
  plugins: [
    require("daisyui")
  ],
  daisyui: {
    themes: [
      {
        dark: {
          "primary": "#d4a017",
          "secondary": "#1e2230",
          "accent": "#2a2e3d",
          "neutral": "#161921",
          "base-100": "#0d0f14",
          "base-200": "#161921",
          "base-300": "#2c3040",
          "info": "#60a5fa",
          "success": "#4ade80",
          "warning": "#fbbf24",
          "error": "#f87171",
        },
        light: {
          "primary": "#b8860b",
          "secondary": "#e0d8c8",
          "accent": "#d4ccba",
          "neutral": "#f0ebe0",
          "base-100": "#faf7f0",
          "base-200": "#ffffff",
          "base-300": "#e0d8c8",
          "info": "#60a5fa",
          "success": "#4ade80",
          "warning": "#fbbf24",
          "error": "#f87171",
        },
      },
    ],
  },
};

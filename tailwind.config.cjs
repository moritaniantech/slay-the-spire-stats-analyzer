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
    },
  },
  plugins: [
    require("daisyui")
  ],
  daisyui: {
    themes: [
      {
        dark: {
          "primary": "#3a4a5f",
          "secondary": "#2a3441",
          "accent": "#3d4e60",
          "neutral": "#1a2332",
          "base-100": "#0f1419",
          "base-200": "#1a2332",
          "base-300": "#1e2a3a",
          "info": "#60a5fa",
          "success": "#4ade80",
          "warning": "#fbbf24",
          "error": "#f87171",
        },
        light: {
          "primary": "#3a4a5f",
          "secondary": "#2a3441",
          "accent": "#3d4e60",
          "neutral": "#1a2332",
          "base-100": "#f5f7fa",
          "base-200": "#ffffff",
          "base-300": "#e8eef5",
          "info": "#60a5fa",
          "success": "#4ade80",
          "warning": "#fbbf24",
          "error": "#f87171",
        },
      },
    ],
  },
}; 
import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Chart.jsの登録
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// キャラクター別カラー
const characterColors: { [key: string]: string } = {
  IRONCLAD: 'rgba(255, 101, 99, 0.7)',
  SILENT: 'rgba(127, 255, 0, 0.7)',
  DEFECT: 'rgba(135, 206, 235, 0.7)',
  WATCHER: 'rgba(166, 0, 255, 0.7)',
};

// キャラクター別ボーダーカラー
const characterBorderColors: { [key: string]: string } = {
  IRONCLAD: 'rgba(255, 101, 99, 1)',
  SILENT: 'rgba(127, 255, 0, 1)',
  DEFECT: 'rgba(135, 206, 235, 1)',
  WATCHER: 'rgba(166, 0, 255, 1)',
};

// 数値を3桁ごとにカンマ区切りで表示する関数
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

interface CharacterStat {
  character: string;
  playCount: number;
  victories: number;
  winRate: number;
  highestScore: number;
  highestFloor: number;
}

interface WinRateChartProps {
  characterStats: CharacterStat[];
}

export const WinRateChart: React.FC<WinRateChartProps> = ({ characterStats }) => {
  // グラフデータの準備
  const chartData = {
    labels: characterStats.map(stat => stat.character.charAt(0).toUpperCase() + stat.character.slice(1).toLowerCase()),
    datasets: [
      {
        label: '勝率 (%)',
        data: characterStats.map(stat => Number(stat.winRate.toFixed(1))),
        backgroundColor: characterStats.map(stat => characterColors[stat.character] || 'rgba(100, 100, 100, 0.7)'),
        borderColor: characterStats.map(stat => characterBorderColors[stat.character] || 'rgba(100, 100, 100, 1)'),
        borderWidth: 1,
      },
    ],
  };

  // グラフのオプション
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#333333'
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const characterIndex = context.dataIndex;
            const characterStat = characterStats[characterIndex];
            return [
              `勝率: ${characterStat.winRate.toFixed(1)}%`,
              `勝利数: ${formatNumber(characterStat.victories)}`,
              `プレイ回数: ${formatNumber(characterStat.playCount)}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cccccc' : '#666666'
        },
        grid: {
          color: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cccccc' : '#666666'
        },
        grid: {
          color: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <div className="h-64">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}; 
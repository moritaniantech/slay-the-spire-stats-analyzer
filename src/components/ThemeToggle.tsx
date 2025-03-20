import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { Run } from '../store';

declare global {
  interface Window {
    electronAPI: {
      getAllRuns(): unknown;
      deleteRun(run: Run): unknown;
      getRunFolder(): unknown;
      selectFolder(): unknown;
      onLoadProgress(arg0: (data: import("../types").LoadProgress) => void): unknown;
      loadRunFiles(folderPath: string): unknown;
      getTheme: () => Promise<string>;
      setTheme: (theme: string) => Promise<string>;
    };
  }
}

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<string>('system');

  useEffect(() => {
    // 初期テーマを取得
    window.electronAPI.getTheme().then(setTheme).catch(console.error);
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    try {
      await window.electronAPI.setTheme(newTheme);
      setTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleTheme}
        className="btn btn-circle btn-ghost swap swap-rotate"
      >
        {/* sun icon */}
        <SunIcon
          className={`h-6 w-6 ${theme === 'dark' ? 'hidden' : 'block'}`}
        />
        {/* moon icon */}
        <MoonIcon
          className={`h-6 w-6 ${theme === 'light' ? 'hidden' : 'block'}`}
        />
      </button>
    </div>
  );
};

export default ThemeToggle; 
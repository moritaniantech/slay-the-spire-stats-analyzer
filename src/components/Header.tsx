import { Link } from 'react-router-dom';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  onThemeToggle: () => void;
  theme: string;
}

export function Header({ onThemeToggle, theme }: HeaderProps) {
  return (
    <div className="navbar bg-navy-base border-b border-navy z-50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
      <div className="flex-1">
        <Link to="/home" className="btn btn-ghost text-xl font-en text-primary-custom hover:bg-navy-light transition-colors">
          Slay the Spire Stats Analyzer
        </Link>
      </div>
      <div className="flex-none">
        <button
          onClick={onThemeToggle}
          className="btn btn-ghost btn-circle text-primary-custom hover:bg-navy-light transition-colors"
          title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
          {theme === 'dark' ? (
            <SunIcon className="h-6 w-6 transition-transform duration-200 hover:rotate-90" />
          ) : (
            <MoonIcon className="h-6 w-6 transition-transform duration-200 hover:rotate-12" />
          )}
        </button>
      </div>
    </div>
  );
} 
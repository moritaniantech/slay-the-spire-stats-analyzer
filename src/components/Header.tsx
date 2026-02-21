import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/20/solid';
import { FolderSelector } from './FolderSelector';

interface HeaderProps {
  onThemeToggle: () => void;
  theme: string;
  onFolderSelect: (folderPath: string) => void;
}

const navItems = [
  { to: '/home', label: 'Home' },
  { to: '/cards', label: 'Cards' },
  { to: '/relics', label: 'Relics' },
  { to: '/neow-bonus', label: 'Neow' },
  { to: '/settings', label: 'Settings' },
] as const;

export function Header({ onThemeToggle, theme, onFolderSelect }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="bg-navy-base border-b border-gold-dim-30">
      {/* Row 1: ロゴ + ナビタブ + テーマトグル */}
      <div className="container mx-auto px-4 max-w-[1920px]">
        <div className="flex items-center h-12">
          {/* ロゴ（左） */}
          <Link
            to="/home"
            className="text-gold-light font-en text-lg font-bold tracking-wide hover:text-gold-primary transition-colors flex-shrink-0 mr-6"
          >
            StS Stats Analyzer
          </Link>

          {/* ナビタブ（中央） */}
          <nav className="flex-1 flex items-center justify-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`btn-sts px-4 py-1.5 text-sm font-en ${
                    isActive ? 'btn-sts-active nav-active-indicator' : ''
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* テーマトグル（右） */}
          <button
            onClick={onThemeToggle}
            className="btn btn-ghost btn-circle btn-sm text-gold-light hover:bg-navy-light transition-colors flex-shrink-0"
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Row 2: 戻る/進む + FolderSelector */}
      <div className="border-t border-gold-dim-15">
        <div className="container mx-auto px-4 max-w-[1920px]">
          <div className="flex items-center gap-3 h-10">
            {/* 戻る/進むボタン（左） */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => navigate(-1)}
                className="btn btn-ghost btn-xs btn-circle text-text-secondary hover:text-gold-light hover:bg-navy-light transition-colors"
                disabled={location.pathname === '/home'}
                aria-label="戻る"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate(1)}
                className="btn btn-ghost btn-xs btn-circle text-text-secondary hover:text-gold-light hover:bg-navy-light transition-colors"
                disabled={
                  !window.history.state ||
                  window.history.state.idx === window.history.length - 1
                }
                aria-label="進む"
              >
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>

            {/* FolderSelector（右寄せ） */}
            <div className="flex-1">
              <FolderSelector onFolderSelect={onFolderSelect} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

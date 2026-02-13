import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/20/solid';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  onThemeToggle: () => void;
  theme: string;
}

export function Header({ onThemeToggle, theme }: HeaderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { path: '/home', label: 'ダッシュボード' },
    { path: '/cards', label: 'カード' },
    { path: '/relics', label: 'レリック' },
    { path: '/neow', label: 'ネオーの祝福' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="navbar bg-navy-base border-b border-navy z-50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
        <div className="flex-none">
          <button
            className="btn btn-ghost btn-circle text-primary-custom hover:bg-navy-light transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
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

      {/* サイドバー */}
      <div
        ref={sidebarRef}
        className={`fixed top-16 left-0 h-full w-64 bg-navy-base border-r border-navy shadow-xl transition-transform duration-300 ease-in-out transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-64'
        } z-50`}
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <ul className="menu menu-vertical">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`text-primary-custom hover:bg-navy-light transition-colors ${
                      location.pathname === item.path ? 'bg-navy-accent text-primary-custom' : ''
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* オーバーレイ */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
} 
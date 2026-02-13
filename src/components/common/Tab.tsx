import React from 'react';
import ImageAsset from './ImageAsset';

interface TabConfig {
  id: string;
  name: string;
  searchBgColor: string;
  textColor: string;
  costFrame: string;
}

interface TabProps {
  config: TabConfig;
  isSelected: boolean;
  onClick: () => void;
}

export const Tab: React.FC<TabProps> = ({ config, isSelected, onClick }) => {
  return (
    <button
      className={`
        relative h-[48px] overflow-hidden
        ${isSelected ? 'z-40 scale-x-110 transition-transform duration-200' : 'z-30 hover:z-35'}
        flex-1 min-w-[80px] flex-shrink-0
      `}
      onClick={onClick}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <ImageAsset
          path={`images/cardLibrary/tab_${config.id}.png`}
          alt={config.name}
          className={`
            w-full h-[48px]
            transition-all duration-200
            ${isSelected ? 'brightness-125 contrast-110' : 'hover:brightness-105'}
          `}
        />
      </div>
    </button>
  );
};

export default Tab; 
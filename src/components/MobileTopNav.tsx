import React from 'react';
import { TabType } from '../types';

interface MobileTopNavProps {
  title?: string;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
  onBackClick?: () => void;
}

export const MobileTopNav: React.FC<MobileTopNavProps> = ({
  title = 'ஓலைச்சுவடி',
  onSearchClick,
  onProfileClick,
  onBackClick,
}) => {
  return (
    <header className="fixed top-0 w-full bg-[#fff2d8] border-b border-[#dac2b6] flex justify-between items-center px-4 py-2 h-14 z-50 md:hidden shadow-xs">
      {onBackClick ? (
        <button
          onClick={onBackClick}
          className="text-[#6c2f00] p-1.5 rounded-lg hover:bg-[#fae7b6] transition-colors flex items-center"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      ) : (
        <div className="text-xl font-bold text-[#6c2f00] truncate">{title}</div>
      )}

      {onBackClick && (
        <div className="text-lg font-bold text-[#6c2f00] truncate px-2 flex-1 text-center">
          {title}
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={onSearchClick}
          className="material-symbols-outlined text-[#6c2f00] hover:bg-[#fae7b6] transition-colors p-2 rounded-lg cursor-pointer text-xl"
        >
          search
        </button>
        <button
          onClick={onProfileClick}
          className="material-symbols-outlined text-[#6c2f00] hover:bg-[#fae7b6] transition-colors p-2 rounded-lg cursor-pointer text-xl"
        >
          account_circle
        </button>
      </div>
    </header>
  );
};

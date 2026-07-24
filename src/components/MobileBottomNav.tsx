import React from 'react';
import { TabType } from '../types';

interface MobileBottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <nav className="fixed bottom-0 w-full md:hidden bg-[#fff2d8] border-t border-[#dac2b6] shadow-lg z-50 flex justify-around items-center px-2 h-16 pb-safe">
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-all cursor-pointer ${
          activeTab === 'home'
            ? 'bg-[#8b4513] text-[#ffc29f]'
            : 'text-[#54433a] hover:bg-[#fae7b6]'
        }`}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}
        >
          home
        </span>
        <span className="text-[10px] font-bold mt-0.5">முகப்பு</span>
      </button>

      <button
        onClick={() => setActiveTab('library')}
        className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-all cursor-pointer ${
          activeTab === 'library' || activeTab === 'chapters'
            ? 'bg-[#8b4513] text-[#ffc29f]'
            : 'text-[#54433a] hover:bg-[#fae7b6]'
        }`}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{
            fontVariationSettings:
              activeTab === 'library' || activeTab === 'chapters' ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          library_books
        </span>
        <span className="text-[10px] font-bold mt-0.5">நூலகம்</span>
      </button>

      <button
        onClick={() => setActiveTab('audio')}
        className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-all cursor-pointer ${
          activeTab === 'audio'
            ? 'bg-[#8b4513] text-[#ffc29f]'
            : 'text-[#54433a] hover:bg-[#fae7b6]'
        }`}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: activeTab === 'audio' ? "'FILL' 1" : "'FILL' 0" }}
        >
          spatial_audio_off
        </span>
        <span className="text-[10px] font-bold mt-0.5">ஒலி</span>
      </button>

      <button
        onClick={() => setActiveTab('bookmarks')}
        className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-all cursor-pointer ${
          activeTab === 'bookmarks'
            ? 'bg-[#8b4513] text-[#ffc29f]'
            : 'text-[#54433a] hover:bg-[#fae7b6]'
        }`}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: activeTab === 'bookmarks' ? "'FILL' 1" : "'FILL' 0" }}
        >
          collections_bookmark
        </span>
        <span className="text-[10px] font-bold mt-0.5">குறிப்புகள்</span>
      </button>

      <button
        onClick={() => setActiveTab('settings')}
        className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-all cursor-pointer ${
          activeTab === 'settings'
            ? 'bg-[#8b4513] text-[#ffc29f]'
            : 'text-[#54433a] hover:bg-[#fae7b6]'
        }`}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : "'FILL' 0" }}
        >
          settings
        </span>
        <span className="text-[10px] font-bold mt-0.5">அமைப்புகள்</span>
      </button>
    </nav>
  );
};

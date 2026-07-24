import React from 'react';
import { TabType } from '../types';

interface SidebarNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
}) => {
  return (
    <nav
      className={`h-full fixed left-0 top-0 hidden md:flex flex-col bg-[#fff2d8] border-r border-[#dac2b6] z-40 p-6 gap-2 transition-all duration-300 ${
        collapsed ? 'collapsed' : 'w-64'
      }`}
    >
      <div className="mb-8 mt-2 px-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mb-6 p-2 rounded-lg hover:bg-[#fae7b6] transition-colors flex items-center justify-center text-[#6c2f00] cursor-pointer"
          id="sidebar-toggle"
          title={collapsed ? 'விரிவாக்கு' : 'சுருக்கு'}
        >
          <span className="material-symbols-outlined">
            {collapsed ? 'chevron_right' : 'menu'}
          </span>
        </button>
        {!collapsed && (
          <div>
            <div className="brand-text text-2xl font-bold text-[#6c2f00]">
              ஓலைச்சுவடி
            </div>
            <div className="nav-subtitle text-sm text-[#54433a] opacity-80 mt-1">
              தமிழ் இலக்கியப் பாரம்பரியம்
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        {/* Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`font-bold flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-left ${
            activeTab === 'home'
              ? 'bg-[#8b4513] text-[#ffc29f] shadow-sm'
              : 'text-[#54433a] font-medium hover:bg-[#fae7b6]'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            home
          </span>
          {!collapsed && <span className="nav-text">முகப்பு</span>}
        </button>

        {/* Library / Book Overview */}
        <button
          onClick={() => setActiveTab('library')}
          className={`font-bold flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-left ${
            activeTab === 'library' || activeTab === 'chapters'
              ? 'bg-[#8b4513] text-[#ffc29f] shadow-sm'
              : 'text-[#54433a] font-medium hover:bg-[#fae7b6]'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings:
                activeTab === 'library' || activeTab === 'chapters'
                  ? "'FILL' 1"
                  : "'FILL' 0",
            }}
          >
            library_books
          </span>
          {!collapsed && <span className="nav-text">நூலகம்</span>}
        </button>

        {/* Audiobook */}
        <button
          onClick={() => setActiveTab('audio')}
          className={`font-bold flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-left ${
            activeTab === 'audio'
              ? 'bg-[#8b4513] text-[#ffc29f] shadow-sm'
              : 'text-[#54433a] font-medium hover:bg-[#fae7b6]'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings: activeTab === 'audio' ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            spatial_audio_off
          </span>
          {!collapsed && <span className="nav-text">ஒலிப் புத்தகம்</span>}
        </button>

        {/* Bookmarks & Notes */}
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`font-bold flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-left ${
            activeTab === 'bookmarks'
              ? 'bg-[#8b4513] text-[#ffc29f] shadow-sm'
              : 'text-[#54433a] font-medium hover:bg-[#fae7b6]'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings: activeTab === 'bookmarks' ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            collections_bookmark
          </span>
          {!collapsed && <span className="nav-text">குறிப்புகள் & அடையாளங்கள்</span>}
        </button>

        {/* Reader */}
        <button
          onClick={() => setActiveTab('reader')}
          className={`font-bold flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-left ${
            activeTab === 'reader'
              ? 'bg-[#8b4513] text-[#ffc29f] shadow-sm'
              : 'text-[#54433a] font-medium hover:bg-[#fae7b6]'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings: activeTab === 'reader' ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            menu_book
          </span>
          {!collapsed && <span className="nav-text">வாசிப்புத் திரை</span>}
        </button>

        {/* Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`font-bold flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-left mt-auto ${
            activeTab === 'settings'
              ? 'bg-[#8b4513] text-[#ffc29f] shadow-sm'
              : 'text-[#54433a] font-medium hover:bg-[#fae7b6]'
          }`}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            settings
          </span>
          {!collapsed && <span className="nav-text">அமைப்புகள்</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-4 pt-4 border-t border-[#dac2b6]/60">
          <div className="flex items-center gap-3 p-3 bg-[#fae7b6] rounded-xl border border-[#dac2b6]">
            <div className="w-9 h-9 rounded-full bg-[#ffdbc9] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#6c2f00]">account_circle</span>
            </div>
            <div className="overflow-hidden text-xs">
              <p className="font-bold text-[#241a00] truncate">பயனர் விவரம்</p>
              <p className="text-[#54433a] opacity-80">Premium Member</p>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

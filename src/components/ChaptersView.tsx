import React, { useState } from 'react';
import { Book, Chapter, TabType } from '../types';

interface ChaptersViewProps {
  book: Book;
  onSelectChapter: (chapter: Chapter, mode: 'read' | 'audio') => void;
  onNavigateTab: (tab: TabType) => void;
}

export const ChaptersView: React.FC<ChaptersViewProps> = ({
  book,
  onSelectChapter,
  onNavigateTab,
}) => {
  const [chapterFilter, setChapterFilter] = useState<'all' | 'read' | 'unread' | 'in_progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Find in-progress chapter or default to chapter 1
  const inProgressChapter =
    book.chapters.find((ch) => ch.status === 'in_progress') || book.chapters[0];

  const filteredChapters = book.chapters.filter((ch) => {
    const matchesFilter =
      chapterFilter === 'all'
        ? true
        : chapterFilter === 'read'
        ? ch.status === 'read'
        : chapterFilter === 'unread'
        ? ch.status === 'unread'
        : ch.status === 'in_progress';

    const matchesSearch = ch.title.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#54433a] mb-6">
        <button
          onClick={() => onNavigateTab('home')}
          className="hover:text-[#6c2f00] hover:underline cursor-pointer"
        >
          முகப்பு
        </button>
        <span>/</span>
        <button
          onClick={() => onNavigateTab('library')}
          className="hover:text-[#6c2f00] hover:underline cursor-pointer"
        >
          {book.title}
        </button>
        <span>/</span>
        <span className="font-bold text-[#241a00]">அத்தியாயங்கள்</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#241a00] mb-1">
            {book.title} - அத்தியாயங்கள்
          </h1>
          <p className="text-[#54433a] text-base font-medium">
            பாகம் 1: புது வெள்ளம் ({book.chapters.length} அத்தியாயங்கள்)
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('library')}
          className="text-sm font-bold text-[#6c2f00] bg-[#fae7b6] border border-[#dac2b6] px-4 py-2 rounded-lg hover:bg-[#f4e1b0] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">info</span>
          <span>நூல் விவரங்கள்</span>
        </button>
      </div>

      {/* Continue Reading / In Progress Banner */}
      {inProgressChapter && (
        <div className="bg-[#fff2d8] rounded-2xl border border-[#dac2b6] p-6 mb-10 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#8b4513] mb-2">
                <span className="material-symbols-outlined text-base">history</span>
                <span>தற்போது வாசித்துக்கொண்டிருப்பது</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#241a00] mb-2">
                {inProgressChapter.title}
              </h3>
              <p className="text-sm text-[#54433a] mb-4">
                கால அளவு: {inProgressChapter.duration} • வாசித்த நிலை:{' '}
                {inProgressChapter.progressPercent || 75}%
              </p>

              {/* Progress bar */}
              <div className="w-full max-w-md h-2 bg-[#ffffff] rounded-full overflow-hidden border border-[#dac2b6]">
                <div
                  className="h-full bg-[#8b4513] rounded-full transition-all duration-300"
                  style={{ width: `${inProgressChapter.progressPercent || 75}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={() => onSelectChapter(inProgressChapter, 'read')}
                className="flex-1 md:flex-initial bg-[#6c2f00] text-[#ffffff] font-bold px-6 py-3 rounded-xl hover:bg-[#6c2f00]/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">play_arrow</span>
                <span>தொடர்ந்து வாசிக்க</span>
              </button>

              <button
                onClick={() => onSelectChapter(inProgressChapter, 'audio')}
                className="bg-[#fae7b6] text-[#6c2f00] border border-[#dac2b6] font-bold px-4 py-3 rounded-xl hover:bg-[#f4e1b0] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="ஒலி வடிவில் கேட்க"
              >
                <span className="material-symbols-outlined text-xl">spatial_audio_off</span>
                <span className="hidden sm:inline text-sm">கேட்க</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          <button
            onClick={() => setChapterFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              chapterFilter === 'all'
                ? 'bg-[#6c2f00] text-[#ffffff]'
                : 'bg-[#fae7b6] text-[#241a00] hover:bg-[#f4e1b0]'
            }`}
          >
            அனைத்தும் ({book.chapters.length})
          </button>
          <button
            onClick={() => setChapterFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              chapterFilter === 'read'
                ? 'bg-[#6c2f00] text-[#ffffff]'
                : 'bg-[#fae7b6] text-[#241a00] hover:bg-[#f4e1b0]'
            }`}
          >
            வாசித்தவை ({book.chapters.filter((c) => c.status === 'read').length})
          </button>
          <button
            onClick={() => setChapterFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              chapterFilter === 'unread'
                ? 'bg-[#6c2f00] text-[#ffffff]'
                : 'bg-[#fae7b6] text-[#241a00] hover:bg-[#f4e1b0]'
            }`}
          >
            வாசிக்காதவை ({book.chapters.filter((c) => c.status === 'unread').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#54433a] text-lg">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="அத்தியாயம் தேடுக..."
            className="w-full h-10 pl-9 pr-8 rounded-lg bg-[#ffffff] border border-[#dac2b6] text-xs text-[#241a00] outline-none focus:border-[#6c2f00]"
          />
        </div>
      </div>

      {/* Chapters List */}
      <div className="space-y-3">
        {filteredChapters.map((chapter) => {
          const isRead = chapter.status === 'read';
          const isInProgress = chapter.status === 'in_progress';

          return (
            <div
              key={chapter.id}
              className="bg-[#ffffff] rounded-xl border border-[#dac2b6] p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#8b4513] transition-all shadow-xs group"
            >
              <div className="flex items-start sm:items-center gap-4 flex-1">
                {/* Status Indicator Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                    isRead
                      ? 'bg-[#dcfce7] text-[#15803d] border border-[#86efac]'
                      : isInProgress
                      ? 'bg-[#ffdbc9] text-[#6c2f00] border border-[#f97316]'
                      : 'bg-[#fff2d8] text-[#54433a] border border-[#dac2b6]'
                  }`}
                >
                  {isRead ? (
                    <span className="material-symbols-outlined text-xl">check</span>
                  ) : (
                    chapter.id
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-[#241a00] text-base sm:text-lg group-hover:text-[#6c2f00] transition-colors">
                    {chapter.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-[#54433a] mt-1">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {chapter.duration}
                    </span>
                    <span>•</span>
                    <span className="font-medium">
                      {isRead
                        ? 'வாசித்து முடிந்தது'
                        : isInProgress
                        ? `வாசித்துக்கொண்டிருக்கிறது (${chapter.progressPercent}%)`
                        : 'வாசிக்கப்படவில்லை'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#dac2b6]/40">
                <button
                  onClick={() => onSelectChapter(chapter, 'audio')}
                  className="p-2.5 rounded-lg bg-[#fae7b6] text-[#6c2f00] hover:bg-[#8b4513] hover:text-[#ffc29f] transition-all cursor-pointer"
                  title="ஒலி வடிவில் கேட்க"
                >
                  <span className="material-symbols-outlined text-xl">spatial_audio_off</span>
                </button>

                <button
                  onClick={() => onSelectChapter(chapter, 'read')}
                  className="bg-[#6c2f00] text-[#ffffff] font-bold px-4 py-2 rounded-lg hover:bg-[#6c2f00]/90 transition-all text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>{isRead ? 'மீண்டும் வாசிக்க' : 'வாசிக்க'}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

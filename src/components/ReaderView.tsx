import React, { useState } from 'react';
import { Book, Chapter, SettingsState, TabType } from '../types';

interface ReaderViewProps {
  book: Book;
  chapter: Chapter;
  settings: SettingsState;
  onNavigateTab: (tab: TabType) => void;
  onAddBookmark: (bookTitle: string, chapterTitle: string, page: number, snippet: string) => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  chapter,
  settings,
  onNavigateTab,
  onAddBookmark,
  onNextChapter,
  onPrevChapter,
}) => {
  const [page, setPage] = useState(42);
  const totalPages = 120;
  const [fontSizePercent, setFontSizePercent] = useState(
    settings.fontSizeStep === 1 ? 100 : settings.fontSizeStep === 2 ? 110 : settings.fontSizeStep === 3 ? 120 : 130
  );
  const [bookmarked, setBookmarked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleBookmarkToggle = () => {
    if (!bookmarked) {
      const snippet = chapter.content[0] || 'அத்தியாயம் வாசிப்பு குறிப்பு...';
      onAddBookmark(book.title, chapter.title, page, snippet);
      setBookmarked(true);
      showToast('பக்கம் அடையாளமிடப்பட்டது! (Bookmark added)');
    } else {
      setBookmarked(false);
      showToast('அடையாளம் அகற்றப்பட்டது');
    }
  };

  const increaseFontSize = () => {
    setFontSizePercent((prev) => Math.min(prev + 10, 150));
  };

  const decreaseFontSize = () => {
    setFontSizePercent((prev) => Math.max(prev - 10, 90));
  };

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#8b4513] text-[#ffc29f] px-5 py-3 rounded-xl shadow-lg border border-[#dac2b6] font-bold text-sm flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Reader Controls Header */}
      <div className="bg-[#fff2d8] rounded-2xl border border-[#dac2b6] p-4 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-4 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('chapters')}
            className="text-[#6c2f00] p-2 rounded-lg hover:bg-[#fae7b6] transition-colors flex items-center cursor-pointer"
            title="அத்தியாயங்கள் பட்டியல்"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <h2 className="text-base font-bold text-[#241a00] truncate max-w-[200px] sm:max-w-xs">
              {book.title}
            </h2>
            <p className="text-xs text-[#54433a] truncate">{chapter.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Font Size Controls */}
          <div className="flex items-center bg-[#ffffff] rounded-xl border border-[#dac2b6] p-1">
            <button
              onClick={decreaseFontSize}
              className="px-2.5 py-1 text-xs font-bold text-[#6c2f00] hover:bg-[#fae7b6] rounded-lg transition-colors cursor-pointer"
              title="எழுத்து அளவைக் குறை"
            >
              A-
            </button>
            <span className="px-2 text-xs font-bold text-[#241a00] border-x border-[#dac2b6]">
              {fontSizePercent}%
            </span>
            <button
              onClick={increaseFontSize}
              className="px-2.5 py-1 text-xs font-bold text-[#6c2f00] hover:bg-[#fae7b6] rounded-lg transition-colors cursor-pointer"
              title="எழுத்து அளவை அதிகரி"
            >
              A+
            </button>
          </div>

          {/* Audio Switch Shortcut */}
          <button
            onClick={() => onNavigateTab('audio')}
            className="p-2.5 rounded-xl bg-[#fae7b6] text-[#6c2f00] hover:bg-[#f4e1b0] transition-colors cursor-pointer flex items-center"
            title="ஒலி வடிவில் கேட்க"
          >
            <span className="material-symbols-outlined text-xl">spatial_audio_off</span>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmarkToggle}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center ${
              bookmarked
                ? 'bg-[#8b4513] text-[#ffc29f] border-[#8b4513]'
                : 'bg-[#ffffff] text-[#54433a] border-[#dac2b6] hover:bg-[#fae7b6]'
            }`}
            title="பக்கம் அடையாளம் இடுக"
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: bookmarked ? "'FILL' 1" : "'FILL' 0" }}
            >
              bookmark
            </span>
          </button>
        </div>
      </div>

      {/* Top Reading Progress Line */}
      <div className="w-full bg-[#dac2b6] h-1.5 rounded-full overflow-hidden mb-8">
        <div
          className="bg-[#8b4513] h-full transition-all duration-300"
          style={{ width: `${Math.round((page / totalPages) * 100)}%` }}
        ></div>
      </div>

      {/* Main Manuscript Reading Area */}
      <div className="bg-[#ffffff] rounded-2xl border border-[#dac2b6] p-6 sm:p-12 shadow-sm mb-8 parchment-texture min-h-[500px]">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 pb-6 border-b border-[#dac2b6]/60">
            <span className="text-xs font-bold text-[#8b4513] uppercase tracking-wider mb-2 block">
              {book.title} • {book.author}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#241a00]">
              {chapter.title}
            </h1>
          </div>

          {/* Paragraphs */}
          <div
            className="space-y-6 text-[#241a00] leading-relaxed text-justify"
            style={{
              fontSize: `${(fontSizePercent / 100) * 1.125}rem`,
              lineHeight: 1.8,
            }}
          >
            {chapter.content.map((paragraph, index) => (
              <p key={index} className="indent-8">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Page Navigation */}
      <div className="bg-[#fff2d8] rounded-2xl border border-[#dac2b6] p-4 flex justify-between items-center shadow-xs">
        <button
          onClick={() => {
            setPage((p) => Math.max(1, p - 1));
            if (onPrevChapter && page === 1) onPrevChapter();
          }}
          disabled={page === 1}
          className="bg-[#fae7b6] text-[#6c2f00] font-bold px-4 py-2 rounded-xl hover:bg-[#f4e1b0] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
          <span>முந்தைய பக்கம்</span>
        </button>

        <span className="font-bold text-[#241a00] text-sm">
          பக்கம் {page} / {totalPages}
        </span>

        <button
          onClick={() => {
            setPage((p) => Math.min(totalPages, p + 1));
            if (onNextChapter && page === totalPages) onNextChapter();
          }}
          disabled={page === totalPages}
          className="bg-[#6c2f00] text-[#ffffff] font-bold px-4 py-2 rounded-xl hover:bg-[#6c2f00]/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm"
        >
          <span>அடுத்த பக்கம்</span>
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { Book, TabType } from '../types';

interface BookDetailViewProps {
  book: Book;
  onNavigateTab: (tab: TabType) => void;
  onToggleLibrary: (bookId: string) => void;
  onToggleSync: (bookId: string) => void;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  book,
  onNavigateTab,
  onToggleLibrary,
  onToggleSync,
}) => {
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
          onClick={() => onNavigateTab('home')}
          className="hover:text-[#6c2f00] hover:underline cursor-pointer"
        >
          நூலகம்
        </button>
        <span>/</span>
        <span className="font-bold text-[#241a00] truncate">{book.title}</span>
      </div>

      {/* Book Hero Card */}
      <div className="bg-[#fff2d8] rounded-2xl border border-[#dac2b6] p-6 md:p-8 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Cover Image */}
          <div className="relative w-48 sm:w-56 md:w-64 aspect-[2/3] shrink-0 bg-[#ffffff] rounded-xl border border-[#dac2b6] overflow-hidden shadow-md">
            <img
              src={book.coverImage}
              alt={book.title}
              className="w-full h-full object-cover"
            />
            {book.inLibrary && (
              <div className="absolute top-3 right-3 bg-[#8b4513] text-[#ffc29f] text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">bookmark</span>
                நூலகத்தில் உள்ளது
              </div>
            )}
          </div>

          {/* Book Info */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
              <span className="bg-[#ffdbc9] text-[#321200] text-xs font-bold px-3 py-1 rounded-lg">
                {book.category}
              </span>
              {book.tag && (
                <span className="bg-[#8b4513] text-[#ffc29f] text-xs font-bold px-3 py-1 rounded-lg">
                  {book.tag}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-[#241a00] mb-2">
              {book.title}
            </h1>
            <p className="text-lg md:text-xl text-[#54433a] font-medium mb-4">
              {book.author}
            </p>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center text-[#d97706]">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <span className="font-bold text-base ml-1 text-[#241a00]">{book.rating}</span>
              </div>
              <span className="text-sm text-[#54433a]">
                ({book.ratingCount.toLocaleString('ta-IN')} மதிப்பீடுகள்)
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 w-full justify-center md:justify-start mt-auto pt-2">
              <button
                onClick={() => onNavigateTab('reader')}
                className="bg-[#6c2f00] text-[#ffffff] font-bold px-6 py-3 rounded-xl hover:bg-[#6c2f00]/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 flex-1 sm:flex-initial"
              >
                <span className="material-symbols-outlined text-xl">menu_book</span>
                <span>வாசிக்கத் தொடங்குக</span>
              </button>

              <button
                onClick={() => onNavigateTab('audio')}
                className="bg-[#fae7b6] text-[#6c2f00] border border-[#dac2b6] font-bold px-5 py-3 rounded-xl hover:bg-[#f4e1b0] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 flex-1 sm:flex-initial"
              >
                <span className="material-symbols-outlined text-xl">spatial_audio_off</span>
                <span>ஒலிப் புத்தகம்</span>
              </button>

              <button
                onClick={() => onToggleLibrary(book.id)}
                className={`font-bold px-4 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
                  book.inLibrary
                    ? 'bg-[#8b4513] text-[#ffc29f] border-[#8b4513]'
                    : 'bg-[#ffffff] text-[#54433a] border-[#dac2b6] hover:bg-[#fae7b6]'
                }`}
              >
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: book.inLibrary ? "'FILL' 1" : "'FILL' 0" }}
                >
                  bookmark
                </span>
                <span>{book.inLibrary ? 'சேமிக்கப்பட்டது' : 'நூலகத்தில் சேர்'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#ffffff] rounded-xl p-4 border border-[#dac2b6] shadow-xs">
          <div className="flex items-center gap-2 text-[#54433a] text-xs font-bold mb-1">
            <span className="material-symbols-outlined text-base">auto_stories</span>
            <span>பக்கங்கள்</span>
          </div>
          <p className="text-xl font-bold text-[#241a00]">{book.pages}</p>
        </div>

        <div className="bg-[#ffffff] rounded-xl p-4 border border-[#dac2b6] shadow-xs">
          <div className="flex items-center gap-2 text-[#54433a] text-xs font-bold mb-1">
            <span className="material-symbols-outlined text-base">schedule</span>
            <span>வாசிப்பு நேரம்</span>
          </div>
          <p className="text-xl font-bold text-[#241a00]">{book.readTime}</p>
        </div>

        <div className="bg-[#ffffff] rounded-xl p-4 border border-[#dac2b6] shadow-xs">
          <div className="flex items-center justify-between text-[#54433a] text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">download</span>
              <span>பதிவிறக்கம்</span>
            </span>
            <span>{book.downloadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-[#fff2d8] rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-[#8b4513] rounded-full transition-all duration-300"
              style={{ width: `${book.downloadProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-[#ffffff] rounded-xl p-4 border border-[#dac2b6] shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[#54433a] text-xs font-bold mb-0.5">
              <span className="material-symbols-outlined text-base">sync</span>
              <span>ஒத்திசைவு</span>
            </div>
            <p className="text-xs text-[#54433a]">சாதனங்களில் ஒத்திசை</p>
          </div>
          <button
            onClick={() => onToggleSync(book.id)}
            className={`w-12 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
              book.syncEnabled ? 'bg-[#8b4513]' : 'bg-[#dac2b6]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-[#ffffff] transition-transform ${
                book.syncEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>
      </div>

      {/* Chapters Shortcut Banner */}
      <div className="bg-[#fae7b6] rounded-xl border border-[#dac2b6] p-5 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#8b4513] text-[#ffc29f] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">format_list_bulleted</span>
          </div>
          <div>
            <h3 className="font-bold text-[#241a00] text-base">
              அத்தியாயங்கள் பட்டியல் ({book.chapters.length} அத்தியாயங்கள்)
            </h3>
            <p className="text-xs text-[#54433a]">
              அத்தியாயம் வாரியாக வாசிக்க அல்லது கேட்க
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab('chapters')}
          className="bg-[#6c2f00] text-[#ffffff] text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-[#6c2f00]/90 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>அத்தியாயங்களைக் காண்க</span>
          <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>

      {/* Book Description & Sample Quote */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-[#ffffff] rounded-2xl border border-[#dac2b6] p-6 shadow-xs">
          <h3 className="text-xl font-bold text-[#241a00] mb-4 pb-3 border-b border-[#dac2b6]/60">
            நூல் விளக்கம்
          </h3>
          <p className="text-[#54433a] leading-relaxed text-base whitespace-pre-line mb-6">
            {book.description}
          </p>

          <h4 className="font-bold text-[#241a00] text-base mb-3">முக்கிய அம்சங்கள்:</h4>
          <ul className="space-y-2 text-sm text-[#54433a] list-disc list-inside">
            <li>தமிழின் மிகச்சிறந்த வரலாற்றுப் புதினம்</li>
            <li>சோழர் கால வரலாற்று பின்னணி கொண்ட கதையமைப்பு</li>
            <li>அனைத்து அத்தியாயங்களும் தெளிவான ஒலிப் புத்தக வடிவில் கிடைக்கின்றன</li>
            <li>ஆஃப்லைன் வாசிப்பு மற்றும் ஒத்திசைவு வசதி</li>
          </ul>
        </div>

        {/* Sample Parchment Quote Box */}
        <div className="bg-[#fff2d8] rounded-2xl border border-[#dac2b6] p-6 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 text-[#8b4513] font-bold text-sm mb-3">
            <span className="material-symbols-outlined">auto_awesome</span>
            <span>மாதிரி வரிகள்</span>
          </div>
          <div className="bg-[#ffffff] rounded-xl p-5 border border-[#dac2b6] relative flex-1 italic text-[#241a00] text-base leading-relaxed parchment-texture">
            <span className="material-symbols-outlined text-3xl text-[#8b4513]/30 absolute top-2 left-2">
              format_quote
            </span>
            <p className="pt-4 pb-2 px-2 text-center font-serif">
              "{book.sampleQuote}"
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('reader')}
            className="mt-4 w-full py-2.5 bg-[#8b4513] text-[#ffc29f] font-bold rounded-xl hover:bg-[#6c2f00] transition-colors text-sm cursor-pointer text-center"
          >
            முழுப்பக்கத்தை வாசிக்க
          </button>
        </div>
      </div>
    </div>
  );
};

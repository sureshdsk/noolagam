import React, { useState } from 'react';
import { Bookmark, Note, TabType } from '../types';

interface BookmarksNotesViewProps {
  bookmarks: Bookmark[];
  notes: Note[];
  onDeleteBookmark: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onAddNote: (newNote: Note) => void;
  onNavigateTab: (tab: TabType) => void;
}

export const BookmarksNotesView: React.FC<BookmarksNotesViewProps> = ({
  bookmarks,
  notes,
  onDeleteBookmark,
  onDeleteNote,
  onAddNote,
  onNavigateTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bookmarks' | 'notes'>('bookmarks');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('பொன்னியின் செல்வன்');
  const [newQuote, setNewQuote] = useState('');
  const [newCommentary, setNewCommentary] = useState('');

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.trim()) return;

    const createdNote: Note = {
      id: Date.now().toString(),
      bookTitle: newBookTitle,
      date: new Date().toLocaleDateString('ta-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      quote: newQuote,
      commentary: newCommentary,
    };

    onAddNote(createdNote);
    setNewQuote('');
    setNewCommentary('');
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#241a00] mb-1">
            குறிப்புகள் & அடையாளங்கள்
          </h1>
          <p className="text-[#54433a] text-sm">
            நீங்கள் சேமித்த புத்தகப் பக்கங்கள் மற்றும் இலக்கியக் குறிப்புகள்
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#6c2f00] text-[#ffffff] font-bold px-5 py-2.5 rounded-xl hover:bg-[#6c2f00]/90 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>புதிய குறிப்பு</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-[#dac2b6] mb-8 gap-6">
        <button
          onClick={() => setActiveSubTab('bookmarks')}
          className={`pb-3 font-bold text-base transition-colors relative cursor-pointer ${
            activeSubTab === 'bookmarks'
              ? 'text-[#6c2f00] border-b-2 border-[#6c2f00]'
              : 'text-[#54433a] hover:text-[#241a00]'
          }`}
        >
          புத்தக அடையாளங்கள் ({bookmarks.length})
        </button>

        <button
          onClick={() => setActiveSubTab('notes')}
          className={`pb-3 font-bold text-base transition-colors relative cursor-pointer ${
            activeSubTab === 'notes'
              ? 'text-[#6c2f00] border-b-2 border-[#6c2f00]'
              : 'text-[#54433a] hover:text-[#241a00]'
          }`}
        >
          சுய குறிப்புகள் ({notes.length})
        </button>
      </div>

      {/* Bookmarks Section */}
      {activeSubTab === 'bookmarks' && (
        <div className="space-y-4">
          {bookmarks.length === 0 ? (
            <div className="bg-[#fff2d8] rounded-2xl p-10 text-center border border-[#dac2b6]">
              <span className="material-symbols-outlined text-4xl text-[#877369] mb-2">
                bookmark_border
              </span>
              <p className="text-[#54433a] font-medium">
                இன்னும் எவ்வித புத்தக அடையாளங்களும் சேர்க்கப்படவில்லை.
              </p>
            </div>
          ) : (
            bookmarks.map((bm) => (
              <div
                key={bm.id}
                className="bg-[#ffffff] rounded-2xl border border-[#dac2b6] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#8b4513] transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#8b4513] mb-1">
                    <span className="material-symbols-outlined text-base">bookmark</span>
                    <span>{bm.bookTitle}</span>
                    <span>•</span>
                    <span>{bm.createdAt}</span>
                  </div>

                  <h3 className="font-bold text-[#241a00] text-base mb-2">
                    {bm.chapterTitle}
                  </h3>

                  <p className="text-sm text-[#54433a] italic bg-[#fff2d8]/60 p-3 rounded-xl border border-[#dac2b6]/40 font-serif">
                    {bm.snippet}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#dac2b6]/40">
                  <button
                    onClick={() => onDeleteBookmark(bm.id)}
                    className="p-2.5 rounded-xl text-[#b91c1c] hover:bg-[#fee2e2] transition-colors cursor-pointer"
                    title="நீக்குக"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>

                  <button
                    onClick={() => onNavigateTab('reader')}
                    className="bg-[#6c2f00] text-[#ffffff] font-bold px-4 py-2.5 rounded-xl hover:bg-[#6c2f00]/90 transition-all text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <span>பக்கத்திற்குச் செல்</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Notes Section with Perforation Design */}
      {activeSubTab === 'notes' && (
        <div className="space-y-6">
          {notes.length === 0 ? (
            <div className="bg-[#fff2d8] rounded-2xl p-10 text-center border border-[#dac2b6]">
              <span className="material-symbols-outlined text-4xl text-[#877369] mb-2">
                edit_note
              </span>
              <p className="text-[#54433a] font-medium">
                இன்னும் எவ்வித குறிப்புகளும் எழுதப்படவில்லை.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="bg-[#fff2d8] rounded-2xl border border-[#dac2b6] p-6 shadow-xs relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="bg-[#ffdbc9] text-[#321200] text-xs font-bold px-3 py-1 rounded-lg">
                      {note.bookTitle}
                    </span>
                    <p className="text-xs text-[#54433a] mt-2 font-medium">{note.date}</p>
                  </div>

                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="text-[#54433a] hover:text-[#b91c1c] p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="நீக்குக"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                {/* Quote Box */}
                <div className="bg-[#ffffff] rounded-xl p-4 border border-[#dac2b6] mb-4 text-[#241a00] font-serif italic text-base relative">
                  <span className="material-symbols-outlined text-2xl text-[#8b4513]/20 absolute top-2 left-2">
                    format_quote
                  </span>
                  <p className="pl-6">{note.quote}</p>
                </div>

                {/* Perforation Divider */}
                <div className="divider-perforation"></div>

                {/* Commentary */}
                <div>
                  <h4 className="text-xs font-bold text-[#8b4513] uppercase mb-1">
                    உங்கள் சிந்தனை / உரை:
                  </h4>
                  <p className="text-sm text-[#54433a] leading-relaxed">
                    {note.commentary}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#241a00]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#fff8f0] rounded-2xl border border-[#dac2b6] max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#dac2b6]">
              <h3 className="text-xl font-bold text-[#241a00]">
                புதிய இலக்கியக் குறிப்பு எழுதுக
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#54433a] hover:text-[#241a00] p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#54433a] mb-1">
                  நூலின் தலைப்பு
                </label>
                <input
                  type="text"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#ffffff] border border-[#dac2b6] text-sm text-[#241a00] outline-none focus:border-[#6c2f00]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#54433a] mb-1">
                  மேற்கோள் / வரிகள் (Quote)
                </label>
                <textarea
                  value={newQuote}
                  onChange={(e) => setNewQuote(e.target.value)}
                  placeholder="நூலில் உங்களைக் கவர்ந்த வரிகள்..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-[#ffffff] border border-[#dac2b6] text-sm text-[#241a00] outline-none focus:border-[#6c2f00]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#54433a] mb-1">
                  உங்கள் விளக்கம் / கருத்து (Commentary)
                </label>
                <textarea
                  value={newCommentary}
                  onChange={(e) => setNewCommentary(e.target.value)}
                  placeholder="இந்த வரிகளைப் பற்றிய உங்கள் எண்ணங்கள்..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-[#ffffff] border border-[#dac2b6] text-sm text-[#241a00] outline-none focus:border-[#6c2f00]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#dac2b6] text-sm font-bold text-[#54433a] hover:bg-[#fae7b6] cursor-pointer"
                >
                  ரத்து செய்
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#6c2f00] text-[#ffffff] text-sm font-bold hover:bg-[#6c2f00]/90 cursor-pointer shadow-sm"
                >
                  சேமிக்க
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

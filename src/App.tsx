import React, { useState, useEffect } from 'react';
import { TabType, Book, Chapter, Bookmark, Note, SettingsState } from './types';
import { BOOKS_DATA, INITIAL_BOOKMARKS, INITIAL_NOTES } from './data/booksData';
import { SidebarNav } from './components/SidebarNav';
import { MobileTopNav } from './components/MobileTopNav';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomeView } from './components/HomeView';
import { BookDetailView } from './components/BookDetailView';
import { ChaptersView } from './components/ChaptersView';
import { AudioPlayerView } from './components/AudioPlayerView';
import { ReaderView } from './components/ReaderView';
import { BookmarksNotesView } from './components/BookmarksNotesView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [books, setBooks] = useState<Book[]>(BOOKS_DATA);
  const [selectedBook, setSelectedBook] = useState<Book>(BOOKS_DATA[0]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter>(
    BOOKS_DATA[0].chapters[3] || BOOKS_DATA[0].chapters[0]
  );
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(INITIAL_BOOKMARKS);
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [selectedCategory, setSelectedCategory] = useState<string>('அனைத்தும்');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [settings, setSettings] = useState<SettingsState>({
    darkMode: false,
    theme: 'traditional',
    fontSizeStep: 2,
    dyslexicFont: false,
    dailyReminder: true,
    newArrivals: true,
    audioSummary: true,
    dataSaver: false,
  });

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, selectedBook, selectedChapter]);

  const handleSelectBook = (book: Book, tabToOpen: TabType = 'library') => {
    setSelectedBook(book);
    if (book.chapters && book.chapters.length > 0) {
      const inProgress = book.chapters.find((c) => c.status === 'in_progress');
      setSelectedChapter(inProgress || book.chapters[0]);
    }
    setActiveTab(tabToOpen);
  };

  const handleSelectChapter = (chapter: Chapter, mode: 'read' | 'audio') => {
    setSelectedChapter(chapter);
    if (mode === 'audio') {
      setActiveTab('audio');
    } else {
      setActiveTab('reader');
    }
  };

  const handleToggleLibrary = (bookId: string) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const updated = { ...b, inLibrary: !b.inLibrary };
          if (selectedBook.id === bookId) setSelectedBook(updated);
          return updated;
        }
        return b;
      })
    );
  };

  const handleToggleSync = (bookId: string) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === bookId) {
          const updated = { ...b, syncEnabled: !b.syncEnabled };
          if (selectedBook.id === bookId) setSelectedBook(updated);
          return updated;
        }
        return b;
      })
    );
  };

  const handleAddBookmark = (
    bookTitle: string,
    chapterTitle: string,
    page: number,
    snippet: string
  ) => {
    const newBm: Bookmark = {
      id: Date.now().toString(),
      bookId: selectedBook.id,
      bookTitle,
      chapterTitle: `${chapterTitle} - பக்கம் ${page}`,
      page,
      snippet,
      createdAt: new Date().toLocaleDateString('ta-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    };
    setBookmarks((prev) => [newBm, ...prev]);
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddNote = (newNote: Note) => {
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Next/Prev Chapter handlers for Reader
  const handleNextChapter = () => {
    const currentIndex = selectedBook.chapters.findIndex((c) => c.id === selectedChapter.id);
    if (currentIndex !== -1 && currentIndex < selectedBook.chapters.length - 1) {
      setSelectedChapter(selectedBook.chapters[currentIndex + 1]);
    }
  };

  const handlePrevChapter = () => {
    const currentIndex = selectedBook.chapters.findIndex((c) => c.id === selectedChapter.id);
    if (currentIndex > 0) {
      setSelectedChapter(selectedBook.chapters[currentIndex - 1]);
    }
  };

  // Theme container classes
  const themeClass =
    settings.darkMode || settings.theme === 'contrast'
      ? 'bg-[#18120a] text-[#fff8f0]'
      : settings.theme === 'minimal'
      ? 'bg-[#f8fafc] text-[#0f172a]'
      : 'bg-[#fff8f0] text-[#241a00]';

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${themeClass}`}>
      {/* Mobile Header */}
      <MobileTopNav
        title={
          activeTab === 'home'
            ? 'ஓலைச்சுவடி'
            : activeTab === 'library'
            ? selectedBook.title
            : activeTab === 'chapters'
            ? `${selectedBook.title} - அத்தியாயங்கள்`
            : activeTab === 'audio'
            ? 'ஒலிப் புத்தகம்'
            : activeTab === 'reader'
            ? selectedChapter.title
            : activeTab === 'bookmarks'
            ? 'குறிப்புகள்'
            : 'அமைப்புகள்'
        }
        onSearchClick={() => {
          setActiveTab('home');
        }}
        onProfileClick={() => {
          setActiveTab('settings');
        }}
        onBackClick={
          activeTab !== 'home'
            ? () => {
                if (activeTab === 'chapters' || activeTab === 'audio' || activeTab === 'reader') {
                  setActiveTab('library');
                } else {
                  setActiveTab('home');
                }
              }
            : undefined
        }
      />

      {/* Desktop Sidebar Navigation */}
      <SidebarNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content View Container */}
      <main
        className={`pt-14 pb-20 md:pt-0 md:pb-10 transition-all duration-300 min-h-screen ${
          collapsed ? 'md:ml-[80px]' : 'md:ml-64'
        }`}
      >
        {activeTab === 'home' && (
          <HomeView
            books={books}
            onSelectBook={handleSelectBook}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activeTab === 'library' && (
          <BookDetailView
            book={selectedBook}
            onNavigateTab={setActiveTab}
            onToggleLibrary={handleToggleLibrary}
            onToggleSync={handleToggleSync}
          />
        )}

        {activeTab === 'chapters' && (
          <ChaptersView
            book={selectedBook}
            onSelectChapter={handleSelectChapter}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'audio' && (
          <AudioPlayerView
            book={selectedBook}
            chapter={selectedChapter}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'reader' && (
          <ReaderView
            book={selectedBook}
            chapter={selectedChapter}
            settings={settings}
            onNavigateTab={setActiveTab}
            onAddBookmark={handleAddBookmark}
            onNextChapter={handleNextChapter}
            onPrevChapter={handlePrevChapter}
          />
        )}

        {activeTab === 'bookmarks' && (
          <BookmarksNotesView
            bookmarks={bookmarks}
            notes={notes}
            onDeleteBookmark={handleDeleteBookmark}
            onDeleteNote={handleDeleteNote}
            onAddNote={handleAddNote}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView settings={settings} setSettings={setSettings} />
        )}
      </main>

      {/* Mobile Navigation Bottom Bar */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

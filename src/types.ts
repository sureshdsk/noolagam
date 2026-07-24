export type TabType = 'home' | 'library' | 'chapters' | 'audio' | 'reader' | 'bookmarks' | 'settings';

export interface Chapter {
  id: number;
  title: string;
  duration: string;
  status: 'read' | 'in_progress' | 'unread';
  progressPercent?: number;
  content: string[];
}

export interface Book {
  id: string;
  title: string;
  englishTitle?: string;
  author: string;
  category: string;
  tag?: string;
  coverImage: string;
  rating: number;
  ratingCount: number;
  description: string;
  pages: string;
  readTime: string;
  inLibrary: boolean;
  downloadProgress: number;
  syncEnabled: boolean;
  sampleQuote: string;
  chapters: Chapter[];
}

export interface Bookmark {
  id: string;
  bookId: string;
  bookTitle: string;
  chapterTitle: string;
  page: number;
  snippet: string;
  createdAt: string;
}

export interface Note {
  id: string;
  bookTitle: string;
  date: string;
  quote: string;
  commentary: string;
}

export interface SettingsState {
  darkMode: boolean;
  theme: 'traditional' | 'minimal' | 'contrast';
  fontSizeStep: number; // 1: Small, 2: Medium, 3: Large, 4: Extra Large
  dyslexicFont: boolean;
  dailyReminder: boolean;
  newArrivals: boolean;
  audioSummary: boolean;
  dataSaver: boolean;
}

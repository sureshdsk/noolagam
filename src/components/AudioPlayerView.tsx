import React, { useState, useEffect, useRef } from 'react';
import { Book, Chapter, TabType } from '../types';

interface AudioPlayerViewProps {
  book: Book;
  chapter: Chapter;
  onNavigateTab: (tab: TabType) => void;
}

export const AudioPlayerView: React.FC<AudioPlayerViewProps> = ({
  book,
  chapter,
  onNavigateTab,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(252); // 04:12 in seconds
  const duration = 765; // 12:45 in seconds
  const [playbackSpeed, setPlaybackSpeed] = useState<'1x' | '1.25x' | '1.5x' | '2x'>('1x');
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showAiSummary, setShowAiSummary] = useState(true);

  const audioSynthRef = useRef<number | null>(null);

  // Simple Speech/Tone synth simulation for interactive feedback when playing
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  const cycleSpeed = () => {
    const speeds: ('1x' | '1.25x' | '1.5x' | '2x')[] = ['1x', '1.25x', '1.5x', '2x'];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const skipSeconds = (secs: number) => {
    setCurrentTime((prev) => Math.max(0, Math.min(duration, prev + secs)));
  };

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 md:py-10">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => onNavigateTab('chapters')}
          className="text-[#6c2f00] p-2 rounded-xl bg-[#fae7b6] hover:bg-[#f4e1b0] transition-colors flex items-center gap-2 font-bold text-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          <span>அத்தியாயங்கள்</span>
        </button>

        <div className="text-center">
          <h2 className="text-lg font-bold text-[#241a00]">{book.title}</h2>
          <p className="text-xs text-[#54433a]">{chapter.title}</p>
        </div>

        <button
          onClick={() => onNavigateTab('reader')}
          className="text-[#6c2f00] p-2 rounded-xl bg-[#fae7b6] hover:bg-[#f4e1b0] transition-colors flex items-center gap-1.5 font-bold text-sm cursor-pointer"
          title="உரையாக வாசிக்க"
        >
          <span className="material-symbols-outlined text-xl">menu_book</span>
          <span className="hidden sm:inline">வாசிக்க</span>
        </button>
      </div>

      {/* Main Player Card */}
      <div className="bg-[#fff2d8] rounded-3xl border border-[#dac2b6] p-6 sm:p-10 shadow-md flex flex-col items-center">
        {/* Cover Art */}
        <div className="relative w-56 sm:w-64 aspect-square rounded-2xl bg-[#ffffff] border-2 border-[#dac2b6] overflow-hidden shadow-lg mb-8 group">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDXbE-lMstCVgwSKwdhzr4_6UfgLS7HeJUhJL1m2nvhNxIeudxe58pYB0LHuQGOr5b2GxbxplUlVXOLUICpetktbPwj-JLa3L4diAwx06cTrmA1RtHmqZQrDYzjF2vJppY48g4u9mxCk_RDAcF6KheLS9a5O363EUjtVV2w7F2NOiroJfwgzhiFQEoifHgQ94v8yi5dGYQnXzEY-HODDNIbZBB2HwiIqZi_mqguDWrQ-9AbEroLoRcJmxKxmpZAwk1EfNNnwlcpn8"
            alt={book.title}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isPlaying ? 'scale-105' : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#241a00]/40 via-transparent to-transparent"></div>
          
          {isPlaying && (
            <div className="absolute bottom-3 left-3 bg-[#8b4513]/90 text-[#ffc29f] text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span>
              ஒலி இயங்குகிறது
            </div>
          )}
        </div>

        {/* Title and Author */}
        <h3 className="text-2xl sm:text-3xl font-bold text-[#241a00] text-center mb-1">
          {chapter.title}
        </h3>
        <p className="text-base text-[#54433a] font-medium text-center mb-8">
          {book.author} • {book.title}
        </p>

        {/* Progress Slider */}
        <div className="w-full max-w-lg mb-6">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-[#dac2b6] rounded-lg appearance-none cursor-pointer accent-[#8b4513]"
          />
          <div className="flex justify-between items-center text-xs text-[#54433a] font-bold mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 w-full mb-8">
          {/* Speed Toggle */}
          <button
            onClick={cycleSpeed}
            className="w-10 h-10 rounded-full bg-[#fae7b6] text-[#6c2f00] font-bold text-xs border border-[#dac2b6] hover:bg-[#f4e1b0] transition-colors flex items-center justify-center cursor-pointer shadow-xs"
            title="வேகம் மாற்று"
          >
            {playbackSpeed}
          </button>

          {/* Skip -10s */}
          <button
            onClick={() => skipSeconds(-10)}
            className="p-3 rounded-full text-[#6c2f00] hover:bg-[#fae7b6] transition-colors cursor-pointer"
            title="10 வினாடி பின்னோக்கி"
          >
            <span className="material-symbols-outlined text-2xl">replay_10</span>
          </button>

          {/* Play/Pause Main Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-16 h-16 rounded-full bg-[#6c2f00] text-[#ffffff] flex items-center justify-center shadow-md hover:bg-[#6c2f00]/90 transition-all cursor-pointer active:scale-95"
            title={isPlaying ? 'நிறுத்து' : 'இயக்கு'}
          >
            <span className="material-symbols-outlined text-3xl">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          {/* Skip +10s */}
          <button
            onClick={() => skipSeconds(10)}
            className="p-3 rounded-full text-[#6c2f00] hover:bg-[#fae7b6] transition-colors cursor-pointer"
            title="10 வினாடி முன்னோக்கி"
          >
            <span className="material-symbols-outlined text-2xl">forward_10</span>
          </button>

          {/* Volume Switch */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-full bg-[#fae7b6] text-[#6c2f00] border border-[#dac2b6] hover:bg-[#f4e1b0] transition-colors flex items-center justify-center cursor-pointer shadow-xs"
            title={isMuted ? 'ஒலியை இயக்கு' : 'ஒலியை நிறுத்து'}
          >
            <span className="material-symbols-outlined text-xl">
              {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
            </span>
          </button>
        </div>

        {/* Live Context AI Summary Card */}
        <div className="w-full max-w-lg bg-[#ffffff] rounded-2xl border border-[#dac2b6] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[#8b4513] font-bold text-xs">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span>நேரடிச் சுருக்கம் (Live Context AI)</span>
            </div>
            <button
              onClick={() => setShowAiSummary(!showAiSummary)}
              className="text-[#54433a] hover:text-[#241a00] text-xs font-bold cursor-pointer"
            >
              {showAiSummary ? 'சுருக்கு' : 'விரிவாக்கு'}
            </button>
          </div>

          {showAiSummary && (
            <p className="text-sm text-[#54433a] leading-relaxed bg-[#fff2d8]/50 p-3 rounded-xl border border-[#dac2b6]/40">
              "கடம்பூர் மாளிகையில் பெரிய பழுவேட்டரையர் வருகை தந்துள்ளார்.
              வந்தியத்தேவன் அங்கே கூடும் குறுநில மன்னர்களின் ரகசிய ஆலோசனையை
              கவனிக்கிறான்."
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

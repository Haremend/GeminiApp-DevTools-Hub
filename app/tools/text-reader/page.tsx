'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  Square, 
  Pause, 
  RotateCcw, 
  Volume2, 
  FileText, 
  Sparkles, 
  Settings2, 
  CheckCircle2, 
  ArrowLeft,
  VolumeX,
  Sliders,
  Type
} from 'lucide-react';

type SupportedLang = 'zh' | 'ja' | 'en';

const LANG_CONFIG: Record<SupportedLang, { label: string; defaultCode: string }> = {
  zh: { label: '中文', defaultCode: 'zh-CN' },
  ja: { label: '日文', defaultCode: 'ja-JP' },
  en: { label: '英文', defaultCode: 'en-US' },
};

const SAMPLE_TEXT = `春江潮水连海平，海上明月共潮生。
滟滟随波千万里，何处春江无月明！
江流宛转绕芳甸，月照花林皆似霰；
空里流霜不觉飞，汀上白沙看不见。
江天一色无纤尘，皎皎空中孤月轮。
江畔何人初见月？江月何年初照人？
人生代代无穷已，江月年年望相似。
不知江月待何人，但见长江送流水。`;

export default function TextReaderPage() {
  // Input & state
  const [inputText, setInputText] = useState(SAMPLE_TEXT);
  const [viewMode, setViewMode] = useState<'edit' | 'reading'>('edit');
  const [splitLines, setSplitLines] = useState<string[]>([]);
  
  // Voices and speech settings
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLang, setSelectedLang] = useState<SupportedLang>('zh');
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState<number>(1.0);
  
  // Playback state
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [previewLineIndex, setPreviewLineIndex] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekSliderVal, setSeekSliderVal] = useState<number>(0);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  // Refs
  const isReadingRef = useRef(false);
  const currentLineRef = useRef<number>(-1);
  const lineElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const linesRef = useRef<string[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const selectedVoiceURIRef = useRef<string>('');
  const rateRef = useRef<number>(1.0);
  const selectedLangRef = useRef<SupportedLang>('zh');

  // Keep refs in sync
  isReadingRef.current = isReading;
  currentLineRef.current = currentLineIndex;
  linesRef.current = splitLines;
  voicesRef.current = availableVoices;
  selectedVoiceURIRef.current = selectedVoiceURI;
  rateRef.current = rate;
  selectedLangRef.current = selectedLang;

  // Initialize SpeechSynthesis and Voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechSupported(false);
      return;
    }

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (!allVoices || allVoices.length === 0) return;

      // Filter only zh, ja, en
      const filtered = allVoices.filter(v => {
        const lang = (v.lang || '').toLowerCase();
        return lang.startsWith('zh') || lang.startsWith('ja') || lang.startsWith('en');
      });

      setAvailableVoices(filtered);

      // Determine available language tabs
      const hasZh = filtered.some(v => v.lang.toLowerCase().startsWith('zh'));
      const hasJa = filtered.some(v => v.lang.toLowerCase().startsWith('ja'));
      const hasEn = filtered.some(v => v.lang.toLowerCase().startsWith('en'));

      setSelectedLang(prevLang => {
        if (prevLang === 'zh' && hasZh) return 'zh';
        if (prevLang === 'ja' && hasJa) return 'ja';
        if (prevLang === 'en' && hasEn) return 'en';
        if (hasZh) return 'zh';
        if (hasEn) return 'en';
        if (hasJa) return 'ja';
        return 'zh';
      });
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Filter voices for current language and preserve selection
  const currentLangVoices = useMemo(() => {
    return availableVoices.filter(v => (v.lang || '').toLowerCase().startsWith(selectedLang));
  }, [availableVoices, selectedLang]);

  useEffect(() => {
    if (currentLangVoices.length === 0) {
      setSelectedVoiceURI('');
      return;
    }
    // Check if previously selected voice exists in currentLangVoices
    const stillExists = currentLangVoices.some(v => v.voiceURI === selectedVoiceURI);
    if (!stillExists) {
      // Pick first
      setSelectedVoiceURI(currentLangVoices[0].voiceURI);
    }
  }, [currentLangVoices, selectedVoiceURI]);

  // Available languages present in voices
  const availableLangs = useMemo(() => {
    const list: SupportedLang[] = [];
    if (availableVoices.some(v => v.lang.toLowerCase().startsWith('zh'))) list.push('zh');
    if (availableVoices.some(v => v.lang.toLowerCase().startsWith('ja'))) list.push('ja');
    if (availableVoices.some(v => v.lang.toLowerCase().startsWith('en'))) list.push('en');
    return list.length > 0 ? list : (['zh', 'en', 'ja'] as SupportedLang[]);
  }, [availableVoices]);

  // Scroll to active line
  const scrollToLine = useCallback((index: number) => {
    const el = lineElementsRef.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Split lines calculation
  const getPreparedLines = (text: string) => {
    return text
      .split(/\n+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
  };

  // Prefetch Buffer and Utterance Generator
  const createUtterance = useCallback((lineIndex: number, linesToRead: string[]) => {
    const text = linesToRead[lineIndex];
    const u = new SpeechSynthesisUtterance(text);
    
    // Assign voice
    const voice = voicesRef.current.find(v => v.voiceURI === selectedVoiceURIRef.current);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = LANG_CONFIG[selectedLangRef.current].defaultCode;
    }
    u.rate = rateRef.current;

    u.onstart = () => {
      if (!isReadingRef.current) return;
      setCurrentLineIndex(lineIndex);
      const total = linesToRead.length;
      const pct = Math.round((lineIndex / total) * 100);
      setProgressPercent(pct);
      setSeekSliderVal(pct);
      scrollToLine(lineIndex);
    };

    u.onend = () => {
      if (!isReadingRef.current) return;
      const total = linesToRead.length;
      
      if (lineIndex >= total - 1) {
        // Last line finished
        setProgressPercent(100);
        setSeekSliderVal(100);
        setCurrentLineIndex(-1); // Remove all highlights when whole text finished
        setIsReading(false);
        setIsPaused(false);
      } else {
        const nextProgress = Math.round(((lineIndex + 1) / total) * 100);
        setProgressPercent(nextProgress);
        setSeekSliderVal(nextProgress);

        // Prefetch buffer: queue lineIndex + 2 (since lineIndex + 1 was queued initially)
        const nextQueueIndex = lineIndex + 2;
        if (nextQueueIndex < total) {
          const nextUtterance = createUtterance(nextQueueIndex, linesToRead);
          window.speechSynthesis.speak(nextUtterance);
        }
      }
    };

    u.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('SpeechSynthesis error at line', lineIndex, e);
    };

    return u;
  }, [scrollToLine]);

  // Start reading from a specific index using 2-line prefetch buffer
  const startReadingFromIndex = useCallback((startIndex: number, linesToRead: string[]) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (linesToRead.length === 0) return;

    window.speechSynthesis.cancel();
    isReadingRef.current = true;
    setIsReading(true);
    setIsPaused(false);
    setCurrentLineIndex(startIndex);

    const total = linesToRead.length;
    const initialPct = Math.round((startIndex / total) * 100);
    setProgressPercent(initialPct);
    setSeekSliderVal(initialPct);
    scrollToLine(startIndex);

    // Queue line 1 (current)
    const u1 = createUtterance(startIndex, linesToRead);
    window.speechSynthesis.speak(u1);

    // Queue line 2 (prefetch buffer)
    if (startIndex + 1 < total) {
      const u2 = createUtterance(startIndex + 1, linesToRead);
      window.speechSynthesis.speak(u2);
    }
  }, [createUtterance, scrollToLine]);

  // User click "开始阅读"
  const handleStart = () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      // Empty text verification: silent return
      return;
    }

    const lines = getPreparedLines(inputText);
    if (lines.length === 0) return;

    setSplitLines(lines);
    setViewMode('reading');
    startReadingFromIndex(0, lines);
  };

  // User click "停止"
  const handleStop = () => {
    isReadingRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsReading(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
    setPreviewLineIndex(null);
    setProgressPercent(0);
    setSeekSliderVal(0);
    setViewMode('edit');
  };

  // Pause / Resume toggle
  const handleTogglePause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  // Seek slider handlers
  const handleSeekSliderInput = (val: number) => {
    setSeekSliderVal(val);
    const total = splitLines.length;
    if (total === 0) return;
    const targetLine = Math.round((val / 100) * (total - 1));
    setPreviewLineIndex(targetLine);
    scrollToLine(targetLine);
  };

  const handleSeekCommit = (val: number) => {
    setIsSeeking(false);
    setPreviewLineIndex(null);
    const total = splitLines.length;
    if (total === 0) return;

    const targetLine = Math.round((val / 100) * (total - 1));
    const targetPct = Math.round((targetLine / total) * 100);
    setProgressPercent(targetPct);
    setSeekSliderVal(targetPct);

    if (isReading) {
      startReadingFromIndex(targetLine, splitLines);
    } else {
      setCurrentLineIndex(targetLine);
      scrollToLine(targetLine);
    }
  };

  // Click on a line in the reading view to jump
  const handleLineClick = (idx: number) => {
    if (splitLines.length === 0) return;
    const total = splitLines.length;
    const targetPct = Math.round((idx / total) * 100);
    setProgressPercent(targetPct);
    setSeekSliderVal(targetPct);
    
    if (isReading) {
      startReadingFromIndex(idx, splitLines);
    } else {
      setCurrentLineIndex(idx);
      scrollToLine(idx);
    }
  };

  const lineCount = useMemo(() => {
    return inputText ? getPreparedLines(inputText).length : 0;
  }, [inputText]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden font-sans">
      {/* Top Controls Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 shrink-0 shadow-sm z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5 min-w-[190px]">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">文本阅读器</h1>
              <p className="text-xs text-gray-500">逐行朗读 · 同步高亮 · 自动居中</p>
            </div>
          </div>

          {/* Middle Controls (Language, Voice, Speed, Seek) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 flex-1 justify-center max-w-4xl">
            {/* 1. Language selector */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="font-medium text-gray-700 whitespace-nowrap">语言:</span>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as SupportedLang)}
                className="bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {availableLangs.map((langKey) => (
                  <option key={langKey} value={langKey}>
                    {LANG_CONFIG[langKey].label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Voice selector */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-[170px] max-w-[260px]">
              <span className="font-medium text-gray-700 whitespace-nowrap">语音:</span>
              <select
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                disabled={currentLangVoices.length === 0}
                className="bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-md px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none truncate w-full disabled:opacity-50"
              >
                {currentLangVoices.length > 0 ? (
                  currentLangVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI} title={`${v.name} (${v.lang})`}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                ) : (
                  <option value="">(系统暂无对应语音)</option>
                )}
              </select>
            </div>

            {/* 3 & 4. Rate Slider + Display */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-medium text-gray-700 whitespace-nowrap">语速:</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-20 sm:w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="font-mono text-gray-800 font-medium w-9 text-right">
                {rate.toFixed(1)}x
              </span>
            </div>

            {/* 5 & 6. Seek Slider + Progress Percentage */}
            <div className="flex items-center gap-2 text-xs text-gray-600 min-w-[160px] sm:min-w-[200px]">
              <span className="font-medium text-gray-700 whitespace-nowrap">进度:</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                disabled={splitLines.length === 0 || viewMode !== 'reading'}
                value={seekSliderVal}
                onMouseDown={() => setIsSeeking(true)}
                onTouchStart={() => setIsSeeking(true)}
                onChange={(e) => handleSeekSliderInput(parseInt(e.target.value, 10))}
                onMouseUp={(e) => handleSeekCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                onTouchEnd={(e) => handleSeekCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                className="w-24 sm:w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                title="拖动调整朗读行"
              />
              <span className="font-mono text-indigo-600 font-semibold w-10 text-right">
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {viewMode === 'reading' && (
              <>
                <button
                  onClick={handleTogglePause}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium"
                  title={isPaused ? '恢复朗读' : '暂停朗读'}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-indigo-600" /> : <Pause className="w-3.5 h-3.5 text-amber-600" />}
                  <span>{isPaused ? '继续' : '暂停'}</span>
                </button>

                <button
                  onClick={handleStop}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                  title="终止朗读并返回编辑界面"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>停止</span>
                </button>
              </>
            )}

            {viewMode === 'edit' && (
              <button
                onClick={handleStart}
                disabled={!inputText.trim()}
                className={`px-4 py-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm ${
                  inputText.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="开始逐行朗读"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>开始阅读</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Warning banner if browser doesn't support Web Speech */}
      {!speechSupported && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-center gap-2">
          <VolumeX className="w-4 h-4 text-amber-600 shrink-0" />
          <span>您的浏览器环境不支持 Web Speech API，建议使用最新版 Google Chrome、Microsoft Edge 或 Safari 浏览器。</span>
        </div>
      )}

      {/* Main Content Area: Mutually exclusive Edit vs Reading card */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 overflow-hidden flex flex-col min-h-0">
        
        {/* CARD 1: 来源文本卡片 (编辑态显示) */}
        {viewMode === 'edit' && (
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-0">
            {/* Card Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-800 text-sm">来源文本</span>
                <span className="text-xs text-gray-400">（粘贴待朗读文本，保留原始换行）</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <button
                  onClick={() => setInputText(SAMPLE_TEXT)}
                  className="hover:text-indigo-600 text-gray-600 flex items-center gap-1 transition-colors"
                  title="填入古诗示例文本"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>填入示例</span>
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setInputText('')}
                  className="hover:text-red-600 text-gray-500 transition-colors"
                  title="清空文本"
                >
                  清空
                </button>
                <span className="text-gray-300">|</span>
                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono">
                  {lineCount} 行 · {inputText.length} 字
                </span>
              </div>
            </div>

            {/* Textarea */}
            <div className="flex-1 p-4 relative min-h-0 flex flex-col">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="粘贴你的文本（支持原始格式）..."
                className="flex-1 w-full p-4 resize-none outline-none border border-gray-200 rounded-lg text-gray-800 text-sm leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans shadow-inner placeholder-gray-400"
              />
            </div>

            {/* Bottom helper */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>按换行符自动切分句子，忽略连续空行；支持中/英/日多语种语音切换</span>
              </div>
              <button
                onClick={handleStart}
                disabled={!inputText.trim()}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  inputText.trim() 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>立即朗读</span>
              </button>
            </div>
          </div>
        )}

        {/* CARD 2: 阅读中卡片 (朗读态显示) */}
        {viewMode === 'reading' && (
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-0">
            {/* Card Header */}
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {isReading && !isPaused && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isReading ? (isPaused ? 'bg-amber-500' : 'bg-indigo-600') : 'bg-gray-400'}`}></span>
                  </span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {isReading ? (isPaused ? '已暂停' : '朗读中') : '朗读完成'}
                  </span>
                </div>
                
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
                  {currentLineIndex >= 0 ? `第 ${currentLineIndex + 1} / ${splitLines.length} 行` : `共 ${splitLines.length} 行`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:inline">
                  提示：可直接点击任意行跳转朗读
                </span>
                <button
                  onClick={handleStop}
                  className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>返回编辑</span>
                </button>
              </div>
            </div>

            {/* Reading Lines Container */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 bg-gray-50/50 min-h-0 divide-y divide-transparent"
            >
              {splitLines.map((line, idx) => {
                const isActive = idx === currentLineIndex;
                const isPreview = idx === previewLineIndex;
                const isDone = currentLineIndex >= 0 && idx < currentLineIndex;

                return (
                  <div
                    key={idx}
                    ref={(el) => { lineElementsRef.current[idx] = el; }}
                    onClick={() => handleLineClick(idx)}
                    className={`group relative p-3 sm:p-4 rounded-xl transition-all duration-200 cursor-pointer text-sm sm:text-base leading-relaxed ${
                      isActive
                        ? 'bg-amber-100/90 text-amber-950 font-semibold shadow-sm border-l-4 border-amber-500 ring-1 ring-amber-300 scale-[1.008]'
                        : isPreview
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-400 text-indigo-900 font-medium'
                        : isDone
                        ? 'bg-white text-gray-500 hover:bg-gray-100/80 border-l-4 border-transparent'
                        : 'bg-white text-gray-800 hover:bg-gray-100/80 hover:shadow-xs border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Line Number Badge */}
                      <span className={`inline-flex items-center justify-center shrink-0 w-6 h-6 rounded-md text-xs font-mono select-none ${
                        isActive
                          ? 'bg-amber-500 text-white font-bold'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-600 font-medium'
                          : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>

                      {/* Line Text */}
                      <span className="flex-1 select-text">
                        {line}
                      </span>

                      {/* Status indicator on the right */}
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full select-none shrink-0">
                          <Volume2 className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                          <span>朗读中</span>
                        </span>
                      )}
                      {isDone && !isActive && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Progress Bar */}
            <div className="p-3 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">整体进度：</span>
                <div className="w-48 sm:w-64 bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono text-indigo-600 font-semibold">{progressPercent}%</span>
              </div>
              <div className="text-gray-400">
                {currentLineIndex >= 0 ? `${currentLineIndex + 1} / ${splitLines.length} 行` : '已停止'}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

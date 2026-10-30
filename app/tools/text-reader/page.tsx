'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  Square, 
  Pause, 
  Volume2, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ArrowLeft,
  VolumeX,
  Type,
  MoveVertical,
  Zap,
  Cpu,
  Radio,
  Loader2
} from 'lucide-react';

type SupportedLang = 'zh' | 'ja' | 'en';
type TtsEngine = 'preload' | 'speechSynthesis';

const LANG_CONFIG: Record<SupportedLang, { label: string; defaultCode: string; ttsCode: string }> = {
  zh: { label: '中文 (普通话)', defaultCode: 'zh-CN', ttsCode: 'zh-CN' },
  ja: { label: '日语 (日本語)', defaultCode: 'ja-JP', ttsCode: 'ja-JP' },
  en: { label: '英语 (English)', defaultCode: 'en-US', ttsCode: 'en-US' },
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
  
  // Engine selection: 'preload' (high performance with lookahead cache) vs 'speechSynthesis' (browser native)
  const [engine, setEngine] = useState<TtsEngine>('preload');
  const [enablePreload, setEnablePreload] = useState<boolean>(true);
  
  // Voices and speech settings
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLang, setSelectedLang] = useState<SupportedLang>('zh');
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState<number>(1.0);
  
  // Preloaded line indices set (for visual feedback)
  const [preloadedSet, setPreloadedSet] = useState<Set<number>>(new Set());
  const [isBufferingCurrent, setIsBufferingCurrent] = useState<boolean>(false);

  // Text display appearance settings (Font size & Spacing)
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window === 'undefined') return 16;
    try {
      const saved = localStorage.getItem('txt_reader_font_size');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 12 && val <= 36) return val;
      }
    } catch {
      // Ignore
    }
    return 16;
  });

  const [lineSpacing, setLineSpacing] = useState<number>(() => {
    if (typeof window === 'undefined') return 10;
    try {
      const saved = localStorage.getItem('txt_reader_line_spacing');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 4 && val <= 32) return val;
      }
    } catch {
      // Ignore
    }
    return 10;
  });

  // Playback state
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [previewLineIndex, setPreviewLineIndex] = useState<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [seekSliderVal, setSeekSliderVal] = useState<number>(0);
  const [speechSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return 'speechSynthesis' in window;
  });

  // Refs for audio playback and preloading cache
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<number, string>>(new Map()); // Map<lineIndex, blobUrl>
  const audioLoadingMapRef = useRef<Map<number, Promise<string>>>(new Map());
  const activeSessionIdRef = useRef<number>(0); // invalidates stale callbacks on restart/stop

  // Refs for state access inside callbacks
  const isReadingRef = useRef(false);
  const isPausedRef = useRef(false);
  const currentLineRef = useRef<number>(-1);
  const lineElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const linesRef = useRef<string[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const selectedVoiceURIRef = useRef<string>('');
  const rateRef = useRef<number>(1.0);
  const selectedLangRef = useRef<SupportedLang>('zh');
  const engineRef = useRef<TtsEngine>('preload');
  const enablePreloadRef = useRef<boolean>(true);

  // Filter voices for current language in Web Speech mode
  const currentLangVoices = useMemo(() => {
    return availableVoices.filter(v => (v.lang || '').toLowerCase().startsWith(selectedLang));
  }, [availableVoices, selectedLang]);

  // Derive active voice: preserve user choice if available, otherwise fallback to first available
  const activeVoiceURI = useMemo(() => {
    if (currentLangVoices.length === 0) return '';
    const exists = currentLangVoices.some(v => v.voiceURI === selectedVoiceURI);
    return exists ? selectedVoiceURI : currentLangVoices[0].voiceURI;
  }, [currentLangVoices, selectedVoiceURI]);

  // Keep refs synchronized
  useEffect(() => {
    isReadingRef.current = isReading;
    isPausedRef.current = isPaused;
    currentLineRef.current = currentLineIndex;
    linesRef.current = splitLines;
    voicesRef.current = availableVoices;
    selectedVoiceURIRef.current = activeVoiceURI;
    rateRef.current = rate;
    selectedLangRef.current = selectedLang;
    engineRef.current = engine;
    enablePreloadRef.current = enablePreload;
  });

  // Initialize Audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const cache = audioCacheRef.current;
    const loadingMap = audioLoadingMapRef.current;

    return () => {
      audio.pause();
      audio.src = '';
      // Clean up cached blob URLs to prevent memory leak
      cache.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      cache.clear();
      loadingMap.clear();
    };
  }, []);

  // Initialize SpeechSynthesis Voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (!allVoices || allVoices.length === 0) return;

      const filtered = allVoices.filter(v => {
        const lang = (v.lang || '').toLowerCase();
        return lang.startsWith('zh') || lang.startsWith('ja') || lang.startsWith('en');
      });

      setAvailableVoices(filtered);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Split lines calculation
  const getPreparedLines = (text: string) => {
    return text
      .split(/\n+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
  };

  // Scroll to active line
  const scrollToLine = useCallback((index: number) => {
    const el = lineElementsRef.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Clear audio blob cache
  const clearAudioCache = useCallback(() => {
    audioCacheRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    audioCacheRef.current.clear();
    audioLoadingMapRef.current.clear();
    setPreloadedSet(new Set());
  }, []);

  // Async function to fetch & cache TTS audio for a line
  const fetchLineAudio = useCallback(async (lineIndex: number, lines: string[], lang: SupportedLang): Promise<string> => {
    if (audioCacheRef.current.has(lineIndex)) {
      return audioCacheRef.current.get(lineIndex)!;
    }

    if (audioLoadingMapRef.current.has(lineIndex)) {
      return audioLoadingMapRef.current.get(lineIndex)!;
    }

    const textToRead = lines[lineIndex];
    if (!textToRead) {
      return '';
    }

    const loadPromise = (async () => {
      try {
        const langCode = LANG_CONFIG[lang].ttsCode;
        const res = await fetch(`/api/tts?text=${encodeURIComponent(textToRead)}&lang=${encodeURIComponent(langCode)}`);
        if (!res.ok) {
          throw new Error(`TTS server responded with ${res.status}`);
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        audioCacheRef.current.set(lineIndex, blobUrl);
        setPreloadedSet(prev => new Set(prev).add(lineIndex));
        return blobUrl;
      } finally {
        audioLoadingMapRef.current.delete(lineIndex);
      }
    })();

    audioLoadingMapRef.current.set(lineIndex, loadPromise);
    return loadPromise;
  }, []);

  // Proactive Lookahead Preloader: Preloads next N lines ahead
  const preloadAhead = useCallback((currentIndex: number, lines: string[], lang: SupportedLang) => {
    if (!enablePreloadRef.current) return;
    const lookaheadCount = 2; // Preload next 2 lines in parallel
    for (let step = 1; step <= lookaheadCount; step++) {
      const targetIndex = currentIndex + step;
      if (targetIndex < lines.length && !audioCacheRef.current.has(targetIndex)) {
        fetchLineAudio(targetIndex, lines, lang).catch(err => {
          console.warn(`[TextReader] Preload error at line ${targetIndex}:`, err);
        });
      }
    }
  }, [fetchLineAudio]);

  // Play line with Preload Engine
  const playLineWithPreload = useCallback(async (index: number, lines: string[], sessionId: number) => {
    if (index >= lines.length) {
      // Completed reading all lines
      setProgressPercent(100);
      setSeekSliderVal(100);
      setCurrentLineIndex(-1);
      setIsReading(false);
      setIsPaused(false);
      setIsBufferingCurrent(false);
      return;
    }

    if (!isReadingRef.current || sessionId !== activeSessionIdRef.current) {
      return;
    }

    setCurrentLineIndex(index);
    const total = lines.length;
    const pct = Math.round((index / total) * 100);
    setProgressPercent(pct);
    setSeekSliderVal(pct);
    scrollToLine(index);

    // Trigger lookahead preloading for upcoming lines immediately
    preloadAhead(index, lines, selectedLangRef.current);

    // Check if current line audio is already preloaded or in flight
    let audioUrl = audioCacheRef.current.get(index);
    if (!audioUrl) {
      setIsBufferingCurrent(true);
      try {
        audioUrl = await fetchLineAudio(index, lines, selectedLangRef.current);
      } catch (err) {
        console.error('Failed to load audio for line', index, err);
        setIsBufferingCurrent(false);
        // Fallback: move to next line after brief delay
        setTimeout(() => {
          if (isReadingRef.current && sessionId === activeSessionIdRef.current) {
            playLineWithPreload(index + 1, lines, sessionId);
          }
        }, 1000);
        return;
      }
      setIsBufferingCurrent(false);
    }

    if (!isReadingRef.current || sessionId !== activeSessionIdRef.current || !audioRef.current) {
      return;
    }

    const audio = audioRef.current;
    audio.src = audioUrl;
    audio.playbackRate = rateRef.current;

    // Handle line completion
    audio.onended = () => {
      if (!isReadingRef.current || sessionId !== activeSessionIdRef.current) return;
      // Seamless jump to next line: next line is ALREADY cached in memory, 0ms pause!
      playLineWithPreload(index + 1, lines, sessionId);
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error at line', index, e);
      if (isReadingRef.current && sessionId === activeSessionIdRef.current) {
        // Skip ahead if playback fails
        playLineWithPreload(index + 1, lines, sessionId);
      }
    };

    try {
      await audio.play();
    } catch (e) {
      console.warn('Audio play request interrupted:', e);
    }
  }, [fetchLineAudio, preloadAhead, scrollToLine]);

  // Web Speech API fallback player
  const playLineWithWebSpeech = useCallback((index: number, lines: string[], sessionId: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (index >= lines.length) {
      setProgressPercent(100);
      setSeekSliderVal(100);
      setCurrentLineIndex(-1);
      setIsReading(false);
      setIsPaused(false);
      return;
    }

    if (!isReadingRef.current || sessionId !== activeSessionIdRef.current) {
      return;
    }

    setCurrentLineIndex(index);
    const total = lines.length;
    const pct = Math.round((index / total) * 100);
    setProgressPercent(pct);
    setSeekSliderVal(pct);
    scrollToLine(index);

    const utterance = new SpeechSynthesisUtterance(lines[index]);
    const voice = voicesRef.current.find(v => v.voiceURI === selectedVoiceURIRef.current);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = LANG_CONFIG[selectedLangRef.current].defaultCode;
    }
    utterance.rate = rateRef.current;

    utterance.onend = () => {
      if (!isReadingRef.current || sessionId !== activeSessionIdRef.current) return;
      playLineWithWebSpeech(index + 1, lines, sessionId);
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('Web Speech error at line', index, e);
      if (isReadingRef.current && sessionId === activeSessionIdRef.current) {
        playLineWithWebSpeech(index + 1, lines, sessionId);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [scrollToLine]);

  // Start reading from a specific index
  const startReadingFromIndex = useCallback((startIndex: number, linesToRead: string[]) => {
    if (linesToRead.length === 0) return;

    // Increment session ID to cancel any prior asynchronous playback chains
    const newSessionId = ++activeSessionIdRef.current;

    // Stop any existing sounds
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    isReadingRef.current = true;
    isPausedRef.current = false;
    setIsReading(true);
    setIsPaused(false);
    setCurrentLineIndex(startIndex);

    if (engineRef.current === 'preload') {
      playLineWithPreload(startIndex, linesToRead, newSessionId);
    } else {
      playLineWithWebSpeech(startIndex, linesToRead, newSessionId);
    }
  }, [playLineWithPreload, playLineWithWebSpeech]);

  // Start button clicked
  const handleStart = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const lines = getPreparedLines(inputText);
    if (lines.length === 0) return;

    setSplitLines(lines);
    setViewMode('reading');
    
    // Clear cache when starting with modified text
    clearAudioCache();
    startReadingFromIndex(0, lines);
  };

  // Stop button clicked
  const handleStop = () => {
    activeSessionIdRef.current++;
    isReadingRef.current = false;
    isPausedRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsReading(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
    setPreviewLineIndex(null);
    setProgressPercent(0);
    setSeekSliderVal(0);
    setIsBufferingCurrent(false);
    setViewMode('edit');
  };

  // Toggle Pause / Resume
  const handleTogglePause = () => {
    if (engine === 'preload') {
      if (!audioRef.current) return;
      if (isPaused) {
        audioRef.current.play();
        setIsPaused(false);
        isPausedRef.current = false;
      } else {
        audioRef.current.pause();
        setIsPaused(true);
        isPausedRef.current = true;
      }
    } else {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        isPausedRef.current = false;
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
        isPausedRef.current = true;
      }
    }
  };

  // Rate change handlers
  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    rateRef.current = newRate;
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const handleRateCommit = () => {
    if (engine === 'speechSynthesis' && isReadingRef.current && currentLineRef.current >= 0 && linesRef.current.length > 0) {
      startReadingFromIndex(currentLineRef.current, linesRef.current);
    }
  };

  // Language change
  const handleLangChange = (lang: SupportedLang) => {
    setSelectedLang(lang);
    selectedLangRef.current = lang;
    clearAudioCache();
    if (isReadingRef.current && currentLineRef.current >= 0 && linesRef.current.length > 0) {
      startReadingFromIndex(currentLineRef.current, linesRef.current);
    }
  };

  // Engine switch
  const handleEngineChange = (newEngine: TtsEngine) => {
    setEngine(newEngine);
    engineRef.current = newEngine;
    if (isReadingRef.current && currentLineRef.current >= 0 && linesRef.current.length > 0) {
      startReadingFromIndex(currentLineRef.current, linesRef.current);
    }
  };

  // Seek slider handlers
  const handleSeekSliderInput = (val: number) => {
    setSeekSliderVal(val);
    const total = splitLines.length;
    if (total === 0) return;
    const targetLine = Math.min(total - 1, Math.round((val / 100) * (total - 1)));
    setPreviewLineIndex(targetLine);
    scrollToLine(targetLine);
  };

  const handleSeekCommit = (val: number) => {
    setPreviewLineIndex(null);
    const total = splitLines.length;
    if (total === 0) return;

    const targetLine = Math.min(total - 1, Math.round((val / 100) * (total - 1)));
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

  // Line click jump
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

  // Appearance handlers (Font Size & Spacing)
  const handleFontSizeChange = (val: number) => {
    setFontSize(val);
    try {
      localStorage.setItem('txt_reader_font_size', val.toString());
    } catch {
      // Ignore
    }
  };

  const handleLineSpacingChange = (val: number) => {
    setLineSpacing(val);
    try {
      localStorage.setItem('txt_reader_line_spacing', val.toString());
    } catch {
      // Ignore
    }
  };

  const lineCount = useMemo(() => {
    return inputText ? getPreparedLines(inputText).length : 0;
  }, [inputText]);

  // Preload status summary
  const preloadedCount = preloadedSet.size;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden font-sans">
      {/* Top Controls Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2.5 shrink-0 shadow-sm z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Left Title & Status */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-gray-900 text-base leading-tight">文本阅读器</h1>
                {engine === 'preload' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                    <Zap className="w-3 h-3 text-emerald-600 fill-current" />
                    下一行秒开预读
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">逐行朗读 · 智能预载 · 零卡顿连续播放</p>
            </div>
          </div>

          {/* Middle Controls (Engine, Language, Voice, Speed, Seek, Font Size, Spacing) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 flex-1 justify-center max-w-5xl">
            
            {/* 1. Engine Selector: Preload vs Web Speech */}
            <div className="flex items-center gap-1 text-xs bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => handleEngineChange('preload')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                  engine === 'preload'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="智能预读引擎：提前在后台缓冲下一行音频，换行0等待，听感连贯自然"
              >
                <Zap className="w-3 h-3 text-amber-500 fill-current" />
                <span>智能预读 (推荐)</span>
              </button>

              <button
                type="button"
                onClick={() => handleEngineChange('speechSynthesis')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
                  engine === 'speechSynthesis'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="系统语音引擎：使用浏览器内置 SpeechSynthesis API"
              >
                <Cpu className="w-3 h-3 text-gray-500" />
                <span>系统语音</span>
              </button>
            </div>

            {/* 2. Language selector */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="font-medium text-gray-700 whitespace-nowrap">语言:</span>
              <select
                value={selectedLang}
                onChange={(e) => handleLangChange(e.target.value as SupportedLang)}
                className="bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-md px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="zh">中文</option>
                <option value="en">英文</option>
                <option value="ja">日文</option>
              </select>
            </div>

            {/* 3. System Voice selector (Only shown in Web Speech mode) */}
            {engine === 'speechSynthesis' && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-[140px] max-w-[200px]">
                <span className="font-medium text-gray-700 whitespace-nowrap">音色:</span>
                <select
                  value={activeVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  disabled={currentLangVoices.length === 0}
                  className="bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-md px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none truncate w-full disabled:opacity-50"
                >
                  {currentLangVoices.length > 0 ? (
                    currentLangVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI} title={`${v.name} (${v.lang})`}>
                        {v.name}
                      </option>
                    ))
                  ) : (
                    <option value="">(系统暂无对应语音)</option>
                  )}
                </select>
              </div>
            )}

            {/* Preload Toggle (in Preload Engine) */}
            {engine === 'preload' && (
              <label 
                className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer bg-emerald-50/70 border border-emerald-200/80 px-2 py-1 rounded-md hover:bg-emerald-50"
                title="开启后，在朗读当前行的同时，后台异步下载下 1~2 行音频，行间切换 0 延迟"
              >
                <input
                  type="checkbox"
                  checked={enablePreload}
                  onChange={(e) => setEnablePreload(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer accent-emerald-600"
                />
                <span className="font-medium flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                  预载下一行
                </span>
                {preloadedCount > 0 && viewMode === 'reading' && (
                  <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-1 py-0.2 rounded font-mono">
                    已缓{preloadedCount}行
                  </span>
                )}
              </label>
            )}

            {/* 4. Rate Slider + Display (0.5x ~ 3.0x) */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="font-medium text-gray-700 whitespace-nowrap">语速:</span>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={rate}
                onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                onMouseUp={handleRateCommit}
                onTouchEnd={handleRateCommit}
                className="w-16 sm:w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                title="调节朗读语速 (0.5x ~ 3.0x)"
              />
              <span className="font-mono text-gray-800 font-medium w-8 text-right">
                {rate.toFixed(1)}x
              </span>
            </div>

            {/* 5. Seek Slider + Progress Percentage */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-[140px] sm:min-w-[170px]">
              <span className="font-medium text-gray-700 whitespace-nowrap">进度:</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                disabled={splitLines.length === 0 || viewMode !== 'reading'}
                value={seekSliderVal}
                onChange={(e) => handleSeekSliderInput(parseInt(e.target.value, 10))}
                onMouseUp={(e) => handleSeekCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                onTouchEnd={(e) => handleSeekCommit(parseInt((e.target as HTMLInputElement).value, 10))}
                className="w-18 sm:w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                title="拖动调整朗读行"
              />
              <span className="font-mono text-indigo-600 font-semibold w-8 text-right">
                {progressPercent}%
              </span>
            </div>

            {/* 6. Font Size Slider + Display */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              <span className="font-medium text-gray-700 whitespace-nowrap flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-indigo-600" />
                字号:
              </span>
              <input
                type="range"
                min="12"
                max="32"
                step="1"
                value={fontSize}
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
                className="w-14 sm:w-18 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                title={`调节展示文本字体大小 (12px ~ 32px，当前 ${fontSize}px)`}
              />
              <span className="font-mono text-gray-800 font-medium w-8 text-right">
                {fontSize}px
              </span>
            </div>

            {/* 7. Spacing Slider + Display */}
            <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              <span className="font-medium text-gray-700 whitespace-nowrap flex items-center gap-1">
                <MoveVertical className="w-3.5 h-3.5 text-indigo-600" />
                间距:
              </span>
              <input
                type="range"
                min="4"
                max="28"
                step="2"
                value={lineSpacing}
                onChange={(e) => handleLineSpacingChange(parseInt(e.target.value, 10))}
                className="w-14 sm:w-18 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                title={`调节展示文本行间距 (4px ~ 28px，当前 ${lineSpacing}px)`}
              />
              <span className="font-mono text-gray-800 font-medium w-7 text-right">
                {lineSpacing}px
              </span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {viewMode === 'reading' && (
              <>
                <button
                  onClick={handleTogglePause}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                  title={isPaused ? '恢复朗读' : '暂停朗读'}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-indigo-600 fill-current" /> : <Pause className="w-3.5 h-3.5 text-amber-600 fill-current" />}
                  <span>{isPaused ? '继续' : '暂停'}</span>
                </button>

                <button
                  onClick={handleStop}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
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
                className={`px-4 py-1.5 rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer ${
                  inputText.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title="开始逐行预载与朗读"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>开始阅读</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Warning banner if browser doesn't support Web Speech and system engine is picked */}
      {!speechSupported && engine === 'speechSynthesis' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-center gap-2">
          <VolumeX className="w-4 h-4 text-amber-600 shrink-0" />
          <span>您的浏览器环境不支持 Web Speech API，建议切换为上方「智能预读」引擎体验。</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 overflow-hidden flex flex-col min-h-0">
        
        {/* CARD 1: 编辑态 */}
        {viewMode === 'edit' && (
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-0">
            {/* Card Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-800 text-sm">来源文本</span>
                <span className="text-xs text-gray-400">（粘贴待朗读文本，按换行自动分行）</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <button
                  onClick={() => setInputText(SAMPLE_TEXT)}
                  className="hover:text-indigo-600 text-gray-600 flex items-center gap-1 transition-colors cursor-pointer"
                  title="填入古诗示例文本"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>填入示例</span>
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setInputText('')}
                  className="hover:text-red-600 text-gray-500 transition-colors cursor-pointer"
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
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: `${Math.max(20, Math.round(fontSize * 1.55 + lineSpacing * 0.35))}px`,
                }}
                className="flex-1 w-full p-4 resize-none outline-none border border-gray-200 rounded-lg text-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans shadow-inner placeholder-gray-400 transition-all"
              />
            </div>

            {/* Bottom helper */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  已启用智能预载技术
                </span>
                <span className="text-gray-400">·</span>
                <span>当前行朗读时会自动在后台预拉取下一行音频，杜绝行间延迟停顿</span>
              </div>
              <button
                onClick={handleStart}
                disabled={!inputText.trim()}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
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

        {/* CARD 2: 朗读态 */}
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
                  <span className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                    {isReading ? (isPaused ? '已暂停' : '朗读中') : '朗读完成'}
                    {isBufferingCurrent && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-normal">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        缓冲中...
                      </span>
                    )}
                  </span>
                </div>
                
                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full font-medium">
                  {currentLineIndex >= 0 ? `第 ${currentLineIndex + 1} / ${splitLines.length} 行` : `共 ${splitLines.length} 行`}
                </span>

                {engine === 'preload' && enablePreload && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <Zap className="w-3 h-3 text-emerald-600 fill-current" />
                    下一行预载管线已就绪
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:inline">
                  提示：点击任意行即可直接跳转
                </span>
                <button
                  onClick={handleStop}
                  className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>返回编辑</span>
                </button>
              </div>
            </div>

            {/* Reading Lines Container */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 min-h-0"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: `${lineSpacing}px`
              }}
            >
              {splitLines.map((line, idx) => {
                const isActive = idx === currentLineIndex;
                const isPreview = idx === previewLineIndex;
                const isDone = currentLineIndex >= 0 && idx < currentLineIndex;
                const isPreloaded = preloadedSet.has(idx);
                const isNextToPlay = idx === currentLineIndex + 1;

                return (
                  <div
                    key={idx}
                    ref={(el) => { lineElementsRef.current[idx] = el; }}
                    onClick={() => handleLineClick(idx)}
                    style={{
                      fontSize: `${fontSize}px`,
                      lineHeight: fontSize > 22 ? 1.55 : 1.65,
                      paddingTop: `${Math.max(8, Math.round(fontSize * 0.45))}px`,
                      paddingBottom: `${Math.max(8, Math.round(fontSize * 0.45))}px`,
                      paddingLeft: '1rem',
                      paddingRight: '1rem',
                    }}
                    className={`group relative rounded-xl transition-all duration-200 cursor-pointer ${
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
                      <span 
                        style={{
                          fontSize: `${Math.max(11, Math.round(fontSize * 0.7))}px`,
                          minWidth: `${Math.max(24, Math.round(fontSize * 1.35))}px`,
                          height: `${Math.max(24, Math.round(fontSize * 1.35))}px`,
                        }}
                        className={`inline-flex items-center justify-center shrink-0 rounded-md font-mono select-none ${
                        isActive
                          ? 'bg-amber-500 text-white font-bold'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-600 font-medium'
                          : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
                      }`}>
                        {idx + 1}
                      </span>

                      {/* Line Text */}
                      <span className="flex-1 select-text break-words">
                        {line}
                      </span>

                      {/* Status indicator on the right */}
                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        {isActive && (
                          <span 
                            style={{ fontSize: `${Math.max(11, Math.round(fontSize * 0.72))}px` }}
                            className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full"
                          >
                            <Volume2 className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                            <span>朗读中</span>
                          </span>
                        )}

                        {/* Next line preloaded badge */}
                        {isNextToPlay && isPreloaded && !isActive && (
                          <span 
                            style={{ fontSize: `${Math.max(10, Math.round(fontSize * 0.65))}px` }}
                            className="inline-flex items-center gap-1 font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded"
                            title="该行已在后台预加载完成，上一行结束后将瞬间 0 延迟播放"
                          >
                            <Zap className="w-2.5 h-2.5 text-emerald-500 fill-current" />
                            <span>下行已预热</span>
                          </span>
                        )}

                        {isDone && !isActive && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Progress Bar */}
            <div className="p-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">整体进度：</span>
                <div className="w-40 sm:w-64 bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono text-indigo-600 font-semibold">{progressPercent}%</span>
              </div>
              
              <div className="flex items-center gap-3 text-gray-400">
                {engine === 'preload' && (
                  <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    预读池：已就绪 {preloadedCount} / {splitLines.length}
                  </span>
                )}
                <span>
                  {currentLineIndex >= 0 ? `${currentLineIndex + 1} / ${splitLines.length} 行` : '已停止'}
                </span>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

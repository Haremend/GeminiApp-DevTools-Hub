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
  Loader2
} from 'lucide-react';

type SupportedLang = 'zh' | 'ja' | 'en';
type TtsEngine = 'preload' | 'speechSynthesis';

interface SmartVoiceItem {
  id: string;
  name: string;
  role: string;
  langGroup: string;
}

const SMART_VOICES: SmartVoiceItem[] = [
  { id: 'zh-CN', name: '晓芳 (标准普通话)', role: '清澈女主播 · 播音质感', langGroup: '中文普通话 & 方言' },
  { id: 'zh-TW', name: '雅婷 (台湾国语)', role: '温婉轻柔 · 舒缓亲切', langGroup: '中文普通话 & 方言' },
  { id: 'zh-HK', name: '嘉欣 (香港粤语)', role: '地道港白 · 广播腔调', langGroup: '中文普通话 & 方言' },
  { id: 'en-US', name: 'Emily (美式标准)', role: '通用播音 · 地道美音', langGroup: '英语口音' },
  { id: 'en-GB', name: 'Arthur (英式典雅)', role: '英伦绅士 · 沉稳男声', langGroup: '英语口音' },
  { id: 'ja-JP', name: '樱子 (东京自然)', role: '自然柔和 · 标准日语', langGroup: '小语种' },
  { id: 'ko-KR', name: '智恩 (首尔流行)', role: '清晰明快 · 标准韩语', langGroup: '小语种' },
];

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
  const [smartVoiceId, setSmartVoiceId] = useState<string>('zh-CN');
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
  const smartVoiceIdRef = useRef<string>('zh-CN');
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
    smartVoiceIdRef.current = smartVoiceId;
    rateRef.current = rate;
    selectedLangRef.current = selectedLang;
    engineRef.current = engine;
    enablePreloadRef.current = enablePreload;
  });

  // Initialize Audio element with browser degradation check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let audio: HTMLAudioElement | null = null;
    try {
      if (typeof Audio !== 'undefined') {
        audio = new Audio();
        audio.preload = 'auto';
        audioRef.current = audio;
      } else {
        // Fallback: If Audio element is not supported by the browser, degrade to native SpeechSynthesis
        setEngine('speechSynthesis');
      }
    } catch (e) {
      console.warn('Audio constructor not supported, degrading to system speech:', e);
      setEngine('speechSynthesis');
    }

    const cache = audioCacheRef.current;
    const loadingMap = audioLoadingMapRef.current;

    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
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
  const fetchLineAudio = useCallback(async (lineIndex: number, lines: string[], voiceId: string): Promise<string> => {
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
        const res = await fetch(`/api/tts?text=${encodeURIComponent(textToRead)}&voice=${encodeURIComponent(voiceId)}`);
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

  // Proactive Lookahead Preloader: Preloads next N lines ahead (auto degrades if Audio unsupported)
  const preloadAhead = useCallback((currentIndex: number, lines: string[], voiceId: string) => {
    if (!enablePreloadRef.current || typeof window === 'undefined' || typeof Audio === 'undefined') return;
    const lookaheadCount = 2; // Preload next 2 lines in parallel
    for (let step = 1; step <= lookaheadCount; step++) {
      const targetIndex = currentIndex + step;
      if (targetIndex < lines.length && !audioCacheRef.current.has(targetIndex)) {
        fetchLineAudio(targetIndex, lines, voiceId).catch(err => {
          console.warn(`[TextReader] Preload error at line ${targetIndex}:`, err);
        });
      }
    }
  }, [fetchLineAudio]);

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

    // If browser doesn't support HTML5 Audio element, degrade smoothly to Web Speech API
    if (!audioRef.current || typeof Audio === 'undefined') {
      playLineWithWebSpeech(index, lines, sessionId);
      return;
    }

    const activeVoice = smartVoiceIdRef.current;
    // Trigger lookahead preloading for upcoming lines immediately
    preloadAhead(index, lines, activeVoice);

    // Check if current line audio is already preloaded or in flight
    let audioUrl = audioCacheRef.current.get(index);
    if (!audioUrl) {
      setIsBufferingCurrent(true);
      try {
        audioUrl = await fetchLineAudio(index, lines, activeVoice);
      } catch (err) {
        console.error('Failed to load audio for line', index, err);
        setIsBufferingCurrent(false);
        // Fallback: degrade to Web Speech single-line reading if available
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          playLineWithWebSpeech(index, lines, sessionId);
          return;
        }
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
  }, [fetchLineAudio, playLineWithWebSpeech, preloadAhead, scrollToLine]);

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

  // Smart voice change (for preload engine)
  const handleSmartVoiceChange = (newVoiceId: string) => {
    setSmartVoiceId(newVoiceId);
    smartVoiceIdRef.current = newVoiceId;
    clearAudioCache();
    if (isReadingRef.current && engineRef.current === 'preload' && currentLineRef.current >= 0 && linesRef.current.length > 0) {
      startReadingFromIndex(currentLineRef.current, linesRef.current);
    }
  };

  // System voice change (for speechSynthesis engine)
  const handleSystemVoiceChange = (uri: string) => {
    setSelectedVoiceURI(uri);
    selectedVoiceURIRef.current = uri;
    if (isReadingRef.current && engineRef.current === 'speechSynthesis' && currentLineRef.current >= 0 && linesRef.current.length > 0) {
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
    <div className="flex flex-col h-[calc(100vh-3rem)] w-full bg-slate-50 overflow-hidden font-sans">
      {/* Top Controls Header - 分两行排布：第一行调整滑块+操作按钮，第二行语音切换 */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 shrink-0 shadow-xs z-10 w-full flex flex-col gap-2.5">
        
        {/* 第一行：拉动的调整按钮（滑块） + 右侧核心操作按钮 */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            {/* 1. 语速滑块 */}
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
              <span className="font-medium text-slate-700 whitespace-nowrap">语速:</span>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={rate}
                onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                onMouseUp={handleRateCommit}
                onTouchEnd={handleRateCommit}
                className="w-16 sm:w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                title="调节朗读语速 (0.5x ~ 3.0x)"
              />
              <span className="font-mono text-slate-800 font-medium w-8 text-right">
                {rate.toFixed(1)}x
              </span>
            </div>

            {/* 2. 进度滑块 */}
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 min-w-[140px] sm:min-w-[170px]">
              <span className="font-medium text-slate-700 whitespace-nowrap">进度:</span>
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
                className="w-18 sm:w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
                title="拖动调整朗读行"
              />
              <span className="font-mono text-indigo-600 font-semibold w-8 text-right">
                {progressPercent}%
              </span>
            </div>

            {/* 3. 字号滑块 */}
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
              <span className="font-medium text-slate-700 whitespace-nowrap flex items-center gap-1">
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
                className="w-14 sm:w-18 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                title={`调节展示文本字体大小 (12px ~ 32px，当前 ${fontSize}px)`}
              />
              <span className="font-mono text-slate-800 font-medium w-8 text-right">
                {fontSize}px
              </span>
            </div>

            {/* 4. 间距滑块 */}
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
              <span className="font-medium text-slate-700 whitespace-nowrap flex items-center gap-1">
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
                className="w-14 sm:w-18 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                title={`调节展示文本行间距 (4px ~ 28px，当前 ${lineSpacing}px)`}
              />
              <span className="font-mono text-slate-800 font-medium w-7 text-right">
                {lineSpacing}px
              </span>
            </div>
          </div>

          {/* 右侧核心操作按钮 */}
          <div className="flex items-center gap-2 shrink-0">
            {viewMode === 'reading' && (
              <>
                <button
                  onClick={handleTogglePause}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                  title={isPaused ? '恢复朗读' : '暂停朗读'}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5 text-indigo-600 fill-current" /> : <Pause className="w-3.5 h-3.5 text-amber-600 fill-current" />}
                  <span>{isPaused ? '继续' : '暂停'}</span>
                </button>

                <button
                  onClick={handleStop}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
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
                className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs cursor-pointer ${
                  inputText.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="开始逐行朗读"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>开始阅读</span>
              </button>
            )}
          </div>
        </div>

        {/* 第二行：语音切换的内容（引擎选择 + 角色/发音人选择） */}
        <div className="w-full flex flex-wrap items-center gap-x-3 gap-y-2 pt-2 border-t border-slate-100 text-xs">
          {/* 1. 引擎选择 */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => handleEngineChange('preload')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                engine === 'preload'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="智能预读引擎：自动在后台预取下一行音频，换行0延迟停顿"
            >
              <Zap className="w-3 h-3 text-amber-500 fill-current" />
              <span>智能预读 (推荐)</span>
            </button>

            <button
              type="button"
              onClick={() => handleEngineChange('speechSynthesis')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer ${
                engine === 'speechSynthesis'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="系统语音引擎：使用浏览器内置 SpeechSynthesis API"
            >
              <Cpu className="w-3 h-3 text-slate-500" />
              <span>系统语音</span>
            </button>
          </div>

          {/* 2. 发音人 / 语音切换 */}
          {engine === 'preload' ? (
            <div className="flex items-center gap-1.5 text-slate-600 min-w-[200px] max-w-[320px]">
              <span className="font-medium text-slate-700 whitespace-nowrap flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>发音人:</span>
              </span>
              <select
                value={smartVoiceId}
                onChange={(e) => handleSmartVoiceChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-md px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none truncate w-full cursor-pointer font-medium"
                title="智能预读发音角色：支持标准普通话、台湾国语、粤语及外语"
              >
                <optgroup label="🇨🇳 中文普通话 & 方言">
                  <option value="zh-CN">👩 晓芳 (标准普通话 · 清澈女主播)</option>
                  <option value="zh-TW">👧 雅婷 (台湾国语 · 温婉轻柔女声)</option>
                  <option value="zh-HK">👩 嘉欣 (粤语广播 · 地道香港白话)</option>
                </optgroup>
                <optgroup label="🇺🇸 🇬🇧 英语口音">
                  <option value="en-US">👱‍♀️ Emily (美式标准 · 通用播音女声)</option>
                  <option value="en-GB">🎩 Arthur (英式典雅 · 绅士男声)</option>
                </optgroup>
                <optgroup label="🇯🇵 🇰🇷 小语种">
                  <option value="ja-JP">🌸 樱子 (东京自然 · 标准日语)</option>
                  <option value="ko-KR">🌺 智恩 (首尔自然 · 清晰韩语)</option>
                </optgroup>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-600 min-w-[240px] max-w-[340px]">
              <span className="font-medium text-slate-700 whitespace-nowrap flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                <span>系统音色:</span>
              </span>
              <select
                value={selectedLang}
                onChange={(e) => handleLangChange(e.target.value as SupportedLang)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-md px-1.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none shrink-0 cursor-pointer"
                title="按语言筛选系统内置发音人"
              >
                <option value="zh">中</option>
                <option value="en">英</option>
                <option value="ja">日</option>
              </select>
              <select
                value={activeVoiceURI}
                onChange={(e) => handleSystemVoiceChange(e.target.value)}
                disabled={currentLangVoices.length === 0}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-md px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none truncate flex-1 disabled:opacity-50 cursor-pointer"
                title="选择浏览器/系统内置的本地语音人"
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
        </div>
      </header>

      {/* Warning banner if browser doesn't support Web Speech and system engine is picked */}
      {!speechSupported && engine === 'speechSynthesis' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-center gap-2 shrink-0">
          <VolumeX className="w-4 h-4 text-amber-600 shrink-0" />
          <span>您的浏览器环境不支持 Web Speech API，建议切换为上方「智能预读」引擎体验。</span>
        </div>
      )}

      {/* Main Content Area - 100% 宽度占用，根据浏览器宽度自适应 */}
      <main className="flex-1 w-full p-3 sm:p-4 lg:p-6 overflow-hidden flex flex-col min-h-0">
        
        {/* CARD 1: 编辑态 */}
        {viewMode === 'edit' && (
          <div className="flex-1 w-full flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden min-h-0">
            {/* Card Header */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-800 text-sm">来源文本</span>
                <span className="text-xs text-slate-400 hidden sm:inline">（粘贴待朗读文本，按换行自动分行）</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <button
                  onClick={() => setInputText(SAMPLE_TEXT)}
                  className="hover:text-indigo-600 text-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                  title="填入古诗示例文本"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>填入示例</span>
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => setInputText('')}
                  className="hover:text-red-600 text-slate-500 transition-colors cursor-pointer"
                  title="清空文本"
                >
                  清空
                </button>
                <span className="text-slate-300">|</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">
                  {lineCount} 行 · {inputText.length} 字
                </span>
              </div>
            </div>

            {/* Textarea - 100% 占满宽度和高度，完全自适应浏览器尺寸 */}
            <div className="flex-1 w-full min-h-0 p-0 flex flex-col">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="在此粘贴或输入待朗读文本（支持长文本，换行自动切分为逐行朗读卡片）..."
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: `${Math.max(20, Math.round(fontSize * 1.55 + lineSpacing * 0.35))}px`,
                }}
                className="flex-1 w-full p-4 sm:p-6 resize-none outline-none border-0 text-slate-800 focus:ring-0 font-sans shadow-none placeholder-slate-400 transition-all overflow-y-auto"
              />
            </div>
          </div>
        )}

        {/* CARD 2: 朗读态 */}
        {viewMode === 'reading' && (
          <div className="flex-1 w-full flex flex-col bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden min-h-0">
            {/* Card Header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {isReading && !isPaused && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isReading ? (isPaused ? 'bg-amber-500' : 'bg-indigo-600') : 'bg-slate-400'}`}></span>
                  </span>
                  <span className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                    {isReading ? (isPaused ? '已暂停' : '朗读中') : '朗读完成'}
                    {isBufferingCurrent && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-normal">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        缓冲中...
                      </span>
                    )}
                  </span>
                </div>
                
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                  {currentLineIndex >= 0 ? `第 ${currentLineIndex + 1} / ${splitLines.length} 行` : `共 ${splitLines.length} 行`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  提示：点击任意行直接跳转
                </span>
                <button
                  onClick={handleStop}
                  className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>返回编辑</span>
                </button>
              </div>
            </div>

            {/* Reading Lines Container - 100% 占满宽度 */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 w-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50 min-h-0"
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
                      paddingLeft: '1.25rem',
                      paddingRight: '1.25rem',
                    }}
                    className={`group relative rounded-xl transition-all duration-200 cursor-pointer w-full ${
                      isActive
                        ? 'bg-amber-100/90 text-amber-950 font-semibold shadow-xs border-l-4 border-amber-500 ring-1 ring-amber-300'
                        : isPreview
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-400 text-indigo-900 font-medium'
                        : isDone
                        ? 'bg-white text-slate-500 hover:bg-slate-100/80 border-l-4 border-transparent'
                        : 'bg-white text-slate-800 hover:bg-slate-100/80 hover:shadow-xs border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3 w-full">
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
                          : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
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

            {/* Bottom Progress Bar - 100% 宽度 */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 w-full shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-700">整体进度：</span>
                <div className="w-40 sm:w-64 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono text-indigo-600 font-semibold">{progressPercent}%</span>
              </div>
              
              <div className="flex items-center gap-3 text-slate-400">
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

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Filter,
  Copy,
  Sparkles,
  Scissors,
  RotateCcw,
  BookOpen,
  Info,
  CheckCircle2,
  Trash2,
  HelpCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

const URL_REGEX = /https?:\/\/[^\s\n\r\t,;'"<>]+/g;

function extractUniqueUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  const cleaned = matches.map((url) => url.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
}

// 预置示例数据
const EXAMPLES = {
  dedupeOnly: {
    title: '示例 1：纯文本 URL 提取与去重 (右侧留空)',
    source: `以下是一批从网页日志中复制的杂乱文本：
用户A访问了 https://github.com/trending 页面查看热榜，
随后跳转到 https://news.ycombinator.com/ 浏览技术新闻。
重试记录：https://github.com/trending (重复链接)
异常请求来自 https://api.example.com/v1/health 检查端口，
推荐阅读 https://nextjs.org/docs 官方文档指南，
另一个用户也点击了 https://news.ycombinator.com/
相关资源：https://tailwindcss.com/docs`,
    exclude: '',
    note: '此场景下右侧留空，点击“开始剔除”或“正则提取”，直接从杂乱文本中提取去重后的干净链接。'
  },
  differenceSet: {
    title: '示例 2：新旧数据差集剔除 (排除已处理/黑名单链接)',
    source: `【今日采集到的外链清单】
https://example.com/article/101
https://example.com/article/102
https://example.com/article/103
https://example.com/article/104
https://bad-site.com/spam-link
https://example.com/article/101 (重复采集)
https://partner.org/promo`,
    exclude: `【历史已推送或黑名单链接】
https://example.com/article/101
https://bad-site.com/spam-link`,
    note: '此场景用于数据增量过滤，自动从左侧排除右侧已存在的 2 个链接，最终输出 102、103、104 及 promo 4条有效新链接。'
  }
};

export default function UrlDeduplicatorPage() {
  const [sourceText, setSourceText] = useState('');
  const [excludeText, setExcludeText] = useState('');
  const [resultText, setResultText] = useState('');
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  // 匹配模式：exact (严格完全匹配，默认符合原需求) 或 fuzzy (包含关键词/域名模糊匹配)
  const [matchMode, setMatchMode] = useState<'exact' | 'fuzzy'>('exact');

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resultContainerRef = useRef<HTMLDivElement>(null);
  const resultTextareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    setToastVisible(true);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Calculate real-time counts
  const sourceUrls = extractUniqueUrls(sourceText);
  const excludeUrls = extractUniqueUrls(excludeText);

  const sourceCountText = sourceText.trim() === '' ? '共 0 条' : `已识别 ${sourceUrls.length} 个唯一URL`;
  const excludeCountText = excludeText.trim() === '' ? '提取到 0 个' : `已识别 ${excludeUrls.length} 个唯一URL`;
  const resultDisplayCount = resultCount !== null ? `剩余 ${resultCount} 条` : '剩余 0 条';

  // 1. 正则提取所有URL
  const handleExtractUrls = () => {
    const leftList = extractUniqueUrls(sourceText);
    const rightList = extractUniqueUrls(excludeText);

    if (leftList.length === 0 && rightList.length === 0) {
      showToast('未发现可提取的 URL');
      return;
    }

    setSourceText(leftList.join('\n'));
    if (rightList.length > 0) {
      setExcludeText(rightList.join('\n'));
    }
    showToast('已完成正则提取并替换内容');
  };

  // 2. 核心开始剔除
  const handleDeduplicate = () => {
    const leftList = extractUniqueUrls(sourceText);

    if (leftList.length === 0) {
      showToast('原始数据为空');
      return;
    }

    let finalResult: string[] = [];

    if (matchMode === 'exact') {
      // 严格完全匹配 (原需求规范)
      const rightSet = new Set(extractUniqueUrls(excludeText));
      finalResult = leftList.filter((url) => !rightSet.has(url));
    } else {
      // 增强模式：支持根据右侧的 URL、域名或每行关键字进行包含过滤
      const excludeTerms = excludeText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (excludeTerms.length === 0) {
        finalResult = leftList;
      } else {
        finalResult = leftList.filter((url) => {
          return !excludeTerms.some((term) => url.includes(term));
        });
      }
    }

    setResultText(finalResult.join('\n'));
    setResultCount(finalResult.length);
    showToast(`剔除完成，剩余 ${finalResult.length} 条数据`);

    // 平滑滚动至结果区中央
    setTimeout(() => {
      resultContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  // 3. 一键复制结果
  const handleCopy = async () => {
    if (!resultText.trim()) {
      showToast('暂无内容可复制');
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(resultText);
      } else if (resultTextareaRef.current) {
        resultTextareaRef.current.select();
        document.execCommand('copy');
      } else {
        throw new Error('No clipboard API');
      }
      showToast('已复制到剪贴板');
    } catch {
      showToast('复制失败，请手动操作');
    }
  };

  // 一键清空重置
  const handleClearAll = () => {
    setSourceText('');
    setExcludeText('');
    setResultText('');
    setResultCount(null);
    showToast('已清空全部输入与结果');
  };

  // 加载示例
  const handleLoadExample = (type: 'dedupeOnly' | 'differenceSet') => {
    const ex = EXAMPLES[type];
    setSourceText(ex.source);
    setExcludeText(ex.exclude);
    setResultText('');
    setResultCount(null);
    showToast(`已载入：${type === 'dedupeOnly' ? '纯去重示例' : '差集剔除示例'}`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 relative pb-16">
      {/* 头部标题与操作区 */}
      <header className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                URL 去重/剔除工具
              </h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                纯前端安全处理
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              支持杂乱文本中 URL 提取去重，以及通过剔除集合进行 A - B 差集过滤
            </p>
          </div>
        </div>

        {/* 操作按钮区 */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={handleExtractUrls}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer"
            title="提取两侧文本中的所有有效 URL 并格式化回写"
          >
            <Sparkles className="w-4 h-4" />
            <span>正则提取所有URL</span>
          </button>

          <button
            onClick={handleDeduplicate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 cursor-pointer"
            title="从原始数据中去重并剔除右侧指定的 URL"
          >
            <Scissors className="w-4 h-4" />
            <span>开始剔除</span>
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 cursor-pointer"
            title="复制处理后的结果到剪贴板"
          >
            <Copy className="w-4 h-4" />
            <span>一键复制结果</span>
          </button>

          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors cursor-pointer"
            title="清空所有输入与结果"
          >
            <RotateCcw className="w-4 h-4" />
            <span>清空</span>
          </button>
        </div>
      </header>

      {/* 快捷示例加载栏 & 需求解释卡片 */}
      <section className="bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 border border-blue-100 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-sm font-semibold text-gray-800">一键填入使用示例：</span>
            <span className="text-xs text-gray-500 hidden md:inline">点击即可快速载入测试数据体验效果</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleLoadExample('dedupeOnly')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-700 text-xs font-medium shadow-2xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              <span>载入【纯去重示例】(右侧留空)</span>
            </button>

            <button
              onClick={() => handleLoadExample('differenceSet')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 text-gray-700 text-xs font-medium shadow-2xs transition-all cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5 text-indigo-500" />
              <span>载入【差集剔除示例】(A - B 黑名单)</span>
            </button>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 ml-1 cursor-pointer"
            >
              {showGuide ? '收起说明' : '为什么有右侧【剔除】框？'}
            </button>
          </div>
        </div>

        {/* 为什么右侧框感觉怪怪的？详细原理解析与常见场景 */}
        {showGuide && (
          <div className="mt-3.5 pt-3.5 border-t border-blue-100/70 text-xs text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-1.5 font-semibold text-gray-800 mb-1">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span>为什么右边【需要剔除的文本】感觉怪怪的？</span>
              </div>
              <p className="text-gray-600 leading-relaxed">
                很多用户以为“去重工具”就是把一份文本里重复的链接去重即可（此时<strong className="text-indigo-600">右侧留空不填即可</strong>，完全不影响单纯去重）。
                而右侧框的真实用途是<strong className="text-gray-900">“排除黑名单 / 已处理清单”</strong>（即数学集合差集 <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600">A - B</code>），用于过滤掉你不再需要的链接。
              </p>
            </div>

            <div className="bg-white/80 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center gap-1.5 font-semibold text-gray-800 mb-1">
                <Info className="w-4 h-4 text-blue-500" />
                <span>两类核心使用场景：</span>
              </div>
              <ul className="space-y-1 text-gray-600">
                <li className="flex items-start gap-1">
                  <span className="text-blue-500 font-bold">•</span>
                  <span><strong>场景 A（纯提取清洗）：</strong>只需在左侧粘贴文章或日志，右边留空，点击“开始剔除”，直接提取唯一 URL。</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>场景 B（增量过滤/黑名单）：</strong>左侧放新抓取的 1000 条链接，右侧放上周已推过的 500 条链接，一键滤掉重复已处理项。</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 输入区（左右两列） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* 左列：原始数据 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="source-textarea" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              原始数据 (源 URL 集合 A)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                {sourceCountText}
              </span>
              {sourceText && (
                <button
                  onClick={() => setSourceText('')}
                  className="text-gray-400 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                  title="清空原始数据"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-2">
            粘贴待处理的杂乱文本或链接列表，自动识别提取 <code className="text-blue-600 font-mono">http/https</code> 链接并保持首次出现顺序
          </p>
          <textarea
            id="source-textarea"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="请输入原始数据，可直接粘贴杂乱文本..."
            className="w-full flex-1 min-h-[300px] p-3.5 text-sm font-mono text-gray-800 bg-slate-50 border border-gray-200 rounded-lg resize-y focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400 leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* 右列：需要剔除的文本 (排除黑名单) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label htmlFor="exclude-textarea" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                需要剔除的文本 (排除黑名单 B)
              </label>
              <span className="text-[11px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                可选
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                {excludeCountText}
              </span>
              {excludeText && (
                <button
                  onClick={() => setExcludeText('')}
                  className="text-gray-400 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                  title="清空剔除文本"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>留空则不剔除任何链接；粘贴已处理链接即可从左侧过滤扣除</span>
            {/* 匹配模式切换 */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-gray-500">规则:</span>
              <button
                type="button"
                onClick={() => setMatchMode('exact')}
                className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  matchMode === 'exact'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
                title="原版严格模式：仅完全一致的 URL 才会剔除"
              >
                完整URL匹配
              </button>
              <button
                type="button"
                onClick={() => setMatchMode('fuzzy')}
                className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  matchMode === 'fuzzy'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
                title="增强模式：支持按每行输入的域名或关键字包含剔除"
              >
                包含关键字/域名
              </button>
            </div>
          </div>
          <textarea
            id="exclude-textarea"
            value={excludeText}
            onChange={(e) => setExcludeText(e.target.value)}
            placeholder={
              matchMode === 'exact'
                ? "直接粘贴包含 URL 的任意文本，系统将自动识别 http/https 链接并从左侧排除..."
                : "可粘贴完整 URL，或每行输入待屏蔽的域名/关键字（如 bad-site.com），将从左侧排除包含该词的链接..."
            }
            className="w-full flex-1 min-h-[300px] p-3.5 text-sm font-mono text-gray-800 bg-slate-50 border border-gray-200 rounded-lg resize-y focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-gray-400 leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>

      {/* 结果区（整行卡片） */}
      <div
        ref={resultContainerRef}
        className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm scroll-mt-20"
      >
        <div className="flex items-center justify-between mb-2.5">
          <label htmlFor="result-textarea" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            最终结果
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {resultDisplayCount}
            </span>
            {resultText && (
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>复制</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-2">
          剔除后保留的 URL 列表（每行一个，已按原始顺序去重并过滤剔除项）
        </p>
        <textarea
          id="result-textarea"
          ref={resultTextareaRef}
          value={resultText}
          readOnly
          placeholder="点击顶部【开始剔除】后，结果将在此显示..."
          className="w-full h-64 p-3.5 text-sm font-mono text-gray-800 bg-slate-50 border border-gray-200 rounded-lg focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-gray-400 leading-relaxed cursor-text"
          spellCheck={false}
        />
      </div>

      {/* 业务规则与提示卡片 */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-gray-600 leading-relaxed space-y-2">
        <div className="font-semibold text-gray-700 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-500" />
          <span>业务规则与处理逻辑：</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-gray-500 pl-1">
          <li><strong>正则抓取规则：</strong>以 <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded font-mono">http://</code> 或 <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded font-mono">https://</code> 开头，结束于空白、换行、单双引号、逗号、分号或尖括号。</li>
          <li><strong>单侧提取：</strong>如果仅需要整理杂乱文章提取去重链接，直接在左侧粘贴并点击“开始剔除”，右侧保持为空即可。</li>
          <li><strong>两栏差集排除：</strong>右侧输入需要排除的 URL 后，左侧列表中任何与右侧相同的 URL 都会被精准剔除。</li>
          <li><strong>结果只读保护与顺序保证：</strong>保留左侧数据首次出现的先后顺序，结果框不可手动修改以避免数据污染，支持一键快捷复制。</li>
        </ul>
      </div>

      {/* 全局 Toast 浮动提示组件 */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ease-out ${
          toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <div className="bg-gray-900/90 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-2xl backdrop-blur border border-white/10 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      </div>
    </div>
  );
}

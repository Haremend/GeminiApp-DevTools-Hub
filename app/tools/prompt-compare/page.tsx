'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Layers, Plus, GitCompare, Download, ArrowLeft, Trash2, X } from 'lucide-react';

interface PromptInput {
  id: number;
  text: string;
  name: string;
}

interface DiffResult {
  name: string;
  text: string;
}

export default function PromptComparePage() {
  const [prompts, setPrompts] = useState<PromptInput[]>([{ id: Date.now(), text: '', name: `Prompt 1` }]);
  const [isComparing, setIsComparing] = useState(false);
  const [result, setResult] = useState<{ base: string; diffs: DiffResult[] } | null>(null);

  // Auto-resize textarea on content change
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight + 2}px`;
  };

  const handleAddPrompt = () => {
    if (prompts[prompts.length - 1].text.trim() === '') return;
    setPrompts([...prompts, { id: Date.now(), text: '', name: `Prompt ${prompts.length + 1}` }]);
  };

  const handleRemovePrompt = (idToRemove: number) => {
    setPrompts(prompts.filter(p => p.id !== idToRemove));
  };

  const handleTextChange = (id: number, newText: string) => {
    setPrompts(prompts.map(p => (p.id === id ? { ...p, text: newText } : p)));
  };

  const handleClear = () => {
    setPrompts([{ id: Date.now(), text: '', name: `Prompt 1` }]);
    setIsComparing(false);
    setResult(null);
  };

  const validPrompts = prompts.filter(p => p.text.trim() !== '');
  const canCompare = validPrompts.length >= 2;
  const canAdd = prompts.length > 0 && prompts[prompts.length - 1].text.trim() !== '';

  const processPrompts = () => {
    if (validPrompts.length < 2) return;

    const N = validPrompts.length;
    const parsedPrompts = validPrompts.map(prompt => {
      const lines = prompt.text.split('\n');
      const parsedLines = lines.map(line => {
        const raw = line.trim();
        if (!raw) return [];
        return raw.split(',').map(t => t.trim()).filter(t => t !== '');
      });
      const allTags = new Set<string>();
      parsedLines.forEach(lineTags => {
        lineTags.forEach(t => allTags.add(t));
      });
      return { name: prompt.name, parsedLines, allTags };
    });

    const tagCounter = new Map<string, number>();
    parsedPrompts.forEach(p => {
      p.allTags.forEach(tag => {
        tagCounter.set(tag, (tagCounter.get(tag) || 0) + 1);
      });
    });

    const baseTagsSet = new Set<string>();
    for (const [tag, count] of tagCounter.entries()) {
      if (count === N) {
        baseTagsSet.add(tag);
      }
    }

    const baseTagsOrdered: string[] = [];
    if (N > 0) {
      parsedPrompts[0].parsedLines.forEach(lineTags => {
        lineTags.forEach(tag => {
          if (baseTagsSet.has(tag) && !baseTagsOrdered.includes(tag)) {
            baseTagsOrdered.push(tag);
          }
        });
      });
    }

    const diffs = parsedPrompts.map(p => {
      const diffLines: string[] = [];
      p.parsedLines.forEach(lineTags => {
        if (lineTags.length === 0) return; // ignore completely empty lines

        const diffTags = lineTags.filter(tag => !baseTagsSet.has(tag));
        if (diffTags.length === 0) return; // skip if completely filtered

        const ordered: string[] = [];
        const seen = new Set<string>();
        diffTags.forEach(tag => {
          if (!seen.has(tag)) {
            ordered.push(tag);
            seen.add(tag);
          }
        });
        diffLines.push(ordered.join(', '));
      });
      return { name: p.name, text: diffLines.join('\n') };
    });

    setResult({
      base: baseTagsOrdered.join(', '),
      diffs: diffs
    });
    setIsComparing(true);
  };

  const downloadMarkdown = () => {
    if (!result) return;
    
    let md = `# Prompt Compare Results\n\n`;
    md += `## Base Prompt (Common Tags)\n\`\`\`\n${result.base || 'No common tags found.'}\n\`\`\`\n\n`;
    
    result.diffs.forEach(diff => {
      md += `## ${diff.name} Differences\n\`\`\`\n${diff.text || 'No exact differences found (or identical to base).'}\n\`\`\`\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt_compare_results_${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Layers className="w-8 h-8 text-indigo-600" />
          Prompt Compare
        </h1>
        <p className="text-gray-500 text-base mt-2">
          Compare multiple comma-separated prompts. Extracts the common base prompt and highlights unique tags per input.
        </p>
      </div>

      {!isComparing ? (
        <div className="flex flex-col gap-6 w-full pb-20">
          <div className="flex flex-col gap-10 w-full">
            {prompts.map((prompt, index) => (
              <div key={prompt.id} className="w-full relative group">
                <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                  <label className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-sm">
                      {index + 1}
                    </span>
                    {prompt.name}
                  </label>
                  {prompts.length > 1 && (
                    <button
                      onClick={() => handleRemovePrompt(prompt.id)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors p-1.5"
                      title="Remove Prompt"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <textarea
                  value={prompt.text}
                  onChange={(e) => {
                    handleTextChange(prompt.id, e.target.value);
                    handleInput(e);
                  }}
                  onFocus={(e) => {
                    handleInput(e);
                  }}
                  placeholder={`Paste ${prompt.name} text here (comma-separated tags)...`}
                  className="w-full p-4 resize-none bg-white rounded-xl shadow-sm border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-800 font-mono text-base auto-rows-min leading-relaxed overflow-hidden min-h-[140px]"
                  spellCheck={false}
                  rows={5}
                />
              </div>
            ))}
          </div>

          {/* Sticky Toolbar at the bottom */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-4xl flex justify-between items-center bg-white/90 backdrop-blur-md p-3 sm:px-6 sm:py-4 rounded-2xl shadow-lg border border-gray-200 z-10 transition-all">
            <div className="flex gap-2 sm:gap-4">
              <button
                onClick={handleClear}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
              <button
                onClick={handleAddPrompt}
                disabled={!canAdd}
                className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Prompt</span>
              </button>
            </div>
            
            <button
              onClick={processPrompts}
              disabled={!canCompare}
              className="flex items-center justify-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm sm:text-base font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitCompare className="w-5 h-5" />
              Compare
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-8 w-full pb-20">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-600 rounded-full inline-block"></span>
              Comparison Results
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={downloadMarkdown}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export MD
              </button>
              <button
                onClick={() => setIsComparing(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit
              </button>
            </div>
          </div>

          {/* Base Prompt */}
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
              <div>
                <span className="font-semibold text-base text-indigo-900 flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Base Prompt (Common Tags)
                </span>
                <p className="text-sm text-indigo-600 mt-1">Tags present in all interconnected prompts.</p>
              </div>
            </div>
            <div className="p-6 font-mono text-base leading-loose text-gray-800 bg-white min-h-[6rem] whitespace-pre-wrap word-break">
              {result?.base || <span className="text-gray-400 italic">No common tags found across all inputs.</span>}
            </div>
          </div>

          {/* Differences */}
          <div className="grid grid-cols-1 gap-6">
            {result?.diffs.map((diff, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-base text-gray-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block shadow-sm"></span>
                      {diff.name} Unique Tags
                    </span>
                    <p className="text-sm text-gray-500 mt-1">Tags exclusively added in this version (compared to the base).</p>
                  </div>
                </div>
                <div className="p-6 font-mono text-base leading-loose text-gray-800 bg-white min-h-[5rem] whitespace-pre-wrap word-break">
                  {diff.text || <span className="text-gray-400 italic font-sans text-sm">No unique tags found. (Identical to base prompt)</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

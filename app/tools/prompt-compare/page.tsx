'use client';

import React, { useState } from 'react';
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
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-4 overflow-hidden">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-indigo-600" />
          Prompt Compare
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Compare multiple comma-separated prompts. Extracts the common base prompt and highlights unique tags per input.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {!isComparing && (
            <button
              onClick={handleAddPrompt}
              disabled={!canAdd}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Prompt
            </button>
          )}
          <button
            onClick={handleClear}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!isComparing ? (
            <button
              onClick={processPrompts}
              disabled={!canCompare}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitCompare className="w-4 h-4" />
              Compare
            </button>
          ) : (
            <>
              <button
                onClick={downloadMarkdown}
                className="flex-[2] sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export Markdown
              </button>
              <button
                onClick={() => setIsComparing(false)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-inner">
        {!isComparing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max items-start">
            {prompts.map((prompt, index) => (
              <div key={prompt.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-72">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
                  <span className="font-medium text-sm text-gray-700">
                    {prompt.name}
                  </span>
                  {prompts.length > 1 && (
                    <button
                      onClick={() => handleRemovePrompt(prompt.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove Prompt"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={prompt.text}
                  onChange={(e) => handleTextChange(prompt.id, e.target.value)}
                  placeholder="Paste your prompt text here (comma-separated tags)..."
                  className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 font-mono text-sm leading-relaxed whitespace-pre hover:bg-gray-50/50 transition-colors"
                  spellCheck={false}
                />
              </div>
            ))}
            
            {prompts.length > 0 && prompts[prompts.length - 1].text.trim() !== '' && (
              <button
                onClick={handleAddPrompt}
                className="h-72 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="p-3 bg-white rounded-full group-hover:bg-indigo-100 shadow-sm transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-medium">Add another prompt</span>
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Base Prompt */}
            <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
              <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
                <span className="font-medium text-sm text-indigo-900 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Base Prompt (Common Tags)
                </span>
                <p className="text-xs text-indigo-600 mt-1">Tags present in all prompts</p>
              </div>
              <div className="p-4 font-mono text-sm leading-relaxed text-gray-800 bg-white min-h-[4rem]">
                {result?.base || <span className="text-gray-400 italic">No common tags found.</span>}
              </div>
            </div>

            {/* Differences */}
            {result?.diffs.map((diff, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <span className="font-medium text-sm text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                    {diff.name} Unique Tags
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Tags not present in the base prompt (ordered by line)</p>
                </div>
                <div className="p-4 font-mono text-sm leading-relaxed text-gray-800 bg-white min-h-[4rem] whitespace-pre-wrap word-break">
                  {diff.text || <span className="text-gray-400 italic">No unique tags found.</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

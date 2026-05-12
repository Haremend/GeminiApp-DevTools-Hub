'use client';

import React, { useState } from 'react';
import { GitCompare, ArrowLeft, Trash2, ArrowRight } from 'lucide-react';
import * as Diff from 'diff';

type DiffMode = 'chars' | 'words' | 'lines';

export default function TextDiffPage() {
  const [originalText, setOriginalText] = useState('');
  const [modifiedText, setModifiedText] = useState('');
  const [isDiffView, setIsDiffView] = useState(false);
  const [diffMode, setDiffMode] = useState<DiffMode>('words');

  const handleCompare = () => {
    setIsDiffView(true);
  };

  const handleClear = () => {
    setOriginalText('');
    setModifiedText('');
    setIsDiffView(false);
  };

  const renderDiff = () => {
    let diffResult: Diff.Change[] = [];

    if (diffMode === 'chars') {
      diffResult = Diff.diffChars(originalText, modifiedText);
    } else if (diffMode === 'words') {
      diffResult = Diff.diffWordsWithSpace(originalText, modifiedText);
    } else if (diffMode === 'lines') {
      diffResult = Diff.diffLines(originalText, modifiedText);
    }

    return (
      <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-all p-4">
        {diffResult.map((part, index) => {
          let className = "text-gray-800";
          if (part.added) {
            className = "bg-green-100 text-green-900";
          } else if (part.removed) {
            className = "bg-red-100 text-red-900 line-through opacity-70";
          }

          // In lines mode, make it display block for lines to ensure bg covers the whole line
          if (diffMode === 'lines' && part.value.endsWith('\n')) {
             // split lines and render with block styles
             const lines = part.value.split('\n');
             // remove the last empty line from split due to trailing \n
             if (lines[lines.length - 1] === '') lines.pop();

             return (
               <span key={index}>
                 {lines.map((line, i) => (
                   <div key={i} className={`${part.added ? 'bg-green-100/60 text-green-900' : part.removed ? 'bg-red-100/60 text-red-900' : ''} px-1 my-[1px]`}>
                     {part.added && <span className="mr-2 text-green-600 select-none">+</span>}
                     {part.removed && <span className="mr-2 text-red-500 select-none">-</span>}
                     {!part.added && !part.removed && <span className="mr-2 text-gray-400 select-none">&nbsp;</span>}
                     <span>{line || ' '}</span>
                   </div>
                 ))}
               </span>
             )
          }

          return (
            <span key={index} className={className}>
              {part.value}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-indigo-600" />
          Text Diff Comparer
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Compare two pieces of text and see the differences highlighted (added or removed words/lines).
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full sm:w-auto flex-1 max-w-[200px]">
             <label className="block text-sm font-medium text-gray-700 mb-1">
               Compare By
             </label>
             <select
               value={diffMode}
               onChange={(e) => setDiffMode(e.target.value as DiffMode)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none bg-white text-sm"
             >
               <option value="words">Words (词语)</option>
               <option value="chars">Characters (字符)</option>
               <option value="lines">Lines (逐行)</option>
             </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto pt-0 sm:pt-6">
          <button
            onClick={handleClear}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          
          {!isDiffView ? (
            <button
              onClick={handleCompare}
              disabled={!originalText && !modifiedText}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitCompare className="w-4 h-4" />
              Compare
            </button>
          ) : (
            <button
              onClick={() => setIsDiffView(false)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Edit
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-4 min-h-0">
        {!isDiffView ? (
          <>
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700 flex justify-between items-center">
                <span>Original Text (旧版本)</span>
              </div>
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="Paste original text here..."
                className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 font-mono text-sm leading-relaxed whitespace-pre hover:bg-gray-50/50 transition-colors"
                spellCheck={false}
              />
            </div>

            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <span className="font-medium text-sm text-gray-700">Modified Text (新版本)</span>
              </div>
              <textarea
                value={modifiedText}
                onChange={(e) => setModifiedText(e.target.value)}
                placeholder="Paste modified text here..."
                className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 font-mono text-sm leading-relaxed hover:bg-gray-50/50 transition-colors whitespace-pre"
                spellCheck={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <span className="font-medium text-sm text-gray-700">Diff Result (比对结果)</span>
                <div className="flex gap-4 text-xs font-medium text-gray-600">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-200 inline-block"></span> Removed</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-200 inline-block"></span> Added</span>
                </div>
              </div>
              <div className="flex-1 w-full overflow-auto bg-gray-50/30">
                {renderDiff()}
              </div>
          </div>
        )}
      </div>
    </div>
  );
}

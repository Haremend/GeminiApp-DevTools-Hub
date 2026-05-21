'use client';

import React, { useState, useMemo } from 'react';
import { SplitSquareHorizontal, Copy, Check, FileText } from 'lucide-react';

export default function TextSplitPage() {
  const [inputText, setInputText] = useState('');
  const [delimiter, setDelimiter] = useState('&');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const lines = useMemo(() => {
    if (!inputText) return [];
    
    // Split the input text by the given delimiter.
    // We fall back to returning the whole string if delimiter is somehow invalid,
    // though in JS an empty string delimiter splits by character.
    return inputText.split(delimiter || '').filter((str) => str !== '');
  }, [inputText, delimiter]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <SplitSquareHorizontal className="w-8 h-8 text-indigo-600" />
          Text Split
        </h1>
        <p className="text-gray-500 text-base mt-2">
          Split a URL or text string by a specific delimiter (e.g., &amp;) to display its parameters line by line.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full pb-20">
        {/* Input Card */}
        <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 p-6 gap-6">
          <div className="flex flex-col gap-3 flex-grow w-full">
            <label htmlFor="inputText" className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Input String
            </label>
            <textarea
              id="inputText"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="https://example.com/api?source=google&campaign=spring_sale&medium=cpc"
              className="w-full p-4 resize-y bg-gray-50 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-800 font-mono text-sm leading-relaxed min-h-[140px]"
              spellCheck={false}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pt-2">
            <div className="flex flex-col gap-2 w-full sm:w-[200px]">
              <label htmlFor="delimiter" className="font-semibold text-gray-800">
                Delimiter
              </label>
              <input
                id="delimiter"
                type="text"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                placeholder="&"
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-indigo-700 font-mono text-base font-semibold text-center"
              />
            </div>
            
            <div className="mt-1 sm:mt-7 text-sm font-medium text-gray-500 px-2 rounded-lg bg-gray-50 border border-gray-100 py-1.5 flex items-center">
              <span className="w-2 h-2 rounded-full bg-indigo-400 mr-2 inline-block"></span>
              {lines.length} {lines.length === 1 ? 'item' : 'items'} found
            </div>
          </div>
        </div>

        {/* Results Card */}
        {lines.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
              <div>
                <span className="font-semibold text-base text-indigo-900 flex items-center gap-2">
                  <SplitSquareHorizontal className="w-5 h-5" />
                  Split Results
                </span>
                <p className="text-sm text-indigo-600 mt-1">Data segments separated by <code className="bg-indigo-100 px-1 rounded mx-1">{delimiter || 'empty mode'}</code></p>
              </div>
            </div>
            
            <div className="flex flex-col p-4 bg-gray-50/50 gap-3">
              {lines.map((line, index) => (
                <div key={index} className="flex items-start group bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm hover:border-indigo-300 hover:shadow transition-all relative">
                  <div className="text-gray-400 font-mono text-xs w-6 shrink-0 mt-0.5 select-none flex justify-end pr-3 border-r border-gray-100 mr-3">
                    {index + 1}
                  </div>
                  <div className="font-mono text-sm text-gray-800 flex-grow break-all pr-12 leading-relaxed">
                    {line}
                  </div>
                  <button
                    onClick={() => copyToClipboard(line, index)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none transition-colors"
                    title="Copy line"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

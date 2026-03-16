'use client';

import React, { useState } from 'react';
import { Combine, Copy, Trash2, ArrowRight, Check } from 'lucide-react';

export default function TextMergerPage() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [delimiters, setDelimiters] = useState('');
  const [copied, setCopied] = useState(false);
  const [mergeWithSpace, setMergeWithSpace] = useState(false);

  const handleProcess = () => {
    if (!inputText) {
      setOutputText('');
      return;
    }

    // 1. Merge all lines into one
    // Replace carriage returns and newlines with either a space or empty string
    const mergeChar = mergeWithSpace ? ' ' : '';
    let processed = inputText.replace(/[\r\n]+/g, mergeChar);

    // 2. If delimiters are provided, insert line breaks after them
    if (delimiters.trim()) {
      // Split by space to allow multiple delimiters like ", . ;"
      const delimArray = delimiters.split(' ').filter(d => d.trim() !== '');
      
      if (delimArray.length > 0) {
        // Escape special regex characters in delimiters
        const escapedDelimiters = delimArray.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`(${escapedDelimiters.join('|')})`, 'g');
        
        // Add newline after the delimiter
        processed = processed.replace(regex, '$1\n');
      }
    }

    // Clean up any potential leading/trailing whitespace on each line
    const finalLines = processed.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    setOutputText(finalLines.join('\n'));
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Combine className="w-6 h-6 text-indigo-600" />
          Text Merger
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Merge multi-line text into a single line, and optionally break it into new lines based on specific symbols.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full sm:w-auto flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Line Break Symbols (separated by space, optional)
            </label>
            <input
              type="text"
              value={delimiters}
              onChange={(e) => setDelimiters(e.target.value)}
              placeholder="e.g., 。 . ;"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center h-full pt-0 sm:pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mergeWithSpace}
                onChange={(e) => setMergeWithSpace(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Add space when merging lines (for English)</span>
            </label>
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
          <button
            onClick={handleProcess}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            Merge
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-4 min-h-0">
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
            Original Text
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your multi-line text here..."
            className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 leading-relaxed"
          />
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="font-medium text-sm text-gray-700">Processed Text</span>
            <button
              onClick={handleCopy}
              disabled={!outputText}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={outputText}
            readOnly
            placeholder="Processed text will appear here..."
            className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 leading-relaxed bg-gray-50/30"
          />
        </div>
      </div>
    </div>
  );
}

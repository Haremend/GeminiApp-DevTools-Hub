'use client';

import React, { useState } from 'react';
import { FileCode2, Copy, Trash2, ArrowRight, Check, Info } from 'lucide-react';

export default function TemplateReplacerPage() {
  const [template, setTemplate] = useState('insert into test(a,b) values(#{a}, #{b});');
  const [data, setData] = useState('1,2\n3,3');
  const [delimiterType, setDelimiterType] = useState<'comma' | 'tab' | 'custom'>('comma');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleProcess = () => {
    if (!template || !data) {
      setOutputText('');
      return;
    }

    let actualDelimiter = ',';
    if (delimiterType === 'tab') actualDelimiter = '\t';
    if (delimiterType === 'custom') actualDelimiter = customDelimiter;

    if (!actualDelimiter) {
      actualDelimiter = ','; // fallback
    }

    const rows = data.split(/\r?\n/).filter(r => r.trim() !== '');
    
    // Extract placeholders to map them sequentially if they aren't numbers
    // Matches {0}, #{a}, {name}, etc.
    const placeholderRegex = /(?:#?\{([^}]+)\})/g;
    const matches = [...template.matchAll(placeholderRegex)];
    const uniqueNames = Array.from(new Set(matches.map(m => m[1]).filter(name => isNaN(Number(name)))));

    const result = rows.map(row => {
      const cols = row.split(actualDelimiter);
      
      return template.replace(placeholderRegex, (match, name) => {
        const num = Number(name);
        if (!isNaN(num)) {
          // Positional placeholder like {0}, {1}
          return cols[num] !== undefined ? cols[num] : match;
        } else {
          // Named placeholder like #{a}, #{b}. Map sequentially based on first appearance
          const idx = uniqueNames.indexOf(name);
          return cols[idx] !== undefined ? cols[idx] : match;
        }
      });
    });

    setOutputText(result.join('\n'));
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
    setTemplate('');
    setData('');
    setOutputText('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileCode2 className="w-6 h-6 text-indigo-600" />
          Template Replacer
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate multiple text blocks by injecting data rows into a template. Great for generating SQL inserts from spreadsheet data.
        </p>
      </div>

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* Top: Template */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col shrink-0">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="font-medium text-sm text-gray-700">Template Text</span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Info className="w-4 h-4" />
              <span>Use {'{0}'}, {'{1}'} for columns, or {'#{a}'}, {'#{b}'} for sequential mapping</span>
            </div>
          </div>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="e.g., insert into test(a,b) values(#{a}, #{b});"
            className="w-full p-4 h-24 resize-y focus:outline-none text-gray-800 font-mono text-sm"
          />
        </div>

        {/* Middle: Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-gray-700">Delimiter:</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="delimiter"
                  checked={delimiterType === 'comma'}
                  onChange={() => setDelimiterType('comma')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Comma (,)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="delimiter"
                  checked={delimiterType === 'tab'}
                  onChange={() => setDelimiterType('tab')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Tab (\t)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="delimiter"
                  checked={delimiterType === 'custom'}
                  onChange={() => setDelimiterType('custom')}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Custom</span>
              </label>
            </div>
            {delimiterType === 'custom' && (
              <input
                type="text"
                value={customDelimiter}
                onChange={(e) => setCustomDelimiter(e.target.value)}
                placeholder="e.g., |"
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
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
              Generate
            </button>
          </div>
        </div>

        {/* Bottom: Split View */}
        <div className="flex flex-col md:flex-row flex-1 gap-4 min-h-0">
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
              Data List (one row per line)
            </div>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Paste your data here (e.g., from Excel or Navicat)..."
              className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 font-mono text-sm leading-relaxed whitespace-pre"
            />
          </div>

          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <span className="font-medium text-sm text-gray-700">Generated Output</span>
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
              placeholder="Generated results will appear here..."
              className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 font-mono text-sm leading-relaxed bg-gray-50/30 whitespace-pre"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

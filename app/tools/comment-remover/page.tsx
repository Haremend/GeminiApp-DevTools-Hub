'use client';

import React, { useState } from 'react';
import { Eraser, Copy, Trash2, ArrowRight, Check, Code2 } from 'lucide-react';
import beautify from 'js-beautify';

type Language = 'javascript' | 'java' | 'python' | 'html';

export default function CommentRemoverPage() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [language, setLanguage] = useState<Language>('javascript');
  const [copied, setCopied] = useState(false);

  const handleProcess = () => {
    if (!inputText) {
      setOutputText('');
      return;
    }

    let processed = inputText;

    // 1. Remove Comments
    if (language === 'javascript' || language === 'java') {
      // Matches strings (to preserve them) or comments (to remove them)
      const regex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\*[\s\S]*?\*\/|\/\/.*)/g;
      processed = processed.replace(regex, (match, g1) => g1 ? g1 : '');
    } else if (language === 'python') {
      // Matches strings/docstrings (to preserve) or comments (to remove)
      const regex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|"""[\s\S]*?"""|'''[\s\S]*?''')|(#.*)/g;
      processed = processed.replace(regex, (match, g1) => g1 ? g1 : '');
    } else if (language === 'html') {
      // Matches HTML comments
      const regex = /(<!--[\s\S]*?-->)/g;
      processed = processed.replace(regex, '');
    }

    // 2. Remove Empty Lines (initial pass)
    processed = processed.split('\n')
      .filter(line => line.trim().length > 0)
      .join('\n');

    // 3. Format Code
    try {
      if (language === 'javascript' || language === 'java') {
        // JS beautifier works reasonably well for Java too
        processed = beautify.js(processed, { 
          indent_size: 2, 
          preserve_newlines: false, // Forces removal of empty lines
          space_in_empty_paren: true 
        });
      } else if (language === 'html') {
        processed = beautify.html(processed, { 
          indent_size: 2,
          preserve_newlines: false
        });
      }
      // For Python, we don't use the beautifier to avoid breaking its strict indentation rules.
      // The empty line removal above is sufficient to clean it up.
    } catch (e) {
      console.error("Formatting failed, using unformatted text", e);
    }

    setOutputText(processed);
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
          <Eraser className="w-6 h-6 text-indigo-600" />
          Comment Remover & Formatter
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Remove all comments and empty lines from your code, and automatically format the output.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full sm:w-auto flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Code2 className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
              >
                <option value="javascript">JavaScript / TypeScript</option>
                <option value="java">Java / C / C++</option>
                <option value="python">Python</option>
                <option value="html">HTML / XML</option>
              </select>
            </div>
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
            删除注释 (Remove)
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 gap-4 min-h-0">
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
            Original Code
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your code here with comments..."
            className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 font-mono text-sm leading-relaxed whitespace-pre"
            spellCheck={false}
          />
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="font-medium text-sm text-gray-700">Cleaned & Formatted Code</span>
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
            placeholder="Result will appear here..."
            className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 font-mono text-sm leading-relaxed bg-gray-50/30 whitespace-pre"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

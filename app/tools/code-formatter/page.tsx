'use client';

import React, { useState } from 'react';
import { AlignLeft, Copy, Trash2, ArrowRight, Check, Code2 } from 'lucide-react';
import beautify from 'js-beautify';

type Language = 'javascript' | 'html' | 'vue' | 'css' | 'java' | 'json';

export default function CodeFormatterPage() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [language, setLanguage] = useState<Language>('javascript');
  const [copied, setCopied] = useState(false);

  const handleFormat = () => {
    if (!inputText.trim()) {
      setOutputText('');
      return;
    }

    let formatted = inputText;
    try {
      const options = { 
        indent_size: 2, 
        space_in_empty_paren: true,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        wrap_line_length: 120
      };
      
      switch (language) {
        case 'javascript':
        case 'java':
        case 'json':
          formatted = beautify.js(inputText, options);
          break;
        case 'html':
        case 'vue':
          formatted = beautify.html(inputText, {
            ...options,
            indent_inner_html: true,
            extra_liners: ['head', 'body', '/html', 'script', 'style']
          });
          break;
        case 'css':
          formatted = beautify.css(inputText, options);
          break;
      }
    } catch (e) {
      console.error("Formatting failed", e);
      formatted = "Error formatting code. Please check your syntax.";
    }

    setOutputText(formatted);
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
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-[1600px] mx-auto w-full p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlignLeft className="w-6 h-6 text-indigo-600" />
          Code Formatter
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Format and beautify your code. Supports JavaScript, Java, HTML, Vue, CSS, and JSON.
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
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
                <option value="java">Java</option>
                <option value="html">HTML</option>
                <option value="vue">Vue</option>
                <option value="css">CSS / SCSS</option>
                <option value="json">JSON</option>
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
            onClick={handleFormat}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            Format Code
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0">
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
            Input Code
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your raw code here..."
            className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 font-mono text-sm leading-relaxed whitespace-pre"
            spellCheck={false}
          />
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="font-medium text-sm text-gray-700">Formatted Code</span>
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
            placeholder="Formatted result will appear here..."
            className="flex-1 w-full p-4 resize-none focus:outline-none text-gray-800 font-mono text-sm leading-relaxed bg-gray-50/30 whitespace-pre"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

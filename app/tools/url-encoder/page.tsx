'use client';

import React, { useState } from 'react';
import { Link2, ArrowRightLeft, Copy, Check, Trash2 } from 'lucide-react';

export default function UrlEncoderPage() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleEncode = () => {
    try {
      setOutputText(encodeURIComponent(inputText));
    } catch (e) {
      setOutputText('Error encoding text.');
    }
  };

  const handleDecode = () => {
    try {
      setOutputText(decodeURIComponent(inputText));
    } catch (e) {
      setOutputText('Error decoding text. Make sure it is a valid encoded URL string.');
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Link2 className="w-8 h-8 text-indigo-600" />
          URL Encoder / Decoder
        </h1>
        <p className="text-gray-500 text-base mt-2">
          Encode or decode a URL or text string to safe format for web transmission.
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full">
        {/* Input Section */}
        <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <span className="font-semibold text-gray-800 text-base">Input String</span>
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-md hover:bg-red-50"
              title="Clear input"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
          <div className="p-6">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your text or URL here..."
              className="w-full p-4 resize-y bg-gray-50 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-gray-800 font-mono text-sm leading-relaxed min-h-[160px]"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 py-2">
          <button
            onClick={handleEncode}
            disabled={!inputText}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Encode
            <ArrowRightLeft className="w-4 h-4 ml-1" />
          </button>
          <button
            onClick={handleDecode}
            disabled={!inputText}
            className="flex items-center gap-2 px-8 py-3 bg-white border border-indigo-600 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Decode
            <ArrowRightLeft className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Output Section */}
        <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
            <span className="font-semibold text-indigo-900 text-base">Output Result</span>
            <button
              onClick={copyToClipboard}
              disabled={!outputText}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Output
                </>
              )}
            </button>
          </div>
          <div className="p-6">
            <textarea
              readOnly
              value={outputText}
              placeholder="Result will appear here..."
              className="w-full p-4 resize-y bg-gray-50/80 rounded-xl border border-gray-200 outline-none text-gray-800 font-mono text-sm leading-relaxed min-h-[160px]"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

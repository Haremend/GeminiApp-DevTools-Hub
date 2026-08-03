'use client';

import { useState } from 'react';
import { Copy, Eraser, Layers } from 'lucide-react';

export default function RemoveDuplicatesTool() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSorted, setIsSorted] = useState(false);
  const [removeEmpty, setRemoveEmpty] = useState(false);

  const processLines = (text: string, sorted: boolean, removeEmptyLines: boolean) => {
    let lines = text.split('\n');
    if (removeEmptyLines) {
      lines = lines.filter(line => line.trim().length > 0);
    }
    let uniqueLines = Array.from(new Set(lines));
    if (sorted) {
      uniqueLines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }
    return uniqueLines.join('\n');
  };

  const handleDeduplicate = () => {
    setOutputText(processLines(inputText, isSorted, removeEmpty));
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
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h1 className="font-bold text-gray-800 text-lg">Remove Duplicate Lines</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 mr-2 text-sm text-gray-700 cursor-pointer hover:text-indigo-600 transition-colors">
            <input 
              type="checkbox" 
              checked={removeEmpty} 
              onChange={(e) => {
                const newRemoveEmpty = e.target.checked;
                setRemoveEmpty(newRemoveEmpty);
                if (outputText) {
                  setOutputText(processLines(inputText, isSorted, newRemoveEmpty));
                }
              }}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
            />
            <span className="font-medium">去除空行</span>
          </label>
          <label className="flex items-center gap-1.5 mr-2 text-sm text-gray-700 cursor-pointer hover:text-indigo-600 transition-colors">
            <input 
              type="checkbox" 
              checked={isSorted} 
              onChange={(e) => {
                const newIsSorted = e.target.checked;
                setIsSorted(newIsSorted);
                if (outputText) {
                  setOutputText(processLines(inputText, newIsSorted, removeEmpty));
                }
              }}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
            />
            <span className="font-medium">Sort</span>
          </label>
          <button 
            onClick={handleClear}
            className="px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
            title="Clear"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button 
            onClick={handleDeduplicate}
            className="px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Layers className="w-4 h-4" />
            <span>Deduplicate</span>
          </button>
          <button 
            onClick={handleCopy}
            disabled={!outputText}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
              copied 
                ? 'bg-green-100 text-green-700' 
                : outputText 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
            Input
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 w-full p-4 resize-none outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            placeholder="Paste your text here..."
          />
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700 flex justify-between items-center">
            <span>Output</span>
            <span className="text-xs text-gray-500">
              {outputText ? `${outputText.split('\n').length} lines` : '0 lines'}
            </span>
          </div>
          <textarea
            readOnly
            value={outputText}
            className="flex-1 w-full p-4 resize-none outline-none bg-gray-50 text-gray-800"
            placeholder="Deduplicated text will appear here..."
          />
        </div>
      </div>
    </div>
  );
}

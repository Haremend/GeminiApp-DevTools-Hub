'use client';

import { useState } from 'react';
import yaml from 'js-yaml';
import { Copy, Check, Play, Trash2 } from 'lucide-react';

export default function YamlFormatterTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const formatYaml = () => {
    setError(null);
    if (!input.trim()) {
      setOutput('');
      return;
    }

    try {
      // Parse the YAML
      const parsed = yaml.load(input);
      
      // Stringify back to YAML with sorting keys and standard formatting
      // js-yaml dump automatically removes empty lines and standardizes format
      const formatted = yaml.dump(parsed, {
        sortKeys: true,
        indent: 2,
        lineWidth: -1, // Don't wrap lines
        noRefs: true,
      });

      setOutput(formatted);
    } catch (err: any) {
      setError(err.message || 'Invalid YAML format');
    }
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearAll = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-900">YAML Formatter</h1>
        <p className="mt-2 text-gray-600">Format YAML, remove empty lines, and sort keys alphabetically (A-Z).</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Input Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">Input</h2>
            <button
              onClick={clearAll}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              title="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your YAML here..."
            className="flex-1 w-full p-4 resize-none focus:outline-none font-mono text-sm text-gray-800 bg-white"
            spellCheck={false}
          />
        </div>

        {/* Actions (Middle on desktop, between on mobile) */}
        <div className="flex lg:flex-col justify-center items-center gap-4 py-2 lg:py-0">
          <button
            onClick={formatYaml}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Format</span>
          </button>
        </div>

        {/* Output Area */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">Output</h2>
            <button
              onClick={copyToClipboard}
              disabled={!output}
              className={`flex items-center space-x-1 text-sm ${
                !output ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-700'
              } transition-colors`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          
          {error ? (
            <div className="p-4 bg-red-50 text-red-600 font-mono text-sm overflow-auto flex-1">
              <p className="font-bold mb-2">Error parsing YAML:</p>
              <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
          ) : (
            <textarea
              value={output}
              readOnly
              placeholder="Formatted YAML will appear here..."
              className="flex-1 w-full p-4 resize-none focus:outline-none font-mono text-sm text-gray-800 bg-gray-50/50"
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

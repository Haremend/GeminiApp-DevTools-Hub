'use client';

import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Download, Play, AlertCircle, Image as ImageIcon } from 'lucide-react';

const DEFAULT_CODE = `graph TD
    A[Client] -->|HTTP Request| B(Load Balancer)
    B --> C{Router}
    C -->|Route 1| D[Service A]
    C -->|Route 2| E[Service B]
    D --> F[(Database)]
    E --> F
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#bbf,stroke:#f66,stroke-width:2px,stroke-dasharray: 5 5`;

export default function MermaidEditorTool() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!code.trim()) {
        if (isMounted) {
          setSvgContent('');
          setError(null);
        }
        return;
      }

      setIsRendering(true);
      try {
        // Generate a unique ID for the render container
        const id = `mermaid-preview-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          // Mermaid sometimes throws errors with HTML content, strip it for display
          const errorMsg = err.message || err.str || 'Syntax Error';
          setError(errorMsg.replace(/<[^>]*>?/gm, ''));
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    };

    const timeout = setTimeout(renderDiagram, 500); // Debounce
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [code]);

  const downloadImage = (format: 'png' | 'jpg') => {
    if (!svgContent) return;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Add padding
      const padding = 40;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw image in center
        ctx.drawImage(img, padding, padding);
        
        const a = document.createElement('a');
        a.download = `mermaid-diagram.${format}`;
        a.href = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`, 1.0);
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mermaid Editor</h1>
          <p className="mt-2 text-gray-600">Create and preview Mermaid diagrams and flowcharts from text.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => downloadImage('png')}
            disabled={!svgContent || !!error}
            className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>PNG</span>
          </button>
          <button
            onClick={() => downloadImage('jpg')}
            disabled={!svgContent || !!error}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-4 h-4" />
            <span>JPG</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Editor Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center">
              <Play className="w-4 h-4 mr-2 text-indigo-500" /> Mermaid Syntax
            </h2>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm text-gray-800 bg-white"
            placeholder="Enter Mermaid syntax here..."
            spellCheck={false}
          />
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">Live Preview</h2>
            {isRendering && <span className="text-xs text-gray-400 animate-pulse">Rendering...</span>}
          </div>
          
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-gray-50/50 relative">
            {error ? (
              <div className="absolute inset-4 p-6 bg-red-50 text-red-600 rounded-xl border border-red-100 overflow-auto">
                <div className="flex items-center space-x-2 mb-2 font-bold">
                  <AlertCircle className="w-5 h-5" />
                  <span>Syntax Error</span>
                </div>
                <pre className="text-sm font-mono whitespace-pre-wrap">{error}</pre>
              </div>
            ) : svgContent ? (
              <div 
                className="mermaid-preview-container max-w-full"
                dangerouslySetInnerHTML={{ __html: svgContent }} 
              />
            ) : (
              <div className="text-gray-400">Enter mermaid syntax to see preview</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

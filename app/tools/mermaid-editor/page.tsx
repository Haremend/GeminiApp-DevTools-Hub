'use client';

import React, { useState, useRef, useEffect } from 'react';
import mermaid from 'mermaid';
import { Download, Edit3, Eye, Columns } from 'lucide-react';

type ViewMode = 'split' | 'edit' | 'preview';

export default function MermaidEditorPage() {
  const [code, setCode] = useState<string>(`graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[Car]
`);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const previewRef = useRef<HTMLDivElement>(null);

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
      try {
        if (!code.trim()) {
          setSvgContent('');
          setError(null);
          return;
        }
        
        // Generate a unique ID for the diagram
        const id = `mermaid-preview-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          // Mermaid might throw an error string or an Error object
          setError(err?.message || err?.str || 'Syntax error in Mermaid code');
        }
      }
    };

    const timeoutId = setTimeout(renderDiagram, 500); // Debounce
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [code]);

  // Handle responsive view mode
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'split') {
        setViewMode('edit');
      } else if (window.innerWidth >= 768 && viewMode !== 'split') {
        setViewMode('split');
      }
    };

    window.addEventListener('resize', handleResize);
    if (window.innerWidth < 768) {
      setViewMode('edit');
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const downloadImage = (format: 'png' | 'jpg') => {
    if (!previewRef.current || !svgContent) return;

    const svgElement = previewRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Set canvas dimensions based on SVG viewBox or width/height
    const viewBox = svgElement.getAttribute('viewBox');
    let width = parseInt(svgElement.getAttribute('width') || '0', 10);
    let height = parseInt(svgElement.getAttribute('height') || '0', 10);

    if (viewBox && (!width || !height)) {
      const [, , w, h] = viewBox.split(' ').map(Number);
      width = w;
      height = h;
    }

    // Fallback dimensions
    if (!width) width = 800;
    if (!height) height = 600;

    // Scale up for better resolution
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;

    img.onload = () => {
      if (ctx) {
        // Fill white background for JPG or transparent for PNG
        if (format === 'jpg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);

        const a = document.createElement('a');
        a.download = `mermaid-diagram.${format}`;
        a.href = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`, 1.0);
        a.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-4">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mermaid Editor</h1>
          <p className="text-gray-500 text-sm">Create diagrams and flowcharts using Mermaid syntax</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadImage('png')}
            disabled={!svgContent || !!error}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export PNG
          </button>
          <button
            onClick={() => downloadImage('jpg')}
            disabled={!svgContent || !!error}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export JPG
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-end p-2 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-1 bg-gray-200/50 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded-md text-sm font-medium transition-colors md:hidden ${viewMode === 'edit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Edit Mode"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded-md text-sm font-medium transition-colors md:hidden ${viewMode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Preview Mode"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-md text-sm font-medium transition-colors hidden md:block ${viewMode === 'split' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Split View"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor & Preview Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor */}
          {(viewMode === 'split' || viewMode === 'edit') && (
            <div className={`flex-1 flex flex-col ${viewMode === 'split' ? 'border-r border-gray-200' : ''}`}>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm text-gray-800 bg-white leading-relaxed"
                placeholder="Type your Mermaid syntax here..."
                spellCheck={false}
              />
            </div>
          )}

          {/* Preview */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div className="flex-1 flex flex-col bg-gray-50/30 relative overflow-hidden">
              {error ? (
                <div className="absolute inset-0 p-6 overflow-auto bg-red-50/50 text-red-600 font-mono text-sm whitespace-pre-wrap">
                  {error}
                </div>
              ) : (
                <div 
                  ref={previewRef}
                  className="flex-1 p-6 overflow-auto flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { Tldraw, exportAs, copyAs, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { useState } from 'react';
import { Copy, Download, Trash2, Image as ImageIcon, Focus } from 'lucide-react';

export default function ImageEditorTool() {
  const [editor, setEditor] = useState<Editor | null>(null);

  const handleMount = (editorInstance: Editor) => {
    setEditor(editorInstance);
    // Improve UX for a basic image editor: zoom on scroll instead of pan, and show a grid.
    editorInstance.updateInstanceState({ isGridMode: true });
  };

  const handleCopy = async () => {
    if (!editor) return;
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
      alert('The canvas is empty.');
      return;
    }
    
    try {
      await copyAs(editor, shapeIds, {
        format: 'png',
        background: true
      });
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy', error);
      alert('Failed to copy to clipboard. Ensure your browser supports this feature.');
    }
  };

  const handleDownload = async () => {
    if (!editor) return;
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
      alert('The canvas is empty.');
      return;
    }

    try {
      await exportAs(editor, shapeIds, {
        format: 'png',
        background: true
      });
    } catch (error) {
      console.error('Failed to download', error);
      alert('Failed to generate image download.');
    }
  };

  const handleClear = () => {
    if (!editor) return;
    if (confirm('Are you sure you want to clear the entire canvas?')) {
      editor.deleteShapes(Array.from(editor.getCurrentPageShapeIds()));
    }
  };

  const handleResetView = () => {
    if (!editor) return;
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length > 0) {
      editor.zoomToFit({ animation: { duration: 200 } });
    } else {
      editor.setCamera({ x: 0, y: 0, z: 1 }, { animation: { duration: 200 } });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
      {/* Header/Toolbar */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-5 h-5 text-indigo-600" />
          <h1 className="font-bold text-gray-800 text-lg">Image Editor</h1>
          <span className="text-sm text-gray-500 ml-4 hidden md:inline-block border-l border-gray-200 pl-4">
            Paste images (Ctrl+V), annotate, and export
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleResetView} 
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm"
          >
            <Focus className="w-4 h-4" /> 
            <span className="hidden sm:inline">Reset View</span>
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
          <button 
            onClick={handleClear} 
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors shadow-sm"
          >
            <Trash2 className="w-4 h-4" /> 
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button 
            onClick={handleCopy} 
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Copy className="w-4 h-4" /> 
            <span className="hidden sm:inline">Copy</span>
          </button>
          <button 
            onClick={handleDownload} 
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> 
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </header>

      {/* Editor Canvas */}
      <div className="flex-1 relative isolate min-h-0 overflow-hidden">
        <Tldraw 
          onMount={handleMount} 
          persistenceKey="image-editor-canvas" 
        />
      </div>
    </div>
  );
}

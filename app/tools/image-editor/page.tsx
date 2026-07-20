'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Trash2, Image as ImageIcon, MousePointer2, Type, Square, Circle, PenTool } from 'lucide-react';

export default function ImageEditorTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<any>(null);
  const [activeTool, setActiveTool] = useState<string>('select');

  useEffect(() => {
    // Dynamically import fabric to avoid SSR issues
    const initFabric = async () => {
      const fabric = (await import('fabric')).fabric;
      
      if (!canvasRef.current || !containerRef.current) return;
      
      const { clientWidth, clientHeight } = containerRef.current;
      
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: clientWidth,
        height: clientHeight,
        backgroundColor: '#e5e7eb', // gray-200
        isDrawingMode: false,
      });

      // Handle resize
      const handleResize = () => {
        if (containerRef.current) {
          canvas.setWidth(containerRef.current.clientWidth);
          canvas.setHeight(containerRef.current.clientHeight);
          canvas.renderAll();
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Handle paste
      const handlePaste = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (f) => {
                const data = f.target?.result as string;
                fabric.Image.fromURL(data, (img) => {
                  // Center and scale image if too large
                  img.scaleToWidth(Math.min(img.width || 800, canvas.width! * 0.8));
                  canvas.centerObject(img);
                  canvas.add(img);
                  canvas.setActiveObject(img);
                });
              };
              reader.readAsDataURL(blob);
            }
            break;
          }
        }
      };
      
      window.addEventListener('paste', handlePaste);
      
      setFabricCanvas(canvas);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('paste', handlePaste);
        canvas.dispose();
      };
    };
    
    initFabric();
  }, []);

  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;
    
    if (tool === 'draw') {
      fabricCanvas.isDrawingMode = true;
    } else {
      fabricCanvas.isDrawingMode = false;
    }
  };

  const addText = () => {
    if (!fabricCanvas) return;
    import('fabric').then(({ fabric }) => {
      const text = new fabric.IText('Double click to edit', {
        left: fabricCanvas.width! / 2 - 100,
        top: fabricCanvas.height! / 2 - 20,
        fontFamily: 'sans-serif',
        fill: '#000000',
        fontSize: 24,
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      setActiveTool('select');
      fabricCanvas.isDrawingMode = false;
    });
  };

  const addRect = () => {
    if (!fabricCanvas) return;
    import('fabric').then(({ fabric }) => {
      const rect = new fabric.Rect({
        left: fabricCanvas.width! / 2 - 50,
        top: fabricCanvas.height! / 2 - 50,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 4,
        width: 100,
        height: 100,
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      setActiveTool('select');
      fabricCanvas.isDrawingMode = false;
    });
  };

  const addCircle = () => {
    if (!fabricCanvas) return;
    import('fabric').then(({ fabric }) => {
      const circle = new fabric.Circle({
        left: fabricCanvas.width! / 2 - 50,
        top: fabricCanvas.height! / 2 - 50,
        fill: 'transparent',
        stroke: '#000000',
        strokeWidth: 4,
        radius: 50,
      });
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
      setActiveTool('select');
      fabricCanvas.isDrawingMode = false;
    });
  };

  const handleCopy = async () => {
    if (!fabricCanvas) return;
    try {
      const dataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1
      });
      
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy', error);
      alert('Failed to copy to clipboard.');
    }
  };

  const handleDownload = () => {
    if (!fabricCanvas) return;
    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1
    });
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `edited-image-${Date.now()}.png`;
    a.click();
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    if (confirm('Are you sure you want to clear the entire canvas?')) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#e5e7eb';
      fabricCanvas.renderAll();
    }
  };

  const deleteSelected = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length) {
      fabricCanvas.discardActiveObject();
      activeObjects.forEach((obj: any) => {
        fabricCanvas.remove(obj);
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && fabricCanvas) {
        // Prevent deleting if editing text
        if (fabricCanvas.getActiveObject() && fabricCanvas.getActiveObject().isEditing) {
          return;
        }
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-5 h-5 text-indigo-600" />
          <h1 className="font-bold text-gray-800 text-lg">Image Editor</h1>
          <span className="text-sm text-gray-500 ml-4 hidden md:inline-block border-l border-gray-200 pl-4">
            Paste images (Ctrl+V), annotate, and export. Select objects and press Delete to remove.
          </span>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="flex flex-1 overflow-hidden min-h-0">
        <aside className="w-16 border-r border-gray-200 bg-white flex flex-col items-center py-4 gap-4 z-10 shrink-0">
          <button
            onClick={() => handleToolChange('select')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'select' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Select tool"
          >
            <MousePointer2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleToolChange('draw')}
            className={`p-2 rounded-lg transition-colors ${activeTool === 'draw' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Draw tool"
          >
            <PenTool className="w-5 h-5" />
          </button>
          <button
            onClick={addText}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Add text"
          >
            <Type className="w-5 h-5" />
          </button>
          <button
            onClick={addRect}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Add rectangle"
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={addCircle}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Add circle"
          >
            <Circle className="w-5 h-5" />
          </button>
        </aside>

        <div className="flex-1 relative isolate min-h-0 overflow-hidden" ref={containerRef}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}

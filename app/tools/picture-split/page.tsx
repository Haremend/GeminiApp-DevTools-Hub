'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, SplitSquareHorizontal, Image as ImageIcon } from 'lucide-react';

export default function PictureSplitPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [dragging, setDragging] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);

  const handleAddFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
    }
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              handleAddFile(file);
              break;
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleAddFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFile(e.dataTransfer.files[0]);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    setCrop({ top: 0, bottom: 0, left: 0, right: 0 });
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const scaleX = imgSize.w / rect.width;
      const scaleY = imgSize.h / rect.height;
      
      setCrop(prev => {
        const newCrop = { ...prev };
        if (dragging === 'top') {
          const y = e.clientY - rect.top;
          newCrop.top = Math.max(0, Math.min(imgSize.h - prev.bottom - 1, y * scaleY));
        } else if (dragging === 'bottom') {
          const y = rect.bottom - e.clientY;
          newCrop.bottom = Math.max(0, Math.min(imgSize.h - prev.top - 1, y * scaleY));
        } else if (dragging === 'left') {
          const x = e.clientX - rect.left;
          newCrop.left = Math.max(0, Math.min(imgSize.w - prev.right - 1, x * scaleX));
        } else if (dragging === 'right') {
          const x = rect.right - e.clientX;
          newCrop.right = Math.max(0, Math.min(imgSize.w - prev.left - 1, x * scaleX));
        }
        return newCrop;
      });
    };
    const handleMouseUp = () => setDragging(null);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, imgSize]);

  const handleDownload = () => {
    if (!imageUrl || imgSize.w === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = imgSize.w - crop.left - crop.right;
    canvas.height = imgSize.h - crop.top - crop.bottom;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(
        img,
        crop.left,
        crop.top,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const link = document.createElement('a');
      link.download = `cropped_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    };
    img.src = imageUrl;
  };

  const topPct = imgSize.h ? (crop.top / imgSize.h) * 100 : 0;
  const bottomPct = imgSize.h ? (crop.bottom / imgSize.h) * 100 : 0;
  const leftPct = imgSize.w ? (crop.left / imgSize.w) * 100 : 0;
  const rightPct = imgSize.w ? (crop.right / imgSize.w) * 100 : 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-gray-50 overflow-hidden">
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <SplitSquareHorizontal className="w-5 h-5 text-indigo-600" />
          <h1 className="font-bold text-gray-800 text-lg">Picture Split</h1>
        </div>
        <button 
          onClick={handleDownload}
          disabled={!imageUrl}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> Download Cropped PNG
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Canvas Area */}
        <div 
          className="flex-1 bg-gray-100 overflow-hidden flex items-center justify-center p-8 relative outline-none"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          {imageUrl ? (
            <div className="relative flex max-w-full max-h-full shadow-lg bg-white">
              <img 
                ref={imageRef}
                src={imageUrl}
                alt="Target"
                className="max-w-full max-h-full object-contain pointer-events-none"
                onLoad={handleImageLoad}
              />
              
              {/* Overlay and Cropper Box */}
              <div className="absolute inset-0 z-10 overflow-hidden">
                {/* Dark Overlays */}
                <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-[1px] transition-all duration-75" style={{ height: `${topPct}%` }} />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[1px] transition-all duration-75" style={{ height: `${bottomPct}%` }} />
                <div className="absolute left-0 bg-black/60 backdrop-blur-[1px] transition-all duration-75" style={{ top: `${topPct}%`, bottom: `${bottomPct}%`, width: `${leftPct}%` }} />
                <div className="absolute right-0 bg-black/60 backdrop-blur-[1px] transition-all duration-75" style={{ top: `${topPct}%`, bottom: `${bottomPct}%`, width: `${rightPct}%` }} />
                
                {/* Cropping Box */}
                <div 
                  className="absolute border-2 border-indigo-500 shadow-[0_0_0_1px_rgba(255,255,255,0.2)] transition-all duration-75" 
                  style={{ top: `${topPct}%`, bottom: `${bottomPct}%`, left: `${leftPct}%`, right: `${rightPct}%` }}
                >
                  {/* Grid lines inside crop box */}
                  <div className="absolute inset-0 flex flex-col justify-evenly pointer-events-none opacity-40">
                    <div className="w-full h-px bg-white" />
                    <div className="w-full h-px bg-white" />
                  </div>
                  <div className="absolute inset-0 flex justify-evenly pointer-events-none opacity-40">
                    <div className="h-full w-px bg-white" />
                    <div className="h-full w-px bg-white" />
                  </div>

                  {/* Drag Handles */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-4 -mt-2 cursor-ns-resize flex items-center justify-center group"
                    onMouseDown={(e) => { e.preventDefault(); setDragging('top'); }}
                  >
                    <div className="w-8 h-1.5 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                  </div>
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-4 -mb-2 cursor-ns-resize flex items-center justify-center group"
                    onMouseDown={(e) => { e.preventDefault(); setDragging('bottom'); }}
                  >
                    <div className="w-8 h-1.5 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                  </div>
                  <div 
                    className="absolute top-0 bottom-0 left-0 w-4 -ml-2 cursor-ew-resize flex items-center justify-center group"
                    onMouseDown={(e) => { e.preventDefault(); setDragging('left'); }}
                  >
                    <div className="h-8 w-1.5 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                  </div>
                  <div 
                    className="absolute top-0 bottom-0 right-0 w-4 -mr-2 cursor-ew-resize flex items-center justify-center group"
                    onMouseDown={(e) => { e.preventDefault(); setDragging('right'); }}
                  >
                    <div className="h-8 w-1.5 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                  </div>
                  
                  {/* Indicators for distances */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shadow-sm pointer-events-none">
                    Top: {Math.round(crop.top)}px
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shadow-sm pointer-events-none">
                    Bottom: {Math.round(crop.bottom)}px
                  </div>
                  <div className="absolute top-1/2 -left-20 -translate-y-1/2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shadow-sm pointer-events-none w-[70px] text-right">
                    Left: {Math.round(crop.left)}px
                  </div>
                  <div className="absolute top-1/2 -right-20 -translate-y-1/2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shadow-sm pointer-events-none w-[70px]">
                    Right: {Math.round(crop.right)}px
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center justify-center w-full max-w-md p-10 border-2 border-dashed border-gray-300 rounded-2xl bg-white">
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-700 font-medium mb-1">Click, drag, or paste image</p>
              <p className="text-sm text-gray-500 mb-6">Supports PNG, JPG, WEBP (Ctrl+V)</p>
              <label className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm">
                Upload Image
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => e.target.files && e.target.files.length > 0 && handleAddFile(e.target.files[0])}
                />
              </label>
            </div>
          )}
        </div>

        {/* Right Settings Panel */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.03)] overflow-auto">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-800 mb-4">Crop Distances (px)</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 flex justify-between">
                  Top <span className="text-indigo-600">{Math.round(crop.top)}</span>
                </label>
                <input 
                  type="number" 
                  value={Math.round(crop.top)}
                  onChange={e => setCrop(p => ({ ...p, top: Math.max(0, Math.min(imgSize.h - p.bottom - 1, Number(e.target.value))) }))}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 flex justify-between">
                  Bottom <span className="text-indigo-600">{Math.round(crop.bottom)}</span>
                </label>
                <input 
                  type="number" 
                  value={Math.round(crop.bottom)}
                  onChange={e => setCrop(p => ({ ...p, bottom: Math.max(0, Math.min(imgSize.h - p.top - 1, Number(e.target.value))) }))}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 flex justify-between">
                  Left <span className="text-indigo-600">{Math.round(crop.left)}</span>
                </label>
                <input 
                  type="number" 
                  value={Math.round(crop.left)}
                  onChange={e => setCrop(p => ({ ...p, left: Math.max(0, Math.min(imgSize.w - p.right - 1, Number(e.target.value))) }))}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 flex justify-between">
                  Right <span className="text-indigo-600">{Math.round(crop.right)}</span>
                </label>
                <input 
                  type="number" 
                  value={Math.round(crop.right)}
                  onChange={e => setCrop(p => ({ ...p, right: Math.max(0, Math.min(imgSize.w - p.left - 1, Number(e.target.value))) }))}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                />
              </div>
            </div>
          </div>
          <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-sm text-gray-800 mb-3">Dimensions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs text-gray-500 mb-1">Original</span>
                <span className="text-sm font-medium text-gray-800">{imgSize.w} × {imgSize.h}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500 mb-1">Cropped</span>
                <span className="text-sm font-medium text-indigo-700">{Math.round(imgSize.w - crop.left - crop.right)} × {Math.round(imgSize.h - crop.top - crop.bottom)}</span>
              </div>
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-end">
            <button 
              onClick={() => {
                setImageUrl(null);
                setImgSize({ w: 0, h: 0 });
                setCrop({ top: 0, bottom: 0, left: 0, right: 0 });
              }}
              disabled={!imageUrl}
              className="w-full py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

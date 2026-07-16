'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Upload, Trash2, ArrowUp, ArrowDown, Settings, Layers } from 'lucide-react';

type Layer = {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
};

const DistanceLine = ({ x, y, length, vertical, value }: { x: number, y: number, length: number, vertical: boolean, value: number }) => {
  const actualLen = Math.abs(length);
  const actualX = length < 0 && !vertical ? x + length : x;
  const actualY = length < 0 && vertical ? y + length : y;

  return (
    <div 
      className={`absolute flex items-center justify-center pointer-events-none ${vertical ? 'border-l' : 'border-t'} border-dashed border-indigo-500`}
      style={{
        left: actualX,
        top: actualY,
        width: vertical ? 0 : actualLen,
        height: vertical ? actualLen : 0,
        zIndex: 9999
      }}
    >
       <div className="absolute bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap font-medium">
         {Math.round(value)}
       </div>
    </div>
  );
};

export default function UILayerCompositePage() {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [autoCanvasSize, setAutoCanvasSize] = useState(true);
  
  const autoCanvasSizeRef = useRef(true);
  useEffect(() => {
    autoCanvasSizeRef.current = autoCanvasSize;
  }, [autoCanvasSize]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, layerX: 0, layerY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAddFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          setLayers(prev => {
            const newLayer = {
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              url,
              width: img.width,
              height: img.height,
              originalWidth: img.width,
              originalHeight: img.height,
              x: 0,
              y: 0,
              opacity: 1,
              scale: 1,
            };
            const next = [...prev, newLayer];
            
            let maxArea = 0;
            let bestW = 800;
            let bestH = 600;
            next.forEach(l => {
              const area = l.originalWidth * l.originalHeight;
              if (area > maxArea) {
                maxArea = area;
                bestW = l.originalWidth;
                bestH = l.originalHeight;
              }
            });
            
            if (autoCanvasSizeRef.current) {
              setCanvasWidth(bestW);
              setCanvasHeight(bestH);
            }

            setSelectedId(newLayer.id);

            return next;
          });
        };
      }
    });
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.items) {
        const items = e.clipboardData.items;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                const ext = file.type.split('/')[1] || 'png';
                const namedFile = new File([file], `Pasted_Image_${Date.now()}.${ext}`, { type: file.type });
                files.push(namedFile);
            }
          }
        }
        if (files.length > 0) {
          handleAddFiles(files);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleAddFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    setSelectedId(layerId);
    setIsDragging(true);
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      setDragStart({ mouseX: e.clientX, mouseY: e.clientY, layerX: layer.x, layerY: layer.y });
    }
  };

  useEffect(() => {
    if (isDragging && selectedId) {
      const handleMouseMove = (e: MouseEvent) => {
        const dx = e.clientX - dragStart.mouseX;
        const dy = e.clientY - dragStart.mouseY;
        setLayers(prev => prev.map(l => l.id === selectedId ? { ...l, x: dragStart.layerX + dx, y: dragStart.layerY + dy } : l));
      };
      const handleMouseUp = () => {
        setIsDragging(false);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, selectedId]);

  const updateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const moveLayer = (index: number, direction: number) => {
    const newLayers = [...layers];
    if (direction === 1 && index < newLayers.length - 1) {
      [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
    } else if (direction === -1 && index > 0) {
      [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
    }
    setLayers(newLayers);
  };

  const removeLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const exportImage = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const layer of layers) {
      const img = await new Promise<HTMLImageElement>((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.src = layer.url;
      });
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(
        img, 
        layer.x, 
        layer.y, 
        layer.width * layer.scale, 
        layer.height * layer.scale
      );
    }

    const link = document.createElement('a');
    link.download = `Composite_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const selectedLayer = layers.find(l => l.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-gray-50 overflow-hidden">
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h1 className="font-bold text-gray-800 text-lg">UI Layer Composite</h1>
        </div>
        <button 
          onClick={exportImage}
          disabled={layers.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> Download Composite
        </button>
      </header>
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Canvas Area */}
        <div 
          className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center p-8 outline-none"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => setSelectedId(null)}
          ref={containerRef}
          tabIndex={0}
        >
          <div 
            className="m-auto relative shadow-xl shrink-0 transition-shadow bg-white" 
            style={{ 
              width: canvasWidth, 
              height: canvasHeight, 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h10v10H0zm10 10h10v10H10z\' fill=\'%23e5e7eb\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")'
            }}
            onClick={(e) => e.stopPropagation()}
          >
             {layers.map(layer => (
               <img 
                 key={layer.id}
                 src={layer.url}
                 draggable={false}
                 onMouseDown={(e) => handleMouseDown(e, layer.id)}
                 style={{
                   position: 'absolute',
                   left: layer.x,
                   top: layer.y,
                   width: layer.width * layer.scale,
                   height: layer.height * layer.scale,
                   opacity: layer.opacity,
                   cursor: isDragging && selectedId === layer.id ? 'grabbing' : 'grab',
                   outline: selectedId === layer.id ? '2px solid #6366f1' : 'none',
                   outlineOffset: '0px'
                 }}
               />
             ))}
             
             {selectedLayer && (
               <>
                 <DistanceLine x={selectedLayer.x + (selectedLayer.width * selectedLayer.scale)/2} y={0} length={selectedLayer.y} vertical={true} value={selectedLayer.y} />
                 <DistanceLine x={selectedLayer.x + (selectedLayer.width * selectedLayer.scale)/2} y={selectedLayer.y + selectedLayer.height * selectedLayer.scale} length={canvasHeight - (selectedLayer.y + selectedLayer.height * selectedLayer.scale)} vertical={true} value={canvasHeight - (selectedLayer.y + selectedLayer.height * selectedLayer.scale)} />
                 <DistanceLine x={0} y={selectedLayer.y + (selectedLayer.height * selectedLayer.scale)/2} length={selectedLayer.x} vertical={false} value={selectedLayer.x} />
                 <DistanceLine x={selectedLayer.x + selectedLayer.width * selectedLayer.scale} y={selectedLayer.y + (selectedLayer.height * selectedLayer.scale)/2} length={canvasWidth - (selectedLayer.x + selectedLayer.width * selectedLayer.scale)} vertical={false} value={canvasWidth - (selectedLayer.x + selectedLayer.width * selectedLayer.scale)} />
               </>
             )}
          </div>
        </div>

        {/* Right Settings Panel */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.03)]">
          {/* Canvas Size */}
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-800 mb-4 flex items-center justify-between">
               Canvas Size
               {autoCanvasSize && <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Auto</span>}
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium mb-1 block">Width (px)</label>
                <input type="number" value={Math.round(canvasWidth)} onChange={e => { setCanvasWidth(Number(e.target.value)); setAutoCanvasSize(false); }} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium mb-1 block">Height (px)</label>
                <input type="number" value={Math.round(canvasHeight)} onChange={e => { setCanvasHeight(Number(e.target.value)); setAutoCanvasSize(false); }} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
            </div>
          </div>

          {/* Selected Layer Settings */}
          {selectedLayer ? (
            <div className="p-5 border-b border-gray-100 bg-indigo-50/50">
              <h3 className="font-semibold text-sm text-gray-800 mb-4 flex items-center gap-2">
                 <Settings className="w-4 h-4 text-indigo-500"/> Layer Properties
              </h3>
              
              {/* Opacity */}
              <div className="mb-5">
                <label className="text-xs font-medium text-gray-700 flex justify-between mb-2">
                   Opacity <span className="text-indigo-600 font-bold">{Math.round(selectedLayer.opacity * 100)}%</span>
                </label>
                <input type="range" min="0" max="1" step="0.01" value={selectedLayer.opacity} onChange={e => updateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })} className="w-full accent-indigo-600"/>
              </div>
              
              {/* Scale */}
              <div className="mb-5">
                <label className="text-xs font-medium text-gray-700 flex justify-between mb-2">
                   Scale <span className="text-indigo-600 font-bold">{Math.round(selectedLayer.scale * 100)}%</span>
                </label>
                <input type="range" min="0.1" max="5" step="0.05" value={selectedLayer.scale} onChange={e => updateLayer(selectedLayer.id, { scale: parseFloat(e.target.value) })} className="w-full accent-indigo-600"/>
              </div>

              {/* Dimensions (W, H) */}
              <div className="flex gap-3 mb-5">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Width (px)</label>
                  <input type="number" value={Math.round(selectedLayer.width * selectedLayer.scale)} onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) updateLayer(selectedLayer.id, { width: val / selectedLayer.scale });
                  }} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"/>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Height (px)</label>
                  <input type="number" value={Math.round(selectedLayer.height * selectedLayer.scale)} onChange={e => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) updateLayer(selectedLayer.id, { height: val / selectedLayer.scale });
                  }} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"/>
                </div>
              </div>

              {/* Positions */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-2 block">Position Offset (px)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center">
                       <span className="text-[10px] text-gray-400 w-10">Top</span>
                       <input type="number" value={Math.round(selectedLayer.y)} onChange={e => updateLayer(selectedLayer.id, { y: parseFloat(e.target.value) })} className="w-full border border-gray-300 rounded-md p-1.5 text-sm outline-none focus:border-indigo-500 transition-all"/>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                       <span className="text-[10px] text-gray-400 w-10">Bottom</span>
                       <input type="number" value={Math.round(canvasHeight - selectedLayer.y - selectedLayer.height * selectedLayer.scale)} onChange={e => {
                          const bottom = parseFloat(e.target.value);
                          if (!isNaN(bottom)) updateLayer(selectedLayer.id, { y: canvasHeight - bottom - selectedLayer.height * selectedLayer.scale });
                       }} className="w-full border border-gray-300 rounded-md p-1.5 text-sm outline-none focus:border-indigo-500 transition-all"/>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                       <span className="text-[10px] text-gray-400 w-10">Left</span>
                       <input type="number" value={Math.round(selectedLayer.x)} onChange={e => updateLayer(selectedLayer.id, { x: parseFloat(e.target.value) })} className="w-full border border-gray-300 rounded-md p-1.5 text-sm outline-none focus:border-indigo-500 transition-all"/>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center">
                       <span className="text-[10px] text-gray-400 w-10">Right</span>
                       <input type="number" value={Math.round(canvasWidth - selectedLayer.x - selectedLayer.width * selectedLayer.scale)} onChange={e => {
                          const right = parseFloat(e.target.value);
                          if (!isNaN(right)) updateLayer(selectedLayer.id, { x: canvasWidth - right - selectedLayer.width * selectedLayer.scale });
                       }} className="w-full border border-gray-300 rounded-md p-1.5 text-sm outline-none focus:border-indigo-500 transition-all"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 border-b border-gray-100 text-center flex flex-col items-center justify-center bg-gray-50/50">
               <Layers className="w-8 h-8 text-gray-300 mb-2"/>
               <p className="text-sm text-gray-500 font-medium">Select a layer to edit</p>
               <p className="text-xs text-gray-400 mt-1">Click any image on the canvas</p>
            </div>
          )}

          {/* Layers List */}
          <div className="p-5 flex-1 overflow-auto flex flex-col">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-semibold text-sm text-gray-800">Layers stack</h3>
               <label className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors font-medium shadow-sm flex items-center">
                 <Upload className="w-3.5 h-3.5 mr-1.5"/> Add Images
                 <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && handleAddFiles(e.target.files)} />
               </label>
            </div>
            
            {layers.length === 0 ? (
               <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-600">No layers yet</p>
                  <p className="text-xs text-gray-500 mt-1">Drag & Drop or Paste (Ctrl+V)</p>
               </div>
            ) : (
               <div className="flex flex-col-reverse gap-2.5">
                 {layers.map((layer, index) => (
                   <div 
                     key={layer.id} 
                     className={`flex items-center gap-3 p-2.5 border rounded-xl cursor-pointer transition-all ${selectedId === layer.id ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-400' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
                     onClick={() => setSelectedId(layer.id)}
                   >
                     <span className="text-[11px] font-bold text-gray-400 w-4 text-center shrink-0">{index + 1}</span>
                     <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                       <img src={layer.url} alt="" className="max-w-full max-h-full object-contain" />
                     </div>
                     <span className="text-sm truncate flex-1 font-medium text-gray-700" title={layer.name}>{layer.name}</span>
                     
                     <div className="flex flex-col gap-1 shrink-0">
                       <button onClick={(e) => { e.stopPropagation(); moveLayer(index, 1) }} disabled={index === layers.length - 1} className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 hover:bg-gray-100 p-0.5 rounded transition-colors"><ArrowUp className="w-3.5 h-3.5"/></button>
                       <button onClick={(e) => { e.stopPropagation(); moveLayer(index, -1) }} disabled={index === 0} className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 hover:bg-gray-100 p-0.5 rounded transition-colors"><ArrowDown className="w-3.5 h-3.5"/></button>
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id) }} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors shrink-0 ml-1"><Trash2 className="w-4 h-4"/></button>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

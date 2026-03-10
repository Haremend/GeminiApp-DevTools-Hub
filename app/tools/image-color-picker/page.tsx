'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, ZoomIn, ZoomOut, Move, Pipette, Copy, Check, Image as ImageIcon, RefreshCw } from 'lucide-react';

export default function ImageColorPickerTool() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<'pan' | 'pick'>('pick');
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  
  const [copiedHex, setCopiedHex] = useState(false);
  const [copiedRgb, setCopiedRgb] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ scale, offset, image });

  useEffect(() => {
    stateRef.current = { scale, offset, image };
  }, [scale, offset, image]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
      : 'rgb(0, 0, 0)';
  };

  const copyToClipboard = (text: string, type: 'hex' | 'rgb') => {
    navigator.clipboard.writeText(text);
    if (type === 'hex') {
      setCopiedHex(true);
      setTimeout(() => setCopiedHex(false), 2000);
    } else {
      setCopiedRgb(true);
      setTimeout(() => setCopiedRgb(false), 2000);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImage(img);
      const canvas = canvasRef.current;
      if (canvas) {
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        const initialScale = Math.min(scaleX, scaleY, 1);
        setScale(initialScale);
        const offsetX = (canvas.width - img.width * initialScale) / 2;
        const offsetY = (canvas.height - img.height * initialScale) / 2;
        setOffset({ x: offsetX, y: offsetY });
      }
      setPickedColor(null);
      setMode('pick');
    };
    
    e.target.value = '';
  };

  const resetView = () => {
    const canvas = canvasRef.current;
    if (canvas && image) {
      const scaleX = canvas.width / image.width;
      const scaleY = canvas.height / image.height;
      const initialScale = Math.min(scaleX, scaleY, 1);
      setScale(initialScale);
      const offsetX = (canvas.width - image.width * initialScale) / 2;
      const offsetY = (canvas.height - image.height * initialScale) / 2;
      setOffset({ x: offsetX, y: offsetY });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { scale, offset, image } = stateRef.current;
      if (!image) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const zoomFactor = 1.1;
      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = Math.pow(zoomFactor, direction);
      const newScale = Math.max(0.05, Math.min(scale * factor, 50));

      const imageX = (mouseX - offset.x) / scale;
      const imageY = (mouseY - offset.y) / scale;

      const newOffsetX = mouseX - imageX * newScale;
      const newOffsetY = mouseY - imageY * newScale;

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    
    ctx.fillStyle = '#e5e7eb';
    for (let i = 0; i < width; i += 20) {
      for (let j = 0; j < height; j += 20) {
        if ((i / 20 + j / 20) % 2 === 0) {
          ctx.fillRect(i, j, 20, 20);
        }
      }
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < width; i += 20) {
      for (let j = 0; j < height; j += 20) {
        if ((i / 20 + j / 20) % 2 !== 0) {
          ctx.fillRect(i, j, 20, 20);
        }
      }
    }

    ctx.save();
    if (scale > 3) {
      ctx.imageSmoothingEnabled = false;
    } else {
      ctx.imageSmoothingEnabled = true;
    }
    
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }, [image, scale, offset]);

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getColorAt = (canvasX: number, canvasY: number) => {
    const { scale, offset, image } = stateRef.current;
    if (!image) return null;
    
    const imageX = Math.floor((canvasX - offset.x) / scale);
    const imageY = Math.floor((canvasY - offset.y) / scale);

    if (imageX < 0 || imageY < 0 || imageX >= image.width || imageY >= image.height) {
      return null;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = 1;
    offscreen.height = 1;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, imageX, imageY, 1, 1, 0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    
    if (data[3] === 0) return null;

    const hex = '#' + [data[0], data[1], data[2]].map(x => {
      const h = x.toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
    
    return hex;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    if (mode === 'pan') {
      setIsDragging(true);
      setDragStart({ x: coords.x - offset.x, y: coords.y - offset.y });
    } else if (mode === 'pick') {
      const color = getColorAt(coords.x, coords.y);
      if (color) setPickedColor(color);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    
    if (isDragging && mode === 'pan') {
      setOffset({ x: coords.x - dragStart.x, y: coords.y - dragStart.y });
    }

    if (mode === 'pick') {
      const color = getColorAt(coords.x, coords.y);
      setHoverColor(color);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Image Color Picker</h1>
        <p className="mt-2 text-gray-600">Upload an image and pick colors directly from it. Images are processed locally in your browser.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {!image ? (
            <div className="w-full h-[500px] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">Click or drag image to upload</p>
              <p className="text-sm text-gray-500 mt-1">Supports PNG, JPG, WEBP</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-200 gap-4">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setMode('pick')}
                    className={`p-2 rounded-lg flex items-center space-x-2 transition-colors ${mode === 'pick' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Pipette className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">Pick Color</span>
                  </button>
                  <button 
                    onClick={() => setMode('pan')}
                    className={`p-2 rounded-lg flex items-center space-x-2 transition-colors ${mode === 'pan' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Move className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">Pan Image</span>
                  </button>
                </div>
                <div className="flex items-center space-x-2 sm:border-l border-gray-200 sm:pl-4">
                  <button onClick={() => setScale(s => s * 1.2)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Zoom In">
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button onClick={() => setScale(s => s / 1.2)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Zoom Out">
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button onClick={resetView} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Reset View">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <div className="relative overflow-hidden ml-2">
                    <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center space-x-1">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-sm font-medium hidden sm:inline">New Image</span>
                    </button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="relative w-full h-[500px] bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={500}
                  className={`w-full h-full ${mode === 'pan' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => {
                    setIsDragging(false);
                    setHoverColor(null);
                  }}
                />
                {mode === 'pick' && hoverColor && (
                  <div className="absolute top-4 left-4 bg-white p-2 rounded-lg shadow-lg border border-gray-200 flex items-center space-x-3 pointer-events-none">
                    <div className="w-8 h-8 rounded-md border border-gray-200 shadow-inner" style={{ backgroundColor: hoverColor }} />
                    <span className="font-mono text-sm text-gray-700">{hoverColor.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Picked Color</h3>
            
            {pickedColor ? (
              <div className="space-y-6">
                <div 
                  className="w-full h-32 rounded-xl border border-gray-200 shadow-inner flex items-center justify-center transition-colors duration-200"
                  style={{ backgroundColor: pickedColor }}
                >
                  <div className={`px-4 py-2 rounded-lg backdrop-blur-md bg-white/30 ${
                    parseInt(pickedColor.replace('#', ''), 16) > 0xffffff / 2 ? 'text-gray-900' : 'text-white'
                  }`}>
                    <span className="font-bold text-xl tracking-wider">{pickedColor.toUpperCase()}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HEX</label>
                    <div className="flex mt-1 rounded-md shadow-sm">
                      <input
                        type="text"
                        readOnly
                        value={pickedColor.toUpperCase()}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border border-gray-300 bg-gray-50 font-mono text-gray-900 focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(pickedColor.toUpperCase(), 'hex')}
                        className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        {copiedHex ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">RGB</label>
                    <div className="flex mt-1 rounded-md shadow-sm">
                      <input
                        type="text"
                        readOnly
                        value={hexToRgb(pickedColor)}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border border-gray-300 bg-gray-50 font-mono text-gray-900 focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(hexToRgb(pickedColor), 'rgb')}
                        className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        {copiedRgb ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 text-gray-400 text-sm text-center px-4">
                {image ? "Click anywhere on the image to pick a color" : "Upload an image first"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

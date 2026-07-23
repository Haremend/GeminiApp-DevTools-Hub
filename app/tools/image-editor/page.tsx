'use client';

import { Image as ImageIcon, Download, Trash2, Pen, Square, Circle, ArrowRight, Type, Grid } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';

type Tool = 'brush' | 'rect' | 'circle' | 'arrow' | 'text' | 'mosaic';

export default function ImageEditorTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ff0000'); // Default color is red
  const [brushSize, setBrushSize] = useState(5);
  const [currentTool, setCurrentTool] = useState<Tool>('brush');

  // Text input state
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, text: '' });
  const textInputRef = useRef<HTMLInputElement>(null);

  const savedImageData = useRef<ImageData | null>(null);
  const startPos = useRef<{x: number, y: number}>({x: 0, y: 0});
  const lastPos = useRef<{x: number, y: number}>({x: 0, y: 0});

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const { width, height } = container.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      let imgData = null;
      
      if (canvas.width > 0 && canvas.height > 0 && ctx) {
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        if (imgData) {
          ctx.putImageData(imgData, 0, 0);
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const drawImageProportionally = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Calculate scale to fit image within canvas with some padding (e.g., 90% max)
    const padding = 0.9;
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;
    
    let renderWidth = img.width;
    let renderHeight = img.height;

    if (img.width > canvas.width * padding || img.height > canvas.height * padding) {
      if (canvasRatio > imgRatio) {
        // Fit by height
        renderHeight = canvas.height * padding;
        renderWidth = img.width * (renderHeight / img.height);
      } else {
        // Fit by width
        renderWidth = canvas.width * padding;
        renderHeight = img.height * (renderWidth / img.width);
      }
    }

    const x = (canvas.width - renderWidth) / 2;
    const y = (canvas.height - renderHeight) / 2;
    
    ctx.drawImage(img, x, y, renderWidth, renderHeight);
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;
          
          const img = new Image();
          img.onload = () => {
            drawImageProportionally(img);
          };
          img.src = URL.createObjectURL(blob);
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [drawImageProportionally]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.visible) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && textInput.text.trim() !== '') {
      ctx.font = `${brushSize * 4 + 10}px sans-serif`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      ctx.fillText(textInput.text, textInput.x, textInput.y);
    }
    
    setTextInput({ visible: false, x: 0, y: 0, text: '' });
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (textInput.visible) {
      handleTextSubmit();
      return;
    }

    if (currentTool === 'text') {
      setTextInput({
        visible: true,
        x: coords.x,
        y: coords.y,
        text: ''
      });
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    setIsDrawing(true);
    startPos.current = coords;
    lastPos.current = coords;
    savedImageData.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (currentTool === 'brush') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    } else if (currentTool === 'mosaic') {
      applyMosaic(coords.x, coords.y);
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentTool === 'brush') {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.closePath();
    }
    setIsDrawing(false);
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headlen = brushSize * 3 + 5; 
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const applyMosaic = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const size = brushSize * 4 + 20; 
    const half = Math.floor(size / 2);
    const blockSize = Math.max(8, Math.floor(brushSize * 1.5));
    
    const startX = Math.floor(x - half);
    const startY = Math.floor(y - half);
    
    try {
      const imgData = ctx.getImageData(startX, startY, size, size);
      const data = imgData.data;

      for (let bx = 0; bx < size; bx += blockSize) {
        for (let by = 0; by < size; by += blockSize) {
          const i = ((by * size) + bx) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          if (a > 0) {
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(startX + bx, startY + by, blockSize, blockSize);
          }
        }
      }
    } catch (e) {
      // Ignore if out of bounds
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    if (currentTool === 'brush') {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      lastPos.current = coords;
    } else if (currentTool === 'mosaic') {
      applyMosaic(coords.x, coords.y);
    } else {
      if (savedImageData.current) {
        ctx.putImageData(savedImageData.current, 0, 0);
      }
      
      const startX = startPos.current.x;
      const startY = startPos.current.y;

      if (currentTool === 'rect') {
        ctx.beginPath();
        ctx.rect(startX, startY, coords.x - startX, coords.y - startY);
        ctx.stroke();
      } else if (currentTool === 'circle') {
        ctx.beginPath();
        const radius = Math.sqrt(Math.pow(coords.x - startX, 2) + Math.pow(coords.y - startY, 2));
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (currentTool === 'arrow') {
        drawArrow(ctx, startX, startY, coords.x, coords.y);
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (textInput.visible) {
      handleTextSubmit();
    }
    
    // Slight delay to allow text to render if it was just submitted
    setTimeout(() => {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'edited-image.png';
      a.click();
    }, 100);
  };

  const ToolButton = ({ icon: Icon, tool, label }: { icon: any, tool: Tool, label: string }) => (
    <button
      onClick={() => setCurrentTool(tool)}
      className={`p-2 rounded-md transition-colors ${currentTool === tool ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden relative">
      <header className="h-auto py-2 sm:h-14 sm:py-0 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between px-4 bg-white shrink-0 shadow-sm z-20 gap-3 sm:gap-0">
        <div className="flex items-center gap-2 lg:gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600 hidden sm:block" />
            <h1 className="font-bold text-gray-800 text-base lg:text-lg">Image Editor</h1>
          </div>
          
          <div className="h-6 w-px bg-gray-200 mx-1 lg:mx-2 hidden sm:block"></div>
          
          <div className="flex items-center gap-1">
            <ToolButton icon={Pen} tool="brush" label="Brush" />
            <ToolButton icon={Square} tool="rect" label="Rectangle" />
            <ToolButton icon={Circle} tool="circle" label="Circle" />
            <ToolButton icon={ArrowRight} tool="arrow" label="Arrow" />
            <ToolButton icon={Type} tool="text" label="Text" />
            <ToolButton icon={Grid} tool="mosaic" label="Mosaic" />
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-md flex-1 sm:flex-none justify-center">
            <input 
              type="color" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
              title="Color"
            />
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24 sm:w-20 cursor-pointer"
              title="Size"
            />
          </div>
          
          <button 
            onClick={clearCanvas}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Clear Canvas"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          
          <button 
            onClick={downloadImage}
            className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 relative isolate min-h-0 overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="absolute inset-0 touch-none"
        />
        
        {textInput.visible && (
          <input
            ref={textInputRef}
            type="text"
            value={textInput.text}
            onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTextSubmit();
              }
            }}
            onBlur={handleTextSubmit}
            style={{
              position: 'absolute',
              left: `${textInput.x}px`,
              top: `${textInput.y}px`,
              transform: 'translateY(-50%)',
              color: color,
              fontSize: `${brushSize * 4 + 10}px`,
              background: 'transparent',
              border: '1px dashed #ccc',
              outline: 'none',
              padding: '2px',
              minWidth: '100px',
              zIndex: 30
            }}
            placeholder="Type here..."
          />
        )}
      </div>
    </div>
  );
}

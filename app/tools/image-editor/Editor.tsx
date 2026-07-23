'use client';

import { Image as ImageIcon, Download, Trash2, Pen, Square, Circle, ArrowRight, Type, Grid, MousePointer2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';

type Tool = 'select' | 'brush' | 'rect' | 'circle' | 'arrow' | 'text' | 'mosaic';

export default function ImageEditorTool() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [color, setColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(5);
  const [history, setHistory] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  // We need to keep a reference to current drawing object (rect, circle, arrow)
  const drawingObjectRef = useRef<fabric.Object | null>(null);
  const startPosRef = useRef<{x: number, y: number} | null>(null);
  const isDrawingRef = useRef(false);
  const isUndoingRef = useRef(false);

  const saveHistory = useCallback(() => {
    if (canvasRef.current && !isUndoingRef.current) {
      const json = JSON.stringify(canvasRef.current.toJSON());
      setHistory(prev => {
        // Don't save if it's identical to the last state
        if (prev.length > 0 && prev[prev.length - 1] === json) {
          return prev;
        }
        return [...prev, json];
      });
    }
  }, []);

  const undo = () => {
    if (history.length > 1 && canvasRef.current) {
      isUndoingRef.current = true;
      const newHistory = history.slice(0, -1);
      const prev = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      
      canvasRef.current.loadFromJSON(prev, () => {
        canvasRef.current?.renderAll();
        isUndoingRef.current = false;
      });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    const { width, height } = containerRef.current.getBoundingClientRect();
    
    const canvas = new fabric.Canvas('editor-canvas', {
      width,
      height,
      backgroundColor: '#f9fafb',
      preserveObjectStacking: true,
      selection: true,
    });
    
    canvasRef.current = canvas;
    setIsReady(true);
    
    // Save initial history
    saveHistory();

    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.setWidth(width);
        canvasRef.current.setHeight(height);
        canvasRef.current.renderAll();
      }
    };
    window.addEventListener('resize', handleResize);

    // Track modifications for undo
    canvas.on('object:modified', saveHistory);
    canvas.on('object:added', (e) => {
      if (isDrawingRef.current || isUndoingRef.current) return; 
      if (e.target?.type === 'path') return; // Brush paths trigger 'path:created'
      saveHistory();
    });
    canvas.on('path:created', saveHistory); 
    canvas.on('object:removed', saveHistory);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [saveHistory]);

  // Update canvas state when tool or color changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady) return;

    if (currentTool === 'brush') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
    } else if (currentTool === 'mosaic') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = 'rgba(150, 150, 150, 0.9)'; // Thick redaction line
      canvas.freeDrawingBrush.width = Math.max(brushSize * 6, 20);
    } else {
      canvas.isDrawingMode = false;
    }

    const isSelectable = currentTool === 'select';
    canvas.selection = isSelectable;
    canvas.forEachObject(obj => {
      obj.selectable = isSelectable;
      obj.evented = isSelectable;
    });
    
    canvas.renderAll();
  }, [currentTool, color, brushSize, isReady]);

  // Handle shape drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady) return;

    const handleMouseDown = (o: fabric.IEvent) => {
      if (currentTool === 'select' || currentTool === 'brush' || currentTool === 'mosaic') return;
      
      const pointer = canvas.getPointer(o.e);
      isDrawingRef.current = true;
      startPosRef.current = { x: pointer.x, y: pointer.y };

      if (currentTool === 'text') {
        const text = new fabric.IText('Text', {
          left: pointer.x,
          top: pointer.y,
          fill: color,
          fontSize: brushSize * 4 + 14,
          fontFamily: 'sans-serif',
          selectable: true,
          evented: true
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        saveHistory();
        setCurrentTool('select'); 
        isDrawingRef.current = false;
        return;
      }

      if (currentTool === 'rect') {
        const rect = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: color,
          strokeWidth: brushSize,
          selectable: false,
          evented: false
        });
        canvas.add(rect);
        drawingObjectRef.current = rect;
      } else if (currentTool === 'circle') {
        const circle = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: 'transparent',
          stroke: color,
          strokeWidth: brushSize,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center'
        });
        canvas.add(circle);
        drawingObjectRef.current = circle;
      } else if (currentTool === 'arrow') {
        const points = [pointer.x, pointer.y, pointer.x, pointer.y];
        const line = new fabric.Line(points, {
          strokeWidth: brushSize,
          fill: color,
          stroke: color,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false
        });
        const triangle = new fabric.Triangle({
          width: brushSize * 3 + 5,
          height: brushSize * 3 + 5,
          fill: color,
          left: pointer.x,
          top: pointer.y,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          angle: 90
        });
        const group = new fabric.Group([line, triangle], {
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
          left: pointer.x,
          top: pointer.y
        });
        canvas.add(group);
        drawingObjectRef.current = group;
      }
    };

    const handleMouseMove = (o: fabric.IEvent) => {
      if (!isDrawingRef.current || !drawingObjectRef.current || !startPosRef.current) return;
      
      const pointer = canvas.getPointer(o.e);
      const startPos = startPosRef.current;
      const obj = drawingObjectRef.current;

      if (currentTool === 'rect') {
        const rect = obj as fabric.Rect;
        rect.set({
          width: Math.abs(pointer.x - startPos.x),
          height: Math.abs(pointer.y - startPos.y),
          left: Math.min(pointer.x, startPos.x),
          top: Math.min(pointer.y, startPos.y)
        });
      } else if (currentTool === 'circle') {
        const circle = obj as fabric.Circle;
        const radius = Math.sqrt(Math.pow(pointer.x - startPos.x, 2) + Math.pow(pointer.y - startPos.y, 2));
        circle.set({ radius });
      } else if (currentTool === 'arrow') {
        const group = obj as fabric.Group;
        const line = group.item(0) as fabric.Line;
        const triangle = group.item(1) as fabric.Triangle;

        const dx = pointer.x - startPos.x;
        const dy = pointer.y - startPos.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        line.set({ x1: startPos.x, y1: startPos.y, x2: pointer.x, y2: pointer.y });
        triangle.set({ left: pointer.x, top: pointer.y, angle: angle + 90 });
        
        group.removeWithUpdate(line);
        group.removeWithUpdate(triangle);
        
        const newGroup = new fabric.Group([line, triangle], {
          selectable: false,
          evented: false
        });
        
        canvas.remove(group);
        canvas.add(newGroup);
        drawingObjectRef.current = newGroup;
      }
      
      canvas.renderAll();
    };

    const handleMouseUp = () => {
      if (isDrawingRef.current && drawingObjectRef.current) {
        drawingObjectRef.current.set({ selectable: true, evented: true });
        drawingObjectRef.current.setCoords();
        
        // Disable drawing state before saving history
        isDrawingRef.current = false;
        saveHistory();
      }
      isDrawingRef.current = false;
      drawingObjectRef.current = null;
      startPosRef.current = null;
      
      if (currentTool !== 'select' && currentTool !== 'brush' && currentTool !== 'mosaic' && currentTool !== 'text') {
        setCurrentTool('select');
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [currentTool, color, brushSize, isReady, saveHistory]);

  // Handle Paste
  useEffect(() => {
    if (!isReady) return;
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData || !canvasRef.current) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;
          
          const reader = new FileReader();
          reader.onload = (f) => {
            const data = f.target?.result as string;
            fabric.Image.fromURL(data, (img) => {
              const canvas = canvasRef.current;
              if (!canvas) return;

              // Proportional scale to fit canvas if needed
              const padding = 0.8;
              if (img.width! > canvas.width! * padding || img.height! > canvas.height! * padding) {
                const scale = Math.min(
                  (canvas.width! * padding) / img.width!,
                  (canvas.height! * padding) / img.height!
                );
                img.scale(scale);
              }

              canvas.centerObject(img);
              canvas.add(img);
              canvas.setActiveObject(img);
              setCurrentTool('select');
              saveHistory();
            });
          };
          reader.readAsDataURL(blob);
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isReady, saveHistory]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && canvasRef.current) {
      const activeObjects = canvasRef.current.getActiveObjects();
      if (activeObjects.length > 0) {
        // Prevent deleting if we are typing text
        const activeObj = canvasRef.current.getActiveObject();
        if (activeObj && activeObj.type === 'i-text' && (activeObj as fabric.IText).isEditing) {
          return;
        }
        
        activeObjects.forEach(obj => {
          canvasRef.current?.remove(obj);
        });
        canvasRef.current.discardActiveObject();
        saveHistory();
      }
    }
  }, [saveHistory]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);


  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#f9fafb';
      canvas.renderAll();
      saveHistory();
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Deselect objects to remove selection borders before saving
    canvas.discardActiveObject();
    canvas.renderAll();
    
    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1 // Can increase for higher res
    });
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'edited-image.png';
    a.click();
  };

  const ToolButton = ({ icon: Icon, tool, label }: { icon: any, tool: Tool, label: string }) => (
    <button
      onClick={() => setCurrentTool(tool)}
      className={`p-2 rounded-md transition-colors flex items-center justify-center ${currentTool === tool ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
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
          
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <ToolButton icon={MousePointer2} tool="select" label="Select & Move" />
            <ToolButton icon={Pen} tool="brush" label="Brush" />
            <ToolButton icon={Square} tool="rect" label="Rectangle" />
            <ToolButton icon={Circle} tool="circle" label="Circle" />
            <ToolButton icon={ArrowRight} tool="arrow" label="Arrow" />
            <ToolButton icon={Type} tool="text" label="Text" />
            <ToolButton icon={Grid} tool="mosaic" label="Mosaic / Redact" />
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button 
            onClick={undo}
            disabled={history.length <= 1}
            className={`p-2 rounded-md transition-colors ${history.length <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'}`}
            title="Undo"
          >
            <Undo2 className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-gray-200 mx-1"></div>

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

      <div ref={containerRef} className="flex-1 relative isolate min-h-0 overflow-hidden bg-gray-200 flex justify-center items-center">
        <canvas id="editor-canvas" className="absolute inset-0" />
      </div>
    </div>
  );
}

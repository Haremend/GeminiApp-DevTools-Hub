'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutGrid,
  Upload,
  Download,
  Copy,
  Trash2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  Plus,
  Check,
  Sparkles,
  Layers,
  Columns,
  Rows,
  Grid2X2,
  ArrowUpDown,
  MoveHorizontal,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';

interface AppendImage {
  id: string;
  name: string;
  src: string;
  imgElement: HTMLImageElement;
  origWidth: number;
  origHeight: number;
  customWidth: number;
  customHeight: number;
  lockAspectRatio: boolean;
  row: number; // 0-indexed
  col: number; // 0-indexed
}

type LayoutPreset = 'horizontal' | 'vertical' | 'grid2x2' | 'custom';
type BackgroundType = 'transparent' | 'white' | 'gray' | 'dark' | 'custom';

export default function PictureAppendPage() {
  const [images, setImages] = useState<AppendImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Grid configuration
  const [gridRows, setGridRows] = useState(1);
  const [gridCols, setGridCols] = useState(2);
  const [gap, setGap] = useState(0); // 0px for seamless flush edge snap
  const [padding, setPadding] = useState(0); // Outer canvas padding
  const [alignMode, setAlignMode] = useState<'start' | 'center' | 'end'>('start');
  const [showCellBorders, setShowCellBorders] = useState(false);
  const [borderColor, setBorderColor] = useState('#E2E8F0');
  
  // Background
  const [bgType, setBgType] = useState<BackgroundType>('white');
  const [customBgColor, setCustomBgColor] = useState('#FFFFFF');
  
  // Canvas viewport navigation
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Canvas & container refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  // Compute total grid dimensions needed based on image placements
  const { maxRow, maxCol } = useMemo(() => {
    let r = gridRows - 1;
    let c = gridCols - 1;
    images.forEach(img => {
      if (img.row > r) r = img.row;
      if (img.col > c) c = img.col;
    });
    return { maxRow: Math.max(r + 1, gridRows), maxCol: Math.max(c + 1, gridCols) };
  }, [images, gridRows, gridCols]);

  // Load an image file or blob into our collection
  const addImageFromSource = useCallback((name: string, src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImages(prev => {
        // Find the first empty cell in row-major order
        let nextRow = 0;
        let nextCol = 0;
        let placed = false;

        const maxC = Math.max(gridCols, 1);
        for (let r = 0; r < 20; r++) {
          for (let c = 0; c < maxC; c++) {
            const occupied = prev.some(item => item.row === r && item.col === c);
            if (!occupied) {
              nextRow = r;
              nextCol = c;
              placed = true;
              break;
            }
          }
          if (placed) break;
        }

        // If not placed within standard bounds, put next to the last one
        if (!placed) {
          nextRow = 0;
          nextCol = prev.length;
        }

        const newImg: AppendImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: name || `Image ${prev.length + 1}`,
          src,
          imgElement: img,
          origWidth: img.naturalWidth || 800,
          origHeight: img.naturalHeight || 600,
          customWidth: img.naturalWidth || 800,
          customHeight: img.naturalHeight || 600,
          lockAspectRatio: true,
          row: nextRow,
          col: nextCol,
        };

        const updated = [...prev, newImg];
        // Automatically expand grid columns or rows if needed
        if (nextCol >= gridCols) {
          setGridCols(nextCol + 1);
        }
        if (nextRow >= gridRows) {
          setGridRows(nextRow + 1);
        }
        return updated;
      });
      showToast(`已添加图片：${name}`);
    };
    img.src = src;
  }, [gridCols, gridRows, showToast]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        addImageFromSource(file.name, url);
      }
    });
  }, [addImageFromSource]);

  // Global Clipboard Paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.clipboardData?.items) {
        let pastedAny = false;
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              pastedAny = true;
              const url = URL.createObjectURL(file);
              addImageFromSource(`截图_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`, url);
            }
          }
        }
        if (pastedAny) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addImageFromSource]);

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Layout preset switches
  const applyPreset = (preset: LayoutPreset) => {
    if (preset === 'horizontal') {
      const count = Math.max(images.length, 2);
      setGridRows(1);
      setGridCols(count);
      setImages(prev => prev.map((img, i) => ({ ...img, row: 0, col: i })));
      showToast('已切换为横向并排对比 (1 行多列)');
    } else if (preset === 'vertical') {
      const count = Math.max(images.length, 2);
      setGridRows(count);
      setGridCols(1);
      setImages(prev => prev.map((img, i) => ({ ...img, row: i, col: 0 })));
      showToast('已切换为纵向堆叠对比 (多行 1 列)');
    } else if (preset === 'grid2x2') {
      setGridRows(2);
      setGridCols(2);
      setImages(prev => prev.map((img, i) => ({
        ...img,
        row: Math.floor(i / 2),
        col: i % 2,
      })));
      showToast('已切换为 2×2 四宫格布局');
    }
  };

  // Batch alignment: Equalize Heights or Widths
  const alignAllHeights = () => {
    if (images.length === 0) return;
    const targetHeight = images[0].customHeight;
    setImages(prev => prev.map(img => {
      const ratio = img.origWidth / img.origHeight;
      return {
        ...img,
        customHeight: targetHeight,
        customWidth: Math.round(targetHeight * ratio),
      };
    }));
    showToast(`已统一高度为 ${targetHeight}px (保持等比)`);
  };

  const alignAllWidths = () => {
    if (images.length === 0) return;
    const targetWidth = images[0].customWidth;
    setImages(prev => prev.map(img => {
      const ratio = img.origHeight / img.origWidth;
      return {
        ...img,
        customWidth: targetWidth,
        customHeight: Math.round(targetWidth * ratio),
      };
    }));
    showToast(`已统一宽度为 ${targetWidth}px (保持等比)`);
  };

  const resetAllSizes = () => {
    setImages(prev => prev.map(img => ({
      ...img,
      customWidth: img.origWidth,
      customHeight: img.origHeight,
    })));
    showToast('已还原所有图片至原始分辨率');
  };

  // Move image to cell
  const moveImageToCell = (imageId: string, targetRow: number, targetCol: number) => {
    setImages(prev => {
      const current = prev.find(img => img.id === imageId);
      if (!current) return prev;
      
      const occupant = prev.find(img => img.row === targetRow && img.col === targetCol && img.id !== imageId);
      
      return prev.map(img => {
        if (img.id === imageId) {
          return { ...img, row: targetRow, col: targetCol };
        }
        // If cell is occupied, swap with it
        if (occupant && img.id === occupant.id) {
          return { ...img, row: current.row, col: current.col };
        }
        return img;
      });
    });
  };

  // Delete image
  const deleteImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedId === id) setSelectedId(null);
    showToast('已删除图片');
  };

  // Update single image dimensions
  const updateImageDim = (id: string, width?: number, height?: number) => {
    setImages(prev => prev.map(img => {
      if (img.id !== id) return img;
      
      let newW = width !== undefined ? Math.max(1, width) : img.customWidth;
      let newH = height !== undefined ? Math.max(1, height) : img.customHeight;
      
      if (img.lockAspectRatio) {
        const ratio = img.origWidth / img.origHeight;
        if (width !== undefined) {
          newH = Math.round(newW / ratio);
        } else if (height !== undefined) {
          newW = Math.round(newH * ratio);
        }
      }
      return { ...img, customWidth: newW, customHeight: newH };
    }));
  };

  // Toggle single image aspect ratio
  const toggleLockRatio = (id: string) => {
    setImages(prev => prev.map(img => {
      if (img.id !== id) return img;
      return { ...img, lockAspectRatio: !img.lockAspectRatio };
    }));
  };

  // Compute composite layout coordinates and bounding box
  const compositeLayout = useMemo(() => {
    // Determine maximum width for each column and maximum height for each row
    const colWidths = new Array(maxCol).fill(0);
    const rowHeights = new Array(maxRow).fill(0);

    images.forEach(img => {
      if (img.col < maxCol && img.row < maxRow) {
        if (img.customWidth > colWidths[img.col]) {
          colWidths[img.col] = img.customWidth;
        }
        if (img.customHeight > rowHeights[img.row]) {
          rowHeights[img.row] = img.customHeight;
        }
      }
    });

    // Compute column starting X positions
    const colX = new Array(maxCol).fill(0);
    let curX = padding;
    for (let c = 0; c < maxCol; c++) {
      colX[c] = curX;
      curX += colWidths[c] + (c < maxCol - 1 ? gap : 0);
    }
    const totalWidth = curX + padding;

    // Compute row starting Y positions
    const rowY = new Array(maxRow).fill(0);
    let curY = padding;
    for (let r = 0; r < maxRow; r++) {
      rowY[r] = curY;
      curY += rowHeights[r] + (r < maxRow - 1 ? gap : 0);
    }
    const totalHeight = curY + padding;

    // Position each image inside its cell
    const items = images.map(img => {
      const cellX = colX[img.col] || padding;
      const cellY = rowY[img.row] || padding;
      const cellW = colWidths[img.col] || img.customWidth;
      const cellH = rowHeights[img.row] || img.customHeight;

      let drawX = cellX;
      if (alignMode === 'center') {
        drawX = cellX + (cellW - img.customWidth) / 2;
      } else if (alignMode === 'end') {
        drawX = cellX + (cellW - img.customWidth);
      }

      let drawY = cellY;
      if (alignMode === 'center') {
        drawY = cellY + (cellH - img.customHeight) / 2;
      } else if (alignMode === 'end') {
        drawY = cellY + (cellH - img.customHeight);
      }

      return {
        ...img,
        cellX,
        cellY,
        cellW,
        cellH,
        drawX,
        drawY,
      };
    });

    return {
      totalWidth: Math.max(totalWidth, 100),
      totalHeight: Math.max(totalHeight, 100),
      colWidths,
      rowHeights,
      colX,
      rowY,
      items,
    };
  }, [images, maxRow, maxCol, gap, padding, alignMode]);

  // Draw the entire composite onto canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { totalWidth, totalHeight, items, colX, rowY, colWidths, rowHeights } = compositeLayout;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Clear canvas
    ctx.clearRect(0, 0, totalWidth, totalHeight);

    // Render background
    if (bgType !== 'transparent') {
      let bg = '#FFFFFF';
      if (bgType === 'white') bg = '#FFFFFF';
      if (bgType === 'gray') bg = '#F8FAFC';
      if (bgType === 'dark') bg = '#0F172A';
      if (bgType === 'custom') bg = customBgColor;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, totalWidth, totalHeight);
    }

    // Optional cell boundary lines
    if (showCellBorders) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      // Draw grid borders
      for (let r = 0; r < maxRow; r++) {
        for (let c = 0; c < maxCol; c++) {
          const x = colX[c];
          const y = rowY[r];
          const w = colWidths[c];
          const h = rowHeights[r];
          ctx.strokeRect(x, y, w, h);
        }
      }
    }

    // Render each image
    items.forEach(item => {
      try {
        ctx.drawImage(item.imgElement, item.drawX, item.drawY, item.customWidth, item.customHeight);
      } catch (err) {
        console.error('Error drawing image:', err);
      }
    });
  }, [compositeLayout, bgType, customBgColor, showCellBorders, borderColor, maxRow, maxCol]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Fit to screen helper
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { totalWidth, totalHeight } = compositeLayout;
    const contW = containerRef.current.clientWidth - 48;
    const contH = containerRef.current.clientHeight - 48;
    if (contW <= 0 || contH <= 0 || totalWidth <= 0 || totalHeight <= 0) return;

    const scaleW = contW / totalWidth;
    const scaleH = contH / totalHeight;
    const newScale = Math.min(scaleW, scaleH, 1);
    setScale(Math.max(0.1, parseFloat(newScale.toFixed(2))));
    setPan({ x: 0, y: 0 });
  }, [compositeLayout]);

  const hasInitialFittedRef = useRef(false);
  useEffect(() => {
    if (images.length > 0 && !hasInitialFittedRef.current) {
      hasInitialFittedRef.current = true;
      fitToScreen();
    } else if (images.length === 0) {
      hasInitialFittedRef.current = false;
    }
  }, [images.length, fitToScreen]);

  // Mouse pan and zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setScale(prev => Math.min(3, Math.max(0.1, parseFloat((prev + zoomDelta).toFixed(2)))));
  };

  // Export functions
  const handleDownload = (format: 'png' | 'jpeg') => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;

    const link = document.createElement('a');
    link.download = `PictureAppend_${new Date().toISOString().slice(0, 10)}_${Date.now()}.${format}`;
    link.href = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.95 : 1.0);
    link.click();
    showToast(`已导出 ${format.toUpperCase()} 图片`);
  };

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('复制失败：无法生成图片数据');
          return;
        }
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('已复制高清图片至剪贴板，可直接在微信/飞书/Figma中粘贴！');
      }, 'image/png');
    } catch (err) {
      console.error('Clipboard copy error:', err);
      showToast('复制到剪贴板失败，请使用右键另存或直接下载');
    }
  };

  // Load demo mockups for UI comparison audit
  const loadDemoAuditScreens = () => {
    const createMockCanvas = (title: string, subtitle: string, badgeText: string, color: string, w: number, h: number) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return '';

      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);

      // Card Header
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, 56);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(title, 24, 36);

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(badgeText, w - 120, 36);

      // Card Body
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(24, 80, w - 48, 140);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(24, 80, w - 48, 140);

      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(subtitle, 48, 120);

      // Stat bars
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(48, 150, w - 96, 12);
      ctx.fillStyle = color;
      ctx.fillRect(48, 150, (w - 96) * 0.75, 12);

      // Footer specs
      ctx.fillStyle = '#64748B';
      ctx.font = '13px monospace';
      ctx.fillText(`Viewport: ${w} × ${h}px · Audit Timestamp: ${new Date().toLocaleDateString()}`, 24, h - 24);

      return c.toDataURL('image/png');
    };

    const demo1 = createMockCanvas('UI 审计稿 A (设计基准)', '组件状态：默认态 (Default)', 'Figma v2.4', '#4F46E5', 640, 520);
    const demo2 = createMockCanvas('UI 审计稿 B (线上还原)', '组件状态：实测态 (Production)', 'Web Live', '#059669', 640, 520);

    setImages([]);
    setGridRows(1);
    setGridCols(2);
    setGap(0);
    setBgType('white');

    addImageFromSource('设计稿_基准.png', demo1);
    setTimeout(() => {
      addImageFromSource('线上_实测.png', demo2);
    }, 100);
  };

  const selectedImage = images.find(img => img.id === selectedId);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] w-full overflow-hidden bg-gray-100">
      {/* Top Header Bar */}
      <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Picture Append</h1>
              <span className="text-xs text-gray-500 font-normal">多图对比拼接与网格排版</span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block">
              支持剪贴板直接粘贴 (Ctrl+V)，Excel 式表格小格子调整贴合位置
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {images.length === 0 ? (
            <button
              onClick={loadDemoAuditScreens}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>载入对比示例</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setImages([]);
                setSelectedId(null);
                showToast('已清空所有图片');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
              title="清空所有图片"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">清空</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-medium shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>添加图片</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => e.target.files && handleFiles(e.target.files)}
            multiple
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={handleCopyToClipboard}
            disabled={images.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="一键复制到剪贴板，可直接在微信/飞书/Figma中粘贴"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>复制图片</span>
          </button>

          <button
            onClick={() => handleDownload('png')}
            disabled={images.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-medium shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出 PNG</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Left Canvas + Right Inspector */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Interactive Canvas Viewport */}
        <div
          ref={containerRef}
          className="flex-1 bg-gray-100/90 relative overflow-hidden flex items-center justify-center select-none"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Canvas Floating Toolbar */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-gray-200/80 px-2.5 py-1.5 rounded-xl shadow-sm">
            <span className="text-xs text-gray-500 font-mono mr-1">
              {compositeLayout.totalWidth} × {compositeLayout.totalHeight} px
            </span>
            <div className="h-3 w-px bg-gray-200" />
            <button
              onClick={() => setScale(s => Math.max(0.1, parseFloat((s - 0.1).toFixed(2))))}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="缩小"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-gray-700 min-w-[38px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(3, parseFloat((s + 0.1).toFixed(2))))}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fitToScreen}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded text-xs flex items-center gap-0.5 ml-1"
              title="适配屏幕"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
              className="px-1.5 py-0.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded text-xs font-mono"
              title="1:1 原图显示"
            >
              100%
            </button>
          </div>

          {/* Paste / Drop Hint when empty */}
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-gray-800">
                按 <kbd className="px-2 py-0.5 bg-gray-200 rounded text-xs font-mono text-gray-700">Ctrl + V</kbd> 粘贴截图
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                或直接拖拽图片文件到画布中。粘贴的图片会自动进行边缘贴合，并通过右侧 Excel 类似网格进行精准位置布局。
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={loadDemoAuditScreens}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors"
                >
                  载入示例对比图
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-medium shadow-sm transition-colors"
                >
                  选择本地图片
                </button>
              </div>
            </div>
          ) : (
            /* Canvas Wrapper with Zoom & Pan */
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.05s ease-out',
              }}
              className="relative shadow-2xl rounded-sm cursor-grab active:cursor-grabbing"
            >
              {/* Checkerboard backdrop for transparent view */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    bgType === 'transparent'
                      ? 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)'
                      : 'none',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              />
              <canvas
                ref={canvasRef}
                className="relative block"
              />
            </div>
          )}
        </div>

        {/* Right Side: Excel-like Grid Controller & Inspector */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white flex flex-col h-auto lg:h-full overflow-y-auto shrink-0 divide-y divide-gray-100">
          
          {/* Section 1: Excel-like Grid Layout Manager */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-gray-900">Excel 式网格槽位排版</h2>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">
                {maxRow} 行 × {maxCol} 列
              </span>
            </div>

            {/* Quick Layout Presets */}
            <div className="grid grid-cols-3 gap-2 mb-3.5">
              <button
                onClick={() => applyPreset('horizontal')}
                className="px-2 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-xs text-gray-700 flex items-center justify-center gap-1 transition-colors"
                title="横向并排贴合 (1行多列)"
              >
                <Columns className="w-3.5 h-3.5 text-indigo-600" />
                <span>横向并排</span>
              </button>
              <button
                onClick={() => applyPreset('vertical')}
                className="px-2 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-xs text-gray-700 flex items-center justify-center gap-1 transition-colors"
                title="纵向堆叠贴合 (多行1列)"
              >
                <Rows className="w-3.5 h-3.5 text-indigo-600" />
                <span>纵向堆叠</span>
              </button>
              <button
                onClick={() => applyPreset('grid2x2')}
                className="px-2 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-xs text-gray-700 flex items-center justify-center gap-1 transition-colors"
                title="2×2 宫格对比"
              >
                <Grid2X2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>2×2 宫格</span>
              </button>
            </div>

            {/* Excel Spreadsheet-like Grid View */}
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50/50 shadow-inner">
              {/* Column Headers (A, B, C...) */}
              <div className="flex border-b border-gray-300 bg-gray-100 text-[11px] font-mono text-gray-600 font-semibold">
                <div className="w-8 shrink-0 py-1 text-center border-r border-gray-300 bg-gray-200/80">#</div>
                {Array.from({ length: maxCol }).map((_, c) => (
                  <div key={c} className="flex-1 py-1 text-center border-r last:border-r-0 border-gray-300">
                    {String.fromCharCode(65 + c)}
                  </div>
                ))}
              </div>

              {/* Rows (1, 2, 3...) */}
              {Array.from({ length: maxRow }).map((_, r) => (
                <div key={r} className="flex border-b last:border-b-0 border-gray-300 min-h-[52px]">
                  {/* Row Index Header */}
                  <div className="w-8 shrink-0 bg-gray-100 flex items-center justify-center font-mono text-[11px] font-semibold text-gray-600 border-r border-gray-300">
                    {r + 1}
                  </div>

                  {/* Grid Cells */}
                  {Array.from({ length: maxCol }).map((_, c) => {
                    const cellImg = images.find(img => img.row === r && img.col === c);
                    const isSelected = cellImg && cellImg.id === selectedId;

                    return (
                      <div
                        key={c}
                        onClick={() => {
                          if (cellImg) {
                            setSelectedId(cellImg.id);
                          } else if (selectedId) {
                            // Move currently selected image to this empty cell
                            moveImageToCell(selectedId, r, c);
                          }
                        }}
                        className={`flex-1 p-1 border-r last:border-r-0 border-gray-300 flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                          cellImg
                            ? isSelected
                              ? 'bg-indigo-100/90 border-indigo-400 ring-2 ring-indigo-500 ring-inset'
                              : 'bg-white hover:bg-indigo-50/50'
                            : 'bg-gray-50/40 hover:bg-gray-100/70 border-dashed'
                        }`}
                        title={cellImg ? `位置 [${String.fromCharCode(65 + c)}${r + 1}]: ${cellImg.name}` : `空槽位 [${String.fromCharCode(65 + c)}${r + 1}] - 点击移动选中的图片到此处`}
                      >
                        {cellImg ? (
                          <div className="w-full flex items-center gap-1.5 px-1 py-0.5">
                            {/* Tiny Thumbnail */}
                            <img
                              src={cellImg.src}
                              alt={cellImg.name}
                              className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0"
                            />
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-[11px] font-medium text-gray-900 truncate">
                                {cellImg.name}
                              </p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                {cellImg.customWidth}×{cellImg.customHeight}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <span>{String.fromCharCode(65 + c)}{r + 1}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Grid dimension adjusters */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2.5">
              <span>网格规格：</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span>行数:</span>
                  <button
                    onClick={() => setGridRows(r => Math.max(1, r - 1))}
                    className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="font-mono text-gray-800">{gridRows}</span>
                  <button
                    onClick={() => setGridRows(r => r + 1)}
                    className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span>列数:</span>
                  <button
                    onClick={() => setGridCols(c => Math.max(1, c - 1))}
                    className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="font-mono text-gray-800">{gridCols}</span>
                  <button
                    onClick={() => setGridCols(c => c + 1)}
                    className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Selected Image Resolution & Dimension Tuning */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span>图片分辨率数值调节</span>
              </h3>
              {selectedImage && (
                <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                  {String.fromCharCode(65 + selectedImage.col)}{selectedImage.row + 1} 槽位
                </span>
              )}
            </div>

            {selectedImage ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <img
                    src={selectedImage.src}
                    alt={selectedImage.name}
                    className="w-10 h-10 rounded-lg object-cover border border-gray-300 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {selectedImage.name}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      原图尺寸: {selectedImage.origWidth} × {selectedImage.origHeight} px
                    </p>
                  </div>
                  <button
                    onClick={() => deleteImage(selectedImage.id)}
                    className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                    title="删除此图"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Dimension Inputs */}
                <div className="grid grid-cols-2 gap-2.5 items-center">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      宽度 (Width px)
                    </label>
                    <input
                      type="number"
                      value={selectedImage.customWidth}
                      onChange={e => updateImageDim(selectedImage.id, parseInt(e.target.value) || 1, undefined)}
                      min={10}
                      step={10}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      高度 (Height px)
                    </label>
                    <input
                      type="number"
                      value={selectedImage.customHeight}
                      onChange={e => updateImageDim(selectedImage.id, undefined, parseInt(e.target.value) || 1)}
                      min={10}
                      step={10}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* Ratio Lock & Presets */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => toggleLockRatio(selectedImage.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      selectedImage.lockAspectRatio
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {selectedImage.lockAspectRatio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{selectedImage.lockAspectRatio ? '等比锁定开启' : '自由拉伸比例'}</span>
                  </button>

                  <div className="flex gap-1">
                    <button
                      onClick={() => updateImageDim(selectedImage.id, selectedImage.origWidth, selectedImage.origHeight)}
                      className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-100 rounded text-xs text-gray-700 font-mono"
                      title="重置为原图 100% 原始尺寸"
                    >
                      100%
                    </button>
                    <button
                      onClick={() => updateImageDim(selectedImage.id, Math.round(selectedImage.origWidth * 0.5), Math.round(selectedImage.origHeight * 0.5))}
                      className="px-2 py-1 bg-white border border-gray-200 hover:bg-gray-100 rounded text-xs text-gray-700 font-mono"
                      title="缩放为 50%"
                    >
                      50%
                    </button>
                  </div>
                </div>

                {/* Cell Position Selector */}
                <div className="flex items-center justify-between pt-1 text-xs text-gray-600 border-t border-gray-200/60">
                  <span>移动至小格子:</span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={`${selectedImage.row},${selectedImage.col}`}
                      onChange={e => {
                        const [r, c] = e.target.value.split(',').map(Number);
                        moveImageToCell(selectedImage.id, r, c);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded font-mono text-xs bg-white text-gray-800"
                    >
                      {Array.from({ length: maxRow }).map((_, r) =>
                        Array.from({ length: maxCol }).map((_, c) => (
                          <option key={`${r}-${c}`} value={`${r},${c}`}>
                            {String.fromCharCode(65 + c)}{r + 1} ({r === selectedImage.row && c === selectedImage.col ? '当前' : '槽位'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                点击上方 Excel 网格中的图片，可针对单张图片精确调整分辨率与长宽数值
              </div>
            )}

            {/* Batch Equalize Operations */}
            <div className="mt-3.5 space-y-2">
              <span className="text-[11px] font-medium text-gray-500 block">批量尺寸对齐工具：</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={alignAllHeights}
                  disabled={images.length === 0}
                  className="px-2.5 py-1.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg text-xs font-medium text-gray-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  title="自动缩放所有图片，使其高度均等于第一张图片，保证水平贴合整齐"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>统一等高 (横排推荐)</span>
                </button>
                <button
                  onClick={alignAllWidths}
                  disabled={images.length === 0}
                  className="px-2.5 py-1.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg text-xs font-medium text-gray-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  title="自动缩放所有图片，使其宽度均等于第一张图片，保证垂直贴合整齐"
                >
                  <MoveHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>统一等宽 (竖排推荐)</span>
                </button>
              </div>
              <button
                onClick={resetAllSizes}
                disabled={images.length === 0}
                className="w-full py-1 text-center text-[11px] text-gray-500 hover:text-gray-700 hover:underline transition-colors disabled:opacity-40"
              >
                还原所有图片至原始分辨率
              </button>
            </div>
          </div>

          {/* Section 3: Canvas Background & Border Styling */}
          <div className="p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">画布背景与贴合间隙</h3>

            {/* Background selection */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">背景模式</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setBgType('white')}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    bgType === 'white'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  纯白
                </button>
                <button
                  onClick={() => setBgType('transparent')}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    bgType === 'transparent'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  透明
                </button>
                <button
                  onClick={() => setBgType('gray')}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    bgType === 'gray'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  浅灰
                </button>
                <button
                  onClick={() => setBgType('dark')}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    bgType === 'dark'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  深黑
                </button>
              </div>

              {/* Custom background color */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={customBgColor}
                  onChange={e => {
                    setCustomBgColor(e.target.value);
                    setBgType('custom');
                  }}
                  className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0.5 bg-white"
                />
                <span className="text-xs text-gray-500">自定义颜色:</span>
                <input
                  type="text"
                  value={customBgColor}
                  onChange={e => {
                    setCustomBgColor(e.target.value);
                    setBgType('custom');
                  }}
                  className="w-24 px-2 py-0.5 text-xs font-mono border border-gray-300 rounded"
                />
              </div>
            </div>

            {/* Gap & Padding Controls */}
            <div className="space-y-3 pt-1 border-t border-gray-100">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-600">图片间距 (Gap)</span>
                  <span className="font-mono text-gray-800 font-semibold">{gap} px {gap === 0 && '(无缝边缘贴合)'}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={48}
                  step={2}
                  value={gap}
                  onChange={e => setGap(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-600">画布外边距 (Padding)</span>
                  <span className="font-mono text-gray-800 font-semibold">{padding} px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={64}
                  step={4}
                  value={padding}
                  onChange={e => setPadding(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Edge Divider border */}
              <div className="flex items-center justify-between pt-1">
                <label className="text-xs text-gray-700 font-medium flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCellBorders}
                    onChange={e => setShowCellBorders(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                  />
                  <span>显示网格单元格分割线</span>
                </label>
                {showCellBorders && (
                  <input
                    type="color"
                    value={borderColor}
                    onChange={e => setBorderColor(e.target.value)}
                    className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0 bg-white"
                    title="分割线颜色"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Export Summary & Info */}
          <div className="p-4 sm:p-5 mt-auto bg-gray-50/70 border-t border-gray-200">
            <div className="text-xs text-gray-500 space-y-1 mb-3">
              <div className="flex justify-between">
                <span>拼接图片数量:</span>
                <span className="font-mono text-gray-900 font-medium">{images.length} 张</span>
              </div>
              <div className="flex justify-between">
                <span>最终画布尺寸:</span>
                <span className="font-mono text-gray-900 font-medium">{compositeLayout.totalWidth} × {compositeLayout.totalHeight} px</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyToClipboard}
                disabled={images.length === 0}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-40"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>复制到剪贴板</span>
              </button>
              <button
                onClick={() => handleDownload('png')}
                disabled={images.length === 0}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>导出完整原图</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2 pointer-events-none transition-all">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

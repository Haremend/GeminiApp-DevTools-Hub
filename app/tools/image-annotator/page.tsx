'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Trash2,
  Undo2,
  Download,
  Image as ImageIcon,
  X,
  AlignLeft,
  AlignCenter,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Annotation {
  id: number;
  /** Position in natural image coordinate system (pixels) */
  x: number;
  y: number;
}

export default function ImageAnnotatorPage() {
  // Image state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [markerSize, setMarkerSize] = useState<number>(28);
  const [nextId, setNextId] = useState<number>(1);
  const [history, setHistory] = useState<{ annotations: Annotation[]; nextId: number }[]>([]);

  // Dragging marker state
  const [draggingMarkerId, setDraggingMarkerId] = useState<number | null>(null);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const dragStartPosRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const isDraggingMarkerRef = useRef(false);

  // Bottom text settings
  const [bottomText, setBottomText] = useState<string>('');
  const [textColor, setTextColor] = useState<string>('#111111');
  const [fontSize, setFontSize] = useState<number>(20);
  const [spacing, setSpacing] = useState<number>(16);
  const [minBottomHeight, setMinBottomHeight] = useState<number>(60);
  const [textAlign, setTextAlign] = useState<'left' | 'center'>('left');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // DOM Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgElementRef = useRef<HTMLImageElement>(null);

  const showToast = useCallback((msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastType(type);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  // Update displayed size on window resize
  const updateDisplayedDimensions = useCallback(() => {
    if (imgElementRef.current) {
      const rect = imgElementRef.current.getBoundingClientRect();
      setDisplayedSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateDisplayedDimensions);
    return () => window.removeEventListener('resize', updateDisplayedDimensions);
  }, [updateDisplayedDimensions]);

  // Load image file
  const handleLoadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('请选择有效的图片文件', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImageSrc(result);
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        // Reset annotations and history for new image
        setAnnotations([]);
        setNextId(1);
        setHistory([]);
        showToast('图片加载成功，可点击任意位置打点', 'success');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }, [showToast]);

  // Paste image support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              handleLoadFile(file);
              break;
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleLoadFile]);

  // Push history snapshot before mutation
  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev, { annotations: [...annotations], nextId }]);
  }, [annotations, nextId]);

  // Undo action
  const handleUndo = useCallback(() => {
    if (history.length === 0) {
      showToast('无可撤销的操作', 'info');
      return;
    }
    const previousState = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setAnnotations(previousState.annotations);
    setNextId(previousState.nextId);
    showToast('已撤销上一步操作', 'info');
  }, [history, showToast]);

  // Keyboard shortcut Ctrl/Cmd + Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        // Only if not focused on text input / textarea
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Click canvas area to add marker
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If just finished dragging a marker or clicked on a marker, ignore
    if (isDraggingMarkerRef.current || hasMovedDuringDrag) {
      return;
    }

    if (!imgElementRef.current || imageSize.width === 0 || imageSize.height === 0) return;

    const rect = imgElementRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if within image bounds
    if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) {
      return;
    }

    // Convert screen coordinates to natural image coordinates
    const scaleX = imageSize.width / rect.width;
    const scaleY = imageSize.height / rect.height;
    const naturalX = Math.round(clickX * scaleX);
    const naturalY = Math.round(clickY * scaleY);

    pushHistory();
    const newAnnotation: Annotation = {
      id: nextId,
      x: naturalX,
      y: naturalY
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    setNextId((prev) => prev + 1);
  };

  // Start dragging a marker
  const handleMarkerMouseDown = (e: React.MouseEvent, markerId: number) => {
    e.stopPropagation();
    pushHistory();
    setDraggingMarkerId(markerId);
    isDraggingMarkerRef.current = true;
    setHasMovedDuringDrag(false);
    dragStartPosRef.current = { clientX: e.clientX, clientY: e.clientY };
  };

  // Dragging effect across window
  useEffect(() => {
    if (draggingMarkerId === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!imgElementRef.current || imageSize.width === 0 || imageSize.height === 0) return;

      if (dragStartPosRef.current) {
        const dx = Math.abs(e.clientX - dragStartPosRef.current.clientX);
        const dy = Math.abs(e.clientY - dragStartPosRef.current.clientY);
        if (dx > 3 || dy > 3) {
          setHasMovedDuringDrag(true);
        }
      }

      const rect = imgElementRef.current.getBoundingClientRect();
      const clampedX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const clampedY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const scaleX = imageSize.width / rect.width;
      const scaleY = imageSize.height / rect.height;
      const naturalX = Math.round(clampedX * scaleX);
      const naturalY = Math.round(clampedY * scaleY);

      setAnnotations((prev) =>
        prev.map((item) => (item.id === draggingMarkerId ? { ...item, x: naturalX, y: naturalY } : item))
      );
    };

    const handleMouseUp = () => {
      setDraggingMarkerId(null);
      setTimeout(() => {
        isDraggingMarkerRef.current = false;
        setHasMovedDuringDrag(false);
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingMarkerId, imageSize]);

  // Double click marker to delete
  const handleMarkerDoubleClick = (e: React.MouseEvent, markerId: number) => {
    e.stopPropagation();
    pushHistory();
    setAnnotations((prev) => prev.filter((item) => item.id !== markerId));
    showToast(`已删除标注 #${markerId}`, 'info');
  };

  // Delete from list
  const handleDeleteItem = (markerId: number) => {
    pushHistory();
    setAnnotations((prev) => prev.filter((item) => item.id !== markerId));
    showToast(`已删除标注 #${markerId}`, 'info');
  };

  // Clear all annotations
  const handleClearAll = () => {
    if (annotations.length === 0) {
      showToast('当前没有标注可清除', 'info');
      return;
    }
    pushHistory();
    setAnnotations([]);
    showToast('已清空全部标注', 'info');
  };

  // Export combined PNG
  const handleExportPNG = () => {
    if (!imageSrc || imageSize.width === 0 || imageSize.height === 0) {
      showToast('请先上传图片', 'error');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      // Scale factors for bottom text to match high-resolution image
      // If image is 2000px wide, and display is ~800px, calculate relative scale
      const displayW = displayedSize.width > 0 ? displayedSize.width : 800;
      const exportScale = Math.max(1, imgW / displayW);

      const scaledFontSize = Math.round(fontSize * exportScale);
      const scaledSpacing = Math.round(spacing * exportScale);
      const scaledMinBottomHeight = Math.round(minBottomHeight * exportScale);
      const padding = Math.round(18 * exportScale);
      const lineHeight = Math.round(scaledFontSize * 1.45);

      // Parse lines
      const lines = bottomText.split('\n');
      const hasText = bottomText.trim().length > 0;

      // Calculate bottom banner height
      let bottomBannerHeight = 0;
      if (hasText || scaledMinBottomHeight > 0) {
        const textContentHeight = hasText ? padding * 2 + lines.length * lineHeight : 0;
        bottomBannerHeight = Math.max(scaledMinBottomHeight, textContentHeight);
      }

      // Total canvas dimensions
      canvas.width = imgW;
      canvas.height = imgH + (bottomBannerHeight > 0 ? scaledSpacing + bottomBannerHeight : 0);

      // 1. Draw original image
      ctx.drawImage(img, 0, 0, imgW, imgH);

      // 2. Draw annotations
      const scaledMarkerDiameter = Math.round(markerSize * exportScale);
      const markerRadius = scaledMarkerDiameter / 2;
      const markerNumberFontSize = Math.max(12, Math.round(scaledMarkerDiameter * 0.52));

      annotations.forEach((item) => {
        ctx.save();
        ctx.translate(item.x, item.y);

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = Math.round(6 * exportScale);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = Math.round(2 * exportScale);

        // Circle background (#2563eb bright blue)
        ctx.beginPath();
        ctx.arc(0, 0, markerRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();

        // White border
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = Math.max(2, Math.round(2.5 * exportScale));
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Number
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${markerNumberFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(item.id), 0, 1 * exportScale);

        ctx.restore();
      });

      // 3. Draw bottom banner if text or height exists
      if (bottomBannerHeight > 0) {
        const bannerTopY = imgH + scaledSpacing;

        // Banner background (clean white)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, bannerTopY, imgW, bottomBannerHeight);

        // Draw text
        if (hasText) {
          ctx.fillStyle = textColor;
          ctx.font = `${scaledFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textBaseline = 'top';

          lines.forEach((line, index) => {
            const lineY = bannerTopY + padding + index * lineHeight;
            if (textAlign === 'center') {
              ctx.textAlign = 'center';
              ctx.fillText(line, imgW / 2, lineY);
            } else {
              ctx.textAlign = 'left';
              ctx.fillText(line, padding, lineY);
            }
          });
        }
      }

      // 4. Download file
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `annotated_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('PNG 导出成功并已开始下载', 'success');
      } catch (err) {
        console.error('Export error:', err);
        showToast('导出失败，请检查浏览器权限', 'error');
      }
    };
    img.src = imageSrc;
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
        {/* Operation Instructions banner */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-3 flex items-start sm:items-center gap-3 text-slate-600 text-sm shadow-xs">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-700">操作指引：</span>
            上传或拖拽图片 → 点击图片任意位置添加编号 → 拖动编号以移动 → 双击删除 → 导出包含底部文字的 PNG 。
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleLoadFile(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-xs transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>上传图片</span>
            </button>

            {/* Clear All */}
            <button
              onClick={handleClearAll}
              disabled={annotations.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                annotations.length > 0
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>清除标注</span>
            </button>

            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                history.length > 0
                  ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-xs'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              title="回退上一步标注 (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
              <span>撤销 ({history.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Marker Size Input */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <label htmlFor="markerSize" className="text-xs text-slate-600 font-medium whitespace-nowrap">
                标注尺寸(px):
              </label>
              <input
                id="markerSize"
                type="number"
                min={10}
                max={120}
                value={markerSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setMarkerSize(Math.max(10, Math.min(120, val)));
                  }
                }}
                className="w-16 bg-white text-slate-800 text-sm font-medium text-center rounded-lg px-2 py-0.5 border border-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Save & Download PNG */}
            <button
              onClick={handleExportPNG}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              <span>保存并下载 PNG</span>
            </button>
          </div>
        </div>

        {/* Main Workspace Grid: Left Image Area & Right Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Canvas & Preview Container (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Image Canvas Box */}
            <div
              className={`relative min-h-[380px] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed transition-all select-none overflow-hidden ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50/40 shadow-inner ring-4 ring-blue-500/10'
                  : 'border-slate-300 bg-slate-50/60'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleLoadFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={handleCanvasClick}
            >
              {!imageSrc ? (
                /* Placeholder when no image loaded */
                <div className="p-8 text-center flex flex-col items-center gap-3 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-xs">
                    <ImageIcon className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-800">
                      {'将图片拖到此处或使用"上传图片"按钮'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">支持 PNG, JPG, WebP 等常见格式，亦可直接使用 Ctrl+V 粘贴</p>
                  </div>
                </div>
              ) : (
                /* Displayed Image and Markers Overlay */
                <div
                  ref={imageContainerRef}
                  className="relative max-w-full flex justify-center items-center cursor-crosshair p-3"
                  style={{ userSelect: 'none' }}
                >
                  <img
                    ref={imgElementRef}
                    src={imageSrc}
                    alt="待标注图片"
                    onLoad={updateDisplayedDimensions}
                    className="max-w-full max-h-[72vh] object-contain block rounded-lg shadow-md border border-slate-200 pointer-events-none"
                    style={{ userSelect: 'none' }}
                  />

                  {/* Render marker overlays */}
                  {displayedSize.width > 0 &&
                    imageSize.width > 0 &&
                    annotations.map((item) => {
                      const scale = displayedSize.width / imageSize.width;
                      const posX = item.x * scale;
                      const posY = item.y * scale;

                      return (
                        <div
                          key={item.id}
                          onMouseDown={(e) => handleMarkerMouseDown(e, item.id)}
                          onDoubleClick={(e) => handleMarkerDoubleClick(e, item.id)}
                          className={`absolute flex items-center justify-center rounded-full text-white font-bold cursor-move select-none transition-transform active:scale-95 ${
                            draggingMarkerId === item.id ? 'z-20 ring-2 ring-white scale-110 shadow-xl' : 'z-10 shadow-md'
                          }`}
                          style={{
                            left: `${posX}px`,
                            top: `${posY}px`,
                            width: `${markerSize}px`,
                            height: `${markerSize}px`,
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: '#2563eb',
                            border: '2px solid #ffffff',
                            fontSize: `${Math.max(10, Math.round(markerSize * 0.52))}px`,
                            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.35)'
                          }}
                          title={`#${item.id} (双击删除，按住可拖动)`}
                        >
                          {item.id}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Bottom Text Live Preview Banner */}
            {imageSrc && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">底部文字实时效果预览</span>
                  <span>导出时将拼接在图片正下方</span>
                </div>

                <div
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl transition-all flex flex-col"
                  style={{
                    minHeight: `${minBottomHeight}px`,
                    padding: '16px',
                    color: textColor,
                    fontSize: `${fontSize}px`,
                    textAlign: textAlign,
                    marginTop: `${Math.min(32, spacing)}px`
                  }}
                >
                  {bottomText.trim() ? (
                    <div className="whitespace-pre-wrap leading-relaxed font-sans break-words">
                      {bottomText}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-sm self-center my-auto">
                      （未输入底部文字时，导出时此区域为白色底块；若无需底部留白可将底色高度最小设为 0）
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Side Control Panels (1 col) */}
          <div className="flex flex-col gap-6">
            {/* Annotation List Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="font-bold text-slate-800 text-base">标注列表</h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                  下一个：{nextId}
                </span>
              </div>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-sm custom-scrollbar">
                {annotations.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    暂无标注，点击画布即可打点
                  </p>
                ) : (
                  annotations.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                          {item.id}
                        </span>
                        <span className="font-mono text-slate-700 text-xs font-semibold">#{item.id}</span>
                        <span className="text-[11px] text-slate-400">
                          ({item.x}, {item.y})
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                        title="删除该编号"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* List operation hint */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs text-slate-500 leading-relaxed">
                操作提示：点击图片空白处新增；拖动编号移动；双击删除。
              </div>
            </div>

            {/* Bottom Text Configuration Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
              <h2 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100">
                底部文字设置
              </h2>

              {/* Textarea */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bottomText" className="text-xs font-medium text-slate-700">
                  底部说明文字
                </label>
                <textarea
                  id="bottomText"
                  rows={3}
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  placeholder="导出时显示在图片下方..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y"
                />
              </div>

              {/* Text Color & Font Size */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="textColor" className="text-xs font-medium text-slate-700">
                    文字颜色
                  </label>
                  <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-2 py-1.5">
                    <input
                      id="textColor"
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="text-xs font-mono text-slate-700 uppercase">{textColor}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="fontSize" className="text-xs font-medium text-slate-700">
                    字体大小(px)
                  </label>
                  <input
                    id="fontSize"
                    type="number"
                    min={8}
                    max={120}
                    value={fontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setFontSize(Math.max(8, Math.min(120, val)));
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Spacing & Min Height */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="spacing" className="text-xs font-medium text-slate-700">
                    图文间距(px)
                  </label>
                  <input
                    id="spacing"
                    type="number"
                    min={0}
                    max={200}
                    value={spacing}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setSpacing(Math.max(0, Math.min(200, val)));
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="minHeight" className="text-xs font-medium text-slate-700">
                    底色最小高度(px)
                  </label>
                  <input
                    id="minHeight"
                    type="number"
                    min={20}
                    max={400}
                    value={minBottomHeight}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setMinBottomHeight(Math.max(20, Math.min(400, val)));
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Alignment */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-700">对齐方式</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTextAlign('left')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      textAlign === 'left'
                        ? 'bg-white text-blue-600 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>左对齐</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextAlign('center')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      textAlign === 'center'
                        ? 'bg-white text-blue-600 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                    <span>居中</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Global Toast Pill Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all animate-bounce">
          <div
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full shadow-2xl text-sm font-medium backdrop-blur-md border ${
              toastType === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : toastType === 'success'
                ? 'bg-emerald-900 text-white border-emerald-800'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {toastType === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            ) : toastType === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-300 shrink-0" />
            )}
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

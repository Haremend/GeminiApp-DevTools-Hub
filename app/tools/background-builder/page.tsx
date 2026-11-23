'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Frame,
  Upload,
  Download,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Crop,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpDown,
  Layers,
  Check,
  SlidersHorizontal,
  Image as ImageIcon,
} from 'lucide-react';

interface CropInsets {
  top: number; // 0..0.48
  right: number;
  bottom: number;
  left: number;
}

interface FeatherInsets {
  left: number; // px in canvas space
  right: number;
  top: number;
  bottom: number;
}

interface ComposerLayer {
  id: string;
  name: string;
  src: string;
  imgElement: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
  x: number; // canvas px of cropped frame top-left
  y: number;
  scale: number; // multiplier relative to naturalWidth/naturalHeight
  crop: CropInsets;
  feather: FeatherInsets;
  opacity: number; // 0..1
  visible: boolean;
}

type PresetId = '16x10' | '2k' | '4k' | '21x9' | '32x9' | 'custom';

interface CanvasPreset {
  id: PresetId;
  label: string;
  ratioLabel: string;
  width: number;
  height: number;
}

const CANVAS_PRESETS: CanvasPreset[] = [
  { id: '2k', label: '2K 壁纸', ratioLabel: '16:9', width: 2560, height: 1440 },
  { id: '4k', label: '4K 超清', ratioLabel: '16:9', width: 3840, height: 2160 },
  { id: '16x10', label: '2560×1600', ratioLabel: '16:10', width: 2560, height: 1600 },
  { id: '21x9', label: '带鱼屏', ratioLabel: '21:9', width: 3440, height: 1440 },
  { id: '32x9', label: '双屏拼接', ratioLabel: '32:9', width: 5120, height: 1440 },
];

const BG_SWATCHES = [
  { label: '深石板', color: '#0F172A' },
  { label: '纯黑', color: '#000000' },
  { label: '浅灰', color: '#F1F5F9' },
  { label: '纯白', color: '#FFFFFF' },
];

type InteractionMode = 'transform' | 'crop';
type DragHandleType =
  | 'move'
  | 'scale-nw'
  | 'scale-ne'
  | 'scale-sw'
  | 'scale-se'
  | 'crop-top'
  | 'crop-right'
  | 'crop-bottom'
  | 'crop-left';

interface LayerBounds {
  left: number;
  right: number;
  centerX: number;
  top: number;
  bottom: number;
  centerY: number;
}

interface DragSession {
  type: DragHandleType;
  layerId: string;
  startClientX: number;
  startClientY: number;
  initialLayer: ComposerLayer;
  otherBounds: LayerBounds[];
}

interface SnapLine {
  orientation: 'vertical' | 'horizontal';
  pos: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getLayerGeometry(layer: ComposerLayer) {
  const srcCropX = layer.crop.left * layer.naturalWidth;
  const srcCropY = layer.crop.top * layer.naturalHeight;
  const srcCropW = Math.max(1, (1 - layer.crop.left - layer.crop.right) * layer.naturalWidth);
  const srcCropH = Math.max(1, (1 - layer.crop.top - layer.crop.bottom) * layer.naturalHeight);
  const displayW = srcCropW * layer.scale;
  const displayH = srcCropH * layer.scale;

  return {
    srcCropX,
    srcCropY,
    srcCropW,
    srcCropH,
    displayW,
    displayH,
    fullW: layer.naturalWidth * layer.scale,
    fullH: layer.naturalHeight * layer.scale,
    innerOffsetX: -layer.crop.left * layer.naturalWidth * layer.scale,
    innerOffsetY: -layer.crop.top * layer.naturalHeight * layer.scale,
  };
}

function computeAutoArrangedLayers(
  targetLayers: ComposerLayer[],
  canvasWidth: number,
  canvasHeight: number
): ComposerLayer[] {
  if (targetLayers.length === 0) return targetLayers;

  const count = targetLayers.length;
  // Scale each layer so its cropped height matches canvas height
  const scaled = targetLayers.map((layer) => {
    const srcCropH = Math.max(1, (1 - layer.crop.top - layer.crop.bottom) * layer.naturalHeight);
    const srcCropW = Math.max(1, (1 - layer.crop.left - layer.crop.right) * layer.naturalWidth);
    const newScale = canvasHeight / srcCropH;
    const displayW = srcCropW * newScale;
    return { layer, newScale, displayW };
  });

  if (count === 1) {
    const { layer, newScale, displayW } = scaled[0];
    return [
      {
        ...layer,
        scale: newScale,
        x: Math.round((canvasWidth - displayW) / 2),
        y: 0,
      },
    ];
  }

  return scaled.map(({ layer, newScale, displayW }, idx) => {
    const t = idx / (count - 1); // 0 -> left edge, 1 -> right edge
    const x = Math.round(t * (canvasWidth - displayW));
    return {
      ...layer,
      scale: newScale,
      x,
      y: 0,
    };
  });
}

export default function BackgroundBuilderPage() {
  // Canvas dimensions & background
  const [presetId, setPresetId] = useState<PresetId>('2k');
  const [canvasWidth, setCanvasWidth] = useState<number>(2560);
  const [canvasHeight, setCanvasHeight] = useState<number>(1440);
  const [draftWidth, setDraftWidth] = useState<string>('2560');
  const [draftHeight, setDraftHeight] = useState<string>('1440');
  const [scaleWithCanvas, setScaleWithCanvas] = useState<boolean>(true);
  const [backgroundType, setBackgroundType] = useState<'solid' | 'transparent'>('solid');
  const [backgroundColor, setBackgroundColor] = useState<string>('#0F172A');

  // Layers (bottom to top: index 0 = backmost, index length-1 = frontmost)
  const [layers, setLayers] = useState<ComposerLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('transform');

  // Viewport zoom & pan
  const [viewportZoom, setViewportZoom] = useState<number>(0.35);
  const [viewportPan, setViewportPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanningStage, setIsPanningStage] = useState<boolean>(false);
  const [spacePressed, setSpacePressed] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);

  // Dragging & snapping
  const [dragSession, setDragSession] = useState<DragSession | null>(null);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);

  // Export & UI status
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoFittedRef = useRef<boolean>(false);

  // Keep latest canvas size in refs for async image load callbacks
  const canvasSizeRef = useRef({ width: canvasWidth, height: canvasHeight });
  useEffect(() => {
    canvasSizeRef.current = { width: canvasWidth, height: canvasHeight };
  }, [canvasWidth, canvasHeight]);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  // Fit artboard comfortably inside viewport
  const fitStageToScreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const availW = Math.max(200, el.clientWidth - 72);
    const availH = Math.max(200, el.clientHeight - 72);
    const ratio = Math.min(availW / canvasWidth, availH / canvasHeight, 1);
    setViewportZoom(Math.max(0.08, parseFloat(ratio.toFixed(3))));
    setViewportPan({ x: 0, y: 0 });
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    if (!hasAutoFittedRef.current) {
      hasAutoFittedRef.current = true;
      fitStageToScreen();
    }
  }, [fitStageToScreen]);

  // Resize canvas and proportionally scale existing layers so composition & overlap stay intact
  const resizeCanvas = useCallback(
    (nextW: number, nextH: number, nextPreset?: PresetId) => {
      const clampedW = clamp(Math.round(nextW) || 320, 320, 7680);
      const clampedH = clamp(Math.round(nextH) || 320, 320, 4320);
      const oldW = canvasWidth;
      const oldH = canvasHeight;

      if (nextPreset) setPresetId(nextPreset);
      setDraftWidth(String(clampedW));
      setDraftHeight(String(clampedH));

      if (clampedW === oldW && clampedH === oldH) return;

      if (scaleWithCanvas) {
        const scaleX = clampedW / oldW;
        const scaleY = clampedH / oldH;
        const sameAspect = Math.abs(scaleX - scaleY) < 0.01;
        const factor = sameAspect ? scaleY : scaleY;

        setLayers((prev) =>
          prev.map((layer) => {
            const oldGeom = getLayerGeometry(layer);
            const newScale = clamp(layer.scale * factor, 0.05, 5);
            const newDispW = oldGeom.srcCropW * newScale;

            let newX: number;
            if (sameAspect) {
              newX = Math.round(layer.x * scaleX);
            } else if (
              Math.abs(oldW - oldGeom.displayW) > 1 &&
              layer.x >= -2 &&
              layer.x <= oldW - oldGeom.displayW + 2
            ) {
              const t = clamp(layer.x / (oldW - oldGeom.displayW), 0, 1);
              newX = Math.round(t * (clampedW - newDispW));
            } else {
              const centerOld = layer.x + oldGeom.displayW / 2;
              newX = Math.round(centerOld * scaleX - newDispW / 2);
            }

            return {
              ...layer,
              scale: newScale,
              x: newX,
              y: Math.round(layer.y * scaleY),
              feather: {
                left: Math.round(layer.feather.left * factor),
                right: Math.round(layer.feather.right * factor),
                top: Math.round(layer.feather.top * factor),
                bottom: Math.round(layer.feather.bottom * factor),
              },
            };
          })
        );
      }

      setCanvasWidth(clampedW);
      setCanvasHeight(clampedH);

      requestAnimationFrame(() => {
        const el = stageRef.current;
        if (!el) return;
        const availW = Math.max(200, el.clientWidth - 72);
        const availH = Math.max(200, el.clientHeight - 72);
        const ratio = Math.min(availW / clampedW, availH / clampedH, 1);
        setViewportZoom(Math.max(0.08, parseFloat(ratio.toFixed(3))));
        setViewportPan({ x: 0, y: 0 });
      });
    },
    [canvasWidth, canvasHeight, scaleWithCanvas]
  );

  // Refit cleanly when canvas preset switches
  const handleSelectPreset = (preset: CanvasPreset) => {
    resizeCanvas(preset.width, preset.height, preset.id);
  };

  // Load images cleanly from URLs or Files
  const loadImagesFromSources = useCallback(
    async (items: { name: string; src: string }[], autoArrangeIfEmpty = true) => {
      const loaded = await Promise.all(
        items.map(
          (item) =>
            new Promise<ComposerLayer | null>((resolve) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                const natW = img.naturalWidth || 1000;
                const natH = img.naturalHeight || 1600;
                const { width: cW, height: cH } = canvasSizeRef.current;
                const defaultScale = cH / natH;
                resolve({
                  id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  name: item.name,
                  src: item.src,
                  imgElement: img,
                  naturalWidth: natW,
                  naturalHeight: natH,
                  x: Math.round((cW - natW * defaultScale) / 2),
                  y: 0,
                  scale: defaultScale,
                  crop: { top: 0, right: 0, bottom: 0, left: 0 },
                  feather: { left: 0, right: 0, top: 0, bottom: 0 },
                  opacity: 1,
                  visible: true,
                });
              };
              img.onerror = () => resolve(null);
              img.src = item.src;
            })
        )
      );

      const valid = loaded.filter((l): l is ComposerLayer => l !== null);
      if (valid.length === 0) return;

      setLayers((prev) => {
        const shouldAutoArrange = autoArrangeIfEmpty && prev.length === 0 && valid.length >= 1;
        const combined = [...prev, ...valid];
        const next = shouldAutoArrange
          ? computeAutoArrangedLayers(combined, canvasSizeRef.current.width, canvasSizeRef.current.height)
          : combined;
        return next;
      });

      setSelectedLayerId(valid[valid.length - 1].id);
      showToast(`已导入 ${valid.length} 张图片`);
    },
    [showToast]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;
      const items = imageFiles.map((f) => ({
        name: f.name,
        src: URL.createObjectURL(f),
      }));
      loadImagesFromSources(items, true);
    },
    [loadImagesFromSources]
  );

  // Global clipboard paste listener
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const f = items[i].getAsFile();
          if (f) pastedFiles.push(f);
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        handleFiles(pastedFiles);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFiles]);

  // Keyboard shortcuts (Space for pan, Delete/Backspace to remove selected layer, Esc to exit crop)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (isInput) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
      } else if (e.key === 'Escape' && interactionMode === 'crop') {
        setInteractionMode('transform');
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
        setLayers((prev) => prev.filter((l) => l.id !== selectedLayerId));
        setSelectedLayerId(null);
        showToast('已删除选中图层');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [interactionMode, selectedLayerId, showToast]);

  // Load 3 vertical demo illustrations with distinct focal sides (left, center, right)
  const loadDemoIllustrations = () => {
    const makeVerticalCard = (
      title: string,
      focalAlign: 'left' | 'center' | 'right',
      palette: [string, string, string],
      w: number,
      h: number
    ) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return '';

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(0.55, palette[1]);
      grad.addColorStop(1, palette[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle atmospheric rays
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(w * 0.15, 0);
      ctx.lineTo(w * 0.55, 0);
      ctx.lineTo(w * 0.85, h);
      ctx.lineTo(w * 0.35, h);
      ctx.closePath();
      ctx.fill();

      // Focal silhouette shifted left / center / right to demonstrate overlap composition
      const focalX = focalAlign === 'left' ? w * 0.32 : focalAlign === 'right' ? w * 0.68 : w * 0.5;
      const focalY = h * 0.42;

      // Halo glow behind focal subject
      const radial = ctx.createRadialGradient(focalX, focalY, 20, focalX, focalY, w * 0.42);
      radial.addColorStop(0, 'rgba(255,255,255,0.48)');
      radial.addColorStop(0.5, 'rgba(255,255,255,0.12)');
      radial.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(focalX, focalY, w * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Geometric architectural/character silhouette
      ctx.fillStyle = 'rgba(15,23,42,0.78)';
      ctx.beginPath();
      ctx.arc(focalX, focalY - h * 0.08, w * 0.14, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(focalX - w * 0.22, h * 0.85);
      ctx.quadraticCurveTo(focalX, focalY + h * 0.03, focalX + w * 0.22, h * 0.85);
      ctx.closePath();
      ctx.fill();

      // Framing label
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.textAlign = focalAlign === 'left' ? 'left' : focalAlign === 'right' ? 'right' : 'center';
      const labelX = focalAlign === 'left' ? 72 : focalAlign === 'right' ? w - 72 : w / 2;
      ctx.fillText(title, labelX, h - 120);

      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.font = '28px monospace';
      ctx.fillText(`${w} × ${h} px`, labelX, h - 72);

      return c.toDataURL('image/png');
    };

    const leftImg = makeVerticalCard('主体靠左 · 左侧立绘', 'left', ['#1E1B4B', '#312E81', '#0F172A'], 1200, 1800);
    const rightImg = makeVerticalCard('主体靠右 · 右侧立绘', 'right', ['#134E4A', '#0F766E', '#042F2E'], 1280, 1920);
    const centerImg = makeVerticalCard('主视角 · 中央压层', 'center', ['#4C1D95', '#6D28D9', '#1E1B4B'], 1200, 1800);

    setLayers([]);
    // Notice order: Left -> Right -> Center (so Center sits on top and overlaps both!)
    loadImagesFromSources(
      [
        { name: '01_左侧竖图.png', src: leftImg },
        { name: '03_右侧竖图.png', src: rightImg },
        { name: '02_中间叠压主图.png', src: centerImg },
      ],
      false
    ).then(() => {
      // Arrange cleanly: Left at x=0, Right at right edge, Center overlapping both on top with gentle feather
      setLayers((curr) => {
        if (curr.length < 3) return curr;
        const cW = canvasSizeRef.current.width;
        const cH = canvasSizeRef.current.height;
        return curr.map((layer, idx) => {
          const s = cH / layer.naturalHeight;
          const dispW = layer.naturalWidth * s;
          if (idx === 0) {
            return { ...layer, scale: s, x: 0, y: 0 };
          }
          if (idx === 1) {
            return { ...layer, scale: s, x: Math.round(cW - dispW), y: 0 };
          }
          return {
            ...layer,
            scale: s,
            x: Math.round((cW - dispW) / 2),
            y: 0,
            feather: { left: 100, right: 100, top: 0, bottom: 0 },
          };
        });
      });
    });
  };

  // Dragging & handle interaction (window-level mousemove/mouseup for smooth dragging outside artboard)
  useEffect(() => {
    if (!dragSession && !isPanningStage) return;

    const onMouseMove = (e: MouseEvent) => {
      if (isPanningStage && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.clientX;
        const dy = e.clientY - panStartRef.current.clientY;
        setViewportPan({
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        });
        return;
      }

      if (!dragSession) return;
      const dx = (e.clientX - dragSession.startClientX) / viewportZoom;
      const dy = (e.clientY - dragSession.startClientY) / viewportZoom;
      const init = dragSession.initialLayer;
      const initGeom = getLayerGeometry(init);

      if (dragSession.type === 'move') {
        let nextX = init.x + dx;
        let nextY = init.y + dy;
        const activeSnaps: SnapLine[] = [];
        const threshold = 12 / viewportZoom;

        if (!e.altKey) {
          // Horizontal snap targets (canvas edges/center + other visible images' edges/center)
          const xTargets: { target: number; linePos: number }[] = [
            { target: 0, linePos: 0 },
            { target: canvasWidth - initGeom.displayW, linePos: canvasWidth },
            { target: (canvasWidth - initGeom.displayW) / 2, linePos: canvasWidth / 2 },
          ];

          for (const other of dragSession.otherBounds) {
            // Moving left edge snaps to other left / right edge
            xTargets.push({ target: other.left, linePos: other.left });
            xTargets.push({ target: other.right, linePos: other.right });
            // Moving right edge snaps to other left / right edge
            xTargets.push({ target: other.left - initGeom.displayW, linePos: other.left });
            xTargets.push({ target: other.right - initGeom.displayW, linePos: other.right });
            // Center-to-center alignment
            xTargets.push({ target: other.centerX - initGeom.displayW / 2, linePos: other.centerX });
          }

          let bestX: { target: number; linePos: number; dist: number } | null = null;
          for (const t of xTargets) {
            const dist = Math.abs(nextX - t.target);
            if (dist <= threshold && (!bestX || dist < bestX.dist)) {
              bestX = { ...t, dist };
            }
          }
          if (bestX) {
            nextX = bestX.target;
            activeSnaps.push({ orientation: 'vertical', pos: bestX.linePos });
          }

          // Vertical snap targets (canvas edges/center + other visible images' edges/center)
          const yTargets: { target: number; linePos: number }[] = [
            { target: 0, linePos: 0 },
            { target: canvasHeight - initGeom.displayH, linePos: canvasHeight },
            { target: (canvasHeight - initGeom.displayH) / 2, linePos: canvasHeight / 2 },
          ];

          for (const other of dragSession.otherBounds) {
            yTargets.push({ target: other.top, linePos: other.top });
            yTargets.push({ target: other.bottom, linePos: other.bottom });
            yTargets.push({ target: other.top - initGeom.displayH, linePos: other.top });
            yTargets.push({ target: other.bottom - initGeom.displayH, linePos: other.bottom });
            yTargets.push({ target: other.centerY - initGeom.displayH / 2, linePos: other.centerY });
          }

          let bestY: { target: number; linePos: number; dist: number } | null = null;
          for (const t of yTargets) {
            const dist = Math.abs(nextY - t.target);
            if (dist <= threshold && (!bestY || dist < bestY.dist)) {
              bestY = { ...t, dist };
            }
          }
          if (bestY) {
            nextY = bestY.target;
            activeSnaps.push({ orientation: 'horizontal', pos: bestY.linePos });
          }
        }

        setSnapLines(activeSnaps);
        setLayers((prev) =>
          prev.map((l) => (l.id === init.id ? { ...l, x: Math.round(nextX), y: Math.round(nextY) } : l))
        );
      } else if (dragSession.type.startsWith('scale-')) {
        // Proportional scaling anchored at opposite corner
        const isLeft = dragSession.type === 'scale-nw' || dragSession.type === 'scale-sw';
        const isTop = dragSession.type === 'scale-nw' || dragSession.type === 'scale-ne';

        const anchorX = isLeft ? init.x + initGeom.displayW : init.x;
        const anchorY = isTop ? init.y + initGeom.displayH : init.y;

        const targetW = isLeft ? initGeom.displayW - dx : initGeom.displayW + dx;
        const targetH = isTop ? initGeom.displayH - dy : initGeom.displayH + dy;

        const scaleFactor = Math.max(targetW / initGeom.displayW, targetH / initGeom.displayH);
        const newScale = clamp(init.scale * scaleFactor, 0.05, 5);
        const newW = initGeom.srcCropW * newScale;
        const newH = initGeom.srcCropH * newScale;

        const newX = isLeft ? anchorX - newW : anchorX;
        const newY = isTop ? anchorY - newH : anchorY;

        setLayers((prev) =>
          prev.map((l) =>
            l.id === init.id
              ? { ...l, scale: newScale, x: Math.round(newX), y: Math.round(newY) }
              : l
          )
        );
      } else if (dragSession.type.startsWith('crop-')) {
        const fullW = init.naturalWidth * init.scale;
        const fullH = init.naturalHeight * init.scale;

        if (dragSession.type === 'crop-left') {
          const deltaFrac = dx / fullW;
          const nextLeft = clamp(init.crop.left + deltaFrac, 0, 0.9 - init.crop.right);
          const appliedPx = (nextLeft - init.crop.left) * fullW;
          setLayers((prev) =>
            prev.map((l) =>
              l.id === init.id
                ? {
                    ...l,
                    x: Math.round(init.x + appliedPx),
                    crop: { ...init.crop, left: nextLeft },
                  }
                : l
            )
          );
        } else if (dragSession.type === 'crop-right') {
          const deltaFrac = -dx / fullW;
          const nextRight = clamp(init.crop.right + deltaFrac, 0, 0.9 - init.crop.left);
          setLayers((prev) =>
            prev.map((l) =>
              l.id === init.id ? { ...l, crop: { ...init.crop, right: nextRight } } : l
            )
          );
        } else if (dragSession.type === 'crop-top') {
          const deltaFrac = dy / fullH;
          const nextTop = clamp(init.crop.top + deltaFrac, 0, 0.9 - init.crop.bottom);
          const appliedPx = (nextTop - init.crop.top) * fullH;
          setLayers((prev) =>
            prev.map((l) =>
              l.id === init.id
                ? {
                    ...l,
                    y: Math.round(init.y + appliedPx),
                    crop: { ...init.crop, top: nextTop },
                  }
                : l
            )
          );
        } else if (dragSession.type === 'crop-bottom') {
          const deltaFrac = -dy / fullH;
          const nextBottom = clamp(init.crop.bottom + deltaFrac, 0, 0.9 - init.crop.top);
          setLayers((prev) =>
            prev.map((l) =>
              l.id === init.id ? { ...l, crop: { ...init.crop, bottom: nextBottom } } : l
            )
          );
        }
      }
    };

    const onMouseUp = () => {
      setDragSession(null);
      setIsPanningStage(false);
      setSnapLines([]);
      panStartRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragSession, isPanningStage, viewportZoom, canvasWidth, canvasHeight]);

  const startHandleDrag = (e: React.MouseEvent, type: DragHandleType, layer: ComposerLayer) => {
    if (spacePressed || e.button !== 0) return;
    e.stopPropagation();
    setSelectedLayerId(layer.id);
    const otherBounds: LayerBounds[] = layers
      .filter((l) => l.visible && l.id !== layer.id)
      .map((l) => {
        const g = getLayerGeometry(l);
        return {
          left: l.x,
          right: l.x + g.displayW,
          centerX: l.x + g.displayW / 2,
          top: l.y,
          bottom: l.y + g.displayH,
          centerY: l.y + g.displayH / 2,
        };
      });

    setDragSession({
      type,
      layerId: layer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialLayer: {
        ...layer,
        crop: { ...layer.crop },
        feather: { ...layer.feather },
      },
      otherBounds,
    });
  };

  const handleStageMouseDown = (e: React.MouseEvent) => {
    // Pan if middle mouse, spacebar held, or clicking blank stage background
    if (e.button === 1 || spacePressed || e.target === stageRef.current) {
      e.preventDefault();
      setIsPanningStage(true);
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: viewportPan.x,
        panY: viewportPan.y,
      };
      if (e.target === stageRef.current && !spacePressed) {
        setSelectedLayerId(null);
      }
    }
  };

  const handleStageWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 1.1 : 0.9;
    setViewportZoom((prev) => clamp(parseFloat((prev * step).toFixed(3)), 0.08, 3));
  };

  // Layer management actions
  const moveLayerOrder = (layerId: string, direction: 'up' | 'down') => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === layerId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const updateSelectedLayer = (updater: (layer: ComposerLayer) => ComposerLayer) => {
    if (!selectedLayerId) return;
    setLayers((prev) => prev.map((l) => (l.id === selectedLayerId ? updater(l) : l)));
  };

  const fitSelectedHeight = () => {
    updateSelectedLayer((l) => {
      const geom = getLayerGeometry(l);
      const newScale = canvasHeight / geom.srcCropH;
      return { ...l, scale: newScale, y: 0 };
    });
  };

  const alignSelected = (pos: 'left' | 'center' | 'right') => {
    updateSelectedLayer((l) => {
      const geom = getLayerGeometry(l);
      if (pos === 'left') return { ...l, x: 0 };
      if (pos === 'right') return { ...l, x: Math.round(canvasWidth - geom.displayW) };
      return { ...l, x: Math.round((canvasWidth - geom.displayW) / 2) };
    });
  };

  const resetSelectedCrop = () => {
    updateSelectedLayer((l) => ({
      ...l,
      crop: { top: 0, right: 0, bottom: 0, left: 0 },
    }));
    showToast('已重置该图层裁剪');
  };

  const handleAutoArrangeAll = () => {
    if (layers.length === 0) return;
    setLayers((prev) => computeAutoArrangedLayers(prev, canvasWidth, canvasHeight));
    showToast('已按当前图层顺序自动等高横排铺满画布');
  };

  // Offscreen high-resolution export engine (100% WYSIWYG with preview crop + scale + edge feather)
  const renderCompositeToCanvas = useCallback((): HTMLCanvasElement | null => {
    const out = document.createElement('canvas');
    out.width = canvasWidth;
    out.height = canvasHeight;
    const ctx = out.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (backgroundType === 'solid') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    for (const layer of layers) {
      if (!layer.visible || layer.opacity <= 0) continue;

      const geom = getLayerGeometry(layer);
      const drawW = Math.max(1, Math.round(geom.displayW));
      const drawH = Math.max(1, Math.round(geom.displayH));

      const hasFeather =
        layer.feather.left > 0 ||
        layer.feather.right > 0 ||
        layer.feather.top > 0 ||
        layer.feather.bottom > 0;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      if (!hasFeather) {
        ctx.drawImage(
          layer.imgElement,
          geom.srcCropX,
          geom.srcCropY,
          geom.srcCropW,
          geom.srcCropH,
          layer.x,
          layer.y,
          geom.displayW,
          geom.displayH
        );
      } else {
        const temp = document.createElement('canvas');
        temp.width = drawW;
        temp.height = drawH;
        const tctx = temp.getContext('2d');
        if (tctx) {
          tctx.imageSmoothingEnabled = true;
          tctx.imageSmoothingQuality = 'high';
          tctx.drawImage(
            layer.imgElement,
            geom.srcCropX,
            geom.srcCropY,
            geom.srcCropW,
            geom.srcCropH,
            0,
            0,
            drawW,
            drawH
          );

          const fL = Math.min(layer.feather.left, drawW * 0.48);
          const fR = Math.min(layer.feather.right, drawW * 0.48);
          if (fL > 0 || fR > 0) {
            tctx.globalCompositeOperation = 'destination-in';
            const gradH = tctx.createLinearGradient(0, 0, drawW, 0);
            gradH.addColorStop(0, fL > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
            if (fL > 0) gradH.addColorStop(clamp(fL / drawW, 0.001, 0.49), 'rgba(0,0,0,1)');
            if (fR > 0) gradH.addColorStop(clamp(1 - fR / drawW, 0.51, 0.999), 'rgba(0,0,0,1)');
            gradH.addColorStop(1, fR > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
            tctx.fillStyle = gradH;
            tctx.fillRect(0, 0, drawW, drawH);
          }

          const fT = Math.min(layer.feather.top, drawH * 0.48);
          const fB = Math.min(layer.feather.bottom, drawH * 0.48);
          if (fT > 0 || fB > 0) {
            tctx.globalCompositeOperation = 'destination-in';
            const gradV = tctx.createLinearGradient(0, 0, 0, drawH);
            gradV.addColorStop(0, fT > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
            if (fT > 0) gradV.addColorStop(clamp(fT / drawH, 0.001, 0.49), 'rgba(0,0,0,1)');
            if (fB > 0) gradV.addColorStop(clamp(1 - fB / drawH, 0.51, 0.999), 'rgba(0,0,0,1)');
            gradV.addColorStop(1, fB > 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,1)');
            tctx.fillStyle = gradV;
            tctx.fillRect(0, 0, drawW, drawH);
          }

          ctx.drawImage(temp, layer.x, layer.y, geom.displayW, geom.displayH);
        }
      }

      ctx.restore();
    }

    return out;
  }, [layers, canvasWidth, canvasHeight, backgroundType, backgroundColor]);

  const handleExport = (format: 'png' | 'jpeg') => {
    if (layers.length === 0 || isExporting) return;
    setIsExporting(true);
    setTimeout(() => {
      try {
        // For JPG, flatten transparent canvas onto backgroundColor
        let exportCanvas: HTMLCanvasElement | null = null;
        if (format === 'jpeg' && backgroundType === 'transparent') {
          const temp = renderCompositeToCanvas();
          if (temp) {
            exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvasWidth;
            exportCanvas.height = canvasHeight;
            const ectx = exportCanvas.getContext('2d');
            if (ectx) {
              ectx.fillStyle = '#0F172A';
              ectx.fillRect(0, 0, canvasWidth, canvasHeight);
              ectx.drawImage(temp, 0, 0);
            }
          }
        } else {
          exportCanvas = renderCompositeToCanvas();
        }

        if (exportCanvas) {
          const a = document.createElement('a');
          a.download = `Background_${canvasWidth}x${canvasHeight}_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
          a.href = exportCanvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.94 : 1.0);
          a.click();
          showToast(`已导出 ${canvasWidth}×${canvasHeight} ${format.toUpperCase()} 背景图`);
        }
      } catch (err) {
        console.error('Export failed:', err);
        showToast('导出失败，请降低画布尺寸后重试');
      } finally {
        setIsExporting(false);
      }
    }, 20);
  };

  const handleCopyComposite = async () => {
    if (layers.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = renderCompositeToCanvas();
      if (!canvas) return;
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('生成图片数据失败');
          setIsExporting(false);
          return;
        }
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showToast('已复制背景图到剪贴板');
        } catch {
          showToast('剪贴板写入受限，请直接点击导出');
        } finally {
          setIsExporting(false);
        }
      }, 'image/png');
    } catch {
      setIsExporting(false);
      showToast('复制失败');
    }
  };

  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === selectedLayerId) || null,
    [layers, selectedLayerId]
  );

  // Inverse-scaled UI handle dimensions so handles remain crisp regardless of viewportZoom
  const handleSizePx = 11 / viewportZoom;
  const borderStrokePx = Math.max(1.2, 1.8 / viewportZoom);

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] w-full overflow-hidden bg-slate-100">
      {/* Top Action Toolbar */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Frame className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight whitespace-nowrap">
              背景图构建
            </h1>
            <span className="hidden md:inline text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
              {canvasWidth} × {canvasHeight} px · {layers.length} 个图层
            </span>
          </div>
        </div>

        {/* Mode & File Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Interaction mode segmented toggle */}
          {selectedLayer && (
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 bg-slate-100 border border-slate-200 rounded-lg mr-1">
              <button
                onClick={() => setInteractionMode('transform')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  interactionMode === 'transform'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>移动缩放</span>
              </button>
              <button
                onClick={() => setInteractionMode('crop')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  interactionMode === 'crop'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Crop className="w-3.5 h-3.5" />
                <span>画布裁剪</span>
              </button>
            </div>
          )}

          {layers.length > 0 && (
            <button
              onClick={handleAutoArrangeAll}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
              title="按当前图层顺序，全部等高缩放并横排铺满画布"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>自动横排铺排</span>
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>添加图片</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          <button
            onClick={handleCopyComposite}
            disabled={layers.length === 0 || isExporting}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>复制</span>
          </button>

          <button
            onClick={() => handleExport('jpeg')}
            disabled={layers.length === 0 || isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium whitespace-nowrap shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出 JPG</span>
          </button>

          <button
            onClick={() => handleExport('png')}
            disabled={layers.length === 0 || isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium whitespace-nowrap shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出 PNG</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left: Interactive Canvas Viewport */}
        <div
          ref={stageRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          onMouseDown={handleStageMouseDown}
          onWheel={handleStageWheel}
          className={`flex-1 relative overflow-hidden flex items-center justify-center select-none bg-slate-200/70 ${
            spacePressed || isPanningStage ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
        >
          {/* Floating Bottom-Left Viewport Controls */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs font-mono tabular-nums text-slate-600 pr-1.5">
              {canvasWidth}×{canvasHeight}
            </span>
            <div className="h-3.5 w-px bg-slate-200" />
            <button
              onClick={() => setViewportZoom((z) => clamp(parseFloat((z - 0.08).toFixed(3)), 0.08, 3))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
              title="缩小画布"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono tabular-nums text-slate-800 min-w-[42px] text-center">
              {Math.round(viewportZoom * 100)}%
            </span>
            <button
              onClick={() => setViewportZoom((z) => clamp(parseFloat((z + 0.08).toFixed(3)), 0.08, 3))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
              title="放大画布"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fitStageToScreen}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded whitespace-nowrap shrink-0"
              title="适配当前屏幕大小"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>适配屏幕</span>
            </button>
          </div>

          {/* Scaled Artboard Container */}
          <div
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `translate(${viewportPan.x}px, ${viewportPan.y}px) scale(${viewportZoom})`,
              transformOrigin: 'center center',
            }}
            className="relative shrink-0 shadow-2xl"
          >
            {/* Clipped Artboard Surface (WYSIWYG Output Frame) */}
            <div
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !spacePressed) {
                  setSelectedLayerId(null);
                }
              }}
              style={{
                width: canvasWidth,
                height: canvasHeight,
                backgroundColor: backgroundType === 'solid' ? backgroundColor : 'transparent',
                backgroundImage:
                  backgroundType === 'transparent'
                    ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)'
                    : 'none',
                backgroundSize: '32px 32px',
                backgroundPosition: '0 0, 0 16px, 16px -16px, -16px 0px',
              }}
              className="relative w-full h-full overflow-hidden ring-1 ring-slate-900/15"
            >
              {/* Render Empty State inside artboard when no layers */}
              {layers.length === 0 && (
                <div
                  style={{ transform: `scale(${1 / viewportZoom})` }}
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto"
                >
                  <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-lg">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-900">
                      拖入或粘贴多张竖屏图片开始构建背景
                    </h2>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      支持将 3 张左右竖图横向叠压拼接为桌面壁纸。可自由拖拽控制前后遮挡关系、单独裁剪边角、等比缩放与边缘渐变羽化。
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-2.5">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                      >
                        选择多张图片
                      </button>
                      <button
                        onClick={loadDemoIllustrations}
                        className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                      >
                        载入 3 张竖图示例
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">
                      也支持按 Ctrl+V 直接从剪贴板粘贴图片
                    </p>
                  </div>
                </div>
              )}

              {/* Render All Visible Layers in Z-Order */}
              {layers.map((layer) => {
                if (!layer.visible) return null;
                const geom = getLayerGeometry(layer);

                const fL = Math.min(layer.feather.left, geom.displayW * 0.48);
                const fR = Math.min(layer.feather.right, geom.displayW * 0.48);
                const fT = Math.min(layer.feather.top, geom.displayH * 0.48);
                const fB = Math.min(layer.feather.bottom, geom.displayH * 0.48);

                const hMask =
                  fL > 0 || fR > 0
                    ? `linear-gradient(to right, ${fL > 0 ? 'transparent' : 'black'} 0px, black ${fL}px, black ${Math.max(fL, geom.displayW - fR)}px, ${fR > 0 ? 'transparent' : 'black'} 100%)`
                    : undefined;

                const vMask =
                  fT > 0 || fB > 0
                    ? `linear-gradient(to bottom, ${fT > 0 ? 'transparent' : 'black'} 0px, black ${fT}px, black ${Math.max(fT, geom.displayH - fB)}px, ${fB > 0 ? 'transparent' : 'black'} 100%)`
                    : undefined;

                return (
                  <div
                    key={layer.id}
                    onMouseDown={(e) => startHandleDrag(e, 'move', layer)}
                    style={{
                      position: 'absolute',
                      left: layer.x,
                      top: layer.y,
                      width: geom.displayW,
                      height: geom.displayH,
                      opacity: layer.opacity,
                      cursor: spacePressed ? 'grab' : 'move',
                      WebkitMaskImage: hMask,
                      maskImage: hMask,
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        position: 'relative',
                        WebkitMaskImage: vMask,
                        maskImage: vMask,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={layer.src}
                        alt={layer.name}
                        draggable={false}
                        style={{
                          position: 'absolute',
                          left: geom.innerOffsetX,
                          top: geom.innerOffsetY,
                          width: geom.fullW,
                          height: geom.fullH,
                          maxWidth: 'none',
                          maxHeight: 'none',
                          pointerEvents: 'none',
                          userSelect: 'none',
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Smart Snap Guidelines */}
              {snapLines.map((line, i) => (
                <div
                  key={i}
                  style={
                    line.orientation === 'vertical'
                      ? {
                          position: 'absolute',
                          left: line.pos,
                          top: 0,
                          bottom: 0,
                          width: borderStrokePx,
                          backgroundColor: '#6366F1',
                          pointerEvents: 'none',
                          zIndex: 50,
                        }
                      : {
                          position: 'absolute',
                          top: line.pos,
                          left: 0,
                          right: 0,
                          height: borderStrokePx,
                          backgroundColor: '#6366F1',
                          pointerEvents: 'none',
                          zIndex: 50,
                        }
                  }
                />
              ))}
            </div>

            {/* Unclipped Interactive Overlay (Selection Frame, Scale Corners, Crop Ghost & Edge Handles) */}
            {selectedLayer && selectedLayer.visible && (() => {
              const geom = getLayerGeometry(selectedLayer);
              return (
                <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 60 }}>
                  {/* In Crop Mode, show ghosted full image footprint behind handles so user sees trimmed area */}
                  {interactionMode === 'crop' && (
                    <div
                      style={{
                        position: 'absolute',
                        left: selectedLayer.x + geom.innerOffsetX,
                        top: selectedLayer.y + geom.innerOffsetY,
                        width: geom.fullW,
                        height: geom.fullH,
                        opacity: 0.28,
                        pointerEvents: 'none',
                        outline: `${borderStrokePx}px dashed rgba(99,102,241,0.7)`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedLayer.src}
                        alt=""
                        draggable={false}
                        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
                      />
                    </div>
                  )}

                  {/* Active Selection / Crop Bounding Box */}
                  <div
                    style={{
                      position: 'absolute',
                      left: selectedLayer.x,
                      top: selectedLayer.y,
                      width: geom.displayW,
                      height: geom.displayH,
                      border: `${borderStrokePx}px solid ${interactionMode === 'crop' ? '#F59E0B' : '#4F46E5'}`,
                      boxSizing: 'border-box',
                    }}
                  >
                    {interactionMode === 'transform' ? (
                      <>
                        {(
                          [
                            { id: 'scale-nw', left: 0, top: 0, cursor: 'nwse-resize' },
                            { id: 'scale-ne', left: '100%', top: 0, cursor: 'nesw-resize' },
                            { id: 'scale-sw', left: 0, top: '100%', cursor: 'nesw-resize' },
                            { id: 'scale-se', left: '100%', top: '100%', cursor: 'nwse-resize' },
                          ] as const
                        ).map((corner) => (
                          <div
                            key={corner.id}
                            onMouseDown={(e) => startHandleDrag(e, corner.id, selectedLayer)}
                            style={{
                              position: 'absolute',
                              left: corner.left,
                              top: corner.top,
                              width: handleSizePx,
                              height: handleSizePx,
                              transform: 'translate(-50%, -50%)',
                              backgroundColor: '#FFFFFF',
                              border: `${borderStrokePx}px solid #4F46E5`,
                              borderRadius: Math.max(2, 2 / viewportZoom),
                              cursor: corner.cursor,
                              pointerEvents: 'auto',
                            }}
                          />
                        ))}
                      </>
                    ) : (
                      <>
                        {/* Top Crop Edge Handle */}
                        <div
                          onMouseDown={(e) => startHandleDrag(e, 'crop-top', selectedLayer)}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            width: Math.min(geom.displayW * 0.45, 44 / viewportZoom),
                            height: 8 / viewportZoom,
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: '#F59E0B',
                            border: `${borderStrokePx * 0.8}px solid #FFFFFF`,
                            borderRadius: 999,
                            cursor: 'ns-resize',
                            pointerEvents: 'auto',
                          }}
                          title="拖动裁剪顶部边缘"
                        />
                        {/* Bottom Crop Edge Handle */}
                        <div
                          onMouseDown={(e) => startHandleDrag(e, 'crop-bottom', selectedLayer)}
                          style={{
                            position: 'absolute',
                            left: '50%',
                            top: '100%',
                            width: Math.min(geom.displayW * 0.45, 44 / viewportZoom),
                            height: 8 / viewportZoom,
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: '#F59E0B',
                            border: `${borderStrokePx * 0.8}px solid #FFFFFF`,
                            borderRadius: 999,
                            cursor: 'ns-resize',
                            pointerEvents: 'auto',
                          }}
                          title="拖动裁剪底部边缘"
                        />
                        {/* Left Crop Edge Handle */}
                        <div
                          onMouseDown={(e) => startHandleDrag(e, 'crop-left', selectedLayer)}
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            width: 8 / viewportZoom,
                            height: Math.min(geom.displayH * 0.45, 44 / viewportZoom),
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: '#F59E0B',
                            border: `${borderStrokePx * 0.8}px solid #FFFFFF`,
                            borderRadius: 999,
                            cursor: 'ew-resize',
                            pointerEvents: 'auto',
                          }}
                          title="拖动裁剪左侧边缘"
                        />
                        {/* Right Crop Edge Handle */}
                        <div
                          onMouseDown={(e) => startHandleDrag(e, 'crop-right', selectedLayer)}
                          style={{
                            position: 'absolute',
                            left: '100%',
                            top: '50%',
                            width: 8 / viewportZoom,
                            height: Math.min(geom.displayH * 0.45, 44 / viewportZoom),
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: '#F59E0B',
                            border: `${borderStrokePx * 0.8}px solid #FFFFFF`,
                            borderRadius: 999,
                            cursor: 'ew-resize',
                            pointerEvents: 'auto',
                          }}
                          title="拖动裁剪右侧边缘"
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right: Inspector & Layer Control Panel */}
        <aside className="w-full lg:w-[376px] border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col h-80 lg:h-full overflow-y-auto shrink-0 divide-y divide-slate-200">
          {/* 1. Canvas Resolution & Ratio Presets */}
          <section className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900">画布比例与尺寸</h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {canvasWidth} × {canvasHeight}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {CANVAS_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                    presetId === p.id
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-medium whitespace-nowrap truncate">{p.label}</div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-500">{p.ratioLabel}</div>
                </button>
              ))}
              <button
                onClick={() => setPresetId('custom')}
                className={`px-2 py-1.5 rounded-lg border text-left transition-colors ${
                  presetId === 'custom'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-medium whitespace-nowrap">自定义</div>
                <div className="text-[11px] font-mono text-slate-500">自由宽高</div>
              </button>
            </div>

            {/* Custom W × H numeric inputs */}
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] text-slate-500 block mb-1">画布宽度 (px)</span>
                <input
                  type="number"
                  min={320}
                  max={7680}
                  step={10}
                  value={draftWidth}
                  onChange={(e) => setDraftWidth(e.target.value)}
                  onBlur={() => {
                    const v = parseInt(draftWidth, 10);
                    if (!isNaN(v)) resizeCanvas(v, canvasHeight, 'custom');
                    else setDraftWidth(String(canvasWidth));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const v = parseInt(draftWidth, 10);
                      if (!isNaN(v)) resizeCanvas(v, canvasHeight, 'custom');
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded-md text-xs font-mono tabular-nums focus:outline-none focus:border-indigo-500"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-slate-500 block mb-1">画布高度 (px)</span>
                <input
                  type="number"
                  min={320}
                  max={4320}
                  step={10}
                  value={draftHeight}
                  onChange={(e) => setDraftHeight(e.target.value)}
                  onBlur={() => {
                    const v = parseInt(draftHeight, 10);
                    if (!isNaN(v)) resizeCanvas(canvasWidth, v, 'custom');
                    else setDraftHeight(String(canvasHeight));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const v = parseInt(draftHeight, 10);
                      if (!isNaN(v)) resizeCanvas(canvasWidth, v, 'custom');
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full px-2.5 py-1 border border-slate-200 rounded-md text-xs font-mono tabular-nums focus:outline-none focus:border-indigo-500"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={scaleWithCanvas}
                onChange={(e) => setScaleWithCanvas(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>切换画布尺寸时等比缩放现有图层</span>
            </label>

            {/* Canvas Background Color */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-600">画布底色</span>
              <div className="flex items-center gap-1.5">
                {BG_SWATCHES.map((sw) => (
                  <button
                    key={sw.color}
                    onClick={() => {
                      setBackgroundType('solid');
                      setBackgroundColor(sw.color);
                    }}
                    title={sw.label}
                    style={{ backgroundColor: sw.color }}
                    className={`w-5 h-5 rounded border transition-transform ${
                      backgroundType === 'solid' && backgroundColor.toLowerCase() === sw.color.toLowerCase()
                        ? 'border-indigo-600 ring-2 ring-indigo-500/30 scale-110'
                        : 'border-slate-300'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => {
                    setBackgroundType('solid');
                    setBackgroundColor(e.target.value);
                  }}
                  title="自定义底色"
                  className="w-5 h-5 p-0 border border-slate-300 rounded cursor-pointer bg-white"
                />
                <button
                  onClick={() => setBackgroundType('transparent')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                    backgroundType === 'transparent'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  透明
                </button>
              </div>
            </div>
          </section>

          {/* 2. Layer Stack (Z-Order Control) */}
          <section className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>图层叠放顺序</span>
              </h2>
              <span className="text-[11px] text-slate-400">上方图层覆盖下方</span>
            </div>

            {layers.length === 0 ? (
              <div className="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                暂无图层 · 添加或粘贴竖图后可在此调整前后遮挡
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {[...layers].reverse().map((layer, revIdx) => {
                  const realIdx = layers.length - 1 - revIdx;
                  const isTop = realIdx === layers.length - 1;
                  const isBottom = realIdx === 0;
                  const isSelected = layer.id === selectedLayerId;

                  return (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/80' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      {/* Thumbnail */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={layer.src}
                        alt={layer.name}
                        className="w-9 h-9 rounded object-cover border border-slate-200 shrink-0 bg-slate-100"
                      />

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-900 truncate">
                          {layer.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                          {layer.naturalWidth}×{layer.naturalHeight} · {Math.round(layer.scale * 100)}%
                        </div>
                      </div>

                      {/* Layer Controls */}
                      <div
                        className="flex items-center gap-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setLayers((prev) =>
                              prev.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l))
                            )
                          }
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title={layer.visible ? '隐藏图层' : '显示图层'}
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => moveLayerOrder(layer.id, 'up')}
                          disabled={isTop}
                          className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 disabled:opacity-25"
                          title="上移一层（盖住下方图片）"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveLayerOrder(layer.id, 'down')}
                          disabled={isBottom}
                          className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 disabled:opacity-25"
                          title="下移一层（退到后方）"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setLayers((prev) => prev.filter((l) => l.id !== layer.id));
                            if (selectedLayerId === layer.id) setSelectedLayerId(null);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="删除图层"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 3. Selected Layer Properties (Scale, Position, Crop, Edge Feathering) */}
          <section className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>选中图层精调</span>
              </h2>
              {selectedLayer && (
                <button
                  onClick={() =>
                    setInteractionMode((m) => (m === 'crop' ? 'transform' : 'crop'))
                  }
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                    interactionMode === 'crop'
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Crop className="w-3 h-3" />
                  <span>{interactionMode === 'crop' ? '完成裁剪' : '在画布裁剪'}</span>
                </button>
              )}
            </div>

            {!selectedLayer ? (
              <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                在画布或图层列表中点击任意图片，可在此调整缩放、裁剪与边缘羽化融合
              </div>
            ) : (
              <div className="space-y-4">
                {/* Quick Align & Fit Helpers */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={fitSelectedHeight}
                    className="col-span-2 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-md text-xs text-slate-700 font-medium whitespace-nowrap transition-colors"
                    title="等比缩放使图片高度恰好等于画布高度"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                    <span>撑满高度</span>
                  </button>
                  <button
                    onClick={() => alignSelected('left')}
                    className="inline-flex items-center justify-center px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-700"
                    title="靠画布左侧贴边"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => alignSelected('right')}
                    className="inline-flex items-center justify-center px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-700"
                    title="靠画布右侧贴边"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scale & Position */}
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">缩放比例</span>
                      <span className="font-mono tabular-nums text-slate-800">
                        {Math.round(selectedLayer.scale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={250}
                      value={Math.round(selectedLayer.scale * 100)}
                      onChange={(e) => {
                        const s = clamp(parseInt(e.target.value) / 100, 0.05, 5);
                        updateSelectedLayer((l) => ({ ...l, scale: s }));
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-[11px] text-slate-500 block mb-0.5">X (px)</span>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.x)}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          updateSelectedLayer((l) => ({ ...l, x: v }));
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono tabular-nums"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-slate-500 block mb-0.5">Y (px)</span>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.y)}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          updateSelectedLayer((l) => ({ ...l, y: v }));
                        }}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono tabular-nums"
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        onClick={() => alignSelected('center')}
                        className="w-full py-1 px-2 border border-slate-200 hover:bg-slate-50 rounded text-xs text-slate-700 inline-flex items-center justify-center gap-1"
                        title="水平居中"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                        <span>居中</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Non-Destructive Crop Insets */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">四边裁剪比例 (%)</span>
                    <button
                      onClick={resetSelectedCrop}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>还原裁剪</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { key: 'left', label: '左' },
                        { key: 'right', label: '右' },
                        { key: 'top', label: '上' },
                        { key: 'bottom', label: '下' },
                      ] as const
                    ).map((side) => (
                      <label key={side.key} className="block">
                        <span className="text-[11px] text-slate-500 block mb-0.5">{side.label}</span>
                        <input
                          type="number"
                          min={0}
                          max={45}
                          step={1}
                          value={Math.round(selectedLayer.crop[side.key] * 100)}
                          onChange={(e) => {
                            const frac = clamp((parseInt(e.target.value) || 0) / 100, 0, 0.45);
                            updateSelectedLayer((l) => ({
                              ...l,
                              crop: { ...l.crop, [side.key]: frac },
                            }));
                          }}
                          className="w-full px-1.5 py-1 border border-slate-200 rounded text-xs font-mono tabular-nums"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Edge Feathering (Overlap Blending) */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">边缘渐变羽化融合</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateSelectedLayer((l) => ({
                            ...l,
                            feather: { ...l.feather, left: 120, right: 120 },
                          }))
                        }
                        className="text-[11px] text-indigo-600 hover:underline"
                      >
                        左右柔化
                      </button>
                      <button
                        onClick={() =>
                          updateSelectedLayer((l) => ({
                            ...l,
                            feather: { left: 0, right: 0, top: 0, bottom: 0 },
                          }))
                        }
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        清零
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                      <span>左边缘羽化</span>
                      <span className="font-mono tabular-nums">{selectedLayer.feather.left} px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={400}
                      step={5}
                      value={selectedLayer.feather.left}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        updateSelectedLayer((l) => ({ ...l, feather: { ...l.feather, left: v } }));
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                      <span>右边缘羽化</span>
                      <span className="font-mono tabular-nums">{selectedLayer.feather.right} px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={400}
                      step={5}
                      value={selectedLayer.feather.right}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        updateSelectedLayer((l) => ({ ...l, feather: { ...l.feather, right: v } }));
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                        <span>上羽化</span>
                        <span className="font-mono tabular-nums">{selectedLayer.feather.top}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={300}
                        step={5}
                        value={selectedLayer.feather.top}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          updateSelectedLayer((l) => ({ ...l, feather: { ...l.feather, top: v } }));
                        }}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                        <span>下羽化</span>
                        <span className="font-mono tabular-nums">{selectedLayer.feather.bottom}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={300}
                        step={5}
                        value={selectedLayer.feather.bottom}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          updateSelectedLayer((l) => ({ ...l, feather: { ...l.feather, bottom: v } }));
                        }}
                        className="w-full accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                      <span>图层不透明度</span>
                      <span className="font-mono tabular-nums">{Math.round(selectedLayer.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={Math.round(selectedLayer.opacity * 100)}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) / 100;
                        updateSelectedLayer((l) => ({ ...l, opacity: v }));
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>

      {/* Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 pointer-events-none">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

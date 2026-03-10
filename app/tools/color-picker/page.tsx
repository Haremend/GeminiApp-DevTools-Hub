'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check } from 'lucide-react';

export default function ColorPickerTool() {
  const [color, setColor] = useState('#6366f1');
  const [copiedHex, setCopiedHex] = useState(false);
  const [copiedRgb, setCopiedRgb] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Convert HEX to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
      : 'rgb(0, 0, 0)';
  };

  const rgbString = hexToRgb(color);

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

  // Draw gradient on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create horizontal gradient (white to color)
    const gradientH = ctx.createLinearGradient(0, 0, width, 0);
    gradientH.addColorStop(0, '#ffffff');
    gradientH.addColorStop(1, color);
    ctx.fillStyle = gradientH;
    ctx.fillRect(0, 0, width, height);

    // Create vertical gradient (transparent to black)
    const gradientV = ctx.createLinearGradient(0, 0, 0, height);
    gradientV.addColorStop(0, 'rgba(0,0,0,0)');
    gradientV.addColorStop(1, '#000000');
    ctx.fillStyle = gradientV;
    ctx.fillRect(0, 0, width, height);
  }, [color]);

  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    
    // Scale coordinates to canvas internal resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    // We don't update the base color here to keep the gradient stable,
    // but we could update a "selected color" state.
    // For simplicity, we'll just let the native color picker drive the base hue.
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Color Picker</h1>
        <p className="mt-2 text-gray-600">Select a color to get its HEX and RGB values for your CSS.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Visual Picker */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Base Hue</label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-12 w-full cursor-pointer rounded-lg border-0 p-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gradient Map (Interactive)</label>
              <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={300}
                  className="w-full h-48 sm:h-64 cursor-crosshair touch-none"
                  onMouseDown={(e) => { setIsDragging(true); handleCanvasInteraction(e); }}
                  onMouseMove={handleCanvasInteraction}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                  onTouchStart={(e) => { setIsDragging(true); handleCanvasInteraction(e); }}
                  onTouchMove={handleCanvasInteraction}
                  onTouchEnd={() => setIsDragging(false)}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Note: The gradient map shows variations of the base hue. Click/drag is visual only in this simple version. Use the Base Hue picker to change the actual color output below.
              </p>
            </div>
          </div>

          {/* Right Column: Outputs */}
          <div className="space-y-6 flex flex-col justify-center">
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-gray-100 shadow-sm" style={{ backgroundColor: color }}>
              <div className={`text-center p-4 rounded-xl backdrop-blur-md bg-white/30 ${
                // Simple contrast check
                parseInt(color.replace('#', ''), 16) > 0xffffff / 2 ? 'text-gray-900' : 'text-white'
              }`}>
                <p className="text-lg font-medium opacity-90">Preview</p>
                <p className="text-3xl font-bold mt-1">{color.toUpperCase()}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* HEX Output */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HEX Code</label>
                <div className="flex mt-1 rounded-md shadow-sm">
                  <div className="relative flex items-stretch flex-grow focus-within:z-10">
                    <input
                      type="text"
                      readOnly
                      value={color.toUpperCase()}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 bg-gray-50 font-mono text-gray-900 px-4 py-3"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(color.toUpperCase(), 'hex')}
                    className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    {copiedHex ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                    <span>{copiedHex ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* RGB Output */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RGB Code</label>
                <div className="flex mt-1 rounded-md shadow-sm">
                  <div className="relative flex items-stretch flex-grow focus-within:z-10">
                    <input
                      type="text"
                      readOnly
                      value={rgbString}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 bg-gray-50 font-mono text-gray-900 px-4 py-3"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(rgbString, 'rgb')}
                    className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    {copiedRgb ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                    <span>{copiedRgb ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Upload, Trash2, Settings2, Type } from 'lucide-react';

export default function QrGeneratorTool() {
  const [value, setValue] = useState('https://example.com');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [level, setLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [includeMargin, setIncludeMargin] = useState(true);
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState(24);
  const [excavate, setExcavate] = useState(true);

  const [textPosition, setTextPosition] = useState<'none' | 'top' | 'bottom'>('none');
  const [labelText, setLabelText] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(16);

  const qrRef = useRef<HTMLDivElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
    e.target.value = '';
  };

  const removeLogo = () => {
    if (logoUrl) {
      URL.revokeObjectURL(logoUrl);
    }
    setLogoUrl(null);
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    if (textPosition === 'none' || !labelText.trim()) {
      // Standard download
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qrcode.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Download with text
    const padding = 20;
    const lineHeight = fontSize * 1.5;
    const text = labelText.trim();

    const tempCanvas = document.createElement('canvas');
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    tCtx.font = `${fontSize}px sans-serif`;
    const maxWidth = canvas.width;
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    paragraphs.forEach(p => {
      let currentLine = '';
      for (let i = 0; i < p.length; i++) {
        const char = p[i];
        const testLine = currentLine + char;
        const metrics = tCtx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);
    });

    const textHeight = lines.length * lineHeight;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width + padding * 2;
    finalCanvas.height = canvas.height + padding * 2 + textHeight + padding;

    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    const qrY = textPosition === 'top' ? padding * 2 + textHeight : padding;
    const textY = textPosition === 'top' ? padding + fontSize : padding * 2 + canvas.height + fontSize;

    // Draw QR Code
    ctx.drawImage(canvas, padding, qrY);

    // Draw Text
    ctx.fillStyle = textColor;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    lines.forEach((line, index) => {
      ctx.fillText(line, finalCanvas.width / 2, textY + index * lineHeight);
    });

    const url = finalCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qrcode-with-text.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">QR Code Generator</h1>
        <p className="mt-2 text-gray-600">Create customizable QR codes with colors, logos, and different error correction levels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            
            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Content (URL, Text, etc.)</label>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter text or URL here..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 resize-none h-24"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Colors */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Settings2 className="w-4 h-4 mr-2" /> Colors
                </h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Foreground Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="flex-1 p-2 text-sm border border-gray-300 rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Background Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 p-2 text-sm border border-gray-300 rounded-lg font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Settings2 className="w-4 h-4 mr-2" /> Properties
                </h3>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Error Correction Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="L">Low (7%)</option>
                    <option value="M">Medium (15%)</option>
                    <option value="Q">Quartile (25%)</option>
                    <option value="H">High (30%) - Best for logos</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <label className="text-sm text-gray-700">Include Border (Margin)</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={includeMargin}
                      onChange={(e) => setIncludeMargin(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Text Label Settings */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Type className="w-4 h-4 mr-2" /> Text Label (On Export)
              </h3>
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Label Text</label>
                <input
                  type="text"
                  value={labelText}
                  onChange={(e) => setLabelText(e.target.value)}
                  placeholder="Enter text to display..."
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Position</label>
                  <select
                    value={textPosition}
                    onChange={(e) => setTextPosition(e.target.value as any)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="none">None</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                {textPosition !== 'none' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Text Color</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="flex-1 p-2 text-sm border border-gray-300 rounded-lg font-mono uppercase"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Font Size: {fontSize}px</label>
                      <input 
                        type="range" 
                        min="10" 
                        max="40" 
                        value={fontSize} 
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full mt-2"
                      />
                    </div>
                  </>
                )}
              </div>
              {textPosition !== 'none' && (
                <p className="text-xs text-gray-500 mt-2">
                  * Text will be wrapped automatically and added to the downloaded image.
                </p>
              )}
            </div>

            {/* Logo Upload */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Center Logo (Optional)</h3>
              {!logoUrl ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload a logo to place in the center</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="flex items-center space-x-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Logo preview" className="w-10 h-10 object-contain bg-white rounded border border-gray-200" />
                      <span className="text-sm font-medium text-gray-700">Custom Logo</span>
                    </div>
                    <button 
                      onClick={removeLogo}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Logo Size: {logoSize}%</label>
                      <input 
                        type="range" 
                        min="10" 
                        max="40" 
                        value={logoSize} 
                        onChange={(e) => setLogoSize(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700">Excavate Background</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={excavate}
                          onChange={(e) => setExcavate(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 w-full text-center">Preview</h2>
            
            <div 
              className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner flex flex-col items-center justify-center mb-6 w-full"
              style={{ backgroundColor: bgColor }}
            >
              {textPosition === 'top' && labelText.trim() && (
                <div 
                  className="mb-4 text-center break-all whitespace-pre-wrap" 
                  style={{ color: textColor, fontSize: `${fontSize}px` }}
                >
                  {labelText}
                </div>
              )}
              
              <div ref={qrRef}>
                <QRCodeCanvas
                  value={value || ' '}
                  size={256}
                  bgColor={bgColor}
                  fgColor={fgColor}
                  level={level}
                  includeMargin={includeMargin}
                  imageSettings={logoUrl ? {
                    src: logoUrl,
                    height: 256 * (logoSize / 100),
                    width: 256 * (logoSize / 100),
                    excavate: excavate,
                  } : undefined}
                  className="max-w-full h-auto shadow-sm rounded-sm"
                />
              </div>

              {textPosition === 'bottom' && labelText.trim() && (
                <div 
                  className="mt-4 text-center break-all whitespace-pre-wrap" 
                  style={{ color: textColor, fontSize: `${fontSize}px` }}
                >
                  {labelText}
                </div>
              )}
            </div>

            <button
              onClick={downloadQR}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Download className="w-5 h-5" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

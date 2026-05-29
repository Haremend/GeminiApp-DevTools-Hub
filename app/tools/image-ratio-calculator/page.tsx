'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, ArrowDownRight, ArrowUpRight, Maximize, Copy, Check } from 'lucide-react';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export default function ImageRatioCalculatorPage() {
  const [width, setWidth] = useState<string>('1920');
  const [height, setHeight] = useState<string>('1536');

  const [mode, setMode] = useState<'step' | 'multiplier'>('step');

  // Step mode states
  const [direction, setDirection] = useState<'-1' | '1'>('-1');
  const [maxCount, setMaxCount] = useState<string>('20');
  const [minWidth, setMinWidth] = useState<string>('');
  const [maxWidth, setMaxWidth] = useState<string>('');
  const [minHeight, setMinHeight] = useState<string>('');
  const [maxHeight, setMaxHeight] = useState<string>('');

  // Multiplier mode states
  const [scaleFactor, setScaleFactor] = useState<string>('0.8');

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const numWidth = parseInt(width, 10);
  const numHeight = parseInt(height, 10);
  const isValidBase = !isNaN(numWidth) && numWidth > 0 && !isNaN(numHeight) && numHeight > 0;

  const stepResults = useMemo(() => {
    if (mode !== 'step' || !isValidBase) return [];
    
    const count = parseInt(maxCount, 10) || 20;
    const dir = parseInt(direction, 10) as -1 | 1;
    
    const minW = minWidth ? parseInt(minWidth, 10) : undefined;
    const maxW = maxWidth ? parseInt(maxWidth, 10) : undefined;
    const minH = minHeight ? parseInt(minHeight, 10) : undefined;
    const maxH = maxHeight ? parseInt(maxHeight, 10) : undefined;

    const g = gcd(numWidth, numHeight);
    const w0 = Math.floor(numWidth / g);
    const h0 = Math.floor(numHeight / g);
    const origK = g;

    const inRange = (w: number, h: number) => {
      if (minW !== undefined && !isNaN(minW) && w < minW) return false;
      if (maxW !== undefined && !isNaN(maxW) && w > maxW) return false;
      if (minH !== undefined && !isNaN(minH) && h < minH) return false;
      if (maxH !== undefined && !isNaN(maxH) && h > maxH) return false;
      return true;
    };

    const results: Array<[number, number]> = [];

    if (dir === -1) {
      for (let k = origK - 1; k > 0; k--) {
        const w = w0 * k;
        const h = h0 * k;
        if (inRange(w, h)) {
          results.push([w, h]);
        }
        if (results.length >= count) break;
      }
    } else {
      for (let k = origK + 1; ; k++) {
        const w = w0 * k;
        const h = h0 * k;
        
        if (maxW !== undefined && !isNaN(maxW) && w > maxW) break;
        if (maxH !== undefined && !isNaN(maxH) && h > maxH) break;
        
        if (inRange(w, h)) {
          results.push([w, h]);
        }
        
        if (results.length >= count) break;
        if (k > origK + 10000) break; // safety cutoff
      }
    }

    return results;
  }, [mode, isValidBase, width, height, direction, maxCount, minWidth, maxWidth, minHeight, maxHeight]);

  const multiplierResult = useMemo(() => {
    if (mode !== 'multiplier' || !isValidBase) return null;
    const scale = parseFloat(scaleFactor);
    if (isNaN(scale) || scale <= 0) return null;
    return [Math.round(numWidth * scale), Math.round(numHeight * scale)];
  }, [mode, isValidBase, width, height, scaleFactor]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-indigo-600" />
          Image Ratio Calculator
        </h1>
        <p className="text-gray-500 text-base mt-2">
          Calculate precise proportional image sizes using GCD step scaling or float multipliers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Base Dimensions Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Maximize className="w-5 h-5 text-indigo-500" />
              Original Dimensions
            </h2>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Width (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="e.g. 1920"
                />
              </div>
              <div className="flex items-end pb-3 text-gray-400 font-bold">×</div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="e.g. 1536"
                />
              </div>
            </div>
            {isValidBase && (
               <div className="text-sm text-indigo-600 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 flex justify-between items-center">
                 <span>Aspect Ratio (approx): {(numWidth / numHeight).toFixed(2)}</span>
                 <span>GCD Unit: {Math.floor(numWidth / gcd(numWidth, numHeight))} × {Math.floor(numHeight / gcd(numWidth, numHeight))}</span>
               </div>
            )}
          </div>

          {/* Mode Selector */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setMode('step')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === 'step' 
                  ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              Step Ratio Sizes
            </button>
            <button
              onClick={() => setMode('multiplier')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                mode === 'multiplier' 
                  ? 'bg-white text-indigo-700 shadow-sm border border-gray-200/50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              Multiplier Scale
            </button>
          </div>

          {/* Settings Card */}
          {mode === 'step' ? (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">
               <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                      <select
                        value={direction}
                        onChange={(e) => setDirection(e.target.value as '-1' | '1')}
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="-1">Shrink (-1)</option>
                        <option value="1">Enlarge (1)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Count</label>
                      <input
                        type="number"
                        value={maxCount}
                        onChange={(e) => setMaxCount(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. 20"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <span className="block text-sm font-medium text-gray-800 mb-3">Bounds Constraints (Optional)</span>
                    <div className="grid grid-cols-2 gap-4 gap-y-3">
                      <div>
                        <input type="number" value={minWidth} onChange={(e) => setMinWidth(e.target.value)} placeholder="Min Width" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                      </div>
                      <div>
                        <input type="number" value={maxWidth} onChange={(e) => setMaxWidth(e.target.value)} placeholder="Max Width" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                      </div>
                      <div>
                        <input type="number" value={minHeight} onChange={(e) => setMinHeight(e.target.value)} placeholder="Min Height" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                      </div>
                      <div>
                        <input type="number" value={maxHeight} onChange={(e) => setMaxHeight(e.target.value)} placeholder="Max Height" className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                      </div>
                    </div>
                  </div>
               </div>
             </div>
          ) : (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scale Factor (e.g. 0.8)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={scaleFactor}
                    onChange={(e) => setScaleFactor(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0.8"
                  />
               </div>
             </div>
          )}
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 flex flex-col h-full min-h-[400px]">
            <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
              <span className="font-semibold text-base text-indigo-900 flex items-center gap-2">
                {mode === 'step' ? (direction === '-1' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />) : <Calculator className="w-5 h-5"/>}
                Computed Results
              </span>
              {mode === 'step' && (
                 <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md">
                   {stepResults.length} sizes found
                 </span>
              )}
            </div>

            <div className="p-6 flex-grow bg-gray-50/50">
              {mode === 'step' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stepResults.map((dims, i) => (
                    <div key={i} className="flex items-center justify-between group bg-white border border-gray-200 p-3 rounded-xl shadow-sm hover:border-indigo-300 transition-colors">
                      <div className="flex items-center gap-2">
                         <span className="w-6 text-xs text-gray-400 font-mono text-right">{i+1}.</span>
                         <span className="font-mono text-gray-800 font-medium">{dims[0]} × {dims[1]}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`${dims[0]} × ${dims[1]}`, i)}
                        className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                        title="Copy dimensions"
                      >
                        {copiedIndex === i ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                  {stepResults.length === 0 && (
                     <div className="col-span-full py-12 text-center text-gray-400 text-sm">
                       No results found for these constraints.
                     </div>
                  )}
                </div>
              )}

              {mode === 'multiplier' && (
                 <div className="flex flex-col items-center justify-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
                    {multiplierResult ? (
                       <div className="flex items-center flex-col gap-6">
                         <div className="flex items-center gap-6">
                           <div className="text-center">
                             <span className="block text-xs font-semibold text-gray-400 tracking-wide uppercase mb-1">Original</span>
                             <span className="font-mono text-lg text-gray-600">{numWidth} × {numHeight}</span>
                           </div>
                           <div className="text-gray-300">
                             <ArrowUpRight className="w-6 h-6 rotate-45" />
                           </div>
                           <div className="text-center">
                             <span className="block text-xs font-semibold text-indigo-500 tracking-wide uppercase mb-1">{scaleFactor}x Scale</span>
                             <span className="font-mono text-2xl font-bold text-gray-900">{multiplierResult[0]} × {multiplierResult[1]}</span>
                           </div>
                         </div>
                         <button
                           onClick={() => copyToClipboard(`${multiplierResult[0]} × ${multiplierResult[1]}`, 9999)}
                           className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                         >
                           {copiedIndex === 9999 ? (
                             <><Check className="w-4 h-4" /> Copied!</>
                           ) : (
                             <><Copy className="w-4 h-4" /> Copy Size</>
                           )}
                         </button>
                       </div>
                    ) : (
                       <div className="text-gray-400 text-sm text-center">
                         Enter a valid scale factor to preview dimensions.
                       </div>
                    )}
                 </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

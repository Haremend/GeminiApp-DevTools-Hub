'use client';

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { Upload, Camera, Copy, Check, XCircle, RefreshCw } from 'lucide-react';

export default function QrScannerTool() {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // Stop camera when unmounting or switching modes
  useEffect(() => {
    return () => stopCamera();
  }, [mode]);

  const startCamera = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // required to tell iOS safari we don't want fullscreen
        videoRef.current.play();
        setIsScanning(true);
        requestRef.current = requestAnimationFrame(tick);
      }
    } catch (err: any) {
      setError('Could not access camera. Please ensure you have granted permissions.');
      setIsScanning(false);
    }
  };

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          
          if (code) {
            setResult(code.data);
            stopCamera();
            return; // Stop ticking
          }
        }
      }
    }
    if (isScanning) {
      requestRef.current = requestAnimationFrame(tick);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setResult(null);
    
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Failed to process image.');
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      
      if (code) {
        setResult(code.data);
      } else {
        setError('No QR code found in the image. Please try another one.');
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError('Failed to load image.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = '';
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">QR Code Scanner</h1>
        <p className="mt-2 text-gray-600">Decode QR codes by uploading an image or scanning directly with your camera.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setMode('upload'); stopCamera(); setResult(null); setError(null); }}
            className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
              mode === 'upload' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>Upload Image</span>
          </button>
          <button
            onClick={() => { setMode('camera'); setResult(null); setError(null); }}
            className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center space-x-2 transition-colors ${
              mode === 'camera' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Use Camera</span>
          </button>
        </div>

        <div className="p-6 md:p-8">
          {/* Scanner Area */}
          <div className="mb-8">
            {mode === 'upload' ? (
              <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
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
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-md aspect-square bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                  {!isScanning && !result && (
                    <button 
                      onClick={startCamera}
                      className="absolute z-10 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg flex items-center space-x-2"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Start Camera</span>
                    </button>
                  )}
                  <video 
                    ref={videoRef} 
                    className={`w-full h-full object-cover ${!isScanning ? 'hidden' : ''}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {isScanning && (
                    <div className="absolute inset-0 pointer-events-none border-2 border-indigo-500/50 m-8 rounded-xl flex items-center justify-center">
                      <div className="w-full h-0.5 bg-indigo-500/50 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                    </div>
                  )}
                </div>
                {isScanning && (
                  <button 
                    onClick={stopCamera}
                    className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Stop Scanning
                  </button>
                )}
                {result && mode === 'camera' && (
                  <button 
                    onClick={() => { setResult(null); startCamera(); }}
                    className="mt-4 flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition-colors font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Scan Another</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Results Area */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start space-x-3">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-green-900">Scan Result</h3>
                <button
                  onClick={copyToClipboard}
                  className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    copied ? 'bg-green-200 text-green-800' : 'bg-white text-green-700 hover:bg-green-100 border border-green-200'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm overflow-auto max-h-64">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 break-all">
                  {result}
                </pre>
              </div>
              
              {/* If result looks like a URL, offer a quick link */}
              {/^https?:\/\//i.test(result) && (
                <div className="mt-4">
                  <a 
                    href={result} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Open Link in New Tab &rarr;
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

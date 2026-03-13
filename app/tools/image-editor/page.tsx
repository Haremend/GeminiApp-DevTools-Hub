'use client';

import { useState, useRef } from 'react';
import { Upload, Download, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

export default function ImageEditorTool() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSourceImage(url);
    setResultImage(url);
    e.target.value = '';
  };

  const openEditor = async () => {
    if (imgRef.current) {
      // Dynamically import markerjs2 to avoid SSR issues
      const markerjs2 = await import('markerjs2');
      const markerArea = new markerjs2.MarkerArea(imgRef.current);
      
      markerArea.settings.displayMode = 'popup';
      
      markerArea.addEventListener('render', (event) => {
        setResultImage(event.dataUrl);
      });
      
      markerArea.show();
    }
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = 'edited-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const clearImage = () => {
    if (sourceImage) URL.revokeObjectURL(sourceImage);
    setSourceImage(null);
    setResultImage(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Image Editor</h1>
        <p className="mt-2 text-gray-600">Annotate images with arrows, text, freehand drawing, mosaic, and cropping.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {!sourceImage ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="w-full max-w-md h-64 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleUpload} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">Click or drag image to upload</p>
              <p className="text-sm text-gray-500 mt-1">Supports PNG, JPG, WEBP</p>
            </div>
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center">
            {/* Toolbar */}
            <div className="w-full flex justify-between items-center mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center space-x-4">
                <button
                  onClick={openEditor}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Image</span>
                </button>
                <button
                  onClick={clearImage}
                  className="flex items-center space-x-2 bg-white hover:bg-red-50 text-red-600 border border-gray-200 hover:border-red-200 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              </div>
              <button
                onClick={downloadImage}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>

            {/* Image Display */}
            <div className="relative w-full max-w-4xl bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center min-h-[400px] p-4">
              {/* Visible result image that markerjs2 attaches to */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                ref={imgRef}
                src={resultImage || sourceImage} 
                alt="Result" 
                className="max-w-full max-h-[70vh] object-contain shadow-sm rounded"
                crossOrigin="anonymous"
              />
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Click &quot;Edit Image&quot; to open the annotation tools (arrows, text, mosaic, crop, etc.)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

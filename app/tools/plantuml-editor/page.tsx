'use client';

import { useState, useEffect } from 'react';
import plantumlEncoder from 'plantuml-encoder';
import { Download, Play, ExternalLink, Image as ImageIcon } from 'lucide-react';

const DEFAULT_CODE = `@startuml
skinparam handwritten true
skinparam monochrome true

actor User
participant "Web Client" as Client
participant "API Server" as Server
database "Database" as DB

User -> Client: Enter credentials
activate Client

Client -> Server: POST /login
activate Server

Server -> DB: Query user
activate DB
DB --> Server: User data
deactivate DB

alt valid credentials
    Server --> Client: 200 OK + Token
else invalid credentials
    Server --> Client: 401 Unauthorized
end
deactivate Server

Client --> User: Show dashboard/error
deactivate Client
@enduml`;

export default function PlantUmlEditorTool() {
  const [code, setCode] = useState(DEFAULT_CODE);
  
  let encoded = '';
  try {
    encoded = plantumlEncoder.encode(code);
  } catch (err) {
    console.error('Failed to encode PlantUML', err);
  }

  const svgUrl = encoded ? `https://www.plantuml.com/plantuml/svg/${encoded}` : '';
  const pngUrl = encoded ? `https://www.plantuml.com/plantuml/png/${encoded}` : '';

  const downloadImage = async (format: 'png' | 'svg') => {
    if (!encoded) return;
    
    // For PlantUML, downloading directly via fetch might hit CORS issues depending on the browser.
    // The safest cross-origin way is to open the image in a new tab, or use an anchor tag.
    const url = format === 'png' ? pngUrl : svgUrl;
    
    try {
      // Try to fetch and download to force a download prompt instead of just opening
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `plantuml-diagram.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PlantUML Editor</h1>
          <p className="mt-2 text-gray-600">Generate UML diagrams from plain text using PlantUML syntax.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => downloadImage('svg')}
            disabled={!encoded}
            className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>SVG</span>
          </button>
          <button
            onClick={() => downloadImage('png')}
            disabled={!encoded}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-4 h-4" />
            <span>PNG</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Editor Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center">
              <Play className="w-4 h-4 mr-2 text-indigo-500" /> PlantUML Syntax
            </h2>
            <a 
              href="https://plantuml.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              Documentation <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm text-gray-800 bg-white"
            placeholder="Enter PlantUML syntax here..."
            spellCheck={false}
          />
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">Live Preview</h2>
          </div>
          
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-gray-50/50 relative">
            {svgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={svgUrl} 
                alt="PlantUML Diagram" 
                className="max-w-full h-auto shadow-sm rounded bg-white p-4"
                onError={(e) => {
                  // If SVG fails to load (e.g. syntax error), we can't easily catch the exact error from the image tag,
                  // but we can show a generic broken image state. PlantUML usually returns an SVG with the error text inside it though!
                }}
              />
            ) : (
              <div className="text-gray-400">Enter PlantUML syntax to see preview</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, Quote, Code, Link as LinkIcon, Image as ImageIcon,
  CheckSquare, Table, Minus, Eye, Edit3, Columns
} from 'lucide-react';
import { motion } from 'motion/react';

type ViewMode = 'split' | 'edit' | 'preview';

export default function MarkdownEditorPage() {
  const [markdown, setMarkdown] = useState<string>(`# Welcome to Markdown Editor

This is a **live preview** markdown editor. You can type on the left and see the results on the right.

## Features

*   **Real-time preview**: See your changes instantly.
*   **Toolbar**: Quick access to common formatting options.
*   **GitHub Flavored Markdown**: Supports tables, strikethrough, task lists, and more.
*   **HTML Support**: You can use raw HTML tags like <kbd>Ctrl</kbd> + <kbd>C</kbd>.

### Example Table

| Syntax | Description |
| --- | --- |
| Header | Title |
| Paragraph | Text |

### Task List

- [x] Write code
- [x] Test editor
- [ ] Deploy app

### Code Block

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}
greet('World');
\`\`\`

> "Markdown is a lightweight markup language with plain-text-formatting syntax."
`);

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle responsive view mode
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'split') {
        setViewMode('edit');
      } else if (window.innerWidth >= 768 && viewMode !== 'split') {
        setViewMode('split');
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial check
    if (window.innerWidth < 768) {
      setViewMode('edit');
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const insertText = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || defaultText;
    
    const newText = textarea.value.substring(0, start) + 
                    before + selectedText + after + 
                    textarea.value.substring(end);
    
    setMarkdown(newText);
    
    // Set focus and selection back
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  ', '');
    } else if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          insertText('**', '**', 'bold text');
          break;
        case 'i':
          e.preventDefault();
          insertText('*', '*', 'italic text');
          break;
        case 'k':
          e.preventDefault();
          insertText('[', '](url)', 'link text');
          break;
      }
    }
  };

  const ToolbarButton = ({ icon: Icon, onClick, title }: { icon: any, onClick: () => void, title: string }) => (
    <button
      onClick={onClick}
      title={title}
      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto w-full p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Markdown Editor</h1>
        <p className="text-gray-500 text-sm">Write and preview Markdown in real-time</p>
      </div>

      <div className="flex flex-col flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between p-2 border-b border-gray-200 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-1">
            <ToolbarButton icon={Heading1} title="Heading 1" onClick={() => insertText('# ', '', 'Heading 1')} />
            <ToolbarButton icon={Heading2} title="Heading 2" onClick={() => insertText('## ', '', 'Heading 2')} />
            <ToolbarButton icon={Heading3} title="Heading 3" onClick={() => insertText('### ', '', 'Heading 3')} />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton icon={Bold} title="Bold (Ctrl+B)" onClick={() => insertText('**', '**', 'bold text')} />
            <ToolbarButton icon={Italic} title="Italic (Ctrl+I)" onClick={() => insertText('*', '*', 'italic text')} />
            <ToolbarButton icon={Strikethrough} title="Strikethrough" onClick={() => insertText('~~', '~~', 'strikethrough text')} />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton icon={List} title="Unordered List" onClick={() => insertText('- ', '', 'List item')} />
            <ToolbarButton icon={ListOrdered} title="Ordered List" onClick={() => insertText('1. ', '', 'List item')} />
            <ToolbarButton icon={CheckSquare} title="Task List" onClick={() => insertText('- [ ] ', '', 'Task')} />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton icon={Quote} title="Blockquote" onClick={() => insertText('> ', '', 'Quote')} />
            <ToolbarButton icon={Code} title="Code Block" onClick={() => insertText('\n```\n', '\n```\n', 'code block')} />
            <ToolbarButton icon={Table} title="Table" onClick={() => insertText('\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n', '')} />
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <ToolbarButton icon={LinkIcon} title="Link (Ctrl+K)" onClick={() => insertText('[', '](url)', 'link text')} />
            <ToolbarButton icon={ImageIcon} title="Image" onClick={() => insertText('![alt text](', 'image.jpg)', '')} />
            <ToolbarButton icon={Minus} title="Horizontal Rule" onClick={() => insertText('\n---\n', '')} />
          </div>

          <div className="flex items-center gap-1 bg-gray-200/50 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded-md text-sm font-medium transition-colors md:hidden ${viewMode === 'edit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Edit Mode"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded-md text-sm font-medium transition-colors md:hidden ${viewMode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Preview Mode"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-md text-sm font-medium transition-colors hidden md:block ${viewMode === 'split' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Split View"
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor & Preview Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor */}
          {(viewMode === 'split' || viewMode === 'edit') && (
            <div className={`flex-1 flex flex-col ${viewMode === 'split' ? 'border-r border-gray-200' : ''}`}>
              <textarea
                ref={textareaRef}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm text-gray-800 bg-white leading-relaxed"
                placeholder="Type your markdown here..."
                spellCheck={false}
              />
            </div>
          )}

          {/* Preview */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div className="flex-1 overflow-y-auto bg-gray-50/30 p-6">
              <div className="prose prose-indigo max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-a:text-indigo-600 hover:prose-a:text-indigo-500">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                >
                  {markdown}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

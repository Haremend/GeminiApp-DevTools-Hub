import { Palette, FileCode2, Wrench, Image as ImageIcon, QrCode, ScanLine, Shield, ImagePlus, FileText, GitMerge, WrapText, Combine, Eraser, AlignLeft, GitCompare, Layers, SplitSquareHorizontal, Link, Calculator, FileSearch } from 'lucide-react';

export type Category = 'Design' | 'Development' | 'Utilities' | 'QR Code' | 'Image Processing' | 'Text';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: Category;
  icon: any;
  path: string;
}

export const categories: Category[] = ['Design', 'Development', 'Utilities', 'QR Code', 'Image Processing', 'Text'];

export const tools: Tool[] = [
  {
    id: 'code-formatter',
    name: 'Code Formatter',
    description: 'Format and beautify your code. Supports various languages.',
    category: 'Development',
    icon: FileCode2,
    path: '/tools/code-formatter',
  },
  {
    id: 'color-picker',
    name: 'Color Picker',
    description: 'Select and convert colors between HEX, RGB, HSL, and more.',
    category: 'Design',
    icon: Palette,
    path: '/tools/color-picker',
  },
  {
    id: 'comment-remover',
    name: 'Comment Remover',
    description: 'Strip comments from your code files quickly.',
    category: 'Development',
    icon: Eraser,
    path: '/tools/comment-remover',
  },
  {
    id: 'crypto-toolkit',
    name: 'Crypto Toolkit',
    description: 'Encrypt, decrypt, and hash text data securely.',
    category: 'Utilities',
    icon: Shield,
    path: '/tools/crypto-toolkit',
  },
  {
    id: 'image-color-picker',
    name: 'Image Color Picker',
    description: 'Pick exact colors from your images.',
    category: 'Image Processing',
    icon: ImageIcon,
    path: '/tools/image-color-picker',
  },
  {
    id: 'image-editor',
    name: 'Image Editor',
    description: 'A basic image editor for cropping and adjusting images.',
    category: 'Image Processing',
    icon: ImagePlus,
    path: '/tools/image-editor',
  },
  {
    id: 'image-ratio-calculator',
    name: 'Image Ratio Calculator',
    description: 'Calculate proportional image sizes with specific bounds.',
    category: 'Image Processing',
    icon: Calculator,
    path: '/tools/image-ratio-calculator',
  },
  {
    id: 'markdown-editor',
    name: 'Markdown Editor',
    description: 'Write, preview, and format Markdown files.',
    category: 'Text',
    icon: FileText,
    path: '/tools/markdown-editor',
  },
  {
    id: 'mermaid-editor',
    name: 'Mermaid Editor',
    description: 'Create diagrams and flowcharts using Mermaid syntax.',
    category: 'Development',
    icon: Layers,
    path: '/tools/mermaid-editor',
  },
  {
    id: 'plantuml-editor',
    name: 'PlantUML Editor',
    description: 'Create UML diagrams using PlantUML syntax.',
    category: 'Development',
    icon: Layers,
    path: '/tools/plantuml-editor',
  },
  {
    id: 'png-metadata-extractor',
    name: 'PNG Metadata Extractor',
    description: 'Extract text, prompts, and config details embedded in PNG files.',
    category: 'Image Processing',
    icon: FileSearch,
    path: '/tools/png-metadata-extractor',
  },
  {
    id: 'prompt-compare',
    name: 'Prompt Compare',
    description: 'Compare AI prompts and analyze their differences.',
    category: 'Text',
    icon: GitCompare,
    path: '/tools/prompt-compare',
  },
  {
    id: 'qr-generator',
    name: 'QR Generator',
    description: 'Generate high-quality QR codes for URLs and text.',
    category: 'QR Code',
    icon: QrCode,
    path: '/tools/qr-generator',
  },
  {
    id: 'qr-scanner',
    name: 'QR Scanner',
    description: 'Scan and decode QR codes from images or camera.',
    category: 'QR Code',
    icon: ScanLine,
    path: '/tools/qr-scanner',
  },
  {
    id: 'template-replacer',
    name: 'Template Replacer',
    description: 'Replace template variables within text blocks.',
    category: 'Text',
    icon: WrapText,
    path: '/tools/template-replacer',
  },
  {
    id: 'text-breaker',
    name: 'Text Breaker',
    description: 'Break text into smaller chunks or sentences.',
    category: 'Text',
    icon: SplitSquareHorizontal,
    path: '/tools/text-breaker',
  },
  {
    id: 'text-diff',
    name: 'Text Diff',
    description: 'Compare two text blocks and highlight the differences.',
    category: 'Text',
    icon: GitCompare,
    path: '/tools/text-diff',
  },
  {
    id: 'text-merger',
    name: 'Text Merger',
    description: 'Merge multiple text files or strings into one.',
    category: 'Text',
    icon: Combine,
    path: '/tools/text-merger',
  },
  {
    id: 'text-split',
    name: 'Text Split',
    description: 'Split text into new lines or separate entries based on delimiter.',
    category: 'Text',
    icon: SplitSquareHorizontal,
    path: '/tools/text-split',
  },
  {
    id: 'url-encoder',
    name: 'URL Encoder / Decoder',
    description: 'Encode or decode a URL or text string to safe format.',
    category: 'Development',
    icon: Link,
    path: '/tools/url-encoder',
  },
  {
    id: 'yaml-formatter',
    name: 'YAML Formatter',
    description: 'Format, validate, and beautify your YAML files.',
    category: 'Development',
    icon: FileCode2,
    path: '/tools/yaml-formatter',
  }
];

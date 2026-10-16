import { Palette, FileCode2, Wrench, Image as ImageIcon, QrCode, ScanLine, Shield, ImagePlus, FileText, GitMerge, WrapText, Combine, Eraser, AlignLeft, GitCompare, Layers, SplitSquareHorizontal, Link, Calculator, FileSearch, Volume2 } from 'lucide-react';

export type Category = 'Design' | 'Development' | 'QR Code' | 'Image Processing' | 'Text';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: Category;
  icon: any; // Lucide icon component
  path: string;
}

export const tools: Tool[] = [
  {
    id: 'png-metadata-extractor',
    name: 'PNG Metadata Extractor',
    description: '提取 AI 工具（如 Stable Diffusion、ComfyUI）生成的 PNG 图片中内嵌的文本提示词与参数配置信息。',
    category: 'Image Processing',
    icon: FileSearch,
    path: '/tools/png-metadata-extractor',
  },
  {
    id: 'image-ratio-calculator',
    name: 'Image Ratio Calculator',
    description: '按指定边界或缩放比例计算图片等比例缩放尺寸（放大或缩小）。',
    category: 'Image Processing',
    icon: Calculator,
    path: '/tools/image-ratio-calculator',
  },
  {
    id: 'url-encoder',
    name: 'URL Encoder / Decoder',
    description: '将 URL 或文本字符串编码或解码为安全的 Web 传输格式。',
    category: 'Development',
    icon: Link,
    path: '/tools/url-encoder',
  },
  {
    id: 'text-split',
    name: 'Text Split',
    description: '根据指定分隔符（如 &）拆分 URL 或文本字符串，并逐行展示拆分后的参数。',
    category: 'Text',
    icon: SplitSquareHorizontal,
    path: '/tools/text-split',
  },
  {
    id: 'prompt-compare',
    name: 'Prompt Compare',
    description: '对比多个逗号分隔的提示词（如 Midjourney 标签），提取公共基础词并高亮独有差异。',
    category: 'Text',
    icon: Layers,
    path: '/tools/prompt-compare',
  },
  {
    id: 'text-diff',
    name: 'Text Diff',
    description: '对比两段文本内容，清晰高亮标记新增和删除的词句及行差异。',
    category: 'Text',
    icon: GitCompare,
    path: '/tools/text-diff',
  },
  {
    id: 'code-formatter',
    name: 'Code Formatter',
    description: '支持 Java、HTML、Vue、JavaScript、CSS、JSON 等代码的并排格式化与美化排版。',
    category: 'Development',
    icon: AlignLeft,
    path: '/tools/code-formatter',
  },
  {
    id: 'comment-remover',
    name: 'Comment Remover',
    description: '一键清除代码中的所有注释与空白行（支持 Java、Python、HTML、JS 等），并自动格式化。',
    category: 'Development',
    icon: Eraser,
    path: '/tools/comment-remover',
  },
  {
    id: 'template-replacer',
    name: 'Template Replacer',
    description: '通过向模板中注入数据行批量生成多段文本，适合基于表格数据生成 SQL 插入语句或模板代码。',
    category: 'Development',
    icon: FileCode2,
    path: '/tools/template-replacer',
  },
  {
    id: 'text-merger',
    name: 'Text Merger',
    description: '将多行文本合并为单行，并可根据指定标点符号重新断行排版。',
    category: 'Text',
    icon: Combine,
    path: '/tools/text-merger',
  },
  {
    id: 'text-breaker',
    name: 'Text Line Breaker',
    description: '去除文本原有换行符，并根据指定分隔标点重新规整切分为段落。',
    category: 'Text',
    icon: WrapText,
    path: '/tools/text-breaker',
  },
  {
    id: 'mermaid-editor',
    name: 'Mermaid Editor',
    description: '使用 Mermaid 语法在线绘制图表与流程图，支持实时渲染预览并导出为 PNG/JPG。',
    category: 'Development',
    icon: GitMerge,
    path: '/tools/mermaid-editor',
  },
  {
    id: 'markdown-editor',
    name: 'Markdown Editor',
    description: '支持实时双栏预览与快捷工具栏的 Markdown 编辑器，兼容 GFM 语法。',
    category: 'Text',
    icon: FileText,
    path: '/tools/markdown-editor',
  },
  {
    id: 'ui-layer-composite',
    name: 'UI Layer Composite',
    description: '多图层 UI 切图层叠排版工具，提供精确定位、等比缩放与不透明度调节。',
    category: 'Design',
    icon: Layers,
    path: '/tools/ui-layer-composite',
  },
  {
    id: 'color-picker',
    name: 'Color Picker',
    description: '从渐变色盘中吸取颜色，快速获取 RGB、HEX、HSL 等 CSS 颜色代码。',
    category: 'Design',
    icon: Palette,
    path: '/tools/color-picker',
  },
  {
    id: 'image-color-picker',
    name: 'Image Color Picker',
    description: '上传图片直接取色，支持画布无级缩放平移与历史吸色记录。',
    category: 'Design',
    icon: ImageIcon,
    path: '/tools/image-color-picker',
  },
  {
    id: 'yaml-formatter',
    name: 'YAML Formatter',
    description: '格式化 YAML 文本，清理空行，并按字母顺序自动对键进行排序。',
    category: 'Development',
    icon: FileCode2,
    path: '/tools/yaml-formatter',
  },
  {
    id: 'crypto-toolkit',
    name: 'Crypto Toolkit',
    description: '常用加解密与哈希计算工具箱，支持 MD5、Base64、AES、SM2、SM3、SM4 等算法。',
    category: 'Development',
    icon: Shield,
    path: '/tools/crypto-toolkit',
  },
  {
    id: 'picture-split',
    name: 'Picture Split',
    description: '像素级图片裁剪工具，支持通过指定距离原图四边的像素数值精确裁剪。',
    category: 'Image Processing',
    icon: SplitSquareHorizontal,
    path: '/tools/picture-split',
  },
  {
    id: 'image-editor',
    name: 'Image Editor',
    description: '轻量图片标注编辑器，支持添加箭头、文本、涂鸦、马赛克及裁剪等操作。',
    category: 'Image Processing',
    icon: ImagePlus,
    path: '/tools/image-editor',
  },
  {
    id: 'qr-generator',
    name: 'QR Code Generator',
    description: '生成可自定义颜色、中间 Logo 与纠错级别的高分辨率二维码。',
    category: 'QR Code',
    icon: QrCode,
    path: '/tools/qr-generator',
  },
  {
    id: 'qr-scanner',
    name: 'QR Code Scanner',
    description: '支持图片上传、剪贴板粘贴或直接调用摄像头扫码解析二维码。',
    category: 'QR Code',
    icon: ScanLine,
    path: '/tools/qr-scanner',
  },
  {
    id: 'remove-duplicates',
    name: 'Remove Duplicates',
    description: '去除文本中的重复行，保留首次出现的行，支持一键去除空行。',
    category: 'Text',
    icon: Layers,
    path: '/tools/remove-duplicates',
  },
  {
    id: 'text-reader',
    name: 'Text Reader (文本阅读器)',
    description: '粘贴文本自动按行拆分，通过浏览器语音逐行朗读，支持同步高亮居中、语速与进度调节、字号与间距自定义。',
    category: 'Text',
    icon: Volume2,
    path: '/tools/text-reader',
  },
];

export const categories: Category[] = Array.from(new Set(tools.map((t) => t.category)));

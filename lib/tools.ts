import { Palette, FileCode2, Wrench, Image as ImageIcon } from 'lucide-react';

export type Category = 'Design' | 'Development' | 'Utilities';

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
    id: 'color-picker',
    name: 'Color Picker',
    description: 'Pick colors from a gradient and get RGB/HEX codes for CSS.',
    category: 'Design',
    icon: Palette,
    path: '/tools/color-picker',
  },
  {
    id: 'image-color-picker',
    name: 'Image Color Picker',
    description: 'Upload an image and pick colors directly from it with zoom and pan support.',
    category: 'Design',
    icon: ImageIcon,
    path: '/tools/image-color-picker',
  },
  {
    id: 'yaml-formatter',
    name: 'YAML Formatter',
    description: 'Format YAML, remove empty lines, and sort keys alphabetically.',
    category: 'Development',
    icon: FileCode2,
    path: '/tools/yaml-formatter',
  },
];

export const categories: Category[] = Array.from(new Set(tools.map((t) => t.category)));

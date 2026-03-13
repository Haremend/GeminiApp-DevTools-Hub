import { Palette, FileCode2, Wrench, Image as ImageIcon, QrCode, ScanLine, Shield } from 'lucide-react';

export type Category = 'Design' | 'Development' | 'Utilities' | 'QR Code' | 'Cryptography';

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
  {
    id: 'crypto-toolkit',
    name: 'Crypto Toolkit',
    description: 'Encrypt, decrypt, and hash data using MD5, Base64, AES, SM2, SM3, SM4, and more.',
    category: 'Cryptography',
    icon: Shield,
    path: '/tools/crypto-toolkit',
  },
  {
    id: 'qr-generator',
    name: 'QR Code Generator',
    description: 'Generate customizable QR codes with colors, logos, and different error correction levels.',
    category: 'QR Code',
    icon: QrCode,
    path: '/tools/qr-generator',
  },
  {
    id: 'qr-scanner',
    name: 'QR Code Scanner',
    description: 'Decode QR codes by uploading an image or scanning directly with your camera.',
    category: 'QR Code',
    icon: ScanLine,
    path: '/tools/qr-scanner',
  },
];

export const categories: Category[] = Array.from(new Set(tools.map((t) => t.category)));

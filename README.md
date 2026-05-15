# DevTools Hub

A collection of useful developer tools built with Next.js, React, and Tailwind CSS. The platform is designed to provide quick, accessible utilities for daily development, design, and data processing tasks.

## 📂 Project Structure

```text
├── app/
│   ├── globals.css      # Global styles and Tailwind CSS v4 imports
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page listing all tools
│   └── tools/           # Individual tool pages with their own routes
│       ├── code-formatter/
│       ├── color-picker/
│       ├── crypto-toolkit/
│       ├── image-editor/
│       └── ...          # Other tool directories
├── hooks/               # Custom React hooks
├── lib/
│   └── tools.ts         # Centralized configuration and metadata for all tools
├── types/               # Shared TypeScript definitions
├── public/              # Static assets
└── next.config.ts       # Next.js configuration
```

## 🧰 Available Tools

### 💻 Development
- **Code Formatter**: Format and beautify your code (Java, HTML, Vue, JavaScript, CSS, JSON) with a side-by-side view. Features an option to remove empty lines.
- **Comment Remover**: Remove all comments and empty lines from your code (Java, Python, HTML, JS) and automatically format it.
- **Template Replacer**: Generate multiple text blocks by injecting data rows into a template. Great for generating SQL inserts from spreadsheet data.
- **Mermaid Editor**: Create diagrams and flowcharts using Mermaid syntax with real-time preview and export to PNG/SVG.
- **YAML Formatter**: Format YAML, remove empty lines, and sort keys alphabetically (A-Z).
- **Crypto Toolkit**: Encrypt, decrypt, and hash data using algorithms like MD5, Base64, AES, SM2, SM3, SM4, and more.

### 📝 Text
- **Text Diff**: Compare two texts side-by-side and see the highlighted differences (added and removed words or lines).
- **Text Merger**: Merge multi-line text into a single line, and optionally break it into new lines based on specific symbols.
- **Text Line Breaker**: Format long texts by removing original line breaks and splitting into new paragraphs based on specified delimiters.
- **Markdown Editor**: A real-time Markdown editor with live preview, toolbar, and GitHub Flavored Markdown support.

### 🎨 Design & Image Processing
- **Color Picker**: Pick colors from a gradient and get RGB/HEX codes for CSS.
- **Image Color Picker**: Upload an image and pick colors directly from it with zoom and pan support.
- **Image Editor**: Annotate images with arrows, text, freehand drawing, mosaic, and cropping functionalities.

### 📱 QR Code
- **QR Code Generator**: Generate customizable QR codes with colors, logos, and different error correction levels.
- **QR Code Scanner**: Decode QR codes by uploading an image, pasting from clipboard, or scanning directly with your camera.

## 🚀 Tech Stack

- Framework: [Next.js 15](https://nextjs.org/) (App Router)
- Styling: [Tailwind CSS v4](https://tailwindcss.com/)
- Icons: [Lucide React](https://lucide.dev/)
- Animations: [Motion](https://motion.dev/)
- Utilities: `js-beautify`, `diff`, `js-yaml`, etc.

## 🛠️ Getting Started

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) with your browser.

### Adding a New Tool

1. Create a new directory under `app/tools/` (e.g., `app/tools/my-new-tool`).
2. Create a `page.tsx` file in that directory with your tool's UI and logic.
3. Open `lib/tools.ts` and add a new entry to the `tools` array:
   ```typescript
   {
     id: 'my-new-tool',
     name: 'My New Tool',
     description: 'Description of what it does.',
     category: 'Utilities',
     icon: MyIconComponent,
     path: '/tools/my-new-tool',
   }
   ```

## 📦 Deployment

This project is configured for standalone output, making it easy to deploy to various platforms.

### Docker Container

A `Dockerfile` is included for containerized deployment.

```bash
# Build the image
docker build -t devtools-hub .

# Run the container
docker run -p 3000:3000 devtools-hub
```

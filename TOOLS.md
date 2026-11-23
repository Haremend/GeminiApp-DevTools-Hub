# DevTools Hub - Detailed Tool Documentation

This document provides a detailed functional description and usage guide for every tool available in the DevTools Hub.

## 🧰 Utilities

### URL Encoder / Decoder
**Path:** `/tools/url-encoder`
**Description:** Encode or decode a URL or text string to a safe format for web transmission.
**Features & Usage:**
- **Input:** Paste your URL or text string into the input area.
- **Mode Toggle:** Switch between "Encode" and "Decode" modes.
- **Real-time Processing:** The output is generated automatically as you type or paste.
- **Copy:** One-click copy button to copy the result to your clipboard.

## 📝 Text

### Text Split
**Path:** `/tools/text-split`
**Description:** Split a URL or text string by a specific delimiter (e.g., `&`) and display the parameters line by line.
**Features & Usage:**
- **Input:** Paste your long string (like a URL query string).
- **Delimiter:** Specify the character to split by (defaults to `&`).
- **Output:** See the split string beautifully formatted line by line.
- **Copy:** Copy individual lines or the entire formatted output.

### Prompt Compare
**Path:** `/tools/prompt-compare`
**Description:** Compare multiple comma-separated prompts (e.g., Midjourney tags), extract common base tags, and show unique differences.
**Features & Usage:**
- **Input Multiple Prompts:** You can add multiple prompt text blocks to compare them.
- **Batch Compare:** Paste multiple prompts separated by `===` into the first input, then click "Batch Compare" to automatically split and populate them into separate input boxes.
- **Common Tags Extraction:** Automatically identifies and lists the tags that appear in *all* provided prompts.
- **Unique Tags Highlighting:** Highlights the unique tags for each prompt, making it easy to spot the differences in long generative AI prompts.

### Text Diff
**Path:** `/tools/text-diff`
**Description:** Compare two texts and see the highlighted differences (added and removed words/lines).
**Features & Usage:**
- **Side-by-Side Input:** Paste your original text on the left and modified text on the right.
- **Diff Calculation:** Automatically computes the differences using line-by-line or word-by-word comparison.
- **Visual Highlighting:** Additions are highlighted in green, deletions in red.

### Text Merger
**Path:** `/tools/text-merger`
**Description:** Merge multi-line text into a single line, and optionally break it into new lines based on specific symbols.
**Features & Usage:**
- **Merge Lines:** Remove all line breaks to turn a multi-line paragraph into a single continuous string.
- **Split by Symbol:** Optionally, specify a delimiter (like `. ` or `, `) to insert line breaks automatically after that symbol.

### Text Line Breaker
**Path:** `/tools/text-breaker`
**Description:** Format long texts by removing original line breaks and splitting into new paragraphs based on specified delimiters.
**Features & Usage:**
- **Format:** Cleans up messy text with unwanted line breaks.
- **Custom Break Rules:** Define specific punctuation marks where new paragraphs should start.

### Markdown Editor
**Path:** `/tools/markdown-editor`
**Description:** A real-time Markdown editor with live preview, toolbar, and GitHub Flavored Markdown support.
**Features & Usage:**
- **Editor:** Write markdown with a convenient formatting toolbar (Bold, Italic, Code, Link, etc.).
- **Live Preview:** See the rendered HTML side-by-side as you type.
### Remove Duplicates
**Path:** `/tools/remove-duplicates`
**Description:** Remove duplicate lines from text while preserving first occurrence order.
**Features & Usage:**
- **Empty Line Removal:** Toggle checkbox to strip blank lines before or after deduplication.
- **Sorting:** Optional natural alphabetical/numeric sorting of deduplicated lines.
- **Side-by-Side Workspace:** Full-width split input/output editors with line count indicator and one-click copy.

### Text Reader (文本阅读器)
**Path:** `/tools/text-reader`
**Description:** Paste text, automatically split into lines, and listen with synchronized speech, line highlighting, and progress seeking.
**Features & Usage:**
- **Full-Width Layout & Two-Row Toolbar:** Top row for Speed (0.5x–4.0x), Progress Seek, Font Size, and Line Spacing sliders; second row for engine mode (Smart Preload vs. System SpeechSynthesis) and voice selector.
- **Voice & Language Support:** Supports Chinese (`zh-CN`, `zh-TW`, `zh-HK`), English (`en-US`, `en-GB`), Japanese (`ja-JP`), and Korean (`ko-KR`), plus local browser voices.
- **Synchronized Highlighting & Auto-scroll:** Automatically preloads the next line when supported, highlights the active line, smoothly scrolls it to center, and lets you click any line to jump.

### URL Deduplicator
**Path:** `/tools/url-deduplicator`
**Description:** Batch-extract, deduplicate, and subtract specified exclusion URLs (`A - B` set difference) from messy text.
**Features & Usage:**
- **Regex Extraction:** Automatically extracts valid `http://` and `https://` URLs from unstructured text.
- **Set Difference (`A - B`):** Removes any URLs present in the exclusion panel from the source list while preserving original order.
- **Real-Time Counts & Presets:** Displays unique URL counts for both panels and includes built-in examples for quick testing.

## 💻 Development

### Code Formatter
**Path:** `/tools/code-formatter`
**Description:** Format and beautify your code (Java, HTML, Vue, JavaScript, CSS, JSON, Text) with a side-by-side view.
**Features & Usage:**
- **Language Support:** Select the target language from a dropdown.
- **Formatting Options:** Adjust tab width, or toggle the "Remove Empty Lines" feature.
- **Live Formatting:** See the formatted code on the right panel instantly.

### Comment Remover
**Path:** `/tools/comment-remover`
**Description:** Remove all comments and empty lines from your code (Java, Python, HTML, JS) and automatically format it.
**Features & Usage:**
- **Clean Code:** Strips out `//`, `/* */`, `<!-- -->`, and `#` comments depending on the selected language.
- **Remove Empty Lines:** Checkbox to remove all blank lines for a compact code view.

### Template Replacer
**Path:** `/tools/template-replacer`
**Description:** Generate multiple text blocks by injecting data rows into a template.
**Features & Usage:**
- **Template Setup:** Write a template using placeholders like `{0}`, `{1}`, etc.
- **Data Input:** Paste multi-line data (e.g., from Excel/CSV) where columns are separated by tabs or commas.
- **Generation:** Generates a new template instance for every row of data. Great for generating batch SQL `INSERT` statements.

### Mermaid Editor
**Path:** `/tools/mermaid-editor`
**Description:** Create diagrams and flowcharts using Mermaid syntax with real-time preview and export to PNG/JPG.
**Features & Usage:**
- **Code Editor:** Write Mermaid.js syntax.
- **Live Preview:** Render charts, sequence diagrams, and flowcharts in real-time.
- **Export:** Download the rendered diagram as a PNG or JPG image.

### YAML Formatter
**Path:** `/tools/yaml-formatter`
**Description:** Format YAML, remove empty lines, and sort keys alphabetically.
**Features & Usage:**
- **Validation:** Checks if your YAML is valid.
- **Formatting:** Cleans up indentation.
- **Sorting:** Alphabetically sorts the keys for easier reading of large config files.

### YAML Node Editor
**Path:** `/tools/yaml-node-editor`
**Description:** Parse YAML into an interactive visual tree with node-level editing, addition/deletion, regex key search, and export.
**Features & Usage:**
- **Visual Tree View:** Expand or collapse all YAML hierarchy nodes, edit keys (with duplicate key warnings) and values with automatic type parsing (String, Number, Boolean, Null).
- **Add & Delete Nodes:** Append new properties to objects or items to arrays directly in the tree.
- **Regex Key Search:** Search keys with regex (case-insensitive option) and jump directly to matching nodes, or batch-delete matching keys/array items.
- **Export:** Live-generated clean YAML output with one-click copy and `export.yaml` download.

### Crypto Toolkit
**Path:** `/tools/crypto-toolkit`
**Description:** Encrypt, decrypt, and hash data using MD5, Base64, AES, SM2, SM3, SM4, and more.
**Features & Usage:**
- **Hashing:** Generate MD5, SHA, SM3 hashes from text.
- **Encryption/Decryption:** Use symmetric encryption (AES, SM4, DES) with customizable keys and IVs.
- **Encoding:** Convert to and from Base64 or Hex.

## 🎨 Design

### UI Layer Composite
**Path:** `/tools/ui-layer-composite`
**Description:** Stack and arrange multiple UI image slices with precise positioning, scaling, and opacity controls.
**Features & Usage:**
- **Layer Management:** Upload, drag-and-drop, or paste (Ctrl+V) multiple UI slices. They are stacked sequentially (1 is bottom-most layer).
- **Positioning:** Drag images on the canvas to move them. Click an image to view its absolute distance to the 4 edges of the canvas (Positioning Guides).
- **Properties Panel:** Select a layer to adjust its X/Y coordinates, Opacity, and Scale/Dimensions in the right sidebar.
- **Canvas Control:** Automatically sizes the canvas to the largest layer, or allows custom manual pixel dimensions.
- **Export:** Download the final stacked composite as a single PNG.

### Color Picker
**Path:** `/tools/color-picker`
**Description:** Pick colors from a gradient and get RGB/HEX codes for CSS.
**Features & Usage:**
- **Visual Picker:** Select colors using a standard gradient visualizer.
- **Format Output:** Instantly copy HEX, RGB, or HSL values.

### Image Color Picker
**Path:** `/tools/image-color-picker`
**Description:** Upload or paste an image and pick colors directly from it with zoom and pan support.
**Features & Usage:**
- **Input:** Drag and drop, click to upload, or paste (Ctrl+V) an image.
- **Pan & Zoom:** Zoom into the image for pixel-perfect color extraction.
- **Color History:** Keeps a history of recently picked colors from the image.

## 🖼️ Image Processing

### PNG Metadata Extractor
**Path:** `/tools/png-metadata-extractor`
**Description:** Extract text, prompts, and config details embedded in PNG files generated by AI tools.
**Features & Usage:**
- **Input:** Upload AI-generated PNGs (e.g., from Stable Diffusion, ComfyUI, NovelAI).
- **Extraction:** Reads hidden `tEXt` or `iTXt` chunks.
- **Sanitization:** Automatically cleans null bytes to allow easy copying of prompts.

### Image Ratio Calculator
**Path:** `/tools/image-ratio-calculator`
**Description:** Calculate proportional image sizes (scale up or down) with specific bounds or scale factor.
**Features & Usage:**
- **Base Dimensions:** Enter original width and height to establish the aspect ratio.
- **Scaling:** Lock ratio and enter a new width or height to calculate the counterpart.

### Picture Split
**Path:** `/tools/picture-split`
**Description:** A precision image cropping tool that lets you specify exact pixel distances from the 4 edges of the image.
**Features & Usage:**
- **Input:** Upload, drag and drop, or paste (Ctrl+V) an image.
- **Visual Overlay:** The image fills the canvas with a cropping box overlay. Drag the edges to visually crop the image. The unselected area is shaded with a gray overlay.
- **Precision Parameters:** Fine-tune the crop by inputting exact top, bottom, left, and right pixel distances in the right sidebar.
- **Export:** Click the download button to save the selected area as a high-quality PNG image.

### Image Editor
**Path:** `/tools/image-editor`
**Description:** Annotate images with arrows, text, freehand drawing, mosaic, and cropping.
**Features & Usage:**
- **Annotation:** Add text, arrows, shapes, and freehand drawings to an image.
- **Privacy:** Use the mosaic tool to blur sensitive information.
- **Export:** Save the edited image to your device.

### Image Annotator
**Path:** `/tools/image-annotator`
**Description:** Quickly stamp auto-incrementing circular numbered markers onto images and export with optional bottom captions.
**Features & Usage:**
- **Numbered Markers:** Click anywhere on the image (upload, drag-and-drop, or `Ctrl+V`) to place numbered circular badges; drag markers to reposition, double-click to remove, and undo multiple steps.
- **Marker & Caption Customization:** Adjust marker diameter and compose multi-line bottom notes with customizable font size, text color, alignment, and vertical spacing.
- **Export:** Composites image, markers, and footer caption into a single downloadable PNG.

### Picture Append
**Path:** `/tools/picture-append`
**Description:** Stitch and align multiple UI audit or design screenshots side-by-side with an Excel-style grid slot controller.
**Features & Usage:**
- **Clipboard & Batch Import:** Press `Ctrl+V` anywhere or drag-and-drop multiple screenshots; images snap together cleanly with 0px gap by default.
- **Excel-Style Grid Slots:** Right sidebar displays a spreadsheet-like matrix (`A, B, C...` × `1, 2, 3...`). Click any empty cell to move the selected image there, or apply 1-click presets (Horizontal, Vertical, 2×2 Grid).
- **Per-Image Resolution & Batch Equalize:** Fine-tune width/height in pixels (with aspect ratio lock), or batch-equalize all heights/widths for clean comparison strips.
- **Background & Export:** Choose transparent, solid white/gray/dark, or custom hex background, toggle cell borders, and copy to clipboard or export high-resolution PNG.

### Background Builder (背景图构建)
**Path:** `/tools/background-builder`
**Description:** Compose multiple vertical illustrations horizontally into wide desktop wallpapers with free overlap, cropping, scaling, edge feathering, and smart edge snapping.
**Features & Usage:**
- **Wallpaper Presets & Proportional Resize:** Supports `2K` (`2560×1440`, 16:9), `4K` (`3840×2160`, 16:9), `2560×1600` (16:10), `21:9` Ultrawide (`3440×1440`), `32:9` Dual-Screen (`5120×1440`), and custom dimensions. Existing layers and feather widths scale proportionally when switching canvas presets.
- **Interactive Stage & Smart Edge Snapping:** Drag images freely on the canvas with magnetic snap guides to both canvas edges/center AND neighboring images' left/right/top/bottom edges (hold `Alt` to bypass snapping). Drag corner handles to scale proportionally.
- **Non-Destructive Canvas Cropping:** Toggle "Crop Mode" to drag 4-side edge handles directly on the canvas (with ghosted preview of trimmed areas) or fine-tune percentage crop insets without altering original source pixels.
- **Layer Stack & Edge Feathering:** Reorder layer Z-index (`Up` / `Down`) in the right sidebar to control which vertical image overlaps another, and apply independent left/right/top/bottom gradient feathering to blend seams smoothly.
- **High-Res Export:** Offscreen canvas compositing outputs exact target resolution PNG (with optional transparency), high-quality JPG, or copies directly to clipboard.

## 📱 QR Code

### QR Code Generator
**Path:** `/tools/qr-generator`
**Description:** Generate customizable QR codes with colors, logos, and different error correction levels.
**Features & Usage:**
- **Data Input:** Enter text, URL, WiFi credentials, or VCard data.
- **Customization:** Change foreground/background colors and add a logo in the center.
- **Export:** Download as PNG or SVG.

### QR Code Scanner
**Path:** `/tools/qr-scanner`
**Description:** Decode QR codes by uploading an image, pasting from clipboard, or scanning directly with your camera.
**Features & Usage:**
- **Camera Scan:** Use your device's webcam or phone camera to scan live.
- **Image Scan:** Upload or paste a screenshot containing a QR code to decode its contents.

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
### Text Reader (文本阅读器)
**Path:** `/tools/text-reader`
**Description:** Paste text, automatically split into sentences/lines, and listen with synchronized speech, line highlighting, and seeking.
**Features & Usage:**
- **Text Input & Auto-split:** Paste any multi-line text, automatically split by line breaks into readable sentences.
- **Voice & Language Selection:** Supports Chinese (zh), Japanese (ja), and English (en) with full browser voice selection.
- **Speed & Progress Seeking:** Adjust reading speed (0.5x ~ 4.0x) and seek to any sentence with interactive slider.
- **Synchronized Highlighting & Auto-scroll:** Current sentence is highlighted and scrolled smoothly to center during reading.

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

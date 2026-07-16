# DevTools Hub

一个使用 Next.js, React 和 Tailwind CSS 构建的实用开发者工具合集。该平台旨在为日常开发、设计和数据处理任务提供快捷易用的工具箱。

## 📂 项目结构

```text
├── app/
│   ├── globals.css      # 全局样式及 Tailwind CSS v4 导入
│   ├── layout.tsx       # 根布局
│   ├── page.tsx         # 首页（展示所有工具列表）
│   └── tools/           # 独立工具页面路由
│       ├── code-formatter/
│       ├── color-picker/
│       ├── crypto-toolkit/
│       ├── image-editor/
│       └── ...          # 其他工具目录
├── hooks/               # 自定义 React hooks
├── lib/
│   └── tools.ts         # 所有工具的统一配置与元数据
├── types/               # 共享的 TypeScript 类型定义
├── public/              # 静态资源
└── next.config.ts       # Next.js 配置文件
```

## 🧰 可用工具

### 💻 开发 (Development)
- **代码格式化 (Code Formatter)**: 并排视图展示，支持格式化和美化代码 (Java, HTML, Vue, JavaScript, CSS, JSON, Text)，提供一键清除空行功能。
- **注释移除器 (Comment Remover)**: 移除代码中的所有注释和空行 (Java, Python, HTML, JS) 并自动进行格式化。
- **模板替换器 (Template Replacer)**: 通过向模板中注入数据行来生成多个文本块。非常适合将电子表格数据转换为 SQL 插入语句。
- **Mermaid 编辑器 (Mermaid Editor)**: 使用 Mermaid 语法创建图表和流程图，支持实时预览及导出为 PNG/JPG 格式。
- **YAML 格式化 (YAML Formatter)**: 格式化 YAML，移除空行，并按字母顺序 (A-Z) 对键进行排序。
- **密码学工具箱 (Crypto Toolkit)**: 加密、解密和哈希计算工具，支持 MD5, Base64, AES, SM2, SM3, SM4 等算法。

### 📝 文本 (Text)
- **提示词对比 (Prompt Compare)**: 对比多个逗号分隔的提示词 (如 Midjourney 提示词)，提取公共标签并高亮显示不同的差异内容，支持批量对比。
- **文本差异比对 (Text Diff)**: 并排对比两段文本，高亮显示新增和删除的词或行。
- **文本合并器 (Text Merger)**: 将多行文本合并为单行，也可根据指定符号重新将单行切分为多行。
- **文本断行器 (Text Line Breaker)**: 清除原有的换行符，并根据指定的分隔符将长文本重新划分为多个段落。
- **文本分割器 (Text Split)**: 根据特定分隔符 (如 `&`) 拆分 URL 或文本字符串，并逐行显示参数。
- **Markdown 编辑器 (Markdown Editor)**: 支持实时预览和 GitHub 风格语法的 Markdown 编辑器，配有快捷工具栏。

### 🎨 设计与图片处理 (Design & Image Processing)
- **PNG 元数据提取 (PNG Metadata Extractor)**: 提取由 AI 工具生成的 PNG 图片中内嵌的文本、提示词以及配置信息。
- **图片比例计算器 (Image Ratio Calculator)**: 根据指定边界或缩放系数计算等比例缩放的图片尺寸。
- **颜色选择器 (Color Picker)**: 从渐变色盘中提取颜色，并获取对应的 RGB/HEX 代码供 CSS 使用。
- **图片取色器 (Image Color Picker)**: 拖拽/上传/粘贴图片，支持缩放和拖拽平移，并在图片上直接点击吸取颜色。
- **图片编辑器 (Image Editor)**: 对图片进行标注处理，包括箭头、文字、自由绘制、马赛克及裁剪等功能。

### 🧰 实用工具 (Utilities)
- **URL 编码 / 解码 (URL Encoder / Decoder)**: 将 URL 或文本字符串编码或解码为安全的 Web 传输格式。

### 📱 二维码 (QR Code)
- **二维码生成器 (QR Code Generator)**: 生成可自定义颜色、Logo 和纠错级别的二维码。
- **二维码扫描器 (QR Code Scanner)**: 通过上传图片、粘贴剪贴板图片或直接使用摄像头扫描来解码二维码。

## 🚀 技术栈

- 框架: [Next.js 15](https://nextjs.org/) (App Router)
- 样式: [Tailwind CSS v4](https://tailwindcss.com/)
- 图标: [Lucide React](https://lucide.dev/)
- 动画: [Motion](https://motion.dev/)
- 工具库: `js-beautify`, `diff`, `js-yaml` 等

## 🛠️ 本地运行

### 本地开发

1. 克隆代码仓库
2. 安装依赖:
   ```bash
   npm install
   ```
3. 启动开发服务器:
   ```bash
   npm run dev
   ```
4. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 添加新工具

1. 在 `app/tools/` 目录下创建一个新文件夹 (例如 `app/tools/my-new-tool`)。
2. 在该文件夹中创建 `page.tsx` 文件，编写工具的界面与逻辑。
3. 打开 `lib/tools.ts` 文件，并在 `tools` 数组中添加一条新记录:
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

## 📦 部署

本项目已配置为 `standalone` 独立构建模式，可轻松部署到多种平台。

### Docker 容器

项目内已包含 `Dockerfile`，用于容器化部署。

```bash
# 构建镜像
docker build -t devtools-hub .

# 运行容器
docker run -p 3000:3000 devtools-hub
```

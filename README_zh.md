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
- **URL 编码 / 解码 (URL Encoder / Decoder)**: 将 URL 或文本字符串编码或解码为安全的 Web 传输格式。
- **代码格式化 (Code Formatter)**: 并排视图展示，支持格式化和美化代码 (Java, HTML, Vue, JavaScript, CSS, JSON, Text)，提供一键清除空行功能。
- **注释移除器 (Comment Remover)**: 移除代码中的所有注释和空行 (Java, Python, HTML, JS) 并自动进行格式化。
- **模板替换器 (Template Replacer)**: 通过向模板中注入数据行来生成多个文本块，适合将表格数据批量转换为 SQL 插入语句。
- **Mermaid 编辑器 (Mermaid Editor)**: 使用 Mermaid 语法创建图表和流程图，支持实时预览及导出为 PNG/JPG 格式。
- **YAML 格式化 (YAML Formatter)**: 格式化 YAML，移除空行，并按字母顺序 (A-Z) 对键进行排序。
- **YAML 节点编辑器 (YAML Node Editor)**: 可视化解析 YAML 为节点树，支持逐节点修改键名与键值、新增/删除子节点、正则检索定位及一键导出下载。
- **密码学工具箱 (Crypto Toolkit)**: 加密、解密和哈希计算工具，支持 MD5, Base64, AES, SM2, SM3, SM4 等算法。

### 📝 文本 (Text)
- **文本分割器 (Text Split)**: 根据特定分隔符 (如 `&`) 拆分 URL 或文本字符串，并逐行显示参数。
- **提示词对比 (Prompt Compare)**: 对比多个逗号分隔的提示词 (如 Midjourney 标签)，提取公共标签并高亮显示独有差异，支持批量对比。
- **文本差异比对 (Text Diff)**: 并排对比两段文本，高亮显示新增和删除的词或行。
- **文本合并器 (Text Merger)**: 将多行文本合并为单行，也可根据指定符号重新将单行切分为多行。
- **文本断行器 (Text Line Breaker)**: 清除原有的换行符，并根据指定的分隔符将长文本重新划分为多个段落。
- **Markdown 编辑器 (Markdown Editor)**: 支持实时预览和 GitHub 风格语法的 Markdown 编辑器，配有快捷工具栏。
- **文本去重 (Remove Duplicates)**: 去除文本中的重复行并保留首次出现项，支持一键去除空行与按行排序。
- **文本阅读器 (Text Reader)**: 粘贴文本自动按行拆分，支持智能预读与系统语音朗读、实时居中高亮、语速/进度滑块跳转及字号间距记忆。
- **URL 去重/剔除工具 (URL Deduplicator)**: 从杂乱文本中批量正则识别并提取 URL，基于集合差集 (`A - B`) 剔除指定链接并一键复制干净结果。

### 🎨 设计 (Design)
- **UI 切图层叠工具 (UI Layer Composite)**: 上传或粘贴多个 UI 切图进行层叠排版，提供四边像素定位线、不透明度及等比缩放控制。
- **颜色选择器 (Color Picker)**: 从渐变色盘中提取颜色，并获取对应的 RGB/HEX/HSL 代码供 CSS 使用。
- **图片取色器 (Image Color Picker)**: 拖拽/上传/粘贴图片，支持缩放和拖拽平移，并在图片上直接点击吸取颜色及记录取色历史。

### 🖼️ 图片处理 (Image Processing)
- **PNG 元数据提取 (PNG Metadata Extractor)**: 提取由 AI 工具生成的 PNG 图片中内嵌的文本、提示词以及配置信息。
- **图片比例计算器 (Image Ratio Calculator)**: 根据指定边界或缩放系数计算等比例缩放的图片尺寸。
- **图片裁剪工具 (Picture Split)**: 像素级高精度图片裁剪工具，支持拖拽选框或通过四边像素距离精确裁剪导出 PNG。
- **图片编辑器 (Image Editor)**: 对图片进行标注处理，包括箭头、文字、自由绘制、马赛克及裁剪等功能。
- **图片标注器 (Image Annotator)**: 在图片上快速打点生成自增圆形编号标记，支持拖拽调整、双击删除、多步撤销及自定义底部说明文字合成导出 PNG。
- **Picture Append (图片拼接与对比)**: 面向 UI 审计与设计稿对比的图片拼接工具，支持 `Ctrl+V` 直接粘贴、右侧 Excel 式格子槽位排版、单图分辨率精确调整与透明/纯色底导出。
- **背景图构建 (Background Builder)**: 将多张竖屏插画/设计稿横排叠压构建宽屏桌面背景图，支持 `16:9` 2K/4K、`16:10` 2560×1600、`21:9`、`32:9` 等比例（切换时图层自动等比缩放）、画布与图片边缘互相智能吸附、非破坏性裁剪、图层上下遮挡调整、边缘渐变羽化融合及高清 PNG/JPG 导出。

### 📱 二维码 (QR Code)
- **二维码生成器 (QR Code Generator)**: 生成可自定义颜色、Logo 和纠错级别的二维码。
- **二维码扫描器 (QR Code Scanner)**: 通过上传图片、粘贴剪贴板图片或直接使用摄像头扫描来解码二维码。

## 🚀 技术栈

- 框架: [Next.js 15](https://nextjs.org/) (App Router)
- 样式: [Tailwind CSS v4](https://tailwindcss.com/)
- 图标: [Lucide React](https://lucide.dev/)
- 动画: [Motion](https://motion.dev/)
- 工具库: `js-beautify`, `diff`, `js-yaml`, `fabric`, `mermaid`, `jsqr`, `sm-crypto`, `crypto-js` 等

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

# DevTools Hub

A collection of useful developer tools built with Next.js, React, and Tailwind CSS.

## Features

- **Extensible Architecture**: Easily add new tools by creating a new route and adding it to `lib/tools.ts`.
- **Color Picker**: Pick colors from a gradient and get RGB/HEX codes.
- **YAML Formatter**: Format YAML, remove empty lines, and sort keys alphabetically (A-Z).
- **Responsive Design**: Works great on desktop and mobile.

## Tech Stack

- Framework: [Next.js 15](https://nextjs.org/) (App Router)
- Styling: [Tailwind CSS v4](https://tailwindcss.com/)
- Icons: [Lucide React](https://lucide.dev/)
- Animations: [Motion](https://motion.dev/)
- YAML Parsing: [js-yaml](https://github.com/nodeca/js-yaml)

## Getting Started

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

## Deployment

This project is configured for standalone output, making it easy to deploy to various platforms.

### Docker Container

A `Dockerfile` is included for containerized deployment.

```bash
# Build the image
docker build -t devtools-hub .

# Run the container
docker run -p 3000:3000 devtools-hub
```

### Cloudflare Pages / GitHub Pages

To deploy as a static site, you can modify `next.config.ts` to use `output: 'export'` instead of `output: 'standalone'`. Note that some Next.js features (like Image Optimization using the default loader) might require specific configurations for static exports.

Currently, it is set up for Node.js environments (like Cloud Run, Vercel, or standard Docker containers) using `output: 'standalone'`.

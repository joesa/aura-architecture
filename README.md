# Aura Architecture

> Design at the speed of thought. Generate production-grade sitemaps, wireframes, style guides, and a live interactive preview from a single prompt.

Aura is an AI-driven architecture studio for front-end projects. Feed it a one-line product description; get back a complete design system, a navigable sitemap, wireframes, a pixel-clean live preview with working links and real imagery, and a downloadable project scaffold.

## Requirements

- Node.js 20+
- An OpenAI API key with access to GPT-4.1 (or any compatible Responses-API model)

## Setup

```bash
git clone https://github.com/joesa/aura-architecture.git
cd aura-architecture
npm install
```

Create `.env.local` in the project root:

```bash
OPENAI_API_KEY=sk-...
# optional — defaults to "gpt-4.1"
OPENAI_MODEL=gpt-4.1
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Describe a product. Watch it architect itself.

## Build

```bash
npm run build
npm start
```

## Architecture

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Prompt screen → generating state → dashboard with five views |
| `app/api/generate/route.ts` | OpenAI Responses API call, zod validation, repair pipeline |
| `app/api/validate-image/route.ts` | HEAD checks for AI-suggested images |
| `lib/schema.ts` | Single source of truth: `AuraProject`, sections, design tokens |
| `lib/system-prompt.ts` | Full Design Architect Pro system prompt |
| `lib/pipeline/repair.ts` | Image fallback chain, link-graph repair, contrast enforcement |
| `lib/preview-router.tsx` | Client-side router shared by wireframe + live preview |
| `lib/export.ts` | Zip export (React + Vite / Next.js variants) |
| `components/renderer/index.tsx` | All 14 section renderers with wireframe/preview dual mode |

## Design principles

1. **No dead links.** Every CTA, nav item, footer link is wired through a shared in-preview router. Unknown paths are repaired server-side before rendering.
2. **No broken images.** Every suggested image URL is HEAD-checked with a Picsum → SVG gradient fallback chain.
3. **No placeholder text.** The system prompt forbids lorem ipsum; post-validation rejects "placeholder"-like strings.
4. **One contract.** The exact same `AuraProject` JSON drives wireframes, live preview, style guide, and exported code.

## License

MIT
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

/**
 * Aura export pipeline
 * --------------------
 * Generates downloadable, self-contained project zips from an AuraProject.
 *
 * Strategy: emit **static HTML pages** (one per sitemap path) that are fully
 * browsable on disk via relative links — no build step, double-click any file
 * and everything works. Styling uses Tailwind Play CDN + a `:root {}` block
 * wiring the design system tokens into CSS custom properties.
 *
 * Two variants:
 * - `downloadReactViteZip`  — scaffold + static HTML + optional Vite upgrade path
 * - `downloadNextjsZip`     — scaffold + static HTML + optional Next.js upgrade path
 *
 * Both reuse the same page generator; variants differ only in README and root
 * scaffolding so the user can progressively enhance either.
 */

import JSZip from "jszip";
import { saveAs } from "file-saver";
import type {
  AuraProject,
  DesignSystem,
  ImageRef,
  LinkTarget,
  Page,
  Section,
} from "@/lib/schema";

// ---------- utilities ----------

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function slugifyPath(path: string): string {
  if (path === "/" || path === "") return "index.html";
  return path.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "_") + ".html";
}

function imageById(project: AuraProject, id?: string): ImageRef | undefined {
  if (!id) return undefined;
  return project.imagery.find((i) => i.id === id);
}

function linkHref(project: AuraProject, link: LinkTarget): string {
  if (link.external || /^https?:\/\//.test(link.href)) return link.href;
  if (link.href.startsWith("#")) return link.href;
  const page = project.pages.find((p) => p.path === link.href);
  if (page) return slugifyPath(page.path);
  // fallback to first page
  return slugifyPath(project.pages[0].path);
}

function cssVars(ds: DesignSystem): string {
  const lines: string[] = [];
  Object.entries(ds.colors.primary).forEach(([k, v]) => lines.push(`--primary-${k}:${v}`));
  Object.entries(ds.colors.neutral).forEach(([k, v]) => lines.push(`--neutral-${k}:${v}`));
  lines.push(`--bg:${ds.colors.background}`);
  lines.push(`--fg:${ds.colors.foreground}`);
  lines.push(`--surface:${ds.colors.surface}`);
  lines.push(`--border:${ds.colors.border}`);
  lines.push(`--muted:${ds.colors.muted}`);
  Object.entries(ds.radii).forEach(([k, v]) => lines.push(`--radius-${k}:${v}`));
  Object.entries(ds.shadows).forEach(([k, v]) => lines.push(`--shadow-${k}:${v}`));
  lines.push(`--font-sans:${ds.typography.fontSans}`);
  lines.push(`--font-display:${ds.typography.fontDisplay ?? ds.typography.fontSans}`);
  lines.push(`--font-mono:${ds.typography.fontMono}`);
  return `:root{${lines.join(";")}}`;
}

// ---------- section renderers ----------

function renderSection(project: AuraProject, s: Section): string {
  switch (s.type) {
    case "navbar":
      return `<nav class="sticky top-0 z-40 bg-white/80 backdrop-blur border-b" style="border-color:var(--border)">
        <div class="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <a href="${slugifyPath("/")}" class="font-bold text-lg" style="color:var(--fg)">${escape(s.logoText)}</a>
          <div class="hidden md:flex items-center gap-6">
            ${s.links.map((l) => `<a href="${linkHref(project, l)}" class="text-sm" style="color:var(--fg)">${escape(l.label)}</a>`).join("")}
          </div>
          <div class="flex items-center gap-2">
            ${s.ctaSecondary ? `<a href="${linkHref(project, s.ctaSecondary)}" class="text-sm px-3 py-1.5" style="color:var(--fg)">${escape(s.ctaSecondary.label)}</a>` : ""}
            ${s.ctaPrimary ? `<a href="${linkHref(project, s.ctaPrimary)}" class="text-sm px-4 py-2 font-medium text-white" style="background:var(--primary-600);border-radius:var(--radius-md)">${escape(s.ctaPrimary.label)}</a>` : ""}
          </div>
        </div>
      </nav>`;

    case "hero": {
      const img = imageById(project, s.imageId);
      const imgTag = img?.url
        ? `<img src="${escape(img.url)}" alt="${escape(img.alt)}" class="w-full h-auto rounded-2xl shadow-xl" style="box-shadow:var(--shadow-xl);border-radius:var(--radius-xl)" />`
        : "";
      const center = s.variant !== "split";
      return `<section class="py-24 px-6" style="background:var(--bg);color:var(--fg)">
        <div class="max-w-7xl mx-auto ${center ? "text-center" : "grid md:grid-cols-2 gap-12 items-center"}">
          <div class="${center ? "max-w-3xl mx-auto" : ""}">
            ${s.badge ? `<div class="inline-block px-3 py-1 text-xs font-medium mb-6" style="background:var(--primary-50);color:var(--primary-700);border-radius:9999px">${escape(s.badge)}</div>` : ""}
            <h1 class="font-bold tracking-tight" style="font-family:var(--font-display);font-size:clamp(2.5rem,5vw,4.5rem);line-height:1.05">${escape(s.headline)}</h1>
            <p class="mt-6 text-lg" style="color:var(--muted);max-width:42rem;${center ? "margin-left:auto;margin-right:auto" : ""}">${escape(s.subheadline)}</p>
            <div class="mt-8 flex gap-3 ${center ? "justify-center" : ""} flex-wrap">
              <a href="${linkHref(project, s.ctaPrimary)}" class="inline-flex items-center px-6 py-3 font-semibold text-white" style="background:var(--primary-600);border-radius:var(--radius-md);box-shadow:var(--shadow-md)">${escape(s.ctaPrimary.label)}</a>
              ${s.ctaSecondary ? `<a href="${linkHref(project, s.ctaSecondary)}" class="inline-flex items-center px-6 py-3 font-semibold border" style="color:var(--fg);border-color:var(--border);border-radius:var(--radius-md)">${escape(s.ctaSecondary.label)}</a>` : ""}
            </div>
          </div>
          ${!center ? `<div>${imgTag}</div>` : img?.url ? `<div class="mt-14 max-w-5xl mx-auto">${imgTag}</div>` : ""}
        </div>
      </section>`;
    }

    case "featureGrid": {
      const cols = s.columns;
      const gridClass = cols === 2 ? "md:grid-cols-2" : cols === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3";
      return `<section class="py-20 px-6" style="background:var(--surface);color:var(--fg)">
        <div class="max-w-7xl mx-auto">
          <div class="text-center max-w-3xl mx-auto mb-14">
            ${s.eyebrow ? `<div class="text-sm font-semibold uppercase tracking-widest" style="color:var(--primary-600)">${escape(s.eyebrow)}</div>` : ""}
            <h2 class="mt-3 font-bold" style="font-size:clamp(1.875rem,3vw,2.5rem);font-family:var(--font-display)">${escape(s.headline)}</h2>
            ${s.subheadline ? `<p class="mt-4 text-lg" style="color:var(--muted)">${escape(s.subheadline)}</p>` : ""}
          </div>
          <div class="grid ${gridClass} gap-6">
            ${s.items
              .map((it) => {
                const inner = `
                  <div class="w-12 h-12 grid place-items-center text-2xl mb-4" style="background:var(--primary-50);color:var(--primary-700);border-radius:var(--radius-md)">${escape(it.icon)}</div>
                  <h3 class="font-semibold text-lg">${escape(it.title)}</h3>
                  <p class="mt-2 text-sm" style="color:var(--muted)">${escape(it.description)}</p>`;
                return it.href
                  ? `<a href="${linkHref(project, { label: it.title, href: it.href })}" class="block p-6 bg-white border hover:shadow-lg transition-shadow" style="border-color:var(--border);border-radius:var(--radius-lg)">${inner}</a>`
                  : `<div class="p-6 bg-white border" style="border-color:var(--border);border-radius:var(--radius-lg)">${inner}</div>`;
              })
              .join("")}
          </div>
        </div>
      </section>`;
    }

    case "bento":
      return `<section class="py-20 px-6" style="background:var(--bg);color:var(--fg)">
        <div class="max-w-7xl mx-auto">
          <div class="text-center max-w-3xl mx-auto mb-12">
            ${s.eyebrow ? `<div class="text-sm font-semibold uppercase tracking-widest" style="color:var(--primary-600)">${escape(s.eyebrow)}</div>` : ""}
            <h2 class="mt-3 font-bold" style="font-size:clamp(1.875rem,3vw,2.5rem);font-family:var(--font-display)">${escape(s.headline)}</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
            ${s.items
              .map((it) => {
                const spanMap: Record<string, string> = { "1x1": "md:col-span-1 md:row-span-1", "2x1": "md:col-span-2", "1x2": "md:row-span-2", "2x2": "md:col-span-2 md:row-span-2" };
                const bg = it.accent ? "background:var(--primary-600);color:white" : "background:var(--surface);color:var(--fg)";
                return `<div class="${spanMap[it.span]} p-6 border min-h-[180px]" style="${bg};border-color:var(--border);border-radius:var(--radius-lg)">
                  <h3 class="font-semibold text-lg">${escape(it.title)}</h3>
                  <p class="mt-2 text-sm opacity-80">${escape(it.description)}</p>
                </div>`;
              })
              .join("")}
          </div>
        </div>
      </section>`;

    case "stats":
      return `<section class="py-20 px-6" style="background:var(--surface);color:var(--fg)">
        <div class="max-w-6xl mx-auto">
          ${s.headline ? `<h2 class="text-center font-bold mb-12" style="font-size:clamp(1.875rem,3vw,2.5rem);font-family:var(--font-display)">${escape(s.headline)}</h2>` : ""}
          <div class="grid grid-cols-2 md:grid-cols-${Math.min(s.items.length, 4)} gap-8">
            ${s.items
              .map((it) => `<div class="text-center">
                <div class="font-bold" style="font-size:clamp(2rem,4vw,3.5rem);color:var(--primary-600);font-family:var(--font-display)">${escape(it.value)}</div>
                <div class="mt-2 text-sm" style="color:var(--muted)">${escape(it.label)}</div>
                ${it.trend ? `<div class="mt-1 text-xs font-medium" style="color:var(--primary-700)">${escape(it.trend)}</div>` : ""}
              </div>`)
              .join("")}
          </div>
        </div>
      </section>`;

    case "logoCloud":
      return `<section class="py-14 px-6 border-y" style="background:var(--bg);border-color:var(--border)">
        <div class="max-w-7xl mx-auto text-center">
          <p class="text-xs uppercase tracking-widest mb-6" style="color:var(--muted)">${escape(s.eyebrow)}</p>
          <div class="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 opacity-70">
            ${s.logos.map((l) => `<span class="text-sm font-semibold tracking-wide" style="color:var(--fg)">${escape(l)}</span>`).join("")}
          </div>
        </div>
      </section>`;

    case "testimonial":
      return `<section class="py-20 px-6" style="background:var(--bg);color:var(--fg)">
        <div class="max-w-6xl mx-auto">
          ${s.headline ? `<h2 class="text-center font-bold mb-12" style="font-size:clamp(1.875rem,3vw,2.5rem);font-family:var(--font-display)">${escape(s.headline)}</h2>` : ""}
          <div class="grid md:grid-cols-${Math.min(s.items.length, 3)} gap-6">
            ${s.items
              .map((it) => {
                const avatar = imageById(project, it.avatarId);
                return `<figure class="p-6 border bg-white" style="border-color:var(--border);border-radius:var(--radius-lg)">
                  <blockquote class="text-base leading-relaxed" style="color:var(--fg)">&ldquo;${escape(it.quote)}&rdquo;</blockquote>
                  <figcaption class="mt-5 flex items-center gap-3">
                    ${avatar?.url ? `<img src="${escape(avatar.url)}" alt="${escape(avatar.alt)}" class="w-10 h-10 rounded-full object-cover" />` : `<div class="w-10 h-10 rounded-full" style="background:var(--primary-100)"></div>`}
                    <div>
                      <div class="font-semibold text-sm">${escape(it.author)}</div>
                      <div class="text-xs" style="color:var(--muted)">${escape(it.role)}</div>
                    </div>
                  </figcaption>
                </figure>`;
              })
              .join("")}
          </div>
        </div>
      </section>`;

    case "pricing":
      return `<section class="py-20 px-6" style="background:var(--surface);color:var(--fg)">
        <div class="max-w-7xl mx-auto">
          <div class="text-center max-w-3xl mx-auto mb-14">
            ${s.eyebrow ? `<div class="text-sm font-semibold uppercase tracking-widest" style="color:var(--primary-600)">${escape(s.eyebrow)}</div>` : ""}
            <h2 class="mt-3 font-bold" style="font-size:clamp(1.875rem,3vw,2.5rem);font-family:var(--font-display)">${escape(s.headline)}</h2>
            ${s.subheadline ? `<p class="mt-4 text-lg" style="color:var(--muted)">${escape(s.subheadline)}</p>` : ""}
          </div>
          <div class="grid md:grid-cols-${s.tiers.length} gap-6 max-w-5xl mx-auto">
            ${s.tiers
              .map((t) => {
                const featBg = t.featured ? "background:var(--primary-600);color:white" : "background:white;color:var(--fg)";
                return `<div class="p-7 border flex flex-col" style="${featBg};border-color:${t.featured ? "transparent" : "var(--border)"};border-radius:var(--radius-lg);box-shadow:${t.featured ? "var(--shadow-xl)" : "var(--shadow-sm)"}">
                  <div class="text-sm font-semibold opacity-80">${escape(t.name)}</div>
                  <div class="mt-3 flex items-baseline gap-1">
                    <span class="font-bold" style="font-size:2.5rem">${escape(t.price)}</span>
                    ${t.period ? `<span class="text-sm opacity-70">${escape(t.period)}</span>` : ""}
                  </div>
                  <p class="mt-3 text-sm opacity-80">${escape(t.description)}</p>
                  <ul class="mt-6 space-y-2.5 text-sm flex-1">
                    ${t.features.map((f) => `<li class="flex items-start gap-2"><span class="shrink-0">✓</span><span>${escape(f)}</span></li>`).join("")}
                  </ul>
                  <a href="${linkHref(project, t.cta)}" class="mt-7 text-center px-5 py-2.5 font-medium ${t.featured ? "bg-white" : "text-white"}" style="${t.featured ? "color:var(--primary-700)" : "background:var(--primary-600)"};border-radius:var(--radius-md)">${escape(t.cta.label)}</a>
                </div>`;
              })
              .join("")}
          </div>
        </div>
      </section>`;

    case "faq":
      return `<section class="py-20 px-6" style="background:var(--bg);color:var(--fg)">
        <div class="max-w-3xl mx-auto">
          <h2 class="text-center font-bold mb-10" style="font-size:clamp(1.875rem,3vw,2.5rem);font-family:var(--font-display)">${escape(s.headline)}</h2>
          <div class="space-y-3">
            ${s.items
              .map((it) => `<details class="group border p-4" style="border-color:var(--border);border-radius:var(--radius-md);background:var(--surface)">
                <summary class="cursor-pointer font-semibold list-none flex justify-between items-center">${escape(it.question)}<span class="group-open:rotate-180 transition-transform">▾</span></summary>
                <p class="mt-3 text-sm leading-relaxed" style="color:var(--muted)">${escape(it.answer)}</p>
              </details>`)
              .join("")}
          </div>
        </div>
      </section>`;

    case "cta":
      return `<section class="py-20 px-6" style="background:var(--primary-600);color:white">
        <div class="max-w-4xl mx-auto text-center">
          <h2 class="font-bold" style="font-size:clamp(1.875rem,3vw,2.75rem);font-family:var(--font-display)">${escape(s.headline)}</h2>
          ${s.subheadline ? `<p class="mt-4 text-lg opacity-90">${escape(s.subheadline)}</p>` : ""}
          <div class="mt-8 flex gap-3 justify-center flex-wrap">
            <a href="${linkHref(project, s.ctaPrimary)}" class="px-6 py-3 font-semibold bg-white" style="color:var(--primary-700);border-radius:var(--radius-md)">${escape(s.ctaPrimary.label)}</a>
            ${s.ctaSecondary ? `<a href="${linkHref(project, s.ctaSecondary)}" class="px-6 py-3 font-semibold border border-white/40" style="border-radius:var(--radius-md);color:white">${escape(s.ctaSecondary.label)}</a>` : ""}
          </div>
        </div>
      </section>`;

    case "gallery":
      return `<section class="py-20 px-6" style="background:var(--bg)">
        <div class="max-w-7xl mx-auto">
          ${s.headline ? `<h2 class="text-center font-bold mb-10" style="font-size:clamp(1.875rem,3vw,2.5rem);font-family:var(--font-display);color:var(--fg)">${escape(s.headline)}</h2>` : ""}
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${s.imageIds
              .map((id) => {
                const im = imageById(project, id);
                return im?.url
                  ? `<img src="${escape(im.url)}" alt="${escape(im.alt)}" class="w-full aspect-square object-cover" style="border-radius:var(--radius-md)" />`
                  : `<div class="w-full aspect-square" style="background:var(--surface);border-radius:var(--radius-md)"></div>`;
              })
              .join("")}
          </div>
        </div>
      </section>`;

    case "steps":
      return `<section class="py-20 px-6" style="background:var(--surface);color:var(--fg)">
        <div class="max-w-5xl mx-auto">
          <div class="text-center max-w-2xl mx-auto mb-14">
            ${s.eyebrow ? `<div class="text-sm font-semibold uppercase tracking-widest" style="color:var(--primary-600)">${escape(s.eyebrow)}</div>` : ""}
            <h2 class="mt-3 font-bold" style="font-size:clamp(1.875rem,3vw,2.5rem);font-family:var(--font-display)">${escape(s.headline)}</h2>
          </div>
          <ol class="grid md:grid-cols-${Math.min(s.items.length, 4)} gap-6">
            ${s.items
              .map((it, i) => `<li class="p-5 bg-white border" style="border-color:var(--border);border-radius:var(--radius-lg)">
                <div class="w-8 h-8 rounded-full grid place-items-center font-semibold text-white mb-4" style="background:var(--primary-600)">${i + 1}</div>
                <h3 class="font-semibold">${escape(it.title)}</h3>
                <p class="mt-2 text-sm" style="color:var(--muted)">${escape(it.description)}</p>
              </li>`)
              .join("")}
          </ol>
        </div>
      </section>`;

    case "form":
      return `<section class="py-20 px-6" style="background:var(--bg);color:var(--fg)">
        <div class="max-w-xl mx-auto">
          <h2 class="text-center font-bold" style="font-size:clamp(1.5rem,3vw,2.25rem);font-family:var(--font-display)">${escape(s.headline)}</h2>
          ${s.subheadline ? `<p class="text-center mt-3" style="color:var(--muted)">${escape(s.subheadline)}</p>` : ""}
          <form class="mt-8 space-y-4" onsubmit="event.preventDefault();alert('Form submitted (demo)')">
            ${s.fields
              .map((f) => {
                const common = `name="${escape(f.name)}" ${f.required ? "required" : ""} placeholder="${escape(f.placeholder ?? "")}" class="w-full px-3 py-2.5 border" style="border-color:var(--border);border-radius:var(--radius-md);background:white"`;
                const input =
                  f.type === "textarea"
                    ? `<textarea ${common} rows="4"></textarea>`
                    : f.type === "select"
                      ? `<select ${common}>${(f.options ?? []).map((o) => `<option>${escape(o)}</option>`).join("")}</select>`
                      : `<input type="${f.type}" ${common} />`;
                return `<label class="block"><span class="block text-sm font-medium mb-1.5">${escape(f.label)}</span>${input}</label>`;
              })
              .join("")}
            <button type="submit" class="w-full px-5 py-2.5 font-semibold text-white" style="background:var(--primary-600);border-radius:var(--radius-md)">${escape(s.submitLabel)}</button>
          </form>
          ${s.footerLinks ? `<div class="mt-6 flex justify-center gap-4 text-sm">${s.footerLinks.map((l) => `<a href="${linkHref(project, l)}" style="color:var(--primary-600)">${escape(l.label)}</a>`).join("")}</div>` : ""}
        </div>
      </section>`;

    case "footer":
      return `<footer class="py-14 px-6 border-t" style="background:var(--surface);color:var(--fg);border-color:var(--border)">
        <div class="max-w-7xl mx-auto">
          <div class="grid md:grid-cols-${Math.max(2, Math.min(s.columns.length + 1, 5))} gap-8 mb-10">
            <div>
              <div class="font-bold text-lg">${escape(project.name)}</div>
              ${s.tagline ? `<p class="mt-2 text-sm" style="color:var(--muted)">${escape(s.tagline)}</p>` : ""}
            </div>
            ${s.columns
              .map((c) => `<div>
                <div class="text-xs font-semibold uppercase tracking-wider mb-3" style="color:var(--muted)">${escape(c.title)}</div>
                <ul class="space-y-2 text-sm">
                  ${c.links.map((l) => `<li><a href="${linkHref(project, l)}" style="color:var(--fg)">${escape(l.label)}</a></li>`).join("")}
                </ul>
              </div>`)
              .join("")}
          </div>
          <div class="pt-6 border-t text-xs" style="color:var(--muted);border-color:var(--border)">${escape(s.legal)}</div>
        </div>
      </footer>`;

    default:
      return "";
  }
}

function renderPage(project: AuraProject, page: Page): string {
  const body = page.sections.map((s) => renderSection(project, s)).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(page.title)} — ${escape(project.name)}</title>
<meta name="description" content="${escape(page.description)}" />
<script src="https://cdn.tailwindcss.com"></script>
<style>${cssVars(project.designSystem)}
body{font-family:var(--font-sans),ui-sans-serif,system-ui;background:var(--bg);color:var(--fg);margin:0}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ---------- scaffolding ----------

function readmeFor(project: AuraProject, kind: "react" | "next"): string {
  return `# ${project.name}

> ${project.tagline}

Generated with **Aura Architecture**.

## What's inside

- \`pages/\` — one static HTML file per sitemap path. Open any file in a browser — everything (links, CTAs, nav) works on disk.
- \`project.json\` — the full design contract (design system, sitemap, sections, imagery).
${kind === "next" ? "- `NEXTJS_UPGRADE.md` — instructions for promoting the static pages into a Next.js App Router project.\n" : "- `VITE_UPGRADE.md` — instructions for wiring the static pages into a Vite + React + Tailwind project.\n"}
## Quick start

Open \`pages/index.html\` in a browser.

## Design tokens

Tokens live in \`:root {}\` of each HTML file — primary scale, neutral scale, radii, shadows, typography. Re-skin by editing those custom properties.
`;
}

function viteUpgrade(): string {
  return `# Upgrade to Vite + React + Tailwind

\`\`\`bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm install -D tailwindcss@next
\`\`\`

Copy each \`pages/*.html\` body into a corresponding React Router route component.
Reuse \`project.json\` for data-driven rendering.
`;
}

function nextjsUpgrade(): string {
  return `# Upgrade to Next.js (App Router)

\`\`\`bash
npx create-next-app@latest my-app --ts --tailwind --app
\`\`\`

Map each \`pages/<slug>.html\` to a Next.js route at \`app/<slug>/page.tsx\`.
Use \`project.json\` as the data source; each section component reads tokens from the shared \`:root\` CSS variables defined in \`app/globals.css\`.
`;
}

// ---------- public API ----------

async function buildZip(project: AuraProject, kind: "react" | "next"): Promise<Blob> {
  const zip = new JSZip();
  zip.file("README.md", readmeFor(project, kind));
  zip.file("project.json", JSON.stringify(project, null, 2));
  zip.file(kind === "next" ? "NEXTJS_UPGRADE.md" : "VITE_UPGRADE.md", kind === "next" ? nextjsUpgrade() : viteUpgrade());
  const pages = zip.folder("pages")!;
  for (const page of project.pages) {
    pages.file(slugifyPath(page.path), renderPage(project, page));
  }
  return zip.generateAsync({ type: "blob" });
}

function safeName(project: AuraProject): string {
  return project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "aura-project";
}

export async function downloadReactViteZip(project: AuraProject): Promise<void> {
  const blob = await buildZip(project, "react");
  saveAs(blob, `${safeName(project)}-vite.zip`);
}

export async function downloadNextjsZip(project: AuraProject): Promise<void> {
  const blob = await buildZip(project, "next");
  saveAs(blob, `${safeName(project)}-nextjs.zip`);
}

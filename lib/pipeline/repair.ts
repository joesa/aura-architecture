import type { AuraProject, ImageRef, LinkTarget } from "@/lib/schema";

/**
 * Post-generation pipeline:
 *   1. Validate image URLs; fill missing/broken with working fallbacks.
 *   2. Ensure every internal href resolves to an existing page path.
 *   3. Ensure WCAG AA contrast on key color pairs.
 */
export async function validateAndRepairProject(
  project: AuraProject,
  _opts: { baseUrl: string },
): Promise<AuraProject> {
  // 1. Imagery
  await resolveImagery(project);

  // 2. Link graph
  repairLinkGraph(project);

  // 3. Contrast
  ensureContrast(project);

  return project;
}

// ---------- Imagery ----------

function picsumUrl(seed: string, aspect: ImageRef["aspect"]): string {
  const [w, h] = aspectDims(aspect);
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

function unsplashUrl(query: string, aspect: ImageRef["aspect"]): string {
  const [w, h] = aspectDims(aspect);
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}`;
}

function aspectDims(aspect: ImageRef["aspect"]): [number, number] {
  switch (aspect) {
    case "1/1":
      return [800, 800];
    case "4/3":
      return [1200, 900];
    case "3/4":
      return [900, 1200];
    case "9/16":
      return [720, 1280];
    case "21/9":
      return [1680, 720];
    case "16/9":
    default:
      return [1600, 900];
  }
}

async function headOk(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    // Picsum sometimes 302s through; Unsplash Source redirects to a CDN.
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "AuraImageValidator/1.0" },
    });
    clearTimeout(t);
    return r.ok && r.status === 200;
  } catch {
    return false;
  }
}

async function resolveImagery(project: AuraProject) {
  await Promise.all(
    project.imagery.map(async (img) => {
      const candidates: string[] = [];
      if (img.url) candidates.push(img.url);
      // Picsum first: it's CDN-backed and rock-solid. Unsplash Source is deprecated.
      candidates.push(picsumUrl(img.id + "-" + img.query, img.aspect));
      candidates.push(unsplashUrl(img.query, img.aspect));

      for (const c of candidates) {
        if (await headOk(c)) {
          img.url = c;
          return;
        }
      }
      // Last resort: SVG gradient data URL.
      img.url = svgGradientDataUrl(img.query, img.aspect);
    }),
  );
}

function svgGradientDataUrl(
  label: string,
  aspect: ImageRef["aspect"],
): string {
  const [w, h] = aspectDims(aspect);
  const hue = Math.abs(hashString(label)) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0%' stop-color='hsl(${hue} 70% 55%)'/>` +
    `<stop offset='100%' stop-color='hsl(${(hue + 40) % 360} 70% 35%)'/>` +
    `</linearGradient></defs>` +
    `<rect width='${w}' height='${h}' fill='url(#g)'/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// ---------- Link graph ----------

function repairLinkGraph(project: AuraProject) {
  const paths = new Set(project.pages.map((p) => p.path));
  const firstAuthPath =
    project.pages.find((p) => /auth|login|sign/i.test(p.path))?.path ?? "/";
  const contactPath =
    project.pages.find((p) => /contact|demo|talk/i.test(p.path))?.path ??
    firstAuthPath;

  function repair(target: LinkTarget | undefined): void {
    if (!target) return;
    if (target.external) return;
    if (target.href.startsWith("http")) {
      target.external = true;
      return;
    }
    if (target.href.startsWith("#")) return; // anchor
    if (!paths.has(target.href)) {
      // Try to find a close match.
      const match = [...paths].find((p) =>
        p.toLowerCase().includes(target.href.toLowerCase().replace(/^\//, "")),
      );
      target.href = match ?? contactPath;
    }
  }

  for (const page of project.pages) {
    for (const section of page.sections) {
      switch (section.type) {
        case "navbar":
          section.links.forEach(repair);
          repair(section.ctaPrimary);
          repair(section.ctaSecondary);
          break;
        case "hero":
          repair(section.ctaPrimary);
          repair(section.ctaSecondary);
          break;
        case "pricing":
          section.tiers.forEach((t) => repair(t.cta));
          break;
        case "cta":
          repair(section.ctaPrimary);
          repair(section.ctaSecondary);
          break;
        case "footer":
          section.columns.forEach((c) => c.links.forEach(repair));
          break;
        case "form":
          section.footerLinks?.forEach(repair);
          break;
        case "featureGrid":
          // items[].href is free-form; if set and internal, repair
          section.items.forEach((i) => {
            if (i.href && !i.href.startsWith("http") && !paths.has(i.href)) {
              i.href = contactPath;
            }
          });
          break;
      }
    }
  }
}

// ---------- Contrast (WCAG AA ≥ 4.5 for body text) ----------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relLuminance(hexToRgb(a));
  const lb = relLuminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function ensureContrast(project: AuraProject) {
  const ds = project.designSystem.colors;
  // If foreground on background fails AA, pick the more contrasting of black / white.
  if (contrastRatio(ds.foreground, ds.background) < 4.5) {
    const white = "#ffffff";
    const black = "#0a0a0a";
    ds.foreground =
      contrastRatio(white, ds.background) > contrastRatio(black, ds.background)
        ? white
        : black;
  }
}

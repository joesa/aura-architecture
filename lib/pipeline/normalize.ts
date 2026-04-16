/**
 * Normalize raw LLM output into a shape compatible with AuraProjectSchema.
 * The model frequently returns semantic colors as scale objects (e.g.
 * `{50:..., 500:..., 900:...}`) or omits them entirely. This pass:
 *
 * 1. Coerces object-shaped semantic colors to a single hex string.
 * 2. Fills in reasonable defaults for missing semantic fields derived from
 *    the primary / neutral scales.
 * 3. Ensures optional-but-often-missing design system fields exist.
 */

type Dict = Record<string, unknown>;
type RawProject = Dict & { designSystem?: Dict };

const DEFAULTS = {
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
};

function pickHex(v: unknown, fallback: string): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as Dict;
    // prefer the 500 level, then 600, then first string value
    const preferred = [500, 600, 700, 400, 300, 800, 900, 200, 100, 50, 950];
    for (const k of preferred) {
      const val = o[k] ?? o[String(k)];
      if (typeof val === "string") return val;
    }
    for (const val of Object.values(o)) {
      if (typeof val === "string") return val;
    }
  }
  return fallback;
}

function ensureScale(v: unknown, hex: string): Dict {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Dict;
    const keys = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const out: Dict = {};
    for (const k of keys) {
      const val = o[k] ?? o[String(k)];
      out[String(k)] = typeof val === "string" ? val : hex;
    }
    return out;
  }
  // synthesize from a single hex — rough but valid
  return {
    50: hex, 100: hex, 200: hex, 300: hex, 400: hex,
    500: hex, 600: hex, 700: hex, 800: hex, 900: hex, 950: hex,
  };
}

export function normalizeAuraProject(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const p = { ...(input as RawProject) };

  if (p.designSystem && typeof p.designSystem === "object") {
    const ds = { ...(p.designSystem as Dict) };
    const colorsRaw = (ds.colors as Dict) ?? {};
    const colors: Dict = { ...colorsRaw };

    const primaryHex = pickHex(colors.primary, "#2563eb");
    const neutralHex = pickHex(colors.neutral, "#71717a");

    colors.primary = ensureScale(colors.primary, primaryHex);
    colors.neutral = ensureScale(colors.neutral, neutralHex);
    if (colors.accent !== undefined) {
      const accentHex = pickHex(colors.accent, primaryHex);
      colors.accent = ensureScale(colors.accent, accentHex);
    }

    // Coerce every semantic color to a hex string.
    colors.background = pickHex(colors.background, "#ffffff");
    colors.foreground = pickHex(colors.foreground, "#09090b");
    colors.surface = pickHex(colors.surface, "#f4f4f5");
    colors.border = pickHex(colors.border, "#e4e4e7");
    colors.muted = pickHex(colors.muted, "#71717a");
    colors.success = pickHex(colors.success, DEFAULTS.success);
    colors.warning = pickHex(colors.warning, DEFAULTS.warning);
    colors.danger = pickHex(colors.danger, DEFAULTS.danger);

    ds.colors = colors;

    // Fill in commonly-omitted fields.
    if (!ds.spacing || typeof ds.spacing !== "object") {
      ds.spacing = { unit: 4, density: "comfortable" };
    }
    if (!ds.motion || typeof ds.motion !== "object") {
      ds.motion = {
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        durationFast: "150ms",
        durationBase: "220ms",
        durationSlow: "360ms",
      };
    }
    if (ds.radii && typeof ds.radii === "object") {
      const r = ds.radii as Dict;
      const base = typeof r.md === "string" ? r.md : "0.5rem";
      ds.radii = {
        sm: typeof r.sm === "string" ? r.sm : "0.25rem",
        md: base,
        lg: typeof r.lg === "string" ? r.lg : "0.75rem",
        xl: typeof r.xl === "string" ? r.xl : "1rem",
        full: typeof r.full === "string" ? r.full : "9999px",
      };
    }
    if (ds.shadows && typeof ds.shadows === "object") {
      const sh = ds.shadows as Dict;
      ds.shadows = {
        sm: typeof sh.sm === "string" ? sh.sm : "0 1px 2px rgba(0,0,0,0.05)",
        md: typeof sh.md === "string" ? sh.md : "0 4px 6px -1px rgba(0,0,0,0.1)",
        lg: typeof sh.lg === "string" ? sh.lg : "0 10px 15px -3px rgba(0,0,0,0.1)",
        xl: typeof sh.xl === "string" ? sh.xl : "0 20px 25px -5px rgba(0,0,0,0.1)",
      };
    }
    if (ds.typography && typeof ds.typography === "object") {
      const t = { ...(ds.typography as Dict) };
      if (!t.weights || typeof t.weights !== "object") {
        t.weights = { regular: 400, medium: 500, semibold: 600, bold: 700 };
      }
      if (!t.fontMono || typeof t.fontMono !== "string") t.fontMono = "JetBrains Mono";
      if (!t.fontSans || typeof t.fontSans !== "string") t.fontSans = "Inter";
      ds.typography = t;
    }

    p.designSystem = ds;
  }

  // Ensure research exists (route schema requires it)
  if (!p.research || typeof p.research !== "object") {
    p.research = {
      category: (p.category as string) ?? "Web App",
      inspirations: [],
      conventions: [],
      audience: "General",
      tone: "Professional",
    };
  }

  // Normalize pages: synthesize missing id/path/name/title/description and
  // recursively normalize each section's id + common missing fields.
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page";

  if (Array.isArray(p.pages)) {
    p.pages = (p.pages as Dict[]).map((rawPage, i) => {
      const pg: Dict = { ...rawPage };
      const name =
        (typeof pg.name === "string" && pg.name) ||
        (typeof pg.title === "string" && pg.title) ||
        (i === 0 ? "Home" : `Page ${i + 1}`);
      pg.name = name;
      if (typeof pg.title !== "string" || !pg.title) pg.title = name;
      if (typeof pg.description !== "string") pg.description = name;
      if (typeof pg.id !== "string" || !pg.id) pg.id = `page-${slugify(name)}`;
      if (typeof pg.path !== "string" || !pg.path) {
        pg.path = i === 0 ? "/" : `/${slugify(name)}`;
      }
      if (Array.isArray(pg.sections)) {
        pg.sections = (pg.sections as Dict[]).map((rawSec, j) => {
          const s: Dict = { ...rawSec };
          if (typeof s.id !== "string" || !s.id) {
            const t = typeof s.type === "string" ? s.type : "section";
            s.id = `${pg.id}-${t}-${j}`;
          }
          // stats: each item must have a `value` string
          if (s.type === "stats" && Array.isArray(s.items)) {
            s.items = (s.items as Dict[]).map((it) => {
              const item: Dict = { ...it };
              if (typeof item.value !== "string") {
                const n = item.value;
                item.value =
                  typeof n === "number" ? String(n) : typeof n === "string" ? n : "\u2014";
              }
              if (typeof item.label !== "string") item.label = "";
              return item;
            });
          }
          return s;
        });
      } else {
        pg.sections = [];
      }
      return pg;
    });
  }

  // Synthesize sitemap from pages if missing or empty.
  const pagesArr = Array.isArray(p.pages) ? (p.pages as Dict[]) : [];
  const hasSitemap =
    Array.isArray(p.sitemap) && (p.sitemap as unknown[]).length > 0;
  if (!hasSitemap && pagesArr.length > 0) {
    p.sitemap = pagesArr.map((pg) => ({
      id: `sm-${pg.id}`,
      name: pg.name as string,
      path: pg.path as string,
      description: pg.description as string | undefined,
    }));
  } else if (Array.isArray(p.sitemap)) {
    p.sitemap = (p.sitemap as Dict[]).map((n, i) => {
      const node: Dict = { ...n };
      if (typeof node.path !== "string" || !node.path) {
        node.path = pagesArr[i]?.path as string | undefined ?? "/";
      }
      if (typeof node.name !== "string" || !node.name) {
        node.name = (pagesArr[i]?.name as string) ?? `Page ${i + 1}`;
      }
      if (typeof node.id !== "string" || !node.id) {
        node.id = `sm-${slugify(node.name as string)}`;
      }
      return node;
    });
  }

  // Ensure imagery is an array (schema requires it, even if empty).
  if (!Array.isArray(p.imagery)) p.imagery = [];

  // Top-level string defaults.
  if (typeof p.name !== "string" || !p.name) p.name = "Untitled Project";
  if (typeof p.tagline !== "string") p.tagline = "";
  if (typeof p.description !== "string") p.description = "";
  if (typeof p.category !== "string") p.category = "Web App";

  return p;
}

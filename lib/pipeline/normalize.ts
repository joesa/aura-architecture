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

    // Fill in commonly-omitted fields. Always merge so partial objects
    // returned by the model get their missing sub-fields populated.
    {
      const sp = (ds.spacing && typeof ds.spacing === "object" ? (ds.spacing as Dict) : {}) as Dict;
      const allowedDensity = new Set(["compact", "comfortable", "spacious"]);
      ds.spacing = {
        unit: typeof sp.unit === "number" ? sp.unit : 4,
        density:
          typeof sp.density === "string" && allowedDensity.has(sp.density)
            ? sp.density
            : "comfortable",
      };
    }
    {
      const mo = (ds.motion && typeof ds.motion === "object" ? (ds.motion as Dict) : {}) as Dict;
      ds.motion = {
        easing: typeof mo.easing === "string" ? mo.easing : "cubic-bezier(0.22, 1, 0.36, 1)",
        durationFast: typeof mo.durationFast === "string" ? mo.durationFast : "150ms",
        durationBase: typeof mo.durationBase === "string" ? mo.durationBase : "220ms",
        durationSlow: typeof mo.durationSlow === "string" ? mo.durationSlow : "360ms",
      };
    }
    {
      const r = (ds.radii && typeof ds.radii === "object" ? ds.radii : {}) as Dict;
      ds.radii = {
        sm: typeof r.sm === "string" ? r.sm : "0.25rem",
        md: typeof r.md === "string" ? r.md : "0.5rem",
        lg: typeof r.lg === "string" ? r.lg : "0.75rem",
        xl: typeof r.xl === "string" ? r.xl : "1rem",
        full: typeof r.full === "string" ? r.full : "9999px",
      };
    }
    {
      const sh = (ds.shadows && typeof ds.shadows === "object" ? ds.shadows : {}) as Dict;
      ds.shadows = {
        sm: typeof sh.sm === "string" ? sh.sm : "0 1px 2px rgba(0,0,0,0.05)",
        md: typeof sh.md === "string" ? sh.md : "0 4px 6px -1px rgba(0,0,0,0.1)",
        lg: typeof sh.lg === "string" ? sh.lg : "0 10px 15px -3px rgba(0,0,0,0.1)",
        xl: typeof sh.xl === "string" ? sh.xl : "0 20px 25px -5px rgba(0,0,0,0.1)",
      };
    }
    {
      const t = (ds.typography && typeof ds.typography === "object" ? { ...(ds.typography as Dict) } : {}) as Dict;
      if (!t.weights || typeof t.weights !== "object") {
        t.weights = { regular: 400, medium: 500, semibold: 600, bold: 700 };
      }
      if (!t.fontMono || typeof t.fontMono !== "string") t.fontMono = "JetBrains Mono";
      if (!t.fontSans || typeof t.fontSans !== "string") t.fontSans = "Inter";
      const scaleDefault = {
        xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem",
        xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem",
        "5xl": "3rem", "6xl": "3.75rem",
      };
      const sc = (t.scale && typeof t.scale === "object" ? t.scale : {}) as Dict;
      t.scale = { ...scaleDefault, ...Object.fromEntries(Object.entries(sc).filter(([, v]) => typeof v === "string")) };
      ds.typography = t;
    }

    p.designSystem = ds;
  }

  // Ensure research exists (route schema requires it)
  const toStr = (v: unknown, fallback: string): string => {
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(", ") || fallback;
    return fallback;
  };
  const toStrArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : String(x)));
    if (typeof v === "string") return [v];
    return [];
  };
  if (!p.research || typeof p.research !== "object") {
    p.research = {
      category: (p.category as string) ?? "Web App",
      inspirations: [],
      conventions: [],
      audience: "General",
      tone: "Professional",
    };
  } else {
    const r = { ...(p.research as Dict) };
    r.category = toStr(r.category, typeof p.category === "string" ? p.category : "Web App");
    r.audience = toStr(r.audience, "General");
    r.tone = toStr(r.tone, "Professional");
    r.inspirations = toStrArr(r.inspirations);
    r.conventions = toStrArr(r.conventions);
    p.research = r;
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
          // Synthesize a minimum-viable `items` array for section types that
          // require one, when the model omitted it entirely or returned a
          // non-array. Also pad to the schema's minimum length.
          const MIN_ITEMS: Record<string, number> = {
            featureGrid: 2,
            bento: 3,
            stats: 2,
            testimonial: 1,
            faq: 2,
            steps: 2,
          };
          if (typeof s.type === "string" && s.type in MIN_ITEMS) {
            if (!Array.isArray(s.items)) s.items = [];
            const min = MIN_ITEMS[s.type];
            while ((s.items as unknown[]).length < min) {
              (s.items as Dict[]).push({});
            }
          }
          // featureGrid / steps / bento: each item needs a `description` string
          if ((s.type === "featureGrid" || s.type === "steps" || s.type === "bento") && Array.isArray(s.items)) {
            s.items = (s.items as Dict[]).map((it) => {
              const item: Dict = { ...it };
              if (typeof item.title !== "string") {
                item.title = typeof (item as Dict).name === "string" ? ((item as Dict).name as string) : "";
              }
              if (typeof item.description !== "string") {
                const alt = (item as Dict).body ?? (item as Dict).text ?? (item as Dict).summary;
                item.description = typeof alt === "string" ? alt : "";
              }
              if (s.type === "featureGrid" && typeof item.icon !== "string") item.icon = "✨";
              return item;
            });
          }
          // faq: items need question/answer
          if (s.type === "faq" && Array.isArray(s.items)) {
            s.items = (s.items as Dict[]).map((it) => {
              const item: Dict = { ...it };
              if (typeof item.question !== "string") item.question = "";
              if (typeof item.answer !== "string") {
                const alt = (item as Dict).response ?? (item as Dict).body;
                item.answer = typeof alt === "string" ? alt : "";
              }
              return item;
            });
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
          // logoCloud: logos must be plain strings, eyebrow required
          if (s.type === "logoCloud") {
            const raw = Array.isArray(s.logos) ? (s.logos as unknown[]) : [];
            const logos = raw.map((l, idx) => {
              if (typeof l === "string") return l;
              if (l && typeof l === "object") {
                const o = l as Dict;
                if (typeof o.name === "string") return o.name;
                if (typeof o.label === "string") return o.label;
                if (typeof o.text === "string") return o.text;
              }
              return `Brand ${idx + 1}`;
            });
            while (logos.length < 4) logos.push(`Brand ${logos.length + 1}`);
            s.logos = logos;
            if (typeof s.eyebrow !== "string") s.eyebrow = "Trusted by teams at";
          }
          // testimonial: items must have quote/author/role strings
          if (s.type === "testimonial" && Array.isArray(s.items)) {
            s.items = (s.items as Dict[]).map((it, idx) => {
              const item: Dict = { ...it };
              if (typeof item.quote !== "string") item.quote = "";
              if (typeof item.author !== "string") {
                item.author =
                  typeof (item as Dict).name === "string"
                    ? ((item as Dict).name as string)
                    : `Customer ${idx + 1}`;
              }
              if (typeof item.role !== "string") {
                item.role =
                  typeof (item as Dict).title === "string"
                    ? ((item as Dict).title as string)
                    : "Customer";
              }
              return item;
            });
          }
          // pricing: tiers must be an array with >=2 entries
          if (s.type === "pricing") {
            if (!Array.isArray(s.tiers)) s.tiers = [];
            const tiers = (s.tiers as Dict[]).map((t, idx) => {
              const tier: Dict = { ...t };
              if (typeof tier.name !== "string") tier.name = `Tier ${idx + 1}`;
              if (typeof tier.price !== "string") {
                const pr = (tier as Dict).price;
                tier.price = typeof pr === "number" ? `$${pr}` : "$0";
              }
              if (typeof tier.description !== "string") tier.description = "";
              if (!Array.isArray(tier.features) || (tier.features as unknown[]).length < 1) {
                tier.features = ["Feature included"];
              } else {
                tier.features = (tier.features as unknown[]).map((f) =>
                  typeof f === "string"
                    ? f
                    : f && typeof f === "object" && typeof (f as Dict).text === "string"
                    ? ((f as Dict).text as string)
                    : String(f),
                );
              }
              if (!tier.cta || typeof tier.cta !== "object") {
                tier.cta = { label: "Get started", href: "/signup" };
              } else {
                const cta = tier.cta as Dict;
                if (typeof cta.label !== "string") cta.label = "Get started";
                if (typeof cta.href !== "string") cta.href = "/signup";
              }
              return tier;
            });
            while (tiers.length < 2) {
              tiers.push({
                name: tiers.length === 0 ? "Starter" : "Pro",
                price: tiers.length === 0 ? "$0" : "$29",
                description: "",
                features: ["Feature included"],
                cta: { label: "Get started", href: "/signup" },
              });
            }
            s.tiers = tiers;
            if (typeof s.headline !== "string") s.headline = "Pricing";
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

  // Ensure imagery is an array of fully-shaped items.
  if (!Array.isArray(p.imagery)) {
    p.imagery = [];
  } else {
    p.imagery = (p.imagery as unknown[]).map((raw, i) => {
      const item: Dict = raw && typeof raw === "object" ? { ...(raw as Dict) } : {};
      if (typeof item.alt !== "string") {
        const alt =
          (item as Dict).description ??
          (item as Dict).caption ??
          (item as Dict).title ??
          (item as Dict).name;
        item.alt = typeof alt === "string" ? alt : `Image ${i + 1}`;
      }
      if (typeof item.src !== "string") {
        const src = (item as Dict).url ?? (item as Dict).href;
        item.src = typeof src === "string" ? src : "";
      }
      return item;
    });
  }

  // Top-level string defaults.
  if (typeof p.name !== "string" || !p.name) p.name = "Untitled Project";
  if (typeof p.tagline !== "string") p.tagline = "";
  if (typeof p.description !== "string") p.description = "";
  if (typeof p.category !== "string") p.category = "Web App";

  return p;
}

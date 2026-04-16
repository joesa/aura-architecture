import { z } from "zod";

/**
 * Aura Project Schema
 * ---
 * Strict contract returned by the AI generation pipeline. Drives sitemap,
 * wireframes, style guide, live preview, and codegen export. One source of
 * truth — if it is not in this schema, the renderer cannot show it.
 */

// ---------- Design System ----------

const ColorScale = z.object({
  50: z.string(),
  100: z.string(),
  200: z.string(),
  300: z.string(),
  400: z.string(),
  500: z.string(),
  600: z.string(),
  700: z.string(),
  800: z.string(),
  900: z.string(),
  950: z.string(),
});

export const DesignSystemSchema = z.object({
  colors: z.object({
    primary: ColorScale,
    neutral: ColorScale,
    accent: ColorScale.optional(),
    success: z.string(),
    warning: z.string(),
    danger: z.string(),
    background: z.string(),
    foreground: z.string(),
    surface: z.string(),
    border: z.string(),
    muted: z.string(),
  }),
  typography: z.object({
    fontSans: z.string(),
    fontDisplay: z.string().optional(),
    fontMono: z.string(),
    scale: z.object({
      xs: z.string(),
      sm: z.string(),
      base: z.string(),
      lg: z.string(),
      xl: z.string(),
      "2xl": z.string(),
      "3xl": z.string(),
      "4xl": z.string(),
      "5xl": z.string(),
      "6xl": z.string(),
    }),
    weights: z.object({
      regular: z.number(),
      medium: z.number(),
      semibold: z.number(),
      bold: z.number(),
    }),
  }),
  spacing: z.object({
    unit: z.number().default(4),
    density: z.enum(["compact", "comfortable", "spacious"]),
  }),
  radii: z.object({
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
    full: z.string(),
  }),
  shadows: z.object({
    sm: z.string(),
    md: z.string(),
    lg: z.string(),
    xl: z.string(),
  }),
  motion: z.object({
    easing: z.string(),
    durationFast: z.string(),
    durationBase: z.string(),
    durationSlow: z.string(),
  }),
});
export type DesignSystem = z.infer<typeof DesignSystemSchema>;

// ---------- Link target ----------
// Every CTA / nav item / footer link must resolve to either a known page path
// or an explicitly external URL. The post-generation link-graph validator
// repairs any unknown paths.

export const LinkTargetSchema = z.object({
  label: z.string(),
  href: z.string(), // "/features" or "https://..." or "#section-id"
  external: z.boolean().optional(),
});
export type LinkTarget = z.infer<typeof LinkTargetSchema>;

// ---------- Sitemap ----------

const SitemapNodeBase = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(), // must match pages[].path
  description: z.string().optional(),
});
export type SitemapNode = z.infer<typeof SitemapNodeBase> & {
  children?: SitemapNode[];
};
export const SitemapNodeSchema: z.ZodType<SitemapNode> = SitemapNodeBase.extend(
  {
    children: z.lazy(() => SitemapNodeSchema.array()).optional(),
  },
);

// ---------- Imagery ----------

export const ImageRefSchema = z.object({
  id: z.string(),
  purpose: z.string(), // "hero", "feature-1", "testimonial-avatar-1", ...
  alt: z.string(),
  query: z.string(), // query keywords for Unsplash Source
  aspect: z.enum(["16/9", "4/3", "1/1", "3/4", "9/16", "21/9"]).default("16/9"),
  url: z.string().optional(), // resolved after server-side validation
});
export type ImageRef = z.infer<typeof ImageRefSchema>;

// ---------- Sections (discriminated union) ----------

const Base = <T extends string>(type: T) =>
  z.object({
    id: z.string(),
    type: z.literal(type),
  });

export const NavbarSectionSchema = Base("navbar").extend({
  logoText: z.string(),
  links: LinkTargetSchema.array(),
  ctaPrimary: LinkTargetSchema.optional(),
  ctaSecondary: LinkTargetSchema.optional(),
});

export const HeroSectionSchema = Base("hero").extend({
  badge: z.string().optional(),
  headline: z.string(),
  subheadline: z.string(),
  ctaPrimary: LinkTargetSchema,
  ctaSecondary: LinkTargetSchema.optional(),
  imageId: z.string().optional(),
  variant: z.enum(["centered", "split", "fullBleed"]).default("centered"),
});

export const FeatureGridSectionSchema = Base("featureGrid").extend({
  eyebrow: z.string().optional(),
  headline: z.string(),
  subheadline: z.string().optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  items: z
    .object({
      icon: z.string(), // emoji or lucide name
      title: z.string(),
      description: z.string(),
      href: z.string().optional(),
    })
    .array()
    .min(2),
});

export const BentoSectionSchema = Base("bento").extend({
  eyebrow: z.string().optional(),
  headline: z.string(),
  items: z
    .object({
      title: z.string(),
      description: z.string(),
      span: z.enum(["1x1", "2x1", "1x2", "2x2"]).default("1x1"),
      imageId: z.string().optional(),
      accent: z.boolean().optional(),
    })
    .array()
    .min(3),
});

export const StatsSectionSchema = Base("stats").extend({
  headline: z.string().optional(),
  items: z
    .object({
      value: z.string(),
      label: z.string(),
      trend: z.string().optional(),
    })
    .array()
    .min(2),
});

export const LogoCloudSectionSchema = Base("logoCloud").extend({
  eyebrow: z.string(),
  logos: z.string().array().min(4), // company names; rendered as type marks
});

export const TestimonialSectionSchema = Base("testimonial").extend({
  eyebrow: z.string().optional(),
  headline: z.string().optional(),
  items: z
    .object({
      quote: z.string(),
      author: z.string(),
      role: z.string(),
      avatarId: z.string().optional(),
    })
    .array()
    .min(1),
});

export const PricingSectionSchema = Base("pricing").extend({
  eyebrow: z.string().optional(),
  headline: z.string(),
  subheadline: z.string().optional(),
  tiers: z
    .object({
      name: z.string(),
      price: z.string(),
      period: z.string().optional(),
      description: z.string(),
      features: z.string().array().min(1),
      cta: LinkTargetSchema,
      featured: z.boolean().optional(),
    })
    .array()
    .min(2),
});

export const FaqSectionSchema = Base("faq").extend({
  headline: z.string(),
  items: z
    .object({
      question: z.string(),
      answer: z.string(),
    })
    .array()
    .min(2),
});

export const CtaSectionSchema = Base("cta").extend({
  headline: z.string(),
  subheadline: z.string().optional(),
  ctaPrimary: LinkTargetSchema,
  ctaSecondary: LinkTargetSchema.optional(),
  variant: z.enum(["banner", "card", "split"]).default("banner"),
});

export const GallerySectionSchema = Base("gallery").extend({
  headline: z.string().optional(),
  imageIds: z.string().array().min(2),
});

export const StepsSectionSchema = Base("steps").extend({
  eyebrow: z.string().optional(),
  headline: z.string(),
  items: z
    .object({
      title: z.string(),
      description: z.string(),
    })
    .array()
    .min(2),
});

export const FormSectionSchema = Base("form").extend({
  headline: z.string(),
  subheadline: z.string().optional(),
  fields: z
    .object({
      name: z.string(),
      label: z.string(),
      type: z.enum(["text", "email", "password", "textarea", "select"]),
      placeholder: z.string().optional(),
      options: z.string().array().optional(),
      required: z.boolean().optional(),
    })
    .array()
    .min(1),
  submitLabel: z.string(),
  footerLinks: LinkTargetSchema.array().optional(),
});

export const FooterSectionSchema = Base("footer").extend({
  tagline: z.string().optional(),
  columns: z
    .object({
      title: z.string(),
      links: LinkTargetSchema.array(),
    })
    .array(),
  legal: z.string(),
});

export const SectionSchema = z.discriminatedUnion("type", [
  NavbarSectionSchema,
  HeroSectionSchema,
  FeatureGridSectionSchema,
  BentoSectionSchema,
  StatsSectionSchema,
  LogoCloudSectionSchema,
  TestimonialSectionSchema,
  PricingSectionSchema,
  FaqSectionSchema,
  CtaSectionSchema,
  GallerySectionSchema,
  StepsSectionSchema,
  FormSectionSchema,
  FooterSectionSchema,
]);
export type Section = z.infer<typeof SectionSchema>;
export type SectionType = Section["type"];

// ---------- Page ----------

export const PageSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  title: z.string(),
  description: z.string(),
  sections: SectionSchema.array().min(1),
});
export type Page = z.infer<typeof PageSchema>;

// ---------- Research & Meta ----------

export const ResearchSchema = z.object({
  category: z.string(),
  inspirations: z.string().array(),
  conventions: z.string().array(),
  audience: z.string(),
  tone: z.string(),
});
export type Research = z.infer<typeof ResearchSchema>;

// ---------- Root ----------

export const AuraProjectSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  category: z.string(), // one of the Design Framework categories
  research: ResearchSchema,
  designSystem: DesignSystemSchema,
  sitemap: SitemapNodeSchema.array().min(1),
  pages: PageSchema.array().min(1),
  imagery: ImageRefSchema.array(),
});
export type AuraProject = z.infer<typeof AuraProjectSchema>;

// ---------- JSON Schema for OpenAI Responses API ----------
// OpenAI's `response_format: json_schema` requires a pure JSON Schema. zod v4
// can convert; we invoke it at call-site.

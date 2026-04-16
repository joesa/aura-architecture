"use client";

import React from "react";
import type {
  AuraProject,
  DesignSystem,
  LinkTarget,
  Page,
  Section,
} from "@/lib/schema";
import { usePreviewRouter } from "@/lib/preview-router";
import { aspectClass, imageUrl } from "@/lib/image";

// ---------- Tokens → CSS variables ----------

export function designSystemToCssVars(
  ds: DesignSystem,
): React.CSSProperties {
  const c = ds.colors;
  return {
    // @ts-expect-error CSS custom properties on React.CSSProperties
    "--aura-bg": c.background,
    "--aura-fg": c.foreground,
    "--aura-surface": c.surface,
    "--aura-border": c.border,
    "--aura-muted": c.muted,
    "--aura-primary": c.primary[600],
    "--aura-primary-hover": c.primary[700],
    "--aura-primary-soft": c.primary[50],
    "--aura-primary-soft-fg": c.primary[700],
    "--aura-neutral-50": c.neutral[50],
    "--aura-neutral-100": c.neutral[100],
    "--aura-neutral-200": c.neutral[200],
    "--aura-neutral-500": c.neutral[500],
    "--aura-neutral-700": c.neutral[700],
    "--aura-neutral-900": c.neutral[900],
    "--aura-radius-sm": ds.radii.sm,
    "--aura-radius-md": ds.radii.md,
    "--aura-radius-lg": ds.radii.lg,
    "--aura-radius-xl": ds.radii.xl,
    "--aura-shadow-sm": ds.shadows.sm,
    "--aura-shadow-md": ds.shadows.md,
    "--aura-shadow-lg": ds.shadows.lg,
    "--aura-font-sans": ds.typography.fontSans,
    "--aura-font-display":
      ds.typography.fontDisplay ?? ds.typography.fontSans,
    "--aura-font-mono": ds.typography.fontMono,
  };
}

// ---------- Helpers ----------

function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

// ---------- Link / Button primitives ----------

function NavLink({
  link,
  className,
  onClick,
}: {
  link: LinkTarget;
  className?: string;
  onClick?: () => void;
}) {
  const { navigate } = usePreviewRouter();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        navigate(link.href);
      }}
      className={className}
    >
      {link.label}
    </button>
  );
}

function CtaButton({
  link,
  variant = "primary",
  size = "md",
  wireframe,
}: {
  link: LinkTarget;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  wireframe: boolean;
}) {
  const { navigate } = usePreviewRouter();
  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-150 select-none";
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-[var(--aura-radius-md)]",
    md: "px-5 py-2.5 text-sm rounded-[var(--aura-radius-md)]",
    lg: "px-7 py-3 text-base rounded-[var(--aura-radius-lg)]",
  };
  const variants = wireframe
    ? {
        primary:
          "bg-zinc-900 text-white hover:bg-zinc-800",
        secondary:
          "bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50",
        ghost:
          "bg-transparent text-zinc-700 hover:bg-zinc-100",
      }
    : {
        primary:
          "text-white shadow-[var(--aura-shadow-md)] hover:opacity-90",
        secondary:
          "bg-white text-[color:var(--aura-fg)] border border-[color:var(--aura-border)] hover:bg-[color:var(--aura-neutral-50)]",
        ghost:
          "text-[color:var(--aura-fg)] hover:bg-[color:var(--aura-neutral-100)]",
      };
  const style =
    !wireframe && variant === "primary"
      ? { backgroundColor: "var(--aura-primary)" }
      : undefined;
  return (
    <button
      type="button"
      style={style}
      onClick={(e) => {
        e.preventDefault();
        navigate(link.href);
      }}
      className={cx(base, sizes[size], variants[variant])}
    >
      {link.label}
      {link.external ? " ↗" : ""}
    </button>
  );
}

// ---------- Section renderers ----------

function SectionNavbar({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "navbar" }>;
  wireframe: boolean;
}) {
  const { project, navigate } = usePreviewRouter();
  return (
    <nav
      className={cx(
        "sticky top-0 z-40 flex items-center justify-between h-16 px-6 md:px-10 border-b",
        wireframe
          ? "bg-white border-zinc-200"
          : "bg-[color:var(--aura-bg)]/85 backdrop-blur-md border-[color:var(--aura-border)]",
      )}
    >
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex items-center gap-2 font-semibold"
      >
        <span
          className={cx(
            "grid place-items-center w-8 h-8 rounded-lg text-sm font-bold",
            wireframe ? "bg-zinc-900 text-white" : "text-white",
          )}
          style={
            !wireframe ? { backgroundColor: "var(--aura-primary)" } : undefined
          }
        >
          {section.logoText.charAt(0).toUpperCase()}
        </span>
        <span
          className={cx(
            "text-[15px] tracking-tight",
            wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
          )}
        >
          {section.logoText}
        </span>
      </button>

      <div className="hidden md:flex items-center gap-7 text-sm">
        {section.links.map((l, i) => (
          <NavLink
            key={i}
            link={l}
            className={cx(
              "hover:opacity-80 transition-opacity",
              wireframe
                ? "text-zinc-600"
                : "text-[color:var(--aura-neutral-700)]",
            )}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {section.ctaSecondary && (
          <div className="hidden sm:block">
            <CtaButton
              link={section.ctaSecondary}
              variant="ghost"
              size="sm"
              wireframe={wireframe}
            />
          </div>
        )}
        {section.ctaPrimary && (
          <CtaButton
            link={section.ctaPrimary}
            variant="primary"
            size="sm"
            wireframe={wireframe}
          />
        )}
      </div>
    </nav>
  );
}

function SectionHero({
  section,
  wireframe,
  project,
}: {
  section: Extract<Section, { type: "hero" }>;
  wireframe: boolean;
  project: AuraProject;
}) {
  const isSplit = section.variant === "split";
  const imgSrc = imageUrl(project, section.imageId, "hero abstract");

  return (
    <section
      className={cx(
        "relative overflow-hidden px-6 md:px-10",
        isSplit ? "py-20 md:py-28" : "py-24 md:py-36",
      )}
    >
      {!wireframe && (
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            background:
              "radial-gradient(1200px 600px at 10% -20%, var(--aura-primary) 0%, transparent 60%)",
          }}
        />
      )}
      <div
        className={cx(
          "max-w-7xl mx-auto",
          isSplit
            ? "grid md:grid-cols-2 gap-14 items-center"
            : "flex flex-col items-center text-center",
        )}
      >
        <div className={cx(isSplit ? "" : "max-w-3xl")}>
          {section.badge && (
            <div
              className={cx(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6",
                wireframe
                  ? "bg-zinc-100 text-zinc-700 border border-zinc-200"
                  : "",
              )}
              style={
                !wireframe
                  ? {
                      background: "var(--aura-primary-soft)",
                      color: "var(--aura-primary-soft-fg)",
                    }
                  : undefined
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: wireframe
                    ? "#71717a"
                    : "var(--aura-primary)",
                }}
              />
              {section.badge}
            </div>
          )}
          <h1
            className={cx(
              "font-bold tracking-tight mb-5",
              isSplit
                ? "text-4xl md:text-5xl"
                : "text-4xl md:text-6xl",
              wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
            )}
            style={
              !wireframe
                ? { fontFamily: "var(--aura-font-display)" }
                : undefined
            }
          >
            {section.headline}
          </h1>
          <p
            className={cx(
              "text-lg md:text-xl leading-relaxed max-w-2xl mb-8",
              isSplit ? "" : "mx-auto",
              wireframe
                ? "text-zinc-500"
                : "text-[color:var(--aura-neutral-700)]",
            )}
          >
            {section.subheadline}
          </p>
          <div
            className={cx(
              "flex flex-wrap gap-3",
              isSplit ? "" : "justify-center",
            )}
          >
            <CtaButton
              link={section.ctaPrimary}
              variant="primary"
              size="lg"
              wireframe={wireframe}
            />
            {section.ctaSecondary && (
              <CtaButton
                link={section.ctaSecondary}
                variant="secondary"
                size="lg"
                wireframe={wireframe}
              />
            )}
          </div>
        </div>

        {isSplit ? (
          <div
            className={cx(
              "relative rounded-2xl overflow-hidden border shadow-xl",
              wireframe
                ? "bg-zinc-100 border-zinc-300 aspect-[4/3]"
                : "border-[color:var(--aura-border)] aspect-[4/3]",
            )}
          >
            {wireframe ? (
              <div className="w-full h-full grid place-items-center text-zinc-400 font-semibold text-sm">
                Image placeholder
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt="Hero visual"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ) : (
          <div
            className={cx(
              "w-full max-w-5xl mt-14 rounded-2xl overflow-hidden border shadow-2xl",
              wireframe
                ? "bg-zinc-100 border-zinc-300 aspect-[16/9]"
                : "border-[color:var(--aura-border)] aspect-[16/9]",
            )}
          >
            {wireframe ? (
              <div className="w-full h-full grid place-items-center text-zinc-400 font-semibold">
                Hero preview placeholder
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt="Product preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SectionFeatureGrid({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "featureGrid" }>;
  wireframe: boolean;
}) {
  const cols =
    section.columns === 2
      ? "md:grid-cols-2"
      : section.columns === 4
        ? "md:grid-cols-2 lg:grid-cols-4"
        : "md:grid-cols-3";
  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-14">
          {section.eyebrow && (
            <div
              className="text-xs font-semibold uppercase tracking-[0.15em] mb-3"
              style={{
                color: wireframe ? "#71717a" : "var(--aura-primary)",
              }}
            >
              {section.eyebrow}
            </div>
          )}
          <h2
            className={cx(
              "text-3xl md:text-4xl font-bold tracking-tight mb-4",
              wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
            )}
          >
            {section.headline}
          </h2>
          {section.subheadline && (
            <p
              className={cx(
                "text-lg leading-relaxed",
                wireframe
                  ? "text-zinc-500"
                  : "text-[color:var(--aura-neutral-700)]",
              )}
            >
              {section.subheadline}
            </p>
          )}
        </div>
        <div className={cx("grid grid-cols-1 gap-6", cols)}>
          {section.items.map((item, i) => (
            <div
              key={i}
              className={cx(
                "p-6 md:p-7 rounded-2xl border transition-all hover:-translate-y-0.5",
                wireframe
                  ? "bg-white border-zinc-200 hover:border-zinc-300"
                  : "bg-[color:var(--aura-surface)] border-[color:var(--aura-border)] hover:shadow-[var(--aura-shadow-md)]",
              )}
            >
              <div
                className={cx(
                  "w-11 h-11 grid place-items-center rounded-xl text-xl mb-5",
                  wireframe ? "bg-zinc-100 text-zinc-600" : "",
                )}
                style={
                  !wireframe
                    ? {
                        background: "var(--aura-primary-soft)",
                        color: "var(--aura-primary-soft-fg)",
                      }
                    : undefined
                }
              >
                {item.icon}
              </div>
              <h3
                className={cx(
                  "text-lg font-semibold mb-2",
                  wireframe
                    ? "text-zinc-900"
                    : "text-[color:var(--aura-fg)]",
                )}
              >
                {item.title}
              </h3>
              <p
                className={cx(
                  "text-sm leading-relaxed",
                  wireframe
                    ? "text-zinc-500"
                    : "text-[color:var(--aura-neutral-700)]",
                )}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionStats({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "stats" }>;
  wireframe: boolean;
}) {
  return (
    <section
      className={cx(
        "py-20 px-6 md:px-10",
        wireframe ? "bg-zinc-50" : "",
      )}
      style={
        !wireframe
          ? { background: "var(--aura-neutral-50)" }
          : undefined
      }
    >
      <div className="max-w-7xl mx-auto">
        {section.headline && (
          <h2
            className={cx(
              "text-2xl md:text-3xl font-bold mb-10 max-w-2xl",
              wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
            )}
          >
            {section.headline}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {section.items.map((s, i) => (
            <div key={i}>
              <div
                className={cx(
                  "text-4xl md:text-5xl font-bold tracking-tight mb-1",
                  wireframe
                    ? "text-zinc-900"
                    : "text-[color:var(--aura-fg)]",
                )}
                style={
                  !wireframe
                    ? { fontFamily: "var(--aura-font-display)" }
                    : undefined
                }
              >
                {s.value}
              </div>
              <div
                className={cx(
                  "text-sm",
                  wireframe
                    ? "text-zinc-500"
                    : "text-[color:var(--aura-neutral-700)]",
                )}
              >
                {s.label}
              </div>
              {s.trend && (
                <div className="text-xs text-emerald-600 mt-1">{s.trend}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionLogoCloud({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "logoCloud" }>;
  wireframe: boolean;
}) {
  return (
    <section className="py-14 px-6 md:px-10">
      <div className="max-w-7xl mx-auto text-center">
        <div
          className={cx(
            "text-xs font-semibold uppercase tracking-[0.18em] mb-8",
            wireframe
              ? "text-zinc-500"
              : "text-[color:var(--aura-neutral-500)]",
          )}
        >
          {section.eyebrow}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-70">
          {section.logos.map((name, i) => (
            <div
              key={i}
              className={cx(
                "text-lg md:text-xl font-semibold tracking-tight",
                wireframe
                  ? "text-zinc-400"
                  : "text-[color:var(--aura-neutral-500)]",
              )}
              style={
                !wireframe
                  ? { fontFamily: "var(--aura-font-display)" }
                  : undefined
              }
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionTestimonial({
  section,
  wireframe,
  project,
}: {
  section: Extract<Section, { type: "testimonial" }>;
  wireframe: boolean;
  project: AuraProject;
}) {
  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="max-w-6xl mx-auto">
        {(section.eyebrow || section.headline) && (
          <div className="mb-12 max-w-2xl">
            {section.eyebrow && (
              <div
                className="text-xs font-semibold uppercase tracking-[0.15em] mb-3"
                style={{
                  color: wireframe ? "#71717a" : "var(--aura-primary)",
                }}
              >
                {section.eyebrow}
              </div>
            )}
            {section.headline && (
              <h2
                className={cx(
                  "text-3xl md:text-4xl font-bold tracking-tight",
                  wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
                )}
              >
                {section.headline}
              </h2>
            )}
          </div>
        )}
        <div
          className={cx(
            "grid gap-6",
            section.items.length >= 2 ? "md:grid-cols-2" : "",
          )}
        >
          {section.items.map((t, i) => (
            <figure
              key={i}
              className={cx(
                "p-8 rounded-2xl border",
                wireframe
                  ? "bg-white border-zinc-200"
                  : "bg-[color:var(--aura-surface)] border-[color:var(--aura-border)]",
              )}
            >
              <blockquote
                className={cx(
                  "text-lg leading-relaxed mb-6",
                  wireframe
                    ? "text-zinc-800"
                    : "text-[color:var(--aura-fg)]",
                )}
              >
                “{t.quote}”
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <div
                  className={cx(
                    "w-10 h-10 rounded-full overflow-hidden",
                    wireframe ? "bg-zinc-200" : "",
                  )}
                >
                  {!wireframe && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl(project, t.avatarId, "portrait")}
                      alt={t.author}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <div
                    className={cx(
                      "text-sm font-semibold",
                      wireframe
                        ? "text-zinc-900"
                        : "text-[color:var(--aura-fg)]",
                    )}
                  >
                    {t.author}
                  </div>
                  <div
                    className={cx(
                      "text-xs",
                      wireframe
                        ? "text-zinc-500"
                        : "text-[color:var(--aura-neutral-500)]",
                    )}
                  >
                    {t.role}
                  </div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionPricing({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "pricing" }>;
  wireframe: boolean;
}) {
  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          {section.eyebrow && (
            <div
              className="text-xs font-semibold uppercase tracking-[0.15em] mb-3"
              style={{
                color: wireframe ? "#71717a" : "var(--aura-primary)",
              }}
            >
              {section.eyebrow}
            </div>
          )}
          <h2
            className={cx(
              "text-3xl md:text-4xl font-bold tracking-tight mb-3",
              wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
            )}
          >
            {section.headline}
          </h2>
          {section.subheadline && (
            <p
              className={cx(
                "text-lg",
                wireframe
                  ? "text-zinc-500"
                  : "text-[color:var(--aura-neutral-700)]",
              )}
            >
              {section.subheadline}
            </p>
          )}
        </div>
        <div
          className={cx(
            "grid gap-6",
            section.tiers.length === 2
              ? "md:grid-cols-2"
              : section.tiers.length >= 4
                ? "md:grid-cols-2 lg:grid-cols-4"
                : "md:grid-cols-3",
          )}
        >
          {section.tiers.map((tier, i) => (
            <div
              key={i}
              className={cx(
                "p-8 rounded-2xl border flex flex-col",
                tier.featured
                  ? wireframe
                    ? "border-zinc-900 border-2 bg-white"
                    : "border-2 bg-[color:var(--aura-surface)]"
                  : wireframe
                    ? "bg-white border-zinc-200"
                    : "bg-[color:var(--aura-surface)] border-[color:var(--aura-border)]",
              )}
              style={
                tier.featured && !wireframe
                  ? { borderColor: "var(--aura-primary)" }
                  : undefined
              }
            >
              <div className="flex items-center justify-between mb-3">
                <h3
                  className={cx(
                    "text-lg font-semibold",
                    wireframe
                      ? "text-zinc-900"
                      : "text-[color:var(--aura-fg)]",
                  )}
                >
                  {tier.name}
                </h3>
                {tier.featured && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      background: wireframe
                        ? "#18181b"
                        : "var(--aura-primary)",
                      color: "#fff",
                    }}
                  >
                    Popular
                  </span>
                )}
              </div>
              <div
                className={cx(
                  "flex items-baseline gap-1 mb-2",
                  wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
                )}
              >
                <span
                  className="text-4xl font-bold"
                  style={
                    !wireframe
                      ? { fontFamily: "var(--aura-font-display)" }
                      : undefined
                  }
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm opacity-60">/{tier.period}</span>
                )}
              </div>
              <p
                className={cx(
                  "text-sm mb-6",
                  wireframe
                    ? "text-zinc-500"
                    : "text-[color:var(--aura-neutral-700)]",
                )}
              >
                {tier.description}
              </p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {tier.features.map((f, j) => (
                  <li
                    key={j}
                    className={cx(
                      "flex items-start gap-2 text-sm",
                      wireframe
                        ? "text-zinc-700"
                        : "text-[color:var(--aura-fg)]",
                    )}
                  >
                    <span
                      className="mt-0.5 shrink-0"
                      style={{
                        color: wireframe ? "#18181b" : "var(--aura-primary)",
                      }}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <CtaButton
                link={tier.cta}
                variant={tier.featured ? "primary" : "secondary"}
                size="md"
                wireframe={wireframe}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionFaq({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "faq" }>;
  wireframe: boolean;
}) {
  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="max-w-3xl mx-auto">
        <h2
          className={cx(
            "text-3xl md:text-4xl font-bold tracking-tight mb-10 text-center",
            wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
          )}
        >
          {section.headline}
        </h2>
        <div
          className={cx(
            "divide-y rounded-2xl border",
            wireframe
              ? "bg-white border-zinc-200 divide-zinc-200"
              : "bg-[color:var(--aura-surface)] border-[color:var(--aura-border)] divide-[color:var(--aura-border)]",
          )}
        >
          {section.items.map((q, i) => (
            <details key={i} className="group p-5">
              <summary
                className={cx(
                  "flex items-center justify-between cursor-pointer font-medium",
                  wireframe
                    ? "text-zinc-900"
                    : "text-[color:var(--aura-fg)]",
                )}
              >
                {q.question}
                <span className="ml-4 text-xl group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p
                className={cx(
                  "mt-3 text-sm leading-relaxed",
                  wireframe
                    ? "text-zinc-500"
                    : "text-[color:var(--aura-neutral-700)]",
                )}
              >
                {q.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionCta({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "cta" }>;
  wireframe: boolean;
}) {
  return (
    <section className="py-16 px-6 md:px-10">
      <div
        className={cx(
          "max-w-6xl mx-auto rounded-3xl p-10 md:p-16 text-center",
          wireframe ? "bg-zinc-900 text-white" : "text-white",
        )}
        style={
          !wireframe
            ? {
                background:
                  "linear-gradient(135deg, var(--aura-primary) 0%, var(--aura-primary-hover) 100%)",
              }
            : undefined
        }
      >
        <h2
          className="text-3xl md:text-5xl font-bold tracking-tight mb-4 max-w-3xl mx-auto"
          style={
            !wireframe ? { fontFamily: "var(--aura-font-display)" } : undefined
          }
        >
          {section.headline}
        </h2>
        {section.subheadline && (
          <p className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto mb-8">
            {section.subheadline}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <CtaButton
            link={section.ctaPrimary}
            variant="secondary"
            size="lg"
            wireframe={wireframe}
          />
          {section.ctaSecondary && (
            <CtaButton
              link={section.ctaSecondary}
              variant="ghost"
              size="lg"
              wireframe={wireframe}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function SectionGallery({
  section,
  wireframe,
  project,
}: {
  section: Extract<Section, { type: "gallery" }>;
  wireframe: boolean;
  project: AuraProject;
}) {
  return (
    <section className="py-20 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        {section.headline && (
          <h2
            className={cx(
              "text-3xl md:text-4xl font-bold tracking-tight mb-10 text-center",
              wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
            )}
          >
            {section.headline}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {section.imageIds.map((id, i) => {
            const img = project.imagery.find((x) => x.id === id);
            return (
              <div
                key={i}
                className={cx(
                  "overflow-hidden rounded-xl border",
                  wireframe
                    ? "bg-zinc-100 border-zinc-200 aspect-[4/3] grid place-items-center text-zinc-400"
                    : "border-[color:var(--aura-border)]",
                  !wireframe && aspectClass(img?.aspect),
                )}
              >
                {wireframe ? (
                  "Image"
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl(project, id)}
                    alt={img?.alt ?? "Gallery image"}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SectionSteps({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "steps" }>;
  wireframe: boolean;
}) {
  return (
    <section className="py-20 px-6 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-12">
          {section.eyebrow && (
            <div
              className="text-xs font-semibold uppercase tracking-[0.15em] mb-3"
              style={{
                color: wireframe ? "#71717a" : "var(--aura-primary)",
              }}
            >
              {section.eyebrow}
            </div>
          )}
          <h2
            className={cx(
              "text-3xl md:text-4xl font-bold tracking-tight",
              wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
            )}
          >
            {section.headline}
          </h2>
        </div>
        <ol className="grid md:grid-cols-3 gap-6 counter-reset-step">
          {section.items.map((item, i) => (
            <li
              key={i}
              className={cx(
                "p-6 rounded-2xl border relative",
                wireframe
                  ? "bg-white border-zinc-200"
                  : "bg-[color:var(--aura-surface)] border-[color:var(--aura-border)]",
              )}
            >
              <div
                className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold mb-4 text-white"
                style={{
                  background: wireframe ? "#18181b" : "var(--aura-primary)",
                }}
              >
                {i + 1}
              </div>
              <h3
                className={cx(
                  "text-lg font-semibold mb-2",
                  wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
                )}
              >
                {item.title}
              </h3>
              <p
                className={cx(
                  "text-sm leading-relaxed",
                  wireframe
                    ? "text-zinc-500"
                    : "text-[color:var(--aura-neutral-700)]",
                )}
              >
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SectionBento({
  section,
  wireframe,
  project,
}: {
  section: Extract<Section, { type: "bento" }>;
  wireframe: boolean;
  project: AuraProject;
}) {
  const spanClass = (s: "1x1" | "2x1" | "1x2" | "2x2") =>
    ({
      "1x1": "md:col-span-1 md:row-span-1",
      "2x1": "md:col-span-2 md:row-span-1",
      "1x2": "md:col-span-1 md:row-span-2",
      "2x2": "md:col-span-2 md:row-span-2",
    })[s];

  return (
    <section className="py-20 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-12">
          {section.eyebrow && (
            <div
              className="text-xs font-semibold uppercase tracking-[0.15em] mb-3"
              style={{
                color: wireframe ? "#71717a" : "var(--aura-primary)",
              }}
            >
              {section.eyebrow}
            </div>
          )}
          <h2
            className={cx(
              "text-3xl md:text-4xl font-bold tracking-tight",
              wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
            )}
          >
            {section.headline}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 md:auto-rows-[220px] gap-4">
          {section.items.map((item, i) => (
            <div
              key={i}
              className={cx(
                "rounded-2xl border p-6 overflow-hidden relative",
                spanClass(item.span),
                wireframe
                  ? "bg-white border-zinc-200"
                  : "bg-[color:var(--aura-surface)] border-[color:var(--aura-border)]",
                item.accent && !wireframe ? "text-white" : "",
              )}
              style={
                item.accent && !wireframe
                  ? {
                      background:
                        "linear-gradient(135deg, var(--aura-primary) 0%, var(--aura-primary-hover) 100%)",
                    }
                  : undefined
              }
            >
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p
                className={cx(
                  "text-sm max-w-md",
                  item.accent && !wireframe
                    ? "opacity-90"
                    : wireframe
                      ? "text-zinc-500"
                      : "text-[color:var(--aura-neutral-700)]",
                )}
              >
                {item.description}
              </p>
              {item.imageId && !wireframe && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl(project, item.imageId)}
                  alt=""
                  className="absolute right-0 bottom-0 w-1/2 h-1/2 object-cover opacity-70"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionForm({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "form" }>;
  wireframe: boolean;
}) {
  return (
    <section className="py-20 md:py-28 px-6 md:px-10 min-h-[60vh] grid place-items-center">
      <div
        className={cx(
          "w-full max-w-md p-8 rounded-2xl border shadow-sm",
          wireframe
            ? "bg-white border-zinc-200"
            : "bg-[color:var(--aura-surface)] border-[color:var(--aura-border)]",
        )}
      >
        <h2
          className={cx(
            "text-2xl font-bold mb-2",
            wireframe ? "text-zinc-900" : "text-[color:var(--aura-fg)]",
          )}
        >
          {section.headline}
        </h2>
        {section.subheadline && (
          <p
            className={cx(
              "text-sm mb-6",
              wireframe
                ? "text-zinc-500"
                : "text-[color:var(--aura-neutral-700)]",
            )}
          >
            {section.subheadline}
          </p>
        )}
        <form
          className="space-y-4"
          onSubmit={(e) => e.preventDefault()}
        >
          {section.fields.map((f, i) => (
            <label key={i} className="block">
              <span
                className={cx(
                  "block text-sm font-medium mb-1.5",
                  wireframe
                    ? "text-zinc-700"
                    : "text-[color:var(--aura-fg)]",
                )}
              >
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </span>
              {f.type === "textarea" ? (
                <textarea
                  placeholder={f.placeholder}
                  rows={4}
                  className={cx(
                    "w-full px-3 py-2 rounded-[var(--aura-radius-md)] border text-sm outline-none focus:ring-2",
                    wireframe
                      ? "border-zinc-300 focus:ring-zinc-400"
                      : "border-[color:var(--aura-border)] bg-[color:var(--aura-bg)]",
                  )}
                />
              ) : f.type === "select" ? (
                <select
                  className={cx(
                    "w-full px-3 py-2 rounded-[var(--aura-radius-md)] border text-sm",
                    wireframe
                      ? "border-zinc-300"
                      : "border-[color:var(--aura-border)] bg-[color:var(--aura-bg)]",
                  )}
                >
                  {f.options?.map((o, j) => <option key={j}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  className={cx(
                    "w-full px-3 py-2 rounded-[var(--aura-radius-md)] border text-sm outline-none focus:ring-2",
                    wireframe
                      ? "border-zinc-300 focus:ring-zinc-400"
                      : "border-[color:var(--aura-border)] bg-[color:var(--aura-bg)]",
                  )}
                />
              )}
            </label>
          ))}
          <button
            type="submit"
            className={cx(
              "w-full py-2.5 rounded-[var(--aura-radius-md)] text-sm font-medium text-white",
            )}
            style={{
              background: wireframe ? "#18181b" : "var(--aura-primary)",
            }}
          >
            {section.submitLabel}
          </button>
        </form>
        {section.footerLinks && section.footerLinks.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-4 text-sm">
            {section.footerLinks.map((l, i) => (
              <NavLink
                key={i}
                link={l}
                className={cx(
                  "hover:underline",
                  wireframe
                    ? "text-zinc-500"
                    : "text-[color:var(--aura-neutral-700)]",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SectionFooter({
  section,
  wireframe,
}: {
  section: Extract<Section, { type: "footer" }>;
  wireframe: boolean;
}) {
  return (
    <footer
      className={cx(
        "border-t px-6 md:px-10 py-14",
        wireframe
          ? "bg-zinc-50 border-zinc-200"
          : "border-[color:var(--aura-border)]",
      )}
      style={
        !wireframe ? { background: "var(--aura-neutral-50)" } : undefined
      }
    >
      <div className="max-w-7xl mx-auto grid gap-10 md:grid-cols-[1fr_2fr]">
        <div>
          {section.tagline && (
            <p
              className={cx(
                "text-sm max-w-xs",
                wireframe
                  ? "text-zinc-500"
                  : "text-[color:var(--aura-neutral-700)]",
              )}
            >
              {section.tagline}
            </p>
          )}
        </div>
        <div
          className={cx(
            "grid gap-8",
            section.columns.length >= 4
              ? "grid-cols-2 md:grid-cols-4"
              : "grid-cols-2 md:grid-cols-3",
          )}
        >
          {section.columns.map((col, i) => (
            <div key={i}>
              <div
                className={cx(
                  "text-xs font-semibold uppercase tracking-[0.15em] mb-3",
                  wireframe
                    ? "text-zinc-900"
                    : "text-[color:var(--aura-fg)]",
                )}
              >
                {col.title}
              </div>
              <ul className="space-y-2">
                {col.links.map((l, j) => (
                  <li key={j}>
                    <NavLink
                      link={l}
                      className={cx(
                        "text-sm hover:underline text-left",
                        wireframe
                          ? "text-zinc-600"
                          : "text-[color:var(--aura-neutral-700)]",
                      )}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div
        className={cx(
          "max-w-7xl mx-auto mt-10 pt-6 border-t text-xs",
          wireframe
            ? "border-zinc-200 text-zinc-500"
            : "border-[color:var(--aura-border)] text-[color:var(--aura-neutral-500)]",
        )}
      >
        {section.legal}
      </div>
    </footer>
  );
}

// ---------- Main switcher ----------

export function SectionRenderer({
  section,
  wireframe,
  project,
}: {
  section: Section;
  wireframe: boolean;
  project: AuraProject;
}) {
  switch (section.type) {
    case "navbar":
      return <SectionNavbar section={section} wireframe={wireframe} />;
    case "hero":
      return (
        <SectionHero section={section} wireframe={wireframe} project={project} />
      );
    case "featureGrid":
      return <SectionFeatureGrid section={section} wireframe={wireframe} />;
    case "bento":
      return (
        <SectionBento section={section} wireframe={wireframe} project={project} />
      );
    case "stats":
      return <SectionStats section={section} wireframe={wireframe} />;
    case "logoCloud":
      return <SectionLogoCloud section={section} wireframe={wireframe} />;
    case "testimonial":
      return (
        <SectionTestimonial
          section={section}
          wireframe={wireframe}
          project={project}
        />
      );
    case "pricing":
      return <SectionPricing section={section} wireframe={wireframe} />;
    case "faq":
      return <SectionFaq section={section} wireframe={wireframe} />;
    case "cta":
      return <SectionCta section={section} wireframe={wireframe} />;
    case "gallery":
      return (
        <SectionGallery
          section={section}
          wireframe={wireframe}
          project={project}
        />
      );
    case "steps":
      return <SectionSteps section={section} wireframe={wireframe} />;
    case "form":
      return <SectionForm section={section} wireframe={wireframe} />;
    case "footer":
      return <SectionFooter section={section} wireframe={wireframe} />;
    default:
      return null;
  }
}

export function PageRenderer({
  page,
  wireframe,
  project,
}: {
  page: Page;
  wireframe: boolean;
  project: AuraProject;
}) {
  return (
    <div
      className="aura-page"
      style={
        wireframe
          ? undefined
          : {
              ...designSystemToCssVars(project.designSystem),
              background: "var(--aura-bg)",
              color: "var(--aura-fg)",
              fontFamily: "var(--aura-font-sans)",
            }
      }
    >
      {page.sections.map((s) => (
        <SectionRenderer
          key={s.id}
          section={s}
          wireframe={wireframe}
          project={project}
        />
      ))}
    </div>
  );
}

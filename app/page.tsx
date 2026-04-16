"use client";

import React, { useMemo, useState } from "react";
import type { AuraProject, SitemapNode } from "@/lib/schema";
import { PreviewRouterProvider, pageForPath, usePreviewRouter } from "@/lib/preview-router";
import { PageRenderer, designSystemToCssVars } from "@/components/renderer";
import { downloadReactViteZip, downloadNextjsZip } from "@/lib/export";

const I = {
  Sparkles: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>),
  Map: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>),
  Layout: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>),
  Palette: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.7H16c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z"/></svg>),
  Eye: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>),
  Download: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>),
  Desktop: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>),
  Tablet: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>),
  Mobile: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>),
  Copy: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>),
  Loader: () => (<svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>),
};

type Toast = { id: number; message: string };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  };
  return { toasts, add };
}

function ToastLayer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="bg-zinc-800 border border-zinc-700 text-white px-3.5 py-2 rounded-lg shadow-xl text-sm">{t.message}</div>
      ))}
    </div>
  );
}

function PromptScreen({ onGenerate, loading, error }: { onGenerate: (prompt: string) => void; loading: boolean; error: string | null }) {
  const [prompt, setPrompt] = useState("");
  const examples = [
    "B2B invoice automation SaaS for accounting teams",
    "LegalTech contract review portal for in-house counsel",
    "Boutique sneaker e-commerce with editorial storytelling",
    "Telemedicine platform for rural clinics",
  ];
  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950 text-white flex flex-col items-center justify-center px-6 py-20">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-blue-300 font-medium mb-8"><I.Sparkles /> Aura Architecture</div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-center bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent mb-5">Design at the speed of thought.</h1>
        <p className="text-lg text-zinc-400 text-center max-w-xl mb-10">Generate production-grade sitemaps, wireframes, style guides, and a live interactive preview — from a single prompt.</p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (prompt.trim() && !loading) onGenerate(prompt.trim()); }}
          className="w-full relative"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30" />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex items-start gap-2 p-2">
            <textarea
              className="flex-1 bg-transparent resize-none outline-none px-4 py-3 text-base placeholder-zinc-500 min-h-[72px]"
              placeholder="Describe your app, website, or product idea…"
              value={prompt}
              disabled={loading}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (prompt.trim() && !loading) onGenerate(prompt.trim()); } }}
            />
            <button type="submit" disabled={!prompt.trim() || loading} className="bg-white text-black px-5 py-3 rounded-xl font-semibold text-sm inline-flex items-center gap-2 shrink-0 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {loading ? <I.Loader /> : (<><I.Sparkles /> Generate</>)}
            </button>
          </div>
        </form>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {examples.map((ex) => (
            <button key={ex} onClick={() => setPrompt(ex)} disabled={loading} className="text-xs px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 transition-colors">{ex}</button>
          ))}
        </div>
        {error && (
          <div className="mt-8 max-w-2xl w-full border border-red-500/40 bg-red-500/10 text-red-200 rounded-xl p-4 text-sm">
            <div className="font-semibold mb-1">Generation failed</div>
            <div className="opacity-90 whitespace-pre-wrap break-words">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function GeneratingScreen({ stage }: { stage: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-950 text-white">
      <div className="w-full max-w-lg p-8 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-3 mb-3 text-blue-400">
          <I.Loader />
          <h2 className="text-xl font-semibold text-white">{stage}</h2>
        </div>
        <p className="text-zinc-400 text-sm">Researching patterns, generating tokens, assembling sitemap, drafting pages, validating imagery, and repairing the link graph. Typically 20–40 seconds.</p>
        <div className="mt-6 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-2/3" />
        </div>
      </div>
    </div>
  );
}

function SitemapTree({ nodes, depth = 0, onNavigate, primary }: { nodes: SitemapNode[]; depth?: number; onNavigate: (path: string) => void; primary: string }) {
  return (
    <ul className={depth === 0 ? "space-y-2" : "space-y-1 ml-6 border-l border-zinc-800 pl-6"}>
      {nodes.map((n) => (
        <li key={n.id}>
          <button onClick={() => onNavigate(n.path)} className="group flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/60 transition-colors">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: primary }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-100 truncate">{n.name}</div>
              {n.description && (<div className="text-xs text-zinc-500 truncate">{n.description}</div>)}
            </div>
            <code className="text-xs text-zinc-500 font-mono shrink-0">{n.path}</code>
          </button>
          {n.children && n.children.length > 0 && (
            <div className="mt-1.5"><SitemapTree nodes={n.children} depth={depth + 1} onNavigate={onNavigate} primary={primary} /></div>
          )}
        </li>
      ))}
    </ul>
  );
}

function SitemapView({ project, onNavigate }: { project: AuraProject; onNavigate: (path: string) => void }) {
  const primary = project.designSystem.colors.primary[600];
  return (
    <div className="p-8 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-1">Sitemap</h2>
        <p className="text-sm text-zinc-400">{project.pages.length} pages · click any node to jump to its wireframe.</p>
      </div>
      <SitemapTree nodes={project.sitemap} onNavigate={onNavigate} primary={primary} />
    </div>
  );
}

const DEVICE_WIDTHS: Record<string, number> = { desktop: 1440, tablet: 834, mobile: 390 };

function PageCanvas({ wireframe, device }: { wireframe: boolean; device: "desktop" | "tablet" | "mobile" }) {
  const { project, currentPath } = usePreviewRouter();
  const page = pageForPath(project, currentPath) ?? project.pages[0];
  const width = DEVICE_WIDTHS[device];
  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-zinc-700 transition-all duration-300 w-full" style={{ maxWidth: width }}>
        <div className="bg-zinc-100 border-b border-zinc-200 h-9 flex items-center px-3 gap-2 shrink-0">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <div className="mx-auto text-[11px] font-mono text-zinc-500 bg-white border border-zinc-200 rounded px-2 py-0.5 max-w-[60%] truncate">
            {project.name.toLowerCase().replace(/\s+/g, "")}.preview.aura.com{currentPath === "/" ? "" : currentPath}
          </div>
        </div>
        <div id="aura-preview-scroll" className="h-[calc(100vh-220px)] overflow-y-auto overflow-x-hidden bg-white">
          <PageRenderer page={page} wireframe={wireframe} project={project} />
        </div>
      </div>
    </div>
  );
}

function WireframesView({ project }: { project: AuraProject }) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  return (
    <PreviewRouterProvider project={project} mode="wireframe">
      <CanvasToolbar title="Wireframes" subtitle="Low-fidelity blueprint · every CTA is wired to the sitemap." device={device} setDevice={setDevice} />
      <div className="p-4 md:p-8 pt-0 flex flex-col items-center">
        <PageCanvas wireframe={true} device={device} />
      </div>
    </PreviewRouterProvider>
  );
}

function PrototypePreviewView({ project }: { project: AuraProject }) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  return (
    <PreviewRouterProvider project={project} mode="preview">
      <CanvasToolbar title="Live preview" subtitle="Production-grade fidelity · every link, button, and route is interactive." device={device} setDevice={setDevice} />
      <div className="p-4 md:p-8 pt-0 flex flex-col items-center">
        <PageCanvas wireframe={false} device={device} />
      </div>
    </PreviewRouterProvider>
  );
}

function CanvasToolbar({ title, subtitle, device, setDevice }: { title: string; subtitle: string; device: "desktop" | "tablet" | "mobile"; setDevice: (d: "desktop" | "tablet" | "mobile") => void }) {
  const { project, currentPath, navigate } = usePreviewRouter();
  return (
    <div className="p-4 md:p-8 pb-3 w-full max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-0.5">{title}</h2>
        <p className="text-sm text-zinc-400">{subtitle}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <select value={currentPath} onChange={(e) => navigate(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 rounded-lg px-3 py-1.5 outline-none">
          {project.pages.map((p) => (<option key={p.id} value={p.path}>{p.name} — {p.path}</option>))}
        </select>
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(["desktop", "tablet", "mobile"] as const).map((d) => (
            <button key={d} onClick={() => setDevice(d)} className={`p-1.5 rounded transition-colors ${device === d ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`} aria-label={d}>
              {d === "desktop" ? <I.Desktop /> : d === "tablet" ? <I.Tablet /> : <I.Mobile />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ColorSwatch({ name, hex, onCopy }: { name: string; hex: string; onCopy: (hex: string) => void }) {
  return (
    <button onClick={() => onCopy(hex)} className="group text-left flex flex-col gap-2 outline-none">
      <div className="h-16 rounded-lg border border-zinc-800 shadow-sm group-hover:scale-[1.02] transition-transform" style={{ backgroundColor: hex }} />
      <div>
        <div className="text-xs text-zinc-300">{name}</div>
        <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
          {hex} <span className="opacity-0 group-hover:opacity-100 transition-opacity"><I.Copy /></span>
        </div>
      </div>
    </button>
  );
}

function StyleGuideView({ project, onToast }: { project: AuraProject; onToast: (s: string) => void }) {
  const ds = project.designSystem;
  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    onToast(`Copied ${label}`);
  };
  const tailwindConfig = useMemo(() => generateTailwindConfig(project), [project]);
  const cssVars = useMemo(() => generateCssVars(project), [project]);
  return (
    <div className="p-8 md:p-10 max-w-6xl mx-auto text-white">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold mb-1">Design system</h2>
          <p className="text-sm text-zinc-400">{ds.typography.fontSans} · {ds.spacing.density} density</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => copy(tailwindConfig, "Tailwind config")} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 flex items-center gap-1.5"><I.Copy /> Copy Tailwind config</button>
          <button onClick={() => copy(cssVars, "CSS variables")} className="text-xs px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 flex items-center gap-1.5"><I.Copy /> Copy CSS vars</button>
        </div>
      </div>
      <section className="mb-12">
        <h3 className="text-xs uppercase tracking-[0.15em] text-zinc-500 font-semibold border-b border-zinc-800 pb-2 mb-5">Primary scale</h3>
        <div className="grid grid-cols-6 md:grid-cols-11 gap-3">
          {(Object.keys(ds.colors.primary) as unknown as Array<keyof typeof ds.colors.primary>).map((k) => (
            <ColorSwatch key={k} name={`primary.${k}`} hex={ds.colors.primary[k]} onCopy={(h) => copy(h, h)} />
          ))}
        </div>
      </section>
      <section className="mb-12">
        <h3 className="text-xs uppercase tracking-[0.15em] text-zinc-500 font-semibold border-b border-zinc-800 pb-2 mb-5">Neutral scale</h3>
        <div className="grid grid-cols-6 md:grid-cols-11 gap-3">
          {(Object.keys(ds.colors.neutral) as unknown as Array<keyof typeof ds.colors.neutral>).map((k) => (
            <ColorSwatch key={k} name={`neutral.${k}`} hex={ds.colors.neutral[k]} onCopy={(h) => copy(h, h)} />
          ))}
        </div>
      </section>
      <section className="mb-12">
        <h3 className="text-xs uppercase tracking-[0.15em] text-zinc-500 font-semibold border-b border-zinc-800 pb-2 mb-5">Semantic</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorSwatch name="background" hex={ds.colors.background} onCopy={(h) => copy(h, h)} />
          <ColorSwatch name="foreground" hex={ds.colors.foreground} onCopy={(h) => copy(h, h)} />
          <ColorSwatch name="surface" hex={ds.colors.surface} onCopy={(h) => copy(h, h)} />
          <ColorSwatch name="border" hex={ds.colors.border} onCopy={(h) => copy(h, h)} />
          <ColorSwatch name="success" hex={ds.colors.success} onCopy={(h) => copy(h, h)} />
          <ColorSwatch name="warning" hex={ds.colors.warning} onCopy={(h) => copy(h, h)} />
          <ColorSwatch name="danger" hex={ds.colors.danger} onCopy={(h) => copy(h, h)} />
          <ColorSwatch name="muted" hex={ds.colors.muted} onCopy={(h) => copy(h, h)} />
        </div>
      </section>
      <section className="mb-12">
        <h3 className="text-xs uppercase tracking-[0.15em] text-zinc-500 font-semibold border-b border-zinc-800 pb-2 mb-5">Typography</h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4" style={{ fontFamily: ds.typography.fontSans }}>
          {(Object.entries(ds.typography.scale) as [string, string][]).map(([key, size]) => (
            <div key={key} className="flex items-baseline justify-between gap-6 border-b border-zinc-800 last:border-0 pb-3 last:pb-0">
              <div style={{ fontSize: size, fontWeight: key === "5xl" || key === "6xl" ? 700 : 500 }} className="truncate">The quick brown fox ({key})</div>
              <code className="text-xs font-mono text-zinc-500 shrink-0">{size}</code>
            </div>
          ))}
        </div>
      </section>
      <section className="mb-12 grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs uppercase tracking-[0.15em] text-zinc-500 font-semibold border-b border-zinc-800 pb-2 mb-5">Radii</h3>
          <div className="grid grid-cols-5 gap-3">
            {(Object.entries(ds.radii) as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 bg-zinc-800 border border-zinc-700" style={{ borderRadius: v }} />
                <div className="text-[11px] text-zinc-400">{k}</div>
                <div className="text-[10px] font-mono text-zinc-500">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-[0.15em] text-zinc-500 font-semibold border-b border-zinc-800 pb-2 mb-5">Shadows</h3>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(ds.shadows) as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex flex-col items-center gap-2 p-4 bg-zinc-900 rounded-lg">
                <div className="w-16 h-16 bg-white rounded-lg" style={{ boxShadow: v }} />
                <div className="text-[11px] text-zinc-400">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section>
        <h3 className="text-xs uppercase tracking-[0.15em] text-zinc-500 font-semibold border-b border-zinc-800 pb-2 mb-5">Components</h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-wrap items-center gap-4" style={designSystemToCssVars(project.designSystem)}>
          <button className="px-5 py-2.5 rounded-[var(--aura-radius-md)] text-white text-sm font-medium shadow-[var(--aura-shadow-md)]" style={{ background: "var(--aura-primary)" }}>Primary</button>
          <button className="px-5 py-2.5 rounded-[var(--aura-radius-md)] text-sm font-medium bg-white text-zinc-900 border border-zinc-300">Secondary</button>
          <button className="px-5 py-2.5 rounded-[var(--aura-radius-md)] text-sm font-medium bg-transparent text-zinc-300 hover:bg-zinc-800">Ghost</button>
          <input className="px-3 py-2 rounded-[var(--aura-radius-md)] text-sm bg-zinc-800 border border-zinc-700 text-white outline-none focus:ring-2 focus:ring-white/20" placeholder="Input placeholder" />
          <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "var(--aura-primary-soft)", color: "var(--aura-primary-soft-fg)" }}>Badge</span>
        </div>
      </section>
    </div>
  );
}

function ExportView({ project, onToast }: { project: AuraProject; onToast: (s: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (kind: "react" | "next") => {
    setBusy(kind);
    try {
      if (kind === "react") await downloadReactViteZip(project);
      else await downloadNextjsZip(project);
      onToast(kind === "react" ? "React + Vite project downloaded" : "Next.js project downloaded");
    } catch (e) {
      onToast(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="p-8 md:p-10 max-w-4xl mx-auto text-white">
      <h2 className="text-2xl font-semibold mb-2">Export</h2>
      <p className="text-sm text-zinc-400 mb-10">One-click download of the full project — tokens, components, routed pages, working links, and validated images.</p>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">React · Vite · Tailwind</div>
          <h3 className="text-xl font-semibold mb-2">SPA with React Router</h3>
          <p className="text-sm text-zinc-400 mb-6">Every sitemap path becomes a real React Router route. Tokens compiled into a Tailwind config. No placeholders.</p>
          <button onClick={() => run("react")} disabled={busy !== null} className="w-full bg-white text-black font-semibold py-2.5 rounded-lg inline-flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50">
            {busy === "react" ? <I.Loader /> : <I.Download />} Download {project.name}-vite.zip
          </button>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Next.js · App Router · Tailwind</div>
          <h3 className="text-xl font-semibold mb-2">Production Next.js scaffold</h3>
          <p className="text-sm text-zinc-400 mb-6">Every sitemap path becomes a real <code className="text-xs">app/…/page.tsx</code>. Shared section components, tokens as CSS vars.</p>
          <button onClick={() => run("next")} disabled={busy !== null} className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg inline-flex items-center justify-center gap-2 hover:bg-blue-500 disabled:opacity-50">
            {busy === "next" ? <I.Loader /> : <I.Download />} Download {project.name}-nextjs.zip
          </button>
        </div>
      </div>
    </div>
  );
}

function generateTailwindConfig(project: AuraProject): string {
  const c = project.designSystem.colors;
  const entries = Object.entries(c.primary).map(([k, v]) => `        ${k}: "${v}"`).join(",\n");
  const ne = Object.entries(c.neutral).map(([k, v]) => `        ${k}: "${v}"`).join(",\n");
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["${project.designSystem.typography.fontSans}", "ui-sans-serif", "system-ui"],
        display: ["${project.designSystem.typography.fontDisplay ?? project.designSystem.typography.fontSans}", "ui-sans-serif"],
        mono: ["${project.designSystem.typography.fontMono}", "ui-monospace"],
      },
      colors: {
        primary: {
${entries}
        },
        neutral: {
${ne}
        },
        success: "${c.success}",
        warning: "${c.warning}",
        danger: "${c.danger}",
      },
    },
  },
};
`;
}

function generateCssVars(project: AuraProject): string {
  const ds = project.designSystem;
  const c = ds.colors;
  const lines: string[] = [];
  Object.entries(c.primary).forEach(([k, v]) => lines.push(`  --primary-${k}: ${v};`));
  Object.entries(c.neutral).forEach(([k, v]) => lines.push(`  --neutral-${k}: ${v};`));
  lines.push(`  --background: ${c.background};`);
  lines.push(`  --foreground: ${c.foreground};`);
  lines.push(`  --surface: ${c.surface};`);
  lines.push(`  --border: ${c.border};`);
  Object.entries(ds.radii).forEach(([k, v]) => lines.push(`  --radius-${k}: ${v};`));
  Object.entries(ds.shadows).forEach(([k, v]) => lines.push(`  --shadow-${k}: ${v};`));
  return `:root {\n${lines.join("\n")}\n}\n`;
}

type TabId = "sitemap" | "wireframes" | "styleguide" | "preview" | "export";

function Dashboard({ project, onReset }: { project: AuraProject; onReset: () => void }) {
  const [tab, setTab] = useState<TabId>("preview");
  const { toasts, add } = useToasts();
  const tabs: Array<{ id: TabId; label: string; icon: () => React.ReactNode }> = [
    { id: "sitemap", label: "Sitemap", icon: I.Map },
    { id: "wireframes", label: "Wireframes", icon: I.Layout },
    { id: "styleguide", label: "Style guide", icon: I.Palette },
    { id: "preview", label: "Live preview", icon: I.Eye },
    { id: "export", label: "Export", icon: I.Download },
  ];
  return (
    <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden">
      <ToastLayer toasts={toasts} />
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center text-white"><I.Sparkles /></div>
            <span className="text-white">Aura</span>
          </div>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="text-sm text-zinc-400">{project.name} · <span className="text-zinc-600">{project.category}</span></div>
        </div>
        <div className="flex gap-2">
          <button onClick={onReset} className="text-sm px-3 py-1.5 rounded-md text-zinc-300 hover:bg-zinc-800">New project</button>
          <button onClick={() => setTab("export")} className="text-sm bg-white text-black px-3 py-1.5 rounded-md font-medium">Export</button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 border-r border-zinc-800 flex flex-col p-3 shrink-0">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-2">Project</div>
          <nav className="space-y-0.5">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${tab === t.id ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"}`}>
                  <Icon /> {t.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto pt-4 border-t border-zinc-800 px-2 text-[11px] text-zinc-500">
            <div className="mb-1">Research</div>
            <div className="text-zinc-400 text-xs leading-relaxed">{project.research.tone}</div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto bg-zinc-900">
          {tab === "sitemap" && (<SitemapView project={project} onNavigate={() => setTab("wireframes")} />)}
          {tab === "wireframes" && <WireframesView project={project} />}
          {tab === "styleguide" && <StyleGuideView project={project} onToast={add} />}
          {tab === "preview" && <PrototypePreviewView project={project} />}
          {tab === "export" && <ExportView project={project} onToast={add} />}
        </main>
      </div>
    </div>
  );
}

export default function AuraApp() {
  const [state, setState] = useState<"input" | "generating" | "dashboard">("input");
  const [project, setProject] = useState<AuraProject | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (prompt: string) => {
    setError(null);
    setState("generating");
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await r.json();
      if (!r.ok) {
        const base = typeof body?.error === "string" ? body.error : "Generation failed";
        const issues = Array.isArray(body?.issues)
          ? body.issues
              .slice(0, 8)
              .map((i: { path?: (string | number)[]; message?: string }) => `• ${(i.path ?? []).join(".") || "(root)"} — ${i.message ?? "invalid"}`)
              .join("\n")
          : "";
        setError(issues ? `${base}\n\n${issues}` : base);
        setState("input");
        return;
      }
      setProject(body as AuraProject);
      setState("dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("input");
    }
  };

  const handleReset = () => {
    setProject(null);
    setError(null);
    setState("input");
  };

  if (state === "input") return <PromptScreen onGenerate={handleGenerate} loading={false} error={error} />;
  if (state === "generating") return <GeneratingScreen stage="Architecting via LLM" />;
  if (state === "dashboard" && project) return <Dashboard project={project} onReset={handleReset} />;
  return null;
}

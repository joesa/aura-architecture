"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { AuraProject, Page } from "@/lib/schema";

type Mode = "wireframe" | "preview";

interface RouterState {
  project: AuraProject;
  currentPath: string;
  mode: Mode;
  navigate: (hrefOrId: string) => void;
}

const Ctx = createContext<RouterState | null>(null);

export function usePreviewRouter(): RouterState {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePreviewRouter outside PreviewRouterProvider");
  return c;
}

export function resolvePath(
  project: AuraProject,
  hrefOrId: string,
): string | null {
  const paths = new Set(project.pages.map((p) => p.path));
  if (paths.has(hrefOrId)) return hrefOrId;
  // id match
  const byId = project.pages.find((p) => p.id === hrefOrId);
  if (byId) return byId.path;
  return null;
}

export function pageForPath(
  project: AuraProject,
  path: string,
): Page | undefined {
  return project.pages.find((p) => p.path === path);
}

export function PreviewRouterProvider({
  project,
  initialPath,
  mode,
  onNotify,
  children,
}: {
  project: AuraProject;
  initialPath?: string;
  mode: Mode;
  onNotify?: (msg: string) => void;
  children: React.ReactNode;
}) {
  const defaultPath = project.pages[0]?.path ?? "/";
  const [currentPath, setCurrentPath] = useState(initialPath ?? defaultPath);

  const navigate = useCallback(
    (hrefOrId: string) => {
      if (!hrefOrId) return;
      // Anchors: smooth scroll inside the preview scroll container.
      if (hrefOrId.startsWith("#")) {
        const el = document.querySelector(
          `[data-anchor="${hrefOrId.slice(1)}"]`,
        );
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // External: open in new tab.
      if (/^https?:\/\//.test(hrefOrId)) {
        window.open(hrefOrId, "_blank", "noopener,noreferrer");
        return;
      }
      const resolved = resolvePath(project, hrefOrId) ?? defaultPath;
      setCurrentPath(resolved);
      onNotify?.(`→ ${resolved}`);
      // Scroll shared scroll container to top.
      const container = document.getElementById("aura-preview-scroll");
      container?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [project, defaultPath, onNotify],
  );

  const value = useMemo<RouterState>(
    () => ({ project, currentPath, mode, navigate }),
    [project, currentPath, mode, navigate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

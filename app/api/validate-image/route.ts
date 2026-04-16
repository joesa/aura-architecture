import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 4000;

async function ok(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
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

export async function POST(req: NextRequest) {
  const { urls } = (await req.json()) as { urls?: string[] };
  if (!Array.isArray(urls)) {
    return Response.json({ error: "Missing urls[]" }, { status: 400 });
  }
  const results = await Promise.all(
    urls.map(async (u) => ({ url: u, ok: await ok(u) })),
  );
  return Response.json({ results });
}

import OpenAI from "openai";
import { NextRequest } from "next/server";
import { AuraProjectSchema, type AuraProject } from "@/lib/schema";
import { DESIGN_ARCHITECT_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { validateAndRepairProject } from "@/lib/pipeline/repair";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const client = new OpenAI({ apiKey });

  type Msg = { role: "user"; content: Array<{ type: "input_text"; text: string }> };
  const input: Msg[] = [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text:
            `Design brief: ${prompt}\n\n` +
            `Return a single JSON object matching the Aura project schema. ` +
            `Include a full sitemap (5+ pages), a complete design system, and imagery entries for every image reference.`,
        },
      ],
    },
  ];

  const callModel = async (): Promise<string> => {
    const resp = await client.responses.create({
      model: DEFAULT_MODEL,
      instructions: DESIGN_ARCHITECT_SYSTEM_PROMPT,
      input,
      text: { format: { type: "json_object" } },
    });
    return resp.output_text ?? "";
  };

  let parsed: unknown;
  let lastIssues: unknown = null;
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: string;
    try {
      raw = await callModel();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json(
        { error: `OpenAI request failed: ${message}` },
        { status: 502 },
      );
    }

    try {
      parsed = JSON.parse(raw);
    } catch {
      input.push({
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Your previous response was not valid JSON. Return ONLY a single valid JSON object matching the schema, no prose, no code fences.",
          },
        ],
      });
      continue;
    }

    const result = AuraProjectSchema.safeParse(parsed);
    if (result.success) {
      const repaired: AuraProject = await validateAndRepairProject(result.data, {
        baseUrl: req.nextUrl.origin,
      });
      return Response.json(repaired);
    }

    const issues = result.error.issues.slice(0, 30);
    lastIssues = issues;
    console.error(`[generate] attempt ${attempt} failed schema validation`, issues);
    if (attempt === MAX_ATTEMPTS) break;

    const feedback = issues
      .map((i) => `- path: ${i.path.join(".") || "(root)"} — ${i.message} [code: ${i.code}]`)
      .join("\n");
    input.push({
      role: "user",
      content: [
        {
          type: "input_text",
          text:
            `Your previous JSON failed strict schema validation with these errors:\n\n${feedback}\n\n` +
            `Return the FULL corrected JSON object. Do not explain. Preserve everything that was already valid; only fix the listed fields. ` +
            `Remember the strict contract: discriminated union on section.type (navbar, hero, featureGrid, bento, stats, logoCloud, testimonial, pricing, faq, cta, gallery, steps, form, footer), ColorScale keys 50/100/.../950, typography.scale xs..6xl, etc.`,
        },
      ],
    });
  }

  return Response.json(
    {
      error: "Generated project failed schema validation after retries.",
      issues: lastIssues,
    },
    { status: 502 },
  );
}

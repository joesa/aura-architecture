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

  let raw: string;
  try {
    const resp = await client.responses.create({
      model: DEFAULT_MODEL,
      instructions: DESIGN_ARCHITECT_SYSTEM_PROMPT,
      input: [
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
      ],
      text: { format: { type: "json_object" } },
    });
    raw = resp.output_text ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `OpenAI request failed: ${message}` },
      { status: 502 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: "Model did not return valid JSON.", raw },
      { status: 502 },
    );
  }

  const result = AuraProjectSchema.safeParse(parsed);
  if (!result.success) {
    return Response.json(
      {
        error: "Generated project failed schema validation.",
        issues: result.error.issues.slice(0, 20),
        raw: parsed,
      },
      { status: 502 },
    );
  }

  const repaired: AuraProject = await validateAndRepairProject(result.data, {
    baseUrl: req.nextUrl.origin,
  });

  return Response.json(repaired);
}

import OpenAI from "openai";
import { NextRequest } from "next/server";
import { AuraProjectSchema, type AuraProject } from "@/lib/schema";
import { DESIGN_ARCHITECT_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { validateAndRepairProject } from "@/lib/pipeline/repair";
import { normalizeAuraProject } from "@/lib/pipeline/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";

type ProgressEvent =
  | { kind: "progress"; stage: string; pct: number; detail?: string }
  | { kind: "result"; project: AuraProject }
  | { kind: "error"; error: string; issues?: unknown };

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
  const encoder = new TextEncoder();
  const baseUrl = req.nextUrl.origin;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: ProgressEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
        } catch {
          // controller already closed
        }
      };

      try {
        send({ kind: "progress", stage: "Contacting OpenAI", pct: 3 });

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

        const callModel = async (attempt: number): Promise<string> => {
          const stageLabel = attempt === 1 ? "Architecting via LLM" : `Retrying (attempt ${attempt}/3)`;
          const stageBase = attempt === 1 ? 5 : Math.min(60, 20 + (attempt - 1) * 10);
          const stageCap = attempt === 1 ? 68 : Math.min(68, stageBase + 30);
          send({ kind: "progress", stage: stageLabel, pct: stageBase });

          // Heartbeat so the UI shows continuous motion while the blocking call runs.
          let pct = stageBase;
          const ping = setInterval(() => {
            if (pct < stageCap) {
              pct += 1;
              send({ kind: "progress", stage: stageLabel, pct });
            }
          }, 700);

          try {
            const resp = await client.responses.create({
              model: DEFAULT_MODEL,
              instructions: DESIGN_ARCHITECT_SYSTEM_PROMPT,
              input,
              text: { format: { type: "json_object" } },
            });
            return resp.output_text ?? "";
          } finally {
            clearInterval(ping);
          }
        };

        let parsed: unknown;
        let lastIssues: unknown = null;
        const MAX_ATTEMPTS = 3;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          let raw: string;
          try {
            raw = await callModel(attempt);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            send({ kind: "error", error: `OpenAI request failed: ${message}` });
            controller.close();
            return;
          }

          send({ kind: "progress", stage: "Parsing response", pct: 72 });
          try {
            parsed = JSON.parse(raw);
            parsed = normalizeAuraProject(parsed);
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

          send({ kind: "progress", stage: "Validating schema", pct: 78 });
          const result = AuraProjectSchema.safeParse(parsed);
          if (result.success) {
            send({ kind: "progress", stage: "Validating imagery & repairing links", pct: 85 });
            const repaired: AuraProject = await validateAndRepairProject(result.data, {
              baseUrl,
            });
            send({ kind: "progress", stage: "Finalizing", pct: 98 });
            send({ kind: "result", project: repaired });
            controller.close();
            return;
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

        send({
          kind: "error",
          error: "Generated project failed schema validation after retries.",
          issues: lastIssues,
        });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ kind: "error", error: message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

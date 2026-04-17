import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { AuraProjectSchema, type AuraProject } from "@/lib/schema";
import { DESIGN_ARCHITECT_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { validateAndRepairProject } from "@/lib/pipeline/repair";
import { normalizeAuraProject } from "@/lib/pipeline/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const PROVIDER = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

type ProgressEvent =
  | { kind: "progress"; stage: string; pct: number; detail?: string }
  | { kind: "result"; project: AuraProject }
  | { kind: "error"; error: string; issues?: unknown };

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (PROVIDER === "openai" && !openaiKey) {
    return Response.json({ error: "OPENAI_API_KEY is not configured on the server." }, { status: 500 });
  }
  if (PROVIDER !== "openai" && !anthropicKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 500 });
  }

  const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
  const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
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
        const providerLabel = PROVIDER === "openai" ? "OpenAI" : "Claude";
        send({ kind: "progress", stage: `Contacting ${providerLabel}`, pct: 3 });

        // Conversation history as simple user/assistant turns; we translate to
        // each provider's native shape inside callModel.
        type Turn = { role: "user" | "assistant"; text: string };
        const history: Turn[] = [
          {
            role: "user",
            text:
              `Design brief: ${prompt}\n\n` +
              `Return a single JSON object matching the Aura project schema. ` +
              `Include a full sitemap (5+ pages), a complete design system, and imagery entries for every image reference. ` +
              `Respond with ONLY the JSON object — no prose, no code fences.`,
          },
        ];

        const callModel = async (attempt: number): Promise<string> => {
          const stageLabel = attempt === 1 ? `Architecting via ${providerLabel}` : `Retrying (attempt ${attempt}/3)`;
          const stageBase = attempt === 1 ? 5 : Math.min(60, 20 + (attempt - 1) * 10);
          const stageCap = attempt === 1 ? 68 : Math.min(68, stageBase + 30);
          send({ kind: "progress", stage: stageLabel, pct: stageBase });

          let pct = stageBase;
          const ping = setInterval(() => {
            if (pct < stageCap) {
              pct += 1;
              send({ kind: "progress", stage: stageLabel, pct });
            }
          }, 700);

          try {
            if (PROVIDER === "openai") {
              const input = history.map((t) => ({
                role: t.role,
                content: [{ type: (t.role === "user" ? "input_text" : "output_text") as "input_text" | "output_text", text: t.text }],
              }));
              const resp = await openai!.responses.create({
                model: OPENAI_MODEL,
                instructions: DESIGN_ARCHITECT_SYSTEM_PROMPT,
                // Cast is needed because the union shape differs per role.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                input: input as any,
                text: { format: { type: "json_object" } },
              });
              return resp.output_text ?? "";
            }
            // Anthropic
            const resp = await anthropic!.messages.create({
              model: ANTHROPIC_MODEL,
              max_tokens: 16000,
              system: DESIGN_ARCHITECT_SYSTEM_PROMPT,
              messages: history.map((t) => ({ role: t.role, content: t.text })),
            });
            const text = resp.content
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("");
            return text;
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
            send({ kind: "error", error: `${providerLabel} request failed: ${message}` });
            controller.close();
            return;
          }

          send({ kind: "progress", stage: "Parsing response", pct: 72 });
          // Strip code fences if present (Claude sometimes wraps despite instructions).
          let cleaned = raw.trim();
          if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          }
          // If there's prose around the JSON, extract the first {...} block.
          if (cleaned[0] !== "{") {
            const first = cleaned.indexOf("{");
            const last = cleaned.lastIndexOf("}");
            if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1);
          }
          try {
            parsed = JSON.parse(cleaned);
            parsed = normalizeAuraProject(parsed);
          } catch {
            history.push({ role: "assistant", text: raw });
            history.push({
              role: "user",
              text: "Your previous response was not valid JSON. Return ONLY a single valid JSON object matching the schema, no prose, no code fences.",
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
          history.push({ role: "assistant", text: raw });
          history.push({
            role: "user",
            text:
              `Your previous JSON failed strict schema validation with these errors:\n\n${feedback}\n\n` +
              `Return the FULL corrected JSON object. Do not explain. Preserve everything that was already valid; only fix the listed fields. ` +
              `Remember the strict contract: discriminated union on section.type (navbar, hero, featureGrid, bento, stats, logoCloud, testimonial, pricing, faq, cta, gallery, steps, form, footer), ColorScale keys 50/100/.../950, typography.scale xs..6xl, etc.`,
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

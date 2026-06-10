import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM = `You are StudySync AI — a helpful, knowledgeable assistant like ChatGPT. You can answer ANY question on ANY topic at ANY level (school, college, competitive exams, professional, general knowledge, coding, writing, life advice, etc.).

GUIDELINES:
1. Use the entire conversation AND the "Long-term memory" block (if present) for context. Recall earlier questions when the user references them.
2. Answer directly and completely. Match the depth of the question — short questions get short answers, complex questions get thorough answers with examples, code, or steps as needed.
3. Only ask a clarifying question if the request is genuinely ambiguous and you cannot give a useful answer without it. Otherwise, just answer. Do NOT force "Quick questions" or "Next steps" sections on every reply.
4. Format with clean markdown: headings, bullet lists, **bold**, and fenced code blocks with language tags when sharing code. Use tables when comparing things.
5. Be accurate, friendly, and concise. If you don't know something or it's beyond your knowledge cutoff, say so honestly.
6. **Previous year questions (PYQs):** When the user asks about any exam topic (JEE, NEET, UPSC, GATE, CBSE/ICSE boards, SAT, GRE, school chapters, university subjects, etc.) OR when the user explicitly asks for "previous year questions", "PYQs", "past papers", or "sample questions", ALWAYS include 3–5 representative previous-year / sample questions on that topic. For each question give: **Year & Exam** (e.g. "JEE Main 2023"), the **question text**, options if MCQ, and a **worked solution** with the final answer in **bold**. If you are not 100% sure of the exact year, clearly label it as a "Representative sample question (similar to past exams)" instead of inventing a citation. Never refuse to provide sample questions.`;

async function getUserIdFromAuth(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await getUserIdFromAuth(request);
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.LOVABLE_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
        if (!apiKey) {
          const errText =
            "Demo mode active: using Gemini Flash preview style without requiring an API key.";
          return new Response(
            `${errText}\n\nDemo answer: Focus on core concepts, practice with past-paper style questions, and build a study routine with short, consistent sessions.`,
            {
              status: 200,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            },
          );
        }

        let body: { messages?: Msg[]; memory?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
        if (messages.length === 0) return new Response("messages required", { status: 400 });

        const sysMessages: Msg[] = [{ role: "system", content: SYSTEM }];
        if (body.memory && body.memory.trim()) {
          sysMessages.push({
            role: "system",
            content: `Long-term memory (recent topics & answers from prior chats — use to maintain context):\n${body.memory.slice(0, 4000)}`,
          });
        }

        const isOpenAI = !!process.env.OPENAI_API_KEY;
        const isLovable = !!process.env.LOVABLE_API_KEY;
        const apiUrl = process.env.AI_API_URL
          ? process.env.AI_API_URL
          : isOpenAI
          ? "https://api.openai.com/v1/chat/completions"
          : "https://ai.gateway.lovable.dev/v1/chat/completions";
        const model = process.env.AI_API_URL
          ? process.env.AI_MODEL || "gpt-4o-mini"
          : isOpenAI
          ? "gpt-4o-mini"
          : isLovable
          ? process.env.LOVABLE_MODEL || "google/gemini-3-flash-preview"
          : "gpt-4o-mini";
        const upstream = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            stream: true,
            max_tokens: 8192,
            messages: [...sysMessages, ...messages],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(() => "");
          const status = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 500;
          const msg =
            status === 429
              ? "Rate limit reached. Please wait a moment."
              : status === 402
                ? "AI credits exhausted. Please top up."
                : "AI service unavailable";
          console.error("AI gateway error", upstream.status, t);
          return new Response(msg, { status });
        }

        // Forward SSE stream as plain text deltas for easy client parsing.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buf = "";

        const stream = new ReadableStream({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              return;
            }
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const l = line.trim();
              if (!l.startsWith("data:")) continue;
              const data = l.slice(5).trim();
              if (data === "[DONE]") {
                controller.close();
                return;
              }
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {
                // ignore parse errors
              }
            }
          },
          cancel() {
            reader.cancel().catch(() => {});
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});

// Server-only Gemini API helper (direct — no Lovable AI Gateway).
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Convert OpenAI-style {role, content}[] messages into Gemini's
// {system_instruction, contents} shape.
function toGeminiPayload(messages: ChatMessage[], temperature: number) {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => m.content);
  const conversation = messages.filter((m) => m.role !== "system");

  return {
    ...(systemParts.length > 0 && {
      system_instruction: { parts: [{ text: systemParts.join("\n\n") }] },
    }),
    contents: conversation.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
    },
  };
}

export async function chatJSON<T = unknown>(opts: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");

  const model = opts.model ?? GEMINI_MODEL;
  const payload = toGeminiPayload(opts.messages, opts.temperature ?? 0.7);

  const res = await fetch(GEMINI_URL(model, key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached. Please wait a moment and try again.");
    if (res.status === 403) throw new Error("Gemini API key is invalid or missing permissions.");
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    return JSON.parse(content) as T;
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("AI returned non-JSON response");
  }
}
export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function llmConfigFromEnv(env: Record<string, string | undefined>): LlmConfig | null {
  const { LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = env;
  if (!LLM_BASE_URL || !LLM_API_KEY || !LLM_MODEL) return null;
  return {
    baseUrl: LLM_BASE_URL.replace(/\/+$/, ""),
    apiKey: LLM_API_KEY,
    model: LLM_MODEL,
  };
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function chatCompletion(
  cfg: LlmConfig,
  messages: ChatMessage[],
  opts: { maxOutputTokens?: number; temperature?: number } = {},
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      ...(opts.maxOutputTokens !== undefined ? { max_tokens: opts.maxOutputTokens } : {}),
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    }),
  });
  if (!res.ok) {
    throw new LlmError(`LLM request failed: ${res.status} ${await res.text()}`, res.status);
  }
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return body.choices?.[0]?.message?.content?.trim() ?? "";
}

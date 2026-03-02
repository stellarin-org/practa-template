import { getApiUrl } from "@/lib/query-client";

export interface PractaAI {
  openai(body: Record<string, unknown>): Promise<any>;
  gemini(body: Record<string, unknown>): Promise<any>;
  anthropic(body: Record<string, unknown>): Promise<any>;
}

async function callAI(provider: string, body: Record<string, unknown>): Promise<any> {
  const baseUrl = getApiUrl();
  const url = new URL(`/api/ai/${provider}`, baseUrl);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || `AI request failed (${res.status})`);
    (err as any).status = res.status;
    (err as any).type = data.type;
    throw err;
  }

  return data;
}

export function createPractaAI(): PractaAI {
  return {
    openai: (body) => callAI("openai", body),
    gemini: (body) => callAI("gemini", body),
    anthropic: (body) => callAI("anthropic", body),
  };
}

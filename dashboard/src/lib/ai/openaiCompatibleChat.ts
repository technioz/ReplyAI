/**
 * Single OpenAI-compatible /v1/chat/completions client for Groq, xAI, and Ollama.
 * Used by reply services and post-generation so provider logic stays in one place.
 */

import dns from 'dns';
import { getOllamaCandidateV1Bases } from './ollamaServerUrl';

if (process.env.OLLAMA_FETCH_IPV4 === '1' && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface ChatCompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResult {
  content: string;
  usage: ChatCompletionUsage | null;
}

export interface OpenAICompatibleChatParams {
  /** Base URL without trailing slash, must include /v1 (e.g. https://api.groq.com/openai/v1 or http://127.0.0.1:11434/v1) */
  baseUrl: string;
  apiKey?: string;
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature: number;
  top_p?: number;
  stream?: boolean;
  frequency_penalty?: number;
  presence_penalty?: number;
}

function isConnectionRefused(err: unknown): boolean {
  const e = err as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException };
  if (e?.code === 'ECONNREFUSED') return true;
  if (e?.cause?.code === 'ECONNREFUSED') return true;
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('ECONNREFUSED');
}

function wrapOllamaNetworkError(err: unknown, requestUrl: string): Error {
  if (!isConnectionRefused(err)) {
    return err instanceof Error ? err : new Error(String(err));
  }
  const origin = (() => {
    try {
      return new URL(requestUrl).origin;
    } catch {
      return requestUrl;
    }
  })();
  return new Error(
    `Cannot reach Ollama at ${origin} (connection refused). ` +
      `Inside Docker/Coolify, localhost and host.docker.internal usually do not reach another container. ` +
      `Set OLLAMA_INTERNAL_BASE_URL or OLLAMA_BASE_URL to the Ollama service on the same Docker network ` +
      `(example: http://ollama:11434 — use your real container/service name from docker compose or Coolify). ` +
      `If curl http://localhost:11434 works on the host but not here, set OLLAMA_DISCOVER_HOST_GATEWAY=1 (Linux) or OLLAMA_AUTO_BRIDGE_FALLBACK=1. ` +
      `Call GET /api/ai/ollama-health from this deployment to see which URL responds.`
  );
}

function isRetryableForNextOllamaOrigin(err: unknown): boolean {
  if (isConnectionRefused(err)) return true;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('ECONNREFUSED')) return true;
  if (msg.includes('fetch failed')) return true;
  const e = err as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException };
  if (e?.code === 'ENOTFOUND' || e?.cause?.code === 'ENOTFOUND') return true;
  if (e?.code === 'ETIMEDOUT' || e?.cause?.code === 'ETIMEDOUT') return true;
  return false;
}

function wrapAggregatedOllamaFailure(v1Bases: string[], lastErr: unknown): Error {
  const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
  return new Error(
    `Cannot reach Ollama after trying (OpenAI path /v1/chat/completions): ${v1Bases.join(' → ')}.\n` +
      `Last error: ${detail}\n\n` +
      `What to do:\n` +
      `1) Coolify: put this app and Ollama on the same Docker network; set OLLAMA_INTERNAL_BASE_URL=http://<ollama-service-name>:11434 (name from Coolify/Docker, not localhost).\n` +
      `2) Host shell curl localhost:11434 works: set OLLAMA_DISCOVER_HOST_GATEWAY=1 (reads container default gateway) or OLLAMA_AUTO_BRIDGE_FALLBACK=1.\n` +
      `3) Open GET /api/ai/ollama-health — it probes GET /api/tags on each candidate and shows which origin works from this container.`
  );
}

function parseErrorBody(status: number, errorData: string, label: string): Error {
  let message = `${label} API error: ${status}`;
  try {
    const errorJson = JSON.parse(errorData) as { error?: string; message?: string };
    if (errorJson.error) message = `${label} API error: ${errorJson.error}`;
    if (errorJson.message) message += ` - ${errorJson.message}`;
  } catch {
    message = `${label} API error: ${status} - ${errorData}`;
  }
  return new Error(message);
}

type OpenAIChatOptions = {
  /** When false, Ollama network errors are rethrown without the long Docker hint (used while trying fallbacks). */
  skipOllamaConnectionHint?: boolean;
};

export async function openAICompatibleChat(
  params: OpenAICompatibleChatParams,
  errorLabel: string,
  opts?: OpenAIChatOptions
): Promise<ChatCompletionResult> {
  const url = `${params.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Quirkly-NextJS-API/1.0.0',
    Accept: 'application/json',
  };
  if (params.apiKey) {
    headers.Authorization = `Bearer ${params.apiKey}`;
  }

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    max_tokens: params.max_tokens,
    temperature: params.temperature,
    top_p: params.top_p ?? 0.95,
    stream: params.stream ?? false,
  };
  if (params.frequency_penalty != null) body.frequency_penalty = params.frequency_penalty;
  if (params.presence_penalty != null) body.presence_penalty = params.presence_penalty;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (errorLabel === 'Ollama' && !opts?.skipOllamaConnectionHint) {
      throw wrapOllamaNetworkError(err, url);
    }
    throw err;
  }

  if (!response.ok) {
    const errorData = await response.text();
    console.error(`${errorLabel} API error:`, response.status, errorData);
    throw parseErrorBody(response.status, errorData, errorLabel);
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  if (!result.choices?.[0]?.message?.content) {
    throw new Error(`Invalid response from ${errorLabel} API`);
  }

  const usage = result.usage
    ? {
        promptTokens: result.usage.prompt_tokens ?? 0,
        completionTokens: result.usage.completion_tokens ?? 0,
        totalTokens: result.usage.total_tokens ?? 0,
      }
    : null;

  return {
    content: result.choices[0].message.content.trim(),
    usage,
  };
}

/** Options tuned for short X/Twitter replies */
export const REPLY_CHAT_OPTIONS = {
  max_tokens: 120,
  temperature: 0.8,
  top_p: 0.9,
  stream: false as const,
};

/** Options tuned for long-form post generation (RAG) */
export const POST_GENERATION_CHAT_OPTIONS = {
  max_tokens: 2000,
  temperature: 1.0,
  top_p: 0.95,
  stream: false as const,
};

/**
 * Try each Ollama /v1 base (primary + OLLAMA_TRY_GATEWAYS + optional bridge fallbacks) until one succeeds.
 */
export async function openOllamaCompatibleChat(
  params: Omit<OpenAICompatibleChatParams, 'baseUrl'>
): Promise<ChatCompletionResult> {
  const bases = getOllamaCandidateV1Bases();
  let lastErr: unknown;

  for (let i = 0; i < bases.length; i++) {
    const baseUrl = bases[i];
    const isLast = i === bases.length - 1;
    const skipHint = bases.length > 1 || !isLast;

    try {
      return await openAICompatibleChat(
        { ...params, baseUrl },
        'Ollama',
        { skipOllamaConnectionHint: skipHint }
      );
    } catch (e) {
      lastErr = e;
      if (!isLast && isRetryableForNextOllamaOrigin(e)) {
        console.warn(`[Ollama] unreachable at ${baseUrl}, trying next candidate`);
        continue;
      }
      if (bases.length > 1 && isLast && isRetryableForNextOllamaOrigin(e)) {
        throw wrapAggregatedOllamaFailure(bases, e);
      }
      throw e;
    }
  }

  throw wrapAggregatedOllamaFailure(bases, lastErr);
}

/**
 * Post / dashboard content generation — respects AI_PROVIDER (groq | xai | ollama).
 */
export async function generatePostGenerationChat(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  switch (provider) {
    case 'groq': {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error('GROQ_API_KEY is required when AI_PROVIDER=groq');
      const { content } = await openAICompatibleChat(
        {
          baseUrl: 'https://api.groq.com/openai/v1',
          apiKey,
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
          messages,
          ...POST_GENERATION_CHAT_OPTIONS,
        },
        'Groq'
      );
      return content;
    }
    case 'xai': {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) throw new Error('XAI_API_KEY is required when AI_PROVIDER=xai');
      const { content } = await openAICompatibleChat(
        {
          baseUrl: 'https://api.x.ai/v1',
          apiKey,
          model: process.env.XAI_MODEL || 'grok-4',
          messages,
          ...POST_GENERATION_CHAT_OPTIONS,
        },
        'XAI'
      );
      return content;
    }
    case 'ollama': {
      const { content } = await openOllamaCompatibleChat({
        apiKey: process.env.OLLAMA_API_KEY,
        model: process.env.OLLAMA_MODEL || 'llama2',
        messages,
        ...POST_GENERATION_CHAT_OPTIONS,
      });
      return content;
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

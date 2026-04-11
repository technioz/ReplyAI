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
      `Set OLLAMA_INTERNAL_BASE_URL (or OLLAMA_BASE_URL) to the Ollama service on the same Coolify/Docker network ` +
      `(e.g. http://ollama:11434 — the internal hostname from your stack, not localhost). ` +
      `GET /api/ai/ollama-health probes the origins from your configuration.`
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
      `1) Same Coolify/Docker network: set OLLAMA_INTERNAL_BASE_URL=http://<ollama-service-name>:11434 (internal name from your stack, not localhost).\n` +
      `2) Open GET /api/ai/ollama-health — probes GET /api/tags on each configured candidate.`
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

const OLLAMA_CLOUD_RESPONSE_LOG_MAX = 16000;

/** Skip thinking segments in multipart `content` arrays (e.g. gpt-oss). */
function isThinkingChunk(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const o = item as Record<string, unknown>;
  const t = o.type;
  if (t === 'thinking' || t === 'reasoning' || t === 'internal_reasoning') return true;
  if (o.role === 'thinking') return true;
  return false;
}

/** Top-level `think` for Ollama /api/chat (gpt-oss only accepts low|medium|high, not false). */
function ollamaCloudThinkRequestField(model: string): boolean | 'low' | 'medium' | 'high' | undefined {
  const raw = process.env.OLLAMA_CLOUD_THINK?.trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') return false;
  if (raw === 'true' || raw === '1' || raw === 'on') return true;
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;

  if (model.toLowerCase().includes('gpt-oss')) {
    return 'low';
  }
  return false;
}

/** Thinking models need headroom: 120 tokens often yields empty `content` with only `thinking`. */
function ollamaCloudNumPredict(model: string, requested: number): number {
  const floor = parseInt(process.env.OLLAMA_CLOUD_MIN_NUM_PREDICT || '', 10);
  const isThinkingish =
    model.toLowerCase().includes('gpt-oss') ||
    model.toLowerCase().includes('qwen3') ||
    model.toLowerCase().includes('deepseek');
  const defaultFloor = isThinkingish ? 512 : 128;
  const cap = Number.isFinite(floor) && floor > 0 ? floor : defaultFloor;
  return Math.max(requested, cap);
}

/**
 * Pull assistant text from Ollama /api/chat JSON.
 * Uses public reply text only (`message.content`, etc.). Never uses `message.thinking` as the reply.
 */
function extractOllamaChatAssistantText(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const r = result as Record<string, unknown>;

  const asTrimmedString = (v: unknown): string | null => {
    if (typeof v === 'string') {
      const t = v.trim();
      return t.length ? t : null;
    }
    return null;
  };

  const fromMessageObj = (msg: unknown): string | null => {
    if (!msg || typeof msg !== 'object') return null;
    const m = msg as Record<string, unknown>;
    const c = m.content;

    if (typeof c === 'string') {
      const t = c.trim();
      if (t.length) return t;
    }

    if (c && typeof c === 'object' && !Array.isArray(c)) {
      const co = c as Record<string, unknown>;
      const nested =
        asTrimmedString(co.text) ||
        asTrimmedString(co.value) ||
        asTrimmedString(co.answer) ||
        (typeof co.content === 'string' ? asTrimmedString(co.content) : null);
      if (nested) return nested;
    }

    if (Array.isArray(c)) {
      const parts: string[] = [];
      for (const item of c) {
        if (isThinkingChunk(item)) continue;
        if (typeof item === 'string') {
          parts.push(item);
          continue;
        }
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          const typ = o.type;
          if (typ === 'text' || typ === 'output_text' || typ === 'message') {
            const t =
              asTrimmedString(o.text) ||
              asTrimmedString(typeof o.content === 'string' ? o.content : null);
            if (t) parts.push(t);
            continue;
          }
          if ('text' in o) {
            const t = (item as { text?: string }).text;
            if (typeof t === 'string') parts.push(t);
          }
        }
      }
      const joined = parts.join('').trim();
      if (joined.length) return joined;
    }

    return null;
  };

  let text = fromMessageObj(r.message);
  if (text) return text;

  const data = r.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    text = fromMessageObj(d.message);
    if (text) return text;
  }

  const choices = r.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const ch0 = choices[0] as Record<string, unknown>;
    text = fromMessageObj(ch0.message);
    if (text) return text;
    text = asTrimmedString(ch0.text);
    if (text) return text;
    const delta = ch0.delta;
    if (delta && typeof delta === 'object') {
      text = fromMessageObj({ role: 'assistant', content: (delta as Record<string, unknown>).content });
      if (text) return text;
    }
  }

  if (Array.isArray(r.messages)) {
    for (let i = r.messages.length - 1; i >= 0; i--) {
      const msg = r.messages[i];
      if (msg && typeof msg === 'object') {
        const m = msg as Record<string, unknown>;
        if (m.role === 'assistant') {
          text = fromMessageObj(msg);
          if (text) return text;
        }
      }
    }
  }

  return asTrimmedString(r.response);
}

function logOllamaCloudParseFailure(model: string, result: unknown): void {
  let serialized = '(unserializable)';
  try {
    serialized = JSON.stringify(result, null, 2);
  } catch {
    serialized = String(result);
  }
  if (serialized.length > OLLAMA_CLOUD_RESPONSE_LOG_MAX) {
    serialized = `${serialized.slice(0, OLLAMA_CLOUD_RESPONSE_LOG_MAX)}\n…(truncated)`;
  }
  const keys = result && typeof result === 'object' ? Object.keys(result as object).join(', ') : 'n/a';
  console.error(`[Ollama Cloud] Could not parse assistant text (model=${model}). Top-level keys: ${keys}`);
  try {
    const msg = (result as Record<string, unknown>).message;
    if (msg && typeof msg === 'object') {
      const m = msg as Record<string, unknown>;
      const c = m.content;
      const onlyThinkingChunks =
        Array.isArray(c) && c.length > 0 && c.every((item) => isThinkingChunk(item));
      const contentEmpty =
        c == null ||
        (typeof c === 'string' && !c.trim()) ||
        (Array.isArray(c) && c.length === 0) ||
        onlyThinkingChunks;
      const hasThinking = typeof m.thinking === 'string' && m.thinking.trim().length > 0;
      if (contentEmpty && hasThinking) {
        console.error(
          '[Ollama Cloud] message.thinking is present but assistant content is empty — thinking is never used as the reply; try raising max tokens or adjusting the model/options.'
        );
      }
    }
  } catch {
    /* ignore */
  }
  console.error('[Ollama Cloud] Full /api/chat JSON body:\n', serialized);
}

/**
 * Call the Ollama Cloud API at https://ollama.com/api/chat
 * This endpoint uses a different request/response format than OpenAI-compatible APIs.
 */
export async function callOllamaCloudChat(
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  options: { max_tokens: number; temperature: number; top_p?: number; stream?: boolean }
): Promise<string> {
  const think = ollamaCloudThinkRequestField(model);
  const numPredict = ollamaCloudNumPredict(model, options.max_tokens);

  const requestBody: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    options: {
      num_predict: numPredict,
      temperature: options.temperature,
      top_p: options.top_p ?? 0.95,
    },
  };

  requestBody.think = think;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Quirkly-NextJS-API/1.0.0',
    Accept: 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch('https://ollama.com/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Ollama Cloud API error:', response.status, errorData);

    let errorMessage = `Ollama Cloud API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorData);
      if (errorJson.error) errorMessage = `Ollama Cloud API error: ${errorJson.error}`;
      if (errorJson.message) errorMessage += ` - ${errorJson.message}`;
    } catch {
      errorMessage = `Ollama Cloud API error: ${response.status} - ${errorData}`;
    }
    throw new Error(errorMessage);
  }

  const result: unknown = await response.json();
  const text = extractOllamaChatAssistantText(result);

  if (!text) {
    logOllamaCloudParseFailure(model, result);
    throw new Error(
      'Invalid response from Ollama Cloud API (no assistant text; check server logs for full JSON)'
    );
  }

  return text;
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
      const model = process.env.OLLAMA_MODEL || 'llama2';

      if (process.env.OLLAMA_USE_CLOUD === 'true') {
        const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
        if (!apiKey) throw new Error('OLLAMA_CLOUD_API_KEY is required when OLLAMA_USE_CLOUD=true');
        const content = await callOllamaCloudChat(
          model,
          apiKey,
          messages,
          POST_GENERATION_CHAT_OPTIONS
        );
        return content;
      }

      const { content } = await openOllamaCompatibleChat({
        apiKey: process.env.OLLAMA_API_KEY,
        model,
        messages,
        ...POST_GENERATION_CHAT_OPTIONS,
      });
      return content;
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

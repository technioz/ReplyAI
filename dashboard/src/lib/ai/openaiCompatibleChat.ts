/**
 * Single OpenAI-compatible /v1/chat/completions client for Groq, xAI, and Ollama.
 * Used by reply services and post-generation so provider logic stays in one place.
 */

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

export async function openAICompatibleChat(
  params: OpenAICompatibleChatParams,
  errorLabel: string
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

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

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

function ollamaV1Base(): string {
  const host = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
  return `${host}/v1`;
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
      const { content } = await openAICompatibleChat(
        {
          baseUrl: ollamaV1Base(),
          apiKey: process.env.OLLAMA_API_KEY,
          model: process.env.OLLAMA_MODEL || 'llama2',
          messages,
          ...POST_GENERATION_CHAT_OPTIONS,
        },
        'Ollama'
      );
      return content;
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

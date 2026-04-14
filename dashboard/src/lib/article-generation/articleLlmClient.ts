import {
  callOllamaCloudChat,
  openAICompatibleChat,
  type ChatMessage,
  type ChatCompletionUsage,
} from '../ai/openaiCompatibleChat';
import { getArticleLlmProvider } from './articleLlmConfig';

const ARTICLE_MAX_TOKENS = 8192;

/** Per-step options; `ollamaOptions` applies only when AI_PROVIDER=ollama. */
export type ArticleLlmCallOptions = {
  temperature?: number;
  contextLogLabel?: string;
  ollamaOptions?: {
    repeat_penalty?: number;
    top_k?: number;
    min_p?: number;
  };
};

function estimateTokensFromMessages(messages: ChatMessage[]): number {
  let chars = 0;
  for (const m of messages) {
    chars += m.role.length + 12;
    chars += typeof m.content === 'string' ? m.content.length : 0;
  }
  return Math.max(1, Math.ceil(chars / 4));
}

function logOpenAiArticleContext(params: {
  label?: string;
  providerLabel: string;
  model: string;
  usage: ChatCompletionUsage | null;
  messages: ChatMessage[];
}): void {
  if (!params.label) return;

  const promptTok = params.usage?.promptTokens ?? estimateTokensFromMessages(params.messages);
  const completionTok = params.usage?.completionTokens ?? 0;
  const limit = 128_000;
  const consumed = promptTok + completionTok;
  const pct = limit > 0 ? ((consumed / limit) * 100).toFixed(1) : '?';
  const promptPct = limit > 0 ? ((promptTok / limit) * 100).toFixed(1) : '?';

  const B = '\x1b[1m';
  const C = '\x1b[36m';
  const Y = '\x1b[33m';
  const G = '\x1b[32m';
  const D = '\x1b[2m';
  const R = '\x1b[0m';
  const line = `${D}${'═'.repeat(72)}${R}`;

  const srcPrompt = params.usage?.promptTokens != null ? 'API prompt_tokens' : 'estimated (chars/4)';
  const srcComp = params.usage?.completionTokens != null ? 'API completion_tokens' : 'n/a';

  console.log(`\n${line}`);
  console.log(
    `${B}${C} CONTEXT WINDOW${R} ${B}|${R} ${Y}${params.label}${R} ${D}|${R} ${G}${params.providerLabel}${R} model=${G}${params.model}${R}`
  );
  console.log(`${line}`);
  console.log(`  ${B}Input (prompt)${R}     ${promptTok.toLocaleString()} tok  ${D}(${srcPrompt})${R}`);
  console.log(`  ${B}Output (completion)${R} ${completionTok.toLocaleString()} tok  ${D}(${srcComp})${R}`);
  console.log(
    `  ${B}Generation cap${R}       max_tokens=${ARTICLE_MAX_TOKENS.toLocaleString()} ${D}(request ceiling)${R}`
  );
  console.log(
    `  ${B}Approx. context limit${R} ${limit.toLocaleString()} tok  ${D}(display heuristic for OpenAI-compatible APIs)${R}`
  );
  console.log(
    `  ${B}Usage vs limit${R}      prompt alone ${promptPct}% of window  |  prompt+completion ${pct}% of window`
  );
  console.log(`${line}\n`);
}

/**
 * Returns a chat function for the article 3-step pipeline, honoring AI_PROVIDER.
 */
export function createArticleChatCompleter(modelResolved: string): (
  messages: ChatMessage[],
  opts?: ArticleLlmCallOptions
) => Promise<string> {
  const provider = getArticleLlmProvider();

  if (provider === 'ollama') {
    const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
    if (!apiKey) {
      throw new Error('OLLAMA_CLOUD_API_KEY is required for article generation when AI_PROVIDER=ollama');
    }
    const o = (opts?: ArticleLlmCallOptions) => opts?.ollamaOptions;
    return async (messages, opts) => {
      const ox = o(opts);
      return callOllamaCloudChat(modelResolved, apiKey, messages, {
        max_tokens: ARTICLE_MAX_TOKENS,
        temperature: opts?.temperature ?? 0.6,
        top_p: 0.95,
        stream: false,
        contextLogLabel: opts?.contextLogLabel,
        repeat_penalty: ox?.repeat_penalty,
        top_k: ox?.top_k,
        min_p: ox?.min_p,
      });
    };
  }

  if (provider === 'xai') {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error('XAI_API_KEY is required for article generation when AI_PROVIDER=xai');
    }
    const model = modelResolved;
    return async (messages, opts?: ArticleLlmCallOptions) => {
      const { content, usage } = await openAICompatibleChat(
        {
          baseUrl: 'https://api.x.ai/v1',
          apiKey,
          model,
          messages,
          max_tokens: ARTICLE_MAX_TOKENS,
          temperature: opts?.temperature ?? 0.6,
          top_p: 0.95,
          stream: false,
        },
        'XAI'
      );
      logOpenAiArticleContext({
        label: opts?.contextLogLabel,
        providerLabel: 'XAI',
        model,
        usage,
        messages,
      });
      return content;
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required for article generation when AI_PROVIDER=groq');
  }
  const model = modelResolved;
  return async (messages, opts?: ArticleLlmCallOptions) => {
    const { content, usage } = await openAICompatibleChat(
      {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey,
        model,
        messages,
        max_tokens: ARTICLE_MAX_TOKENS,
        temperature: opts?.temperature ?? 0.6,
        top_p: 0.95,
        stream: false,
      },
      'Groq'
    );
    logOpenAiArticleContext({
      label: opts?.contextLogLabel,
      providerLabel: 'Groq',
      model,
      usage,
      messages,
    });
    return content;
  };
}

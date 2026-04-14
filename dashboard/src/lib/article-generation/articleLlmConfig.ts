import { OLLAMA_CLOUD_MODELS } from './types';

export type ArticleLlmProvider = 'ollama' | 'xai' | 'groq';

/** Same source as AIServiceFactory / post generation — drives article LLM backend. */
export function getArticleLlmProvider(): ArticleLlmProvider {
  const p = (process.env.AI_PROVIDER || 'groq').toLowerCase();
  if (p === 'xai') return 'xai';
  if (p === 'ollama') return 'ollama';
  return 'groq';
}

/**
 * Model id actually sent to the article LLM.
 * - ollama: use the id chosen in the UI (Ollama Cloud).
 * - xai / groq: use env model (request body id must still match the picker for validation).
 */
export function resolveArticleModel(requestModelId: string | undefined): string {
  const provider = getArticleLlmProvider();
  if (provider === 'xai') {
    return process.env.XAI_MODEL || 'grok-3';
  }
  if (provider === 'groq') {
    return process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  }
  return (requestModelId && requestModelId.trim()) || process.env.OLLAMA_MODEL || 'deepseek-v3.2:cloud';
}

/** Models shown in the article picker (must match what /api/article/generate accepts). */
export function getArticleModelsForPicker(): { id: string; label: string; description: string }[] {
  const provider = getArticleLlmProvider();
  if (provider === 'xai') {
    const id = process.env.XAI_MODEL || 'grok-3';
    return [
      {
        id,
        label: `xAI — ${id}`,
        description: 'Configured via XAI_MODEL (AI_PROVIDER=xai)',
      },
    ];
  }
  if (provider === 'groq') {
    const id = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    return [
      {
        id,
        label: `Groq — ${id}`,
        description: 'Configured via GROQ_MODEL (AI_PROVIDER=groq)',
      },
    ];
  }
  return OLLAMA_CLOUD_MODELS.map((m) => ({ id: m.id, label: m.label, description: m.description }));
}

export function getAllowedArticleModelIds(): string[] {
  return getArticleModelsForPicker().map((m) => m.id);
}

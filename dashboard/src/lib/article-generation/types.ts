export type ArticleTone = 'authoritative' | 'conversational' | 'contrarian' | 'storytelling';
export type ArticleLength = 'short' | 'medium' | 'long';

export interface ArticleGenerationRequest {
  topic?: string;
  tone: ArticleTone;
  length: ArticleLength;
  includeSEO: boolean;
  model: string;
}

export const OLLAMA_CLOUD_MODELS = [
  { id: 'gemma3:27b', label: 'Gemma 3 27B', description: 'Best balance of speed and quality' },
  { id: 'deepseek-v3.2', label: 'DeepSeek V3.2', description: 'Excellent reasoning and writing' },
  { id: 'qwen3-coder:480b', label: 'Qwen3 Coder 480B', description: 'Largest model, best for technical articles' },
  { id: 'kimi-k2:1t', label: 'Kimi K2 1T', description: 'Massive context window, great for research-heavy articles' },
  { id: 'gemma3:4b', label: 'Gemma 3 4B', description: 'Fastest, good for drafts and iterations' },
] as const;

export interface ArticleGenerationResponse {
  content: string;
  metadata: {
    tone: ArticleTone;
    length: ArticleLength;
    wordCount: number;
    model: string;
    seoOptimized: boolean;
  };
}
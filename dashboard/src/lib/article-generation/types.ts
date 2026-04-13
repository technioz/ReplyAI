export type ArticleTone = 'authoritative' | 'conversational' | 'contrarian' | 'storytelling';
export type ArticleLength = 'short' | 'medium' | 'long';

export type Brief = {
  topic: string;
  audience: string;
  search_intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  primary_keyword: string;
  secondary_keywords: string[];
  geo_keywords: string[];
  reader_level: 'beginner' | 'intermediate' | 'advanced';
  article_type: 'tutorial' | 'explainer' | 'comparison' | 'opinion' | 'guide' | 'listicle';
  core_questions: string[];
  must_include: string[];
  must_avoid: string[];
  tone: string[];
  target_length: 'short' | 'medium' | 'long' | 'very long';
  cta_type: 'none' | 'soft' | 'direct';
  output_format: 'markdown';
};

export interface WriterProfile {
  handle?: string;
  displayName?: string;
  bio?: string;
  expertise?: {
    domains?: string[];
    keywords?: string[];
    topics?: string[];
  };
  toneAnalysis?: {
    primaryTone?: string;
    secondaryTones?: string[];
    vocabulary?: string[];
    avgTweetLength?: number;
  };
  writingSamples?: string[];
}

export const OLLAMA_CLOUD_MODELS = [
  {
    id: 'qwen3.5:397b-cloud',
    label: 'Qwen3.5 397B (cloud)',
    description: 'Best for writing. Strong instruction following, natural prose, follows humanizer rules closely',
  },
  {
    id: 'kimi-k2.5:cloud',
    label: 'Kimi K2.5 (cloud)',
    description: 'Best for narrative. Conversational flow, 256K context, less robotic output',
  },
  {
    id: 'gpt-oss:120b-cloud',
    label: 'gpt-oss 120B (cloud)',
    description: 'Strong for editing. Configurable reasoning depth, follows rewrite instructions precisely',
  },
  {
    id: 'deepseek-v3.2:cloud',
    label: 'DeepSeek V3.2 (cloud)',
    description: 'Strong reasoning, 160K context. Good for technical articles',
  },
  {
    id: 'gemma4:31b-cloud',
    label: 'Gemma 4 31B (cloud)',
    description: 'Good reasoning and clarity. Dense 31B, thinking modes',
  },
  {
    id: 'deepseek-v3.1:671b-cloud',
    label: 'DeepSeek V3.1 671B (cloud)',
    description: 'Large reasoning model, 160K context. Good for complex technical topics',
  },
  {
    id: 'qwen3-coder:480b-cloud',
    label: 'Qwen3 Coder 480B (cloud)',
    description: 'Code-focused. Use only for highly technical articles with code samples',
  }
] as const;

export interface ArticleGenerationResponse {
  content: string;
  metadata: {
    tone: ArticleTone;
    length: ArticleLength;
    wordCount: number;
    model: string;
    seoOptimized: boolean;
    brief: Brief;
    draft: string;
    final: string;
  };
}
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

export const OLLAMA_CLOUD_MODELS = [
  {
    id: 'deepseek-v3.2:cloud',
    label: 'DeepSeek V3.2 (cloud)',
    description: 'Top-tier reasoning and agent-style planning; 160K context',
  },
  {
    id: 'qwen3.5:397b-cloud',
    label: 'Qwen3.5 397B MoE (cloud)',
    description: 'Largest Qwen3.5 cloud variant — strong instruction following and prose',
  },
  {
    id: 'gemma4:31b-cloud',
    label: 'Gemma 4 31B (cloud)',
    description: 'Dense 31B with thinking modes; excellent reasoning and clarity',
  },
  {
    id: 'kimi-k2.5:cloud',
    label: 'Kimi K2.5 (cloud)',
    description: 'Conversational + thinking modes; great narrative flow, 256K context',
  },
  {
    id: 'gpt-oss:120b-cloud',
    label: 'gpt-oss 120B (cloud)',
    description: 'OpenAI open-weight; configurable reasoning depth for structured long output',
  },
  {
    id: 'deepseek-v3.1:671b-cloud',
    label: 'DeepSeek V3.1 671B (cloud)',
    description: 'Top-tier reasoning and agent-style planning; 160K context',
  },
  {
    id: 'qwen3-coder:480b-cloud',
    label: 'Qwen3 Coder 480B (cloud)',
    description: 'Largest Qwen3 Coder cloud variant — strong instruction following and prose',
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
export type Platform = 'X' | 'LinkedIn';

export type Pillar =
  | 'manual-processes-revenue-leaks'
  | 'automation-survival'
  | 'systems-work-while-sleep';

export interface KnowledgeChunk {
  id: string;
  content: string;
  metadata: {
    source: 'postGeneration' | 'desireFramework' | 'profileContext' | 'backendEngineering';
    category: 'pillar' | 'postType' | 'style' | 'framework' | 'example' | 'hook' | 'profile' | 'technical';
    subcategory?: string;
    pillar?: string;
    postType?: string;
    keywords?: string[];
    importance?: 'critical' | 'high' | 'medium' | 'low';
  };
  embedding?: number[];
  category?: string;
  importance?: 'critical' | 'high' | 'medium' | 'low';
}

export interface PostGenerationRequest {
  platform: Platform;
  context?: {
    topic?: string;
    trendingTopic?: string;
    technicalConcept?: string;
  };
}

export interface PostGenerationResponse {
  content: string;
  metadata: {
    platform: Platform;
    characterCount: number;
    hookType: string;
  };
}

export interface RAGSearchResult {
  id: string;
  score: number;
  content: string;
  metadata: any;
}
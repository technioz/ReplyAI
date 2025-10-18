// Post Generation Types
// Completely separate from existing reply generation types

export type PostType = 
  | 'value-bomb-thread'
  | 'client-story-thread'
  | 'contrarian-take'
  | 'pattern-recognition'
  | 'personal-journey'
  | 'engagement-question'
  | 'educational-deep-dive';

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
    pillar?: Pillar;
    postType?: PostType;
    keywords?: string[];
    importance?: 'critical' | 'high' | 'medium' | 'low';
  };
  embedding?: number[];
  category?: string; // For backward compatibility
  importance?: 'critical' | 'high' | 'medium' | 'low'; // For backward compatibility
}

export interface PostGenerationRequest {
  postType: PostType;
  platform: Platform;
  context?: {
    topic?: string;
    trendingTopic?: string;
    redditProblem?: string;
    technicalConcept?: string;
  };
}

export interface PostGenerationResponse {
  content: string;
  metadata: {
    postType: PostType;
    pillar: Pillar;
    platform: Platform;
    characterCount: number;
    tweetCount?: number;
    estimatedEngagement: string;
    hookType: string;
  };
}

export interface RAGSearchResult {
  id: string;
  score: number;
  content: string;
  metadata: any;
}


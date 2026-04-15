export type ContentFormat = 'post' | 'article' | 'thread' | 'both';

export interface ContentIdea {
  id: string;
  title: string;
  hook: string;
  angle: string;
  format: ContentFormat;
  platform: ('X' | 'LinkedIn')[];
  urgency: 'viral' | 'timely' | 'evergreen';
  topicTag: string;
  reasoning: string;
}

export interface ContentIdeaRequest {
  platform?: 'X' | 'LinkedIn';
  focusArea?: string;
}

export interface ContentIdeaResponse {
  ideas: ContentIdea[];
  profileUsed: boolean;
  trendingTopicsUsed: boolean;
}

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
import { Platform } from './types';

export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

export interface BraveLLMContextResponse {
  grounding?: {
    [key: string]: {
      [url: string]: {
        title?: string;
        snippets?: string[];
      };
    };
  };
  sources?: Record<string, {
    title?: string;
  }>;
}

export class BraveSearchService {
  private apiKey: string;
  private baseUrl: string = 'https://api.search.brave.com/res/v1/llm/context';

  constructor() {
    const key = process.env.BRAVE_SEARCH_API_KEY;
    if (!key) {
      console.warn('[BraveSearch] BRAVE_SEARCH_API_KEY not set. Topic context will not be available.');
    }
    this.apiKey = key || '';
  }

  isEnabled(): boolean {
    return this.apiKey.length > 0;
  }

  async fetchTopicContext(
    topic: string,
    platform: Platform
  ): Promise<string | null> {
    if (!this.apiKey) {
      console.log('[BraveSearch] No API key configured, skipping context fetch');
      return null;
    }

    try {
      const query = this.buildSearchQuery(topic, platform);

      const params = new URLSearchParams({
        q: query,
        count: '10',
        maximum_number_of_urls: '5',
        maximum_number_of_tokens: '4096',
        search_lang: 'en',
      });

      console.log(`[BraveSearch] Fetching context for: "${query}"`);

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
          'User-Agent': 'Quirkly-PostGen/1.0.0',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`[BraveSearch] API error: ${response.status}`, errorData);
        return null;
      }

      const data = await response.json() as BraveLLMContextResponse;
      const context = this.parseContext(data);

      if (context) {
        console.log(`[BraveSearch] Retrieved context (${context.length} chars)`);
      } else {
        console.log('[BraveSearch] No context returned from API');
      }

      return context;
    } catch (error) {
      console.error('[BraveSearch] Error fetching topic context:', error);
      return null;
    }
  }

  private buildSearchQuery(topic: string, platform: Platform): string {
    const platformHint = platform === 'X' ? 'twitter' : 'linkedin';
    return `${topic} ${platformHint} post ideas recent insights`;
  }

  private parseContext(data: BraveLLMContextResponse): string | null {
    const sections: string[] = [];

    if (data.grounding) {
      for (const [, entries] of Object.entries(data.grounding)) {
        for (const [url, entry] of Object.entries(entries)) {
          if (entry?.snippets && entry.snippets.length > 0) {
            const title = entry.title || url;
            sections.push(`### ${title}\n${entry.snippets.join('\n')}`);
          }
        }
      }
    }

    if (sections.length === 0) {
      return null;
    }

    return sections.join('\n\n');
  }
}
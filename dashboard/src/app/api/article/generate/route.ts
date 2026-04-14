import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { AppError, handleApiError } from '@/lib/errors';
import { ArticleGenerationService } from '@/lib/article-generation/articleGenerationService';
import { ArticleTone, ArticleLength, WriterProfile } from '@/lib/article-generation/types';
import { getAllowedArticleModelIds } from '@/lib/article-generation/articleLlmConfig';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await validateApiKey(request);

    const body = await request.json();
    const { topic, tone, length, includeSEO, model } = body;

    if (!tone || !['authoritative', 'conversational', 'contrarian', 'storytelling'].includes(tone)) {
      throw AppError.validationError('Invalid tone. Must be: authoritative, conversational, contrarian, or storytelling');
    }

    if (!length || !['short', 'medium', 'long'].includes(length)) {
      throw AppError.validationError('Invalid length. Must be: short, medium, or long');
    }

    const validModelIds = getAllowedArticleModelIds();
    if (!model || !validModelIds.includes(model)) {
      throw AppError.validationError(`Invalid model. Must be one of: ${validModelIds.join(', ')}`);
    }

    if (topic && typeof topic !== 'string') {
      throw AppError.validationError('Topic must be a string');
    }

    if (topic && topic.length > 500) {
      throw AppError.validationError('Topic must be under 500 characters');
    }

    const seoEnabled = typeof includeSEO === 'boolean' ? includeSEO : true;

    const dbUser = await User.findById(user.id);
    if (!dbUser) {
      throw AppError.notFound('User not found');
    }

    const CREDITS_REQUIRED = 10;
    if (dbUser.credits.available < CREDITS_REQUIRED) {
      throw AppError.creditsExhausted(`Need ${CREDITS_REQUIRED} credits. You have ${dbUser.credits.available}`);
    }

    const writerProfile = buildWriterProfile(dbUser);

    const articleService = new ArticleGenerationService();

    console.log(`[ArticleGenerate] Starting 3-step generation: model=${model}, tone=${tone}, length=${length}, topic=${topic || '(auto)'}, hasWriterProfile=${!!writerProfile}`);

    const result = await articleService.generateArticle(
      topic || undefined,
      tone as ArticleTone,
      length as ArticleLength,
      seoEnabled,
      model,
      writerProfile
    );

    const metadata = articleService.extractMetadata(
      result.content,
      tone as ArticleTone,
      length as ArticleLength,
      result.modelUsed,
      seoEnabled,
      result.brief,
      result.draft,
      result.final
    );

    await dbUser.useCredits(CREDITS_REQUIRED);

    console.log(`[ArticleGenerate] Complete. Final word count: ${metadata.wordCount}, credits used: ${CREDITS_REQUIRED}`);

    return NextResponse.json({
      success: true,
      data: {
        content: result.content,
        metadata: {
          ...metadata,
          creditsUsed: CREDITS_REQUIRED,
          creditsRemaining: dbUser.credits.available
        }
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}

function buildWriterProfile(dbUser: any): WriterProfile | undefined {
  const pd = dbUser.profileData;
  if (!pd || !pd.isActive) return undefined;

  return {
    handle: pd.xHandle || undefined,
    displayName: pd.displayName || undefined,
    bio: pd.bio || undefined,
    expertise: pd.expertise ? {
      domains: pd.expertise.domains || [],
      keywords: pd.expertise.keywords || [],
      topics: pd.expertise.topics || [],
    } : undefined,
    toneAnalysis: pd.toneAnalysis ? {
      primaryTone: pd.toneAnalysis.primaryTone || undefined,
      secondaryTones: pd.toneAnalysis.secondaryTones || [],
      vocabulary: pd.toneAnalysis.vocabulary || [],
      avgTweetLength: pd.toneAnalysis.avgTweetLength || undefined,
    } : undefined,
    writingSamples: (pd.privacy?.includeTweets && pd.recentTweets?.length > 0)
      ? pd.recentTweets.slice(0, 5).map((t: any) => t.content).filter(Boolean)
      : undefined,
  };
}
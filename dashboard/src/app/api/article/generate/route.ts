import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { AppError, handleApiError } from '@/lib/errors';
import { ArticleGenerationService } from '@/lib/article-generation/articleGenerationService';
import { ArticleTone, ArticleLength, OLLAMA_CLOUD_MODELS } from '@/lib/article-generation/types';
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

    const validModelIds = OLLAMA_CLOUD_MODELS.map(m => m.id);
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

    const articleService = new ArticleGenerationService();

    console.log(`[ArticleGenerate] Starting 3-step generation: model=${model}, tone=${tone}, length=${length}, topic=${topic || '(auto)'}`);

    const result = await articleService.generateArticle(
      topic || undefined,
      tone as ArticleTone,
      length as ArticleLength,
      seoEnabled,
      model
    );

    const metadata = articleService.extractMetadata(
      result.content,
      tone as ArticleTone,
      length as ArticleLength,
      model,
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
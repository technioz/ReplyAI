import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { AppError, handleApiError } from '@/lib/errors';
import { ArticleGenerationAIAdapter } from '@/lib/article-generation/aiAdapter';
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

    const aiAdapter = new ArticleGenerationAIAdapter();
    const articleService = new ArticleGenerationService();

    const { systemPrompt, userPrompt } = await articleService.prepareArticle(
      topic || undefined,
      tone as ArticleTone,
      length as ArticleLength,
      seoEnabled
    );

    console.log(`📝 Generating article with model: ${model}, tone: ${tone}, length: ${length}`);
    const generatedContent = await aiAdapter.generateContent(systemPrompt, userPrompt, model);

    const metadata = articleService.extractMetadata(
      generatedContent,
      tone as ArticleTone,
      length as ArticleLength,
      model,
      seoEnabled
    );

    await dbUser.useCredits(CREDITS_REQUIRED);

    return NextResponse.json({
      success: true,
      data: {
        content: generatedContent,
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
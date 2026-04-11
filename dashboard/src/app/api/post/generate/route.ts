import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { AppError, handleApiError } from '@/lib/errors';
import { PostGenerationAIAdapter } from '@/lib/post-generation/aiAdapter';
import { PostGenerationService } from '@/lib/post-generation/postGenerationService';
import { Platform } from '@/lib/post-generation/types';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await validateApiKey(request);

    const body = await request.json();
    const { platform, context } = body;

    if (!platform || !['X', 'LinkedIn'].includes(platform)) {
      throw AppError.validationError('Invalid platform. Must be X or LinkedIn');
    }

    const dbUser = await User.findById(user.id);
    if (!dbUser) {
      throw AppError.notFound('User not found');
    }

    const CREDITS_REQUIRED = 5;
    if (dbUser.credits.available < CREDITS_REQUIRED) {
      throw AppError.creditsExhausted(`Need ${CREDITS_REQUIRED} credits. You have ${dbUser.credits.available}`);
    }

    const aiAdapter = new PostGenerationAIAdapter();
    const postService = new PostGenerationService();

    const { systemPrompt, userPrompt } = await postService.prepareGeneration({
      platform: platform as Platform,
      context
    });

    console.log('🤖 Generating post content...');
    const generatedContent = await aiAdapter.generateContent(systemPrompt, userPrompt);

    const validation = postService.validateContent(generatedContent);
    if (!validation.isValid) {
      console.warn('⚠️ Content validation issues:', validation.issues);
    }

    const metadata = postService.extractMetadata(generatedContent, platform as Platform);

    await dbUser.useCredits(CREDITS_REQUIRED);

    return NextResponse.json({
      success: true,
      data: {
        content: generatedContent,
        metadata: {
          ...metadata,
          validationIssues: validation.issues
        },
        creditsUsed: CREDITS_REQUIRED,
        creditsRemaining: dbUser.credits.available
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}
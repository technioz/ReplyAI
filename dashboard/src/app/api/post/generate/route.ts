// Post Generation API Endpoint
// Separate from existing reply generation API

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { AppError, handleApiError } from '@/lib/errors';
import { PostGenerationAIAdapter } from '@/lib/post-generation/aiAdapter';
import { PostGenerationService } from '@/lib/post-generation/postGenerationService';
import { PostType, Platform } from '@/lib/post-generation/types';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await validateApiKey(request);

    const body = await request.json();
    const { postType, platform, context } = body;

    const validPostTypes: PostType[] = [
      'value-bomb-thread',
      'client-story-thread',
      'contrarian-take',
      'pattern-recognition',
      'personal-journey',
      'engagement-question',
      'educational-deep-dive'
    ];

    if (!postType || !validPostTypes.includes(postType as PostType)) {
      throw AppError.validationError('Invalid post type. Must be one of: ' + validPostTypes.join(', '));
    }

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

    // Step 1: Initialize services
    const aiAdapter = new PostGenerationAIAdapter();
    const postService = new PostGenerationService();

    // Step 2: Prepare generation with RAG context and prompts
    console.log(`🔍 Preparing generation for ${postType}...`);
    const { systemPrompt, userPrompt, ragContext } = await postService.prepareGeneration({
      postType: postType as PostType,
      platform: platform as Platform,
      context
    });

    // Step 4: Generate content using AI
    console.log('🤖 Generating post content...');
    const generatedContent = await aiAdapter.generateContent(systemPrompt, userPrompt);

    // Step 5: Validate content quality
    console.log('✅ Validating content quality...');
    const validation = postService.validateContent(generatedContent, postType as PostType);
    
    if (!validation.isValid) {
      console.warn('⚠️ Content validation issues:', validation.issues);
      // Still return but include warnings
    }

    // Step 6: Extract metadata
    const metadata = postService.extractMetadata(
      generatedContent,
      postType as PostType,
      platform as Platform
    );

    // Step 7: Deduct credits
    await dbUser.useCredits(CREDITS_REQUIRED);

    // Step 8: Return response
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

// GET endpoint to list available post types
export async function GET(request: NextRequest) {
  try {
    await validateApiKey(request);

    const postTypes = [
      {
        id: 'value-bomb-thread',
        name: 'Value Bomb Thread',
        description: 'Educational thread packed with actionable insights (5-10 tweets)',
        icon: '💣',
        estimatedTime: '2-3 min',
        creditCost: 5
      },
      {
        id: 'client-story-thread',
        name: 'Client Success Story',
        description: 'Transformation narrative with real results (6-8 tweets)',
        icon: '📈',
        estimatedTime: '1-2 min',
        creditCost: 5
      },
      {
        id: 'contrarian-take',
        name: 'Contrarian Take',
        description: 'Challenge common beliefs (1-3 sentences)',
        icon: '⚡',
        estimatedTime: '30 sec',
        creditCost: 5
      },
      {
        id: 'pattern-recognition',
        name: 'Pattern Recognition',
        description: 'Show expertise through identifying patterns (4-6 sentences)',
        icon: '🔍',
        estimatedTime: '1 min',
        creditCost: 5
      },
      {
        id: 'personal-journey',
        name: 'War Story',
        description: 'Personal experience and lessons learned (5-7 sentences)',
        icon: '⚔️',
        estimatedTime: '1-2 min',
        creditCost: 5
      },
      {
        id: 'engagement-question',
        name: 'Engagement Question',
        description: 'Spark conversation and build community (2-4 sentences)',
        icon: '❓',
        estimatedTime: '30 sec',
        creditCost: 5
      },
      {
        id: 'educational-deep-dive',
        name: 'Educational Thread',
        description: 'Deep technical teaching with examples (8-10 tweets)',
        icon: '📚',
        estimatedTime: '3-4 min',
        creditCost: 5
      }
    ];

    return NextResponse.json({
      success: true,
      data: { postTypes }
    });

  } catch (error) {
    return handleApiError(error);
  }
}


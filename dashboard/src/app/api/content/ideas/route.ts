import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { AppError, handleApiError } from '@/lib/errors';
import { ContentIdeaService } from '@/lib/content-ideas/contentIdeaService';
import { WriterProfile } from '@/lib/content-ideas/types';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const user = await validateApiKey(request);

    const body = await request.json();
    const { platform, focusArea } = body;

    if (platform && !['X', 'LinkedIn'].includes(platform)) {
      throw AppError.validationError('Invalid platform. Must be X or LinkedIn');
    }

    if (focusArea && typeof focusArea !== 'string') {
      throw AppError.validationError('focusArea must be a string');
    }

    if (focusArea && focusArea.length > 200) {
      throw AppError.validationError('focusArea must be under 200 characters');
    }

    const dbUser = await User.findById(user.id);
    if (!dbUser) {
      throw AppError.notFound('User not found');
    }

    const CREDITS_REQUIRED = 2;
    if (dbUser.credits.available < CREDITS_REQUIRED) {
      throw AppError.creditsExhausted(`Need ${CREDITS_REQUIRED} credits. You have ${dbUser.credits.available}`);
    }

    const writerProfile = buildWriterProfile(dbUser);

    const ideaService = new ContentIdeaService();

    console.log(`[ContentIdeas] Generating ideas: platform=${platform || 'any'}, focusArea=${focusArea || '(none)'}, hasProfile=${!!writerProfile}`);

    const result = await ideaService.generateIdeas(
      { platform, focusArea },
      writerProfile
    );

    await dbUser.useCredits(CREDITS_REQUIRED);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        creditsUsed: CREDITS_REQUIRED,
        creditsRemaining: dbUser.credits.available,
      },
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
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = params;

    // Users can only access their own profile context
    if (user.id !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Can only access your own profile context' 
      }, { status: 403 });
    }

    // Get user with profile data
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Return empty context if no profile data
    if (!currentUser.profileData || !currentUser.profileData.isActive) {
      return NextResponse.json({
        success: true,
        hasContext: false,
        context: null,
        message: 'No active profile context available'
      });
    }

    const profileData = currentUser.profileData;

    // Build LLM context based on privacy settings
    const context = buildLLMContext(profileData);

    return NextResponse.json({
      success: true,
      hasContext: true,
      context: context,
      lastUpdated: profileData.lastUpdated
    });

  } catch (error) {
    console.error('Profile context error:', error);
    return handleApiError(error);
  }
}

function buildLLMContext(profileData: any) {
  try {
    const context = {
      // Basic profile information (always safe to include)
      userProfile: {
        handle: profileData.xHandle,
        displayName: profileData.displayName,
        bio: profileData.bio || '',
        verified: profileData.verified,
        expertise: {
          domains: profileData.expertise?.domains || [],
          keywords: profileData.expertise?.keywords || [],
          topics: profileData.expertise?.topics || []
        },
        tone: {
          primaryTone: profileData.toneAnalysis?.primaryTone || 'professional',
          secondaryTones: profileData.toneAnalysis?.secondaryTones || [],
          characteristics: [],
          avgTweetLength: profileData.toneAnalysis?.avgTweetLength || 0
        }
      },
      
      // Writing style guidance
      writingStyle: {
        preferredLength: getPreferredLength(profileData.toneAnalysis?.avgTweetLength || 0),
        toneGuidance: getToneGuidance(profileData.toneAnalysis),
        expertiseGuidance: getExpertiseGuidance(profileData.expertise)
      },

      // Context for reply generation
      replyContext: {
        shouldMatchTone: true,
        shouldIncludeExpertise: true,
        maxLength: 280,
        includePersonalTouch: true
      }
    };

    // Add tweet examples if privacy allows
    if (profileData.privacy?.includeTweets && profileData.recentTweets?.length > 0) {
      context.userProfile.recentTweets = profileData.recentTweets
        .slice(0, 3) // Only include 3 most recent tweets
        .map((tweet: any) => ({
          content: tweet.content,
          engagement: tweet.engagement
        }));
    }

    return context;
  } catch (error) {
    console.error('Error building LLM context:', error);
    return null;
  }
}

function getPreferredLength(avgTweetLength: number) {
  if (avgTweetLength < 50) {
    return 'concise';
  } else if (avgTweetLength > 200) {
    return 'detailed';
  } else {
    return 'balanced';
  }
}

function getToneGuidance(toneAnalysis: any) {
  const guidance = {
    primary: toneAnalysis?.primaryTone || 'professional',
    characteristics: [],
    tips: []
  };

  if (toneAnalysis?.secondaryTones) {
    guidance.characteristics = toneAnalysis.secondaryTones;
    
    // Add specific tips based on tone
    if (toneAnalysis.secondaryTones.includes('humorous')) {
      guidance.tips.push('Use appropriate humor and wit in responses');
    }
    if (toneAnalysis.secondaryTones.includes('enthusiastic')) {
      guidance.tips.push('Maintain energetic and positive tone');
    }
    if (toneAnalysis.secondaryTones.includes('casual')) {
      guidance.tips.push('Keep language relaxed and conversational');
    }
    if (toneAnalysis.secondaryTones.includes('concise')) {
      guidance.tips.push('Keep responses brief and to the point');
    }
  }

  return guidance;
}

function getExpertiseGuidance(expertise: any) {
  const guidance = {
    domains: expertise?.domains || [],
    keywords: expertise?.keywords || [],
    topics: expertise?.topics || [],
    suggestions: []
  };

  // Add expertise-based suggestions
  if (guidance.domains.includes('technology')) {
    guidance.suggestions.push('Reference relevant tech concepts when appropriate');
  }
  if (guidance.domains.includes('business')) {
    guidance.suggestions.push('Include business insights and strategic thinking');
  }
  if (guidance.domains.includes('finance')) {
    guidance.suggestions.push('Provide financial context and market insights');
  }

  return guidance;
}

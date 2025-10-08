import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import { handleApiError } from '@/lib/errors';
import { validateApiKey } from '@/lib/middleware/auth';
import User from '@/lib/models/User';
import { AIServiceFactory } from '@/lib/ai/AIServiceFactory';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Extension-Version',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// AI Service Integration - Now supports both Groq and XAI
// The GroqService class has been moved to /lib/ai/GroqService.ts
// The XAIService class is available at /lib/ai/XAIService.ts
// Use AIServiceFactory.createService() to get the appropriate service based on AI_PROVIDER env var

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    const { 
      tweetText, 
      tone = 'professional', 
      userContext,
      timestamp,
      source = 'unknown'
    } = await request.json();

    // Validate required fields
    if (!tweetText || !tweetText.trim()) {
      throw new Error('Tweet text is required');
    }

    if (tweetText.length > 5000) {
      throw new Error('Tweet text is too long (max 5000 characters)');
    }

    // Validate tone
    const validTones = ['professional', 'casual', 'humorous', 'empathetic', 'analytical', 'enthusiastic', 'controversial'];
    if (!validTones.includes(tone)) {
      throw new Error(`Invalid tone. Must be one of: ${validTones.join(', ')}`);
    }

    // Authenticate user using JWT (stateless - no database lookup)
    let user = null;
    let isFreeUser = false;
    
    try {
      // Try to get user from JWT token
      const validatedUser = await validateApiKey(request);
      if (validatedUser) {
        user = validatedUser;
        isFreeUser = false;
        console.log(`✅ JWT auth successful for user: ${user.email}`);
      } else {
        isFreeUser = true;
      }
    } catch (error) {
      console.log('JWT authentication failed, treating as free user:', error);
      isFreeUser = true;
    }

    try {
      // Get profile context if user is authenticated
      let profileContext = null;
      if (user && !isFreeUser) {
        try {
          console.log(`🔍 Loading profile context for user: ${user.email}`);
          
          // Make internal API call to get profile context
          const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/profile/${user.id}/context`, {
            headers: {
              'Authorization': request.headers.get('Authorization') || '',
              'Content-Type': 'application/json'
            }
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.success && profileData.hasContext) {
              profileContext = profileData.context;
              console.log(`✅ Profile context loaded:`, {
                hasProfile: !!profileContext?.userProfile,
                expertise: profileContext?.userProfile?.expertise?.domains?.length || 0,
                tone: profileContext?.userProfile?.tone?.primaryTone,
                handle: profileContext?.userProfile?.handle
              });
            } else {
              console.log(`ℹ️ No profile context available for user: ${user.email}`);
            }
          } else {
            console.log(`⚠️ Failed to load profile context: ${profileResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Error loading profile context:', error.message);
          // Continue without profile context
        }
      }

      // Generate reply using AI service with profile context
      const aiService = AIServiceFactory.createService();
      const enhancedUserContext = {
        ...userContext,
        profileContext
      };
      
      console.log(`🤖 Generating reply with context:`, {
        hasProfileContext: !!profileContext,
        tone: tone,
        originalContext: !!userContext
      });
      
      const aiResult = await aiService.generateReply(tweetText.trim(), tone, enhancedUserContext);

      // Check credits if user is authenticated (from JWT payload)
      if (user && !isFreeUser) {
        // Check if user has enough credits (from JWT payload)
        if (user.credits.available < 1) {
          return NextResponse.json({ 
            success: false, 
            error: 'CREDITS_EXHAUSTED',
            message: 'Insufficient credits available. Please upgrade your plan or wait for credit reset.' 
          }, { status: 402 });
        }
        
        console.log(`✅ Credit check passed: ${user.email} (credits remaining: ${user.credits.available})`);
      }

      // Prepare response
      const response: any = {
        success: true,
        reply: aiResult.reply,
        tone: tone,
        metadata: {
          originalTweetLength: tweetText.length,
          replyLength: aiResult.reply.length,
          maxReplyLength: 280,
          processingTime: aiResult.processingTime || null,
          source: source,
          timestamp: new Date().toISOString(),
          model: AIServiceFactory.getCurrentProvider() === 'xai' 
            ? (process.env.XAI_MODEL || 'grok-3')
            : (process.env.GROQ_MODEL || 'llama3-8b-8192'),
          provider: AIServiceFactory.getCurrentProvider()
        }
      };

      // Add user-specific info if authenticated
      if (user) {
        response.user = {
          id: user.id,
          email: user.email,
          credits: {
            available: user.credits.available,
            used: user.credits.used,
            total: user.credits.total
          },
          hasActiveSubscription: user.hasActiveSubscription
        };
      } else if (isFreeUser) {
        // Add free user info
        const freeCreditsLimit = parseInt(process.env.FREE_CREDITS_LIMIT || '50');
        response.freeUser = {
          creditsUsed: 0, // Free users don't have a fixed daily limit, so this will be 0
          creditsRemaining: Math.max(0, freeCreditsLimit - 0), // 0 credits used for free users
          message: 'Free tier - limited features available'
        };
      }

      return NextResponse.json(response);

    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Handle specific AI service errors
      if (aiError instanceof Error) {
        if (aiError.message.includes('API key')) {
          return NextResponse.json({ 
            success: false, 
            error: 'AI_SERVICE_ERROR',
            message: 'AI service configuration error. Please contact support.' 
          }, { status: 500 });
        }
        
        if (aiError.message.includes('rate limit') || aiError.message.includes('quota')) {
          return NextResponse.json({ 
            success: false, 
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'AI service rate limit exceeded. Please try again later.' 
          }, { status: 429 });
        }
      }
      
      throw aiError;
    }

  } catch (error) {
    console.error('Reply generation error:', error);
    return handleApiError(error);
  }
}
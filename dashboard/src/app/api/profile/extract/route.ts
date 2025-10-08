import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

// Import validateApiKey function from reply generation route
async function validateApiKey(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!apiKey || apiKey.length < 10) {
      return null;
    }

    // Find user by API key
    const user = await User.findByApiKey(apiKey);
    if (!user || user.status !== 'active') {
      return null;
    }

    return user;
  } catch (error) {
    console.error('API key validation error:', error);
    return null;
  }
}

// Profile data interface
interface XProfileData {
  xHandle: string;
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  joinDate?: string;
  followerCount: number;
  followingCount: number;
  verified: boolean;
  profileImageUrl?: string;
  pinnedTweet?: {
    content: string;
    createdAt: string;
  };
  recentTweets: Array<{
    content: string;
    createdAt: string;
    engagement: number;
  }>;
  extractedAt: string;
  pageUrl: string;
}

// Enhanced profile data with analysis
interface EnhancedProfileData extends XProfileData {
  toneAnalysis: {
    primaryTone: string;
    secondaryTones: string[];
    vocabulary: string[];
    avgTweetLength: number;
  };
  expertise: {
    domains: string[];
    keywords: string[];
    topics: string[];
  };
  privacy: {
    extractPublicData: boolean;
    includeTweets: boolean;
    includeEngagement: boolean;
  };
  isActive: boolean;
  lastUpdated: string;
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Use API key authentication (same as reply generation)
    const user = await validateApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { profileData, userId } = body;

    if (!profileData || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing profile data or user ID' 
      }, { status: 400 });
    }

    // Validate that the user can only update their own profile
    if (user.id.toString() !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Can only update your own profile' 
      }, { status: 403 });
    }

    // Use the user from validateApiKey (already fetched from database)
    const currentUser = user;

    // Process and enhance profile data
    const enhancedProfile = await processProfileData(profileData as XProfileData);

    // Store or update profile data in user document
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      {
        $set: {
          'profileData': enhancedProfile,
          'profileExtractedAt': new Date(),
          'updatedAt': new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update profile data' 
      }, { status: 500 });
    }

    console.log(`✅ Profile data stored for user ${currentUser.email}:`, {
      xHandle: enhancedProfile.xHandle,
      displayName: enhancedProfile.displayName,
      expertiseKeywords: enhancedProfile.expertise.keywords.length,
      recentTweets: enhancedProfile.recentTweets.length
    });

    return NextResponse.json({
      success: true,
      message: 'Profile data stored successfully',
      profileData: {
        xHandle: enhancedProfile.xHandle,
        displayName: enhancedProfile.displayName,
        bio: enhancedProfile.bio,
        expertise: enhancedProfile.expertise,
        toneAnalysis: enhancedProfile.toneAnalysis,
        extractedAt: enhancedProfile.extractedAt
      }
    });

  } catch (error) {
    console.error('Profile extraction error:', error);
    return handleApiError(error);
  }
}

async function processProfileData(profileData: XProfileData): Promise<EnhancedProfileData> {
  try {
    // Analyze tone from tweets and bio
    const toneAnalysis = analyzeTone(profileData);
    
    // Extract expertise from bio and tweets
    const expertise = extractExpertise(profileData);
    
    // Determine privacy settings (default to conservative)
    const privacy = {
      extractPublicData: true,
      includeTweets: profileData.recentTweets.length <= 10, // Only include if limited tweets
      includeEngagement: true
    };

    const enhancedProfile: EnhancedProfileData = {
      ...profileData,
      toneAnalysis,
      expertise,
      privacy,
      isActive: true,
      lastUpdated: new Date().toISOString()
    };

    return enhancedProfile;
  } catch (error) {
    console.error('Error processing profile data:', error);
    throw new Error('Failed to process profile data');
  }
}

function analyzeTone(profileData: XProfileData) {
  try {
    const toneAnalysis = {
      primaryTone: 'professional',
      secondaryTones: [],
      vocabulary: [],
      avgTweetLength: 0
    };

    // Analyze bio tone
    if (profileData.bio) {
      const bioText = profileData.bio.toLowerCase();
      
      if (bioText.includes('fun') || bioText.includes('humor') || bioText.includes('joke')) {
        toneAnalysis.secondaryTones.push('humorous');
      }
      if (bioText.includes('passionate') || bioText.includes('love')) {
        toneAnalysis.secondaryTones.push('passionate');
      }
      if (bioText.includes('thoughtful') || bioText.includes('deep')) {
        toneAnalysis.secondaryTones.push('thoughtful');
      }
      if (bioText.includes('casual') || bioText.includes('chill')) {
        toneAnalysis.secondaryTones.push('casual');
      }
    }

    // Analyze recent tweets
    if (profileData.recentTweets && profileData.recentTweets.length > 0) {
      const tweets = profileData.recentTweets;
      
      // Calculate average tweet length
      const totalLength = tweets.reduce((sum, tweet) => sum + tweet.content.length, 0);
      toneAnalysis.avgTweetLength = Math.round(totalLength / tweets.length);

      // Analyze tweet characteristics
      const allTweetText = tweets.map(tweet => tweet.content.toLowerCase()).join(' ');
      
      if (allTweetText.includes('lol') || allTweetText.includes('haha') || allTweetText.includes('😂')) {
        toneAnalysis.secondaryTones.push('humorous');
      }
      
      if (allTweetText.includes('!') && (allTweetText.split('!').length - 1) > tweets.length * 0.3) {
        toneAnalysis.secondaryTones.push('enthusiastic');
      }
      
      if (toneAnalysis.avgTweetLength < 50) {
        toneAnalysis.secondaryTones.push('concise');
      } else if (toneAnalysis.avgTweetLength > 200) {
        toneAnalysis.secondaryTones.push('detailed');
      }

      // Extract common vocabulary
      const words = allTweetText.split(/\s+/).filter(word => word.length > 3);
      const wordFreq: { [key: string]: number } = {};
      
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      toneAnalysis.vocabulary = Object.keys(wordFreq)
        .sort((a, b) => wordFreq[b] - wordFreq[a])
        .slice(0, 20); // Top 20 most used words
    }

    // Determine primary tone
    if (toneAnalysis.secondaryTones.includes('humorous')) {
      toneAnalysis.primaryTone = 'humorous';
    } else if (toneAnalysis.secondaryTones.includes('enthusiastic')) {
      toneAnalysis.primaryTone = 'enthusiastic';
    } else if (toneAnalysis.secondaryTones.includes('casual')) {
      toneAnalysis.primaryTone = 'casual';
    }

    // Remove duplicates from secondary tones
    toneAnalysis.secondaryTones = [...new Set(toneAnalysis.secondaryTones)];

    return toneAnalysis;
  } catch (error) {
    console.error('Error analyzing tone:', error);
    return {
      primaryTone: 'professional',
      secondaryTones: [],
      vocabulary: [],
      avgTweetLength: 0
    };
  }
}

function extractExpertise(profileData: XProfileData) {
  try {
    const expertise = {
      domains: [],
      keywords: [],
      topics: []
    };

    const textToAnalyze = [
      profileData.bio || '',
      ...(profileData.recentTweets?.map(tweet => tweet.content) || [])
    ].join(' ').toLowerCase();

    // Common expertise keywords
    const expertiseKeywords = [
      // Tech roles
      'developer', 'engineer', 'programmer', 'coder', 'software', 'frontend', 'backend', 'fullstack',
      'devops', 'sre', 'data scientist', 'analyst', 'architect', 'cto', 'cpo', 'cfo',
      
      // Design roles
      'designer', 'ui/ux', 'graphic designer', 'product designer', 'creative director',
      
      // Business roles
      'entrepreneur', 'founder', 'ceo', 'startup', 'marketer', 'marketing', 'sales', 'growth',
      'product manager', 'project manager', 'consultant', 'advisor', 'investor', 'vc',
      
      // Industries
      'fintech', 'healthtech', 'edtech', 'agtech', 'cleantech', 'biotech', 'medtech',
      'saas', 'b2b', 'b2c', 'ecommerce', 'retail', 'fashion', 'food', 'travel',
      
      // Technologies
      'ai', 'artificial intelligence', 'machine learning', 'ml', 'blockchain', 'crypto',
      'web3', 'defi', 'nft', 'metaverse', 'ar', 'vr', 'iot', 'cloud', 'aws', 'azure',
      
      // Skills
      'javascript', 'python', 'react', 'node', 'typescript', 'java', 'go', 'rust',
      'sql', 'nosql', 'mongodb', 'postgresql', 'redis', 'docker', 'kubernetes'
    ];

    // Check for expertise keywords
    expertiseKeywords.forEach(keyword => {
      if (textToAnalyze.includes(keyword)) {
        expertise.keywords.push(keyword);
      }
    });

    // Extract hashtags as topics
    const hashtags = textToAnalyze.match(/#\w+/g);
    if (hashtags) {
      expertise.topics = [...new Set(hashtags.map(tag => tag.substring(1)))];
    }

    // Extract domains based on keywords
    const domainMap: { [key: string]: string[] } = {
      'technology': ['developer', 'engineer', 'software', 'tech', 'programming', 'coding'],
      'business': ['entrepreneur', 'founder', 'ceo', 'startup', 'business', 'marketing'],
      'finance': ['fintech', 'crypto', 'blockchain', 'defi', 'investor', 'finance'],
      'design': ['designer', 'ui/ux', 'creative', 'graphic', 'product design'],
      'data': ['data scientist', 'analyst', 'machine learning', 'ai', 'analytics']
    };

    Object.entries(domainMap).forEach(([domain, keywords]) => {
      const hasDomainKeywords = keywords.some(keyword => expertise.keywords.includes(keyword));
      if (hasDomainKeywords) {
        expertise.domains.push(domain);
      }
    });

    return expertise;
  } catch (error) {
    console.error('Error extracting expertise:', error);
    return {
      domains: [],
      keywords: [],
      topics: []
    };
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await validateApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const tone = searchParams.get('tone');
    
    // Get user's usage history
    let usageHistory = user.usage
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(offset, offset + limit);

    // Filter by tone if specified (Note: We don't store tone in usage history yet)
    if (tone) {
      // This would require updating the User model to store more detailed reply history
      console.log(`Tone filter requested: ${tone} (not yet implemented)`);
    }

    const totalReplies = user.usage.reduce((total, day) => total + day.repliesGenerated, 0);

    return NextResponse.json({
      success: true,
      history: usageHistory.map(usage => ({
        date: usage.date,
        creditsUsed: usage.creditsUsed,
        repliesGenerated: usage.repliesGenerated,
        month: usage.month,
        year: usage.year
      })),
      pagination: {
        limit: limit,
        offset: offset,
        total: user.usage.length,
        hasMore: offset + limit < user.usage.length
      },
      summary: {
        totalReplies,
        totalCreditsUsed: user.credits.used,
        accountAge: Math.ceil((new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user with fresh data
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get activity data
    const activityData = currentUser.usage
      .filter(usage => usage.date >= startDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(usage => ({
        date: usage.date,
        creditsUsed: usage.creditsUsed,
        repliesGenerated: usage.repliesGenerated,
        month: usage.month,
        year: usage.year
      }));

    // Calculate activity statistics
    const totalReplies = activityData.reduce((sum, day) => sum + day.repliesGenerated, 0);
    const totalCredits = activityData.reduce((sum, day) => sum + day.creditsUsed, 0);
    const activeDays = activityData.length;
    const averageRepliesPerDay = activeDays > 0 ? Math.round(totalReplies / activeDays * 100) / 100 : 0;

    return NextResponse.json({
      success: true,
      activity: {
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        },
        data: activityData,
        stats: {
          totalReplies,
          totalCredits,
          activeDays,
          averageRepliesPerDay
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

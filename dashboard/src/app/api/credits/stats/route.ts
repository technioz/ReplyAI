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

    // Get user with fresh data
    const currentUser = await User.findById(user._id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const limit = parseInt(searchParams.get('limit') || '30');
    
    let usageData = [];
    const now = new Date();
    
    if (period === 'day') {
      // Get daily usage for the last N days
      for (let i = limit - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const dayUsage = currentUser.usage.find(u => 
          u.date.toDateString() === date.toDateString()
        );
        
        usageData.push({
          date: date.toISOString().split('T')[0],
          creditsUsed: dayUsage ? dayUsage.creditsUsed : 0,
          repliesGenerated: dayUsage ? dayUsage.repliesGenerated : 0
        });
      }
    } else if (period === 'month') {
      // Get monthly usage for the last N months
      for (let i = limit - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const monthUsage = currentUser.usage.filter(u => u.month === monthKey);
        const creditsUsed = monthUsage.reduce((total, day) => total + day.creditsUsed, 0);
        const repliesGenerated = monthUsage.reduce((total, day) => total + day.repliesGenerated, 0);
        
        usageData.push({
          month: monthKey,
          creditsUsed,
          repliesGenerated,
          daysActive: monthUsage.length
        });
      }
    }

    // Calculate totals
    const totalCreditsUsed = usageData.reduce((total, item) => total + item.creditsUsed, 0);
    const totalRepliesGenerated = usageData.reduce((total, item) => total + item.repliesGenerated, 0);
    const accountAgeDays = Math.ceil((now.getTime() - currentUser.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const averageCreditsPerDay = accountAgeDays > 0 ? Math.round(totalCreditsUsed / accountAgeDays * 100) / 100 : 0;

    return NextResponse.json({
      success: true,
      stats: {
        period,
        limit,
        data: usageData,
        totals: {
          creditsUsed: totalCreditsUsed,
          repliesGenerated: totalRepliesGenerated,
          accountAgeDays,
          averageCreditsPerDay
        },
        current: {
          available: currentUser.credits.available,
          used: currentUser.credits.used,
          total: currentUser.credits.total,
          utilizationRate: currentUser.credits.total > 0 ? 
            Math.round((currentUser.credits.used / currentUser.credits.total) * 100) : 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

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
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current month usage
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const monthlyUsage = currentUser.usage.filter(u => u.month === currentMonth);
    const monthlyCreditsUsed = monthlyUsage.reduce((total, day) => total + day.creditsUsed, 0);
    const monthlyRepliesGenerated = monthlyUsage.reduce((total, day) => total + day.repliesGenerated, 0);

    // Get today's usage
    const today = new Date().toDateString();
    const todayUsage = currentUser.usage.find(u => u.date.toDateString() === today);
    
    return NextResponse.json({
      success: true,
      credits: {
        available: currentUser.credits.available,
        used: currentUser.credits.used,
        total: currentUser.credits.total,
        lastResetAt: currentUser.credits.lastResetAt
      },
      usage: {
        today: {
          creditsUsed: todayUsage ? todayUsage.creditsUsed : 0,
          repliesGenerated: todayUsage ? todayUsage.repliesGenerated : 0
        },
        thisMonth: {
          creditsUsed: monthlyCreditsUsed,
          repliesGenerated: monthlyRepliesGenerated,
          daysActive: monthlyUsage.length
        }
      },
      subscription: {
        hasActive: currentUser.hasActiveSubscription,
        plan: currentUser.subscription ? currentUser.subscription.plan : 'free',
        creditsIncluded: currentUser.subscription ? currentUser.subscription.creditsIncluded : 50
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

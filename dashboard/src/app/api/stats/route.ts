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

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Basic user stats
    const userStats = {
      totalCredits: currentUser.credits,
      usedCredits: currentUser.totalCreditsUsed || 0,
      remainingCredits: currentUser.credits - (currentUser.totalCreditsUsed || 0),
      apiKeysCount: currentUser.apiKeys?.length || 0,
      accountAge: Math.floor((Date.now() - currentUser.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      status: currentUser.status,
      role: currentUser.role,
      hasActiveSubscription: currentUser.hasActiveSubscription || false,
    };

    // If admin, get system-wide stats
    if (currentUser.role === 'admin') {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ status: 'active' });
      const suspendedUsers = await User.countDocuments({ status: 'suspended' });
      const totalCreditsUsed = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$totalCreditsUsed' } } }
      ]);

      const systemStats = {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalCreditsUsed: totalCreditsUsed[0]?.total || 0,
        recentSignups: await User.countDocuments({
          createdAt: { $gte: startDate }
        }),
      };

      return NextResponse.json({
        userStats,
        systemStats,
        isAdmin: true,
      });
    }

    return NextResponse.json({
      userStats,
      isAdmin: false,
    });

  } catch (error) {
    return handleApiError(error);
  }
}

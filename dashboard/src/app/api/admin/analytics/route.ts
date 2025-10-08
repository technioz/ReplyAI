// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, restrictTo } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const adminUser = await authenticateUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const groupBy = searchParams.get('groupBy') || 'day';
    
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User growth analytics
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // User activity analytics
    const userActivity = await User.aggregate([
      {
        $match: {
          lastLoginAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m',
              date: '$lastLoginAt'
            }
          },
          activeUsers: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Credit usage analytics
    const creditUsage = await User.aggregate([
      {
        $group: {
          _id: null,
          totalCreditsUsed: { $sum: '$credits.used' },
          totalCreditsAvailable: { $sum: '$credits.available' },
          totalCreditsTotal: { $sum: '$credits.total' },
          averageCreditsPerUser: { $avg: '$credits.total' },
          totalUsers: { $sum: 1 }
        }
      }
    ]);

    // Subscription analytics
    const subscriptionAnalytics = await User.aggregate([
      {
        $group: {
          _id: {
            plan: '$subscription.plan',
            status: '$subscription.status'
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$subscription.creditsIncluded', 0] } }
        }
      }
    ]);

    // Role distribution
    const roleDistribution = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Status distribution
    const statusDistribution = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top users by credit usage
    // @ts-ignore - Mongoose TypeScript issue
    const topUsersByCredits = await User.find()
      .select('email firstName lastName credits.used')
      .sort({ 'credits.used': -1 })
      .limit(10);

    // Top users by activity
    // @ts-ignore - Mongoose TypeScript issue
    const topUsersByActivity = await User.find()
      .select('email firstName lastName lastLoginAt')
      .sort({ lastLoginAt: -1 })
      .limit(10);

    const analytics = {
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      },
      userGrowth: {
        total: userGrowth.reduce((sum, item) => sum + item.count, 0),
        daily: userGrowth
      },
      userActivity: {
        total: userActivity.reduce((sum, item) => sum + item.activeUsers, 0),
        daily: userActivity
      },
      credits: {
        totalUsed: creditUsage[0]?.totalCreditsUsed || 0,
        totalAvailable: creditUsage[0]?.totalCreditsAvailable || 0,
        totalAllocated: creditUsage[0]?.totalCreditsTotal || 0,
        averagePerUser: Math.round(creditUsage[0]?.averageCreditsPerUser || 0),
        utilizationRate: creditUsage[0]?.totalCreditsTotal > 0 ? 
          Math.round((creditUsage[0]?.totalCreditsUsed / creditUsage[0]?.totalCreditsTotal) * 100) : 0
      },
      subscriptions: subscriptionAnalytics.reduce((acc: any, item: any) => {
        const key = item._id.plan || 'free';
        if (!acc[key]) acc[key] = { count: 0, totalRevenue: 0 };
        acc[key].count += item.count;
        acc[key].totalRevenue += item.totalRevenue;
        return acc;
      }, {}),
      roles: roleDistribution.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      status: statusDistribution.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topUsers: {
        byCredits: topUsersByCredits,
        byActivity: topUsersByActivity
      }
    };

    return NextResponse.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

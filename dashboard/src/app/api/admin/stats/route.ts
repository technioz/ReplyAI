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
    const days = parseInt(searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get system-wide statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    const inactiveUsers = await User.countDocuments({ status: 'inactive' });
    
    // Get user growth statistics
    const newUsersThisPeriod = await User.countDocuments({
      createdAt: { $gte: startDate }
    });
    
    const totalUsersBeforePeriod = totalUsers - newUsersThisPeriod;
    const growthRate = totalUsersBeforePeriod > 0 ? 
      ((newUsersThisPeriod / totalUsersBeforePeriod) * 100).toFixed(2) : '0.00';

    // Get credit usage statistics
    const creditStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalCreditsUsed: { $sum: '$credits.used' },
          totalCreditsAvailable: { $sum: '$credits.available' },
          totalCreditsTotal: { $sum: '$credits.total' },
          averageCreditsPerUser: { $avg: '$credits.total' }
        }
      }
    ]);

    // Get subscription statistics
    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get role distribution
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity
    const recentLogins = await User.countDocuments({
      lastLoginAt: { $gte: startDate }
    });

    const systemStats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        inactive: inactiveUsers,
        newThisPeriod: newUsersThisPeriod,
        growthRate: `${growthRate}%`
      },
      credits: {
        totalUsed: creditStats[0]?.totalCreditsUsed || 0,
        totalAvailable: creditStats[0]?.totalCreditsAvailable || 0,
        totalAllocated: creditStats[0]?.totalCreditsTotal || 0,
        averagePerUser: Math.round(creditStats[0]?.averageCreditsPerUser || 0)
      },
      subscriptions: subscriptionStats.reduce((acc: any, stat: any) => {
        acc[stat._id || 'free'] = stat.count;
        return acc;
      }, {}),
      roles: roleStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      activity: {
        recentLogins,
        periodDays: days
      }
    };

    return NextResponse.json({
      success: true,
      stats: systemStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

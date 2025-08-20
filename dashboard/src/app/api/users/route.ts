import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, restrictTo } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

// GET /api/users - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Authenticate and check admin role
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (!restrictTo('admin')(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const role = searchParams.get('role') || '';

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (role) {
      query.role = role;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get users with pagination
    const users = await User.find(query)
      .select('-password -sessions')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Get stats
    const stats = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats.reduce((acc: any, stat: any) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/users - Bulk operations (admin only)
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    
    // Authenticate and check admin role
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (!restrictTo('admin')(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, userIds, data } = body;

    if (!action || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    let updateData: any = {};
    let message = '';

    switch (action) {
      case 'suspend':
        updateData = { status: 'suspended' };
        message = 'Users suspended successfully';
        break;
      case 'activate':
        updateData = { status: 'active' };
        message = 'Users activated successfully';
        break;
      case 'resetCredits':
        updateData = { 
          'credits.available': 0,
          'credits.used': 0,
          'credits.total': 0,
          'credits.lastResetAt': new Date()
        };
        message = 'User credits reset successfully';
        break;
      case 'updateRole':
        if (!data?.role) {
          return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        }
        updateData = { role: data.role };
        message = 'User roles updated successfully';
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      message,
      updatedCount: result.modifiedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

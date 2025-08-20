import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, restrictTo } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const adminUser = await authenticateUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (!restrictTo(['admin'])(adminUser)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, userIds, data, filters } = body;

    if (!action || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    let updateData: any = {};
    let message = '';
    let query = { _id: { $in: userIds } };

    // Apply additional filters if provided
    if (filters) {
      if (filters.status) {
        query = { ...query, status: filters.status };
      }
      if (filters.role) {
        query = { ...query, role: filters.role };
      }
    }

    switch (action) {
      case 'suspend':
        updateData = { status: 'suspended' };
        message = 'Users suspended successfully';
        break;
      case 'activate':
        updateData = { status: 'active' };
        message = 'Users activated successfully';
        break;
      case 'deactivate':
        updateData = { status: 'inactive' };
        message = 'Users deactivated successfully';
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
      case 'updateStatus':
        if (!data?.status) {
          return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }
        updateData = { status: data.status };
        message = 'User statuses updated successfully';
        break;
      case 'addCredits':
        if (!data?.amount || data.amount <= 0) {
          return NextResponse.json({ error: 'Valid credit amount is required' }, { status: 400 });
        }
        updateData = { 
          $inc: { 
            'credits.available': data.amount,
            'credits.total': data.amount
          }
        };
        message = `Added ${data.amount} credits to users successfully`;
        break;
      case 'removeCredits':
        if (!data?.amount || data.amount <= 0) {
          return NextResponse.json({ error: 'Valid credit amount is required' }, { status: 400 });
        }
        updateData = { 
          $inc: { 
            'credits.available': -data.amount,
            'credits.total': -data.amount
          }
        };
        message = `Removed ${data.amount} credits from users successfully`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update users
    const result = await User.updateMany(query, updateData);

    console.log(`🔧 Bulk operation: ${action} performed on ${result.modifiedCount} users by admin ${adminUser.email}`);

    return NextResponse.json({
      success: true,
      message,
      action,
      updatedCount: result.modifiedCount,
      totalMatched: result.matchedCount,
      filters: filters || {},
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

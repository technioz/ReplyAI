import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, restrictTo } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();
    
    const adminUser = await authenticateUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (!restrictTo(['admin'])(adminUser)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      return NextResponse.json({ 
        error: 'Valid status is required (active, inactive, or suspended)' 
      }, { status: 400 });
    }

    // Update user status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true, runValidators: true }
    ).select('-password -sessions');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`🔒 User status updated: ${updatedUser.email} -> ${status} by admin ${adminUser.email}`);

    return NextResponse.json({
      success: true,
      message: `User status updated to ${status}`,
      user: updatedUser,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

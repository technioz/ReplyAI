import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, restrictTo } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (!restrictTo('admin')(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, credits } = body;

    if (!userId || credits === undefined) {
      return NextResponse.json({ error: 'User ID and credits are required' }, { status: 400 });
    }

    // Update user credits
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { credits },
      { new: true, runValidators: true }
    ).select('-password -sessions');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Credits updated successfully',
      user: updatedUser,
    });

  } catch (error) {
    return handleApiError(error);
  }
}

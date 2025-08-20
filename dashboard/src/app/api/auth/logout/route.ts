import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
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

    const body = await request.json();
    const { sessionToken, action } = body;

    // Get user with fresh data
    const currentUser = await User.findById(user._id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'logoutAll') {
      // Invalidate all sessions
      currentUser.sessions = [];
      await currentUser.save();

      console.log(`🔒 User ${currentUser.email} logged out from all devices`);

      return NextResponse.json({
        success: true,
        message: 'Logged out from all devices successfully',
        timestamp: new Date().toISOString()
      });
    } else if (sessionToken) {
      // Invalidate specific session
      const result = currentUser.invalidateSession(sessionToken);
      if (result) {
        await currentUser.save();
        console.log(`🔒 User ${currentUser.email} logged out from specific session`);
      }

      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      // Default logout - invalidate current session
      const result = currentUser.invalidateSession(user.sessionToken);
      if (result) {
        await currentUser.save();
        console.log(`🔒 User ${currentUser.email} logged out`);
      }

      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    return handleApiError(error);
  }
}

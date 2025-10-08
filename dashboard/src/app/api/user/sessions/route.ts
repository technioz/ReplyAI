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

    // Return active sessions
    const activeSessions = currentUser.sessions
      .filter(session => session.isActive && session.expiresAt > new Date())
      .map(session => ({
        id: session._id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        isActive: session.isActive
      }));

    return NextResponse.json({
      success: true,
      sessions: activeSessions,
      count: activeSessions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, action } = body;

    // Get user with fresh data
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'revokeAll') {
      // Revoke all sessions except current one
      currentUser.sessions = currentUser.sessions.filter(session => 
        session.token === user.sessionToken
      );
      await currentUser.save();

      console.log(`🔒 User ${currentUser.email} revoked all sessions except current`);

      return NextResponse.json({
        success: true,
        message: 'All other sessions revoked successfully',
        timestamp: new Date().toISOString()
      });
    } else if (sessionId) {
      // Revoke specific session
      const sessionIndex = currentUser.sessions.findIndex(session => 
        session._id.toString() === sessionId
      );

      if (sessionIndex === -1) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      currentUser.sessions.splice(sessionIndex, 1);
      await currentUser.save();

      console.log(`🔒 User ${currentUser.email} revoked session: ${sessionId}`);

      return NextResponse.json({
        success: true,
        message: 'Session revoked successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({ 
        error: 'Session ID or action is required' 
      }, { status: 400 });
    }

  } catch (error) {
    return handleApiError(error);
  }
}

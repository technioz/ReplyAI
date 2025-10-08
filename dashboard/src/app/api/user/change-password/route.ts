import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        message: 'Current password and new password are required' 
      }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        message: 'New password must be at least 8 characters long' 
      }, { status: 400 });
    }

    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      }, { status: 400 });
    }

    // Get user with password using the working approach
    const currentUser = await User.findById(user.id).select('+password').exec();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check current password using bcrypt directly
    const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
    if (!isPasswordValid) {
      return NextResponse.json({ 
        success: false, 
        error: 'UNAUTHORIZED',
        message: 'Current password is incorrect' 
      }, { status: 401 });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.findByIdAndUpdate(user.id, { password: hashedPassword });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

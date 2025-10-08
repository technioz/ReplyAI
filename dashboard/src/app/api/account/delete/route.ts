import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { password, confirmation } = body;

    if (!password || !confirmation) {
      return NextResponse.json({ error: 'Password and confirmation are required' }, { status: 400 });
    }

    if (confirmation !== 'DELETE') {
      return NextResponse.json({ error: 'Confirmation must be exactly "DELETE"' }, { status: 400 });
    }

    // Get user with password using email (which works with TypeScript)
    // @ts-ignore - Mongoose TypeScript issue with findOne().select() chaining
    const currentUser = await User.findOne({ email: user.email }).select('+password').exec();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, currentUser.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Password is incorrect' }, { status: 400 });
    }

    // Delete user account
    // @ts-ignore - Mongoose TypeScript issue
    await User.deleteOne({ _id: user.id });

    return NextResponse.json({
      message: 'Account deleted successfully',
    });

  } catch (error) {
    return handleApiError(error);
  }
}

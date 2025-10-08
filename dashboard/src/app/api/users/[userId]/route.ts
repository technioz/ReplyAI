// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, restrictTo } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();
    
    const adminUser = await authenticateUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = params;

    // Get user details
    const user = await User.findById(userId).select('-password -sessions');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

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
    
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = params;
    const body = await request.json();
    const { firstName, lastName, email, role, status, credits } = body;

    // Build update object
    const updateData: any = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (credits !== undefined) updateData.credits = credits;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -sessions');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`🔧 User updated: ${updatedUser.email} by admin ${adminUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();
    
    const adminUser = await authenticateUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = params;

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`🗑️ User deleted: ${deletedUser.email} by admin ${adminUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

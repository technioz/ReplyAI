import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function PUT(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { keyId } = params;
    const body = await request.json();
    const { name, isActive } = body;

    // Validate input
    if (name !== undefined && (typeof name !== 'string' || name.length < 1 || name.length > 50)) {
      return NextResponse.json({ 
        error: 'Name must be between 1 and 50 characters' 
      }, { status: 400 });
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json({ 
        error: 'isActive must be a boolean' 
      }, { status: 400 });
    }

    // Get user with fresh data
    const currentUser = await User.findById(user._id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!currentUser.apiKeys || currentUser.apiKeys.length === 0) {
      return NextResponse.json({ error: 'No API keys found' }, { status: 404 });
    }

    // Find the API key
    const apiKey = currentUser.apiKeys.find(key => key._id.toString() === keyId);
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Update fields if provided
    if (name !== undefined) {
      apiKey.name = name;
    }
    if (isActive !== undefined) {
      apiKey.isActive = isActive;
    }

    await currentUser.save();

    console.log(`✏️ User ${currentUser.email} updated API key: ${apiKey.name}`);

    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
      apiKey: {
        id: apiKey._id,
        key: apiKey.key,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt,
        isActive: apiKey.isActive
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { keyId } = params;

    // Get user with fresh data
    const currentUser = await User.findById(user._id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!currentUser.apiKeys || currentUser.apiKeys.length === 0) {
      return NextResponse.json({ error: 'No API keys found' }, { status: 404 });
    }

    // Find and remove the API key
    const keyIndex = currentUser.apiKeys.findIndex(key => key._id.toString() === keyId);
    
    if (keyIndex === -1) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const deletedKey = currentUser.apiKeys[keyIndex];
    currentUser.apiKeys.splice(keyIndex, 1);

    // If the deleted key was the main apiKey, update it to the first remaining key or null
    if (currentUser.apiKey === deletedKey.key) {
      currentUser.apiKey = currentUser.apiKeys.length > 0 ? currentUser.apiKeys[0].key : null;
    }

    await currentUser.save();

    console.log(`🗑️ User ${currentUser.email} deleted API key: ${deletedKey.name}`);

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
      deletedKey: {
        id: deletedKey._id,
        name: deletedKey.name
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

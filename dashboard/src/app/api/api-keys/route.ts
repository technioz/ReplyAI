import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import crypto from 'crypto';

// GET /api/api-keys - Get user's API keys
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get fresh user data
    const currentUser = await User.findById(user._id).exec();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Format API keys for response (exclude the actual key for security)
    const formattedApiKeys = (currentUser.apiKeys || []).map(apiKey => ({
      id: apiKey._id,
      name: apiKey.name,
      key: apiKey.key,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      isActive: apiKey.isActive
    }));

    return NextResponse.json({
      success: true,
      apiKeys: formattedApiKeys,
      count: formattedApiKeys.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/api-keys - Generate new API key
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'API key name is required and must be a non-empty string' 
      }, { status: 400 });
    }

    if (name.length > 50) {
      return NextResponse.json({ 
        error: 'API key name cannot exceed 50 characters' 
      }, { status: 400 });
    }

    // Get user with fresh data
    const currentUser = await User.findById(user._id).exec();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check API key limit (max 5 keys per user)
    const currentKeys = currentUser.apiKeys || [];
    if (currentKeys.length >= 5) {
      return NextResponse.json({ 
        error: 'Maximum number of API keys reached (5)' 
      }, { status: 400 });
    }

    // Generate new API key
    const keyId = crypto.randomBytes(8).toString('hex');
    const keySecret = crypto.randomBytes(32).toString('hex');
    const newApiKey = `qk_${keyId}_${keySecret}`;

    // Create API key object matching the schema
    const apiKeyObject = {
      key: newApiKey,
      name: name.trim(),
      createdAt: new Date(),
      lastUsedAt: null,
      isActive: true
    };

    // Add to user's API keys
    currentUser.apiKeys.push(apiKeyObject);
    
    // If this is the first API key, also set it as the main apiKey field for backward compatibility
    if (!currentUser.apiKey) {
      currentUser.apiKey = newApiKey;
    }

    await currentUser.save();

    console.log(`🔑 User ${currentUser.email} generated new API key: ${name}`);

    // Return the plain API key (only shown once) and formatted response
    return NextResponse.json({
      success: true,
      message: 'API key generated successfully',
      apiKey: {
        id: apiKeyObject._id || 'temp-id',
        key: newApiKey, // Plain key for user to copy
        name: apiKeyObject.name,
        createdAt: apiKeyObject.createdAt,
        isActive: apiKeyObject.isActive
      },
      warning: 'Store this API key securely. It will not be shown again.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/api-keys - Delete API key
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { keyId } = body;

    if (!keyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    // Get user with fresh data
    const currentUser = await User.findById(user._id).exec();
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

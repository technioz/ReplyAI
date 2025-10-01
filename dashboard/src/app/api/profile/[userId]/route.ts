import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = params;

    // Users can only access their own profile data
    if (user.id !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Can only access your own profile' 
      }, { status: 403 });
    }

    // Get user with profile data
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Return profile data if available
    if (!currentUser.profileData) {
      return NextResponse.json({
        success: true,
        hasProfileData: false,
        message: 'No profile data available. Visit your X profile page to extract data.'
      });
    }

    const profileData = currentUser.profileData;

    return NextResponse.json({
      success: true,
      hasProfileData: true,
      profileData: {
        xHandle: profileData.xHandle,
        displayName: profileData.displayName,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website,
        joinDate: profileData.joinDate,
        followerCount: profileData.followerCount,
        followingCount: profileData.followingCount,
        verified: profileData.verified,
        profileImageUrl: profileData.profileImageUrl,
        pinnedTweet: profileData.pinnedTweet,
        expertise: profileData.expertise,
        toneAnalysis: profileData.toneAnalysis,
        privacy: profileData.privacy,
        extractedAt: profileData.extractedAt,
        lastUpdated: profileData.lastUpdated,
        isActive: profileData.isActive
      }
    });

  } catch (error) {
    console.error('Profile retrieval error:', error);
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = params;

    // Users can only update their own profile data
    if (user.id !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Can only update your own profile' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { privacy, isActive } = body;

    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    if (!currentUser.profileData) {
      return NextResponse.json({ 
        success: false, 
        error: 'No profile data to update' 
      }, { status: 404 });
    }

    // Update profile data
    const updates: any = {
      'profileData.lastUpdated': new Date().toISOString(),
      'updatedAt': new Date()
    };

    if (privacy) {
      updates['profileData.privacy'] = {
        ...currentUser.profileData.privacy,
        ...privacy
      };
    }

    if (typeof isActive === 'boolean') {
      updates['profileData.isActive'] = isActive;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update profile data' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile data updated successfully',
      profileData: {
        privacy: updatedUser.profileData.privacy,
        isActive: updatedUser.profileData.isActive,
        lastUpdated: updatedUser.profileData.lastUpdated
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = params;

    // Users can only delete their own profile data
    if (user.id !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized: Can only delete your own profile' 
      }, { status: 403 });
    }

    // Remove profile data from user document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $unset: {
          'profileData': 1,
          'profileExtractedAt': 1
        },
        $set: {
          'updatedAt': new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete profile data' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile data deleted successfully'
    });

  } catch (error) {
    console.error('Profile deletion error:', error);
    return handleApiError(error);
  }
}

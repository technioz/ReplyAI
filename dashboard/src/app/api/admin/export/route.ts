// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, restrictTo } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const adminUser = await authenticateUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { format = 'json', filters = {} } = body;

    // Build query based on filters
    const query: any = {};
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.role) {
      query.role = filters.role;
    }
    
    if (filters.dateFrom) {
      query.createdAt = { $gte: new Date(filters.dateFrom) };
    }
    
    if (filters.dateTo) {
      if (query.createdAt) {
        query.createdAt.$lte = new Date(filters.dateTo);
      } else {
        query.createdAt = { $lte: new Date(filters.dateTo) };
      }
    }

    // Get users based on filters
    const users = await User.find(query)
      .select('-password -sessions')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'ID',
        'Email',
        'First Name',
        'Last Name',
        'Full Name',
        'Role',
        'Status',
        'Credits Available',
        'Credits Used',
        'Credits Total',
        'Subscription Plan',
        'Subscription Status',
        'Created At',
        'Last Login',
        'Email Verified'
      ];

      const csvRows = users.map(user => [
        user._id.toString(),
        user.email,
        user.firstName || '',
        user.lastName || '',
        user.fullName || '',
        user.role || 'user',
        user.status || 'active',
        user.credits?.available || 0,
        user.credits?.used || 0,
        user.credits?.total || 0,
        user.subscription?.plan || 'free',
        user.subscription?.status || 'none',
        user.createdAt?.toISOString() || '',
        user.lastLoginAt?.toISOString() || '',
        user.emailVerified ? 'Yes' : 'No'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // Return JSON format
      return NextResponse.json({
        success: true,
        format: 'json',
        count: users.length,
        users,
        filters,
        exportedAt: new Date().toISOString(),
        exportedBy: adminUser.email
      });
    }

  } catch (error) {
    return handleApiError(error);
  }
}

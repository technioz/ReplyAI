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
    const { subject, message, priority = 'normal', category = 'general' } = body;

    if (!subject || !message) {
      return NextResponse.json({ 
        error: 'Subject and message are required' 
      }, { status: 400 });
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ 
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` 
      }, { status: 400 });
    }

    // Validate category
    const validCategories = ['general', 'technical', 'billing', 'feature-request', 'bug-report'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
      }, { status: 400 });
    }

    // Get user with fresh data
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create support ticket (in a real app, you'd save this to a database)
    const supportTicket = {
      id: `TICKET-${Date.now()}`,
      userId: currentUser._id,
      userEmail: currentUser.email,
      userFullName: currentUser.fullName,
      subject,
      message,
      priority,
      category,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // TODO: Save support ticket to database
    // TODO: Send notification to support team
    // TODO: Send confirmation email to user

    console.log(`🎫 Support ticket created: ${supportTicket.id} by ${currentUser.email}`);

    return NextResponse.json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        id: supportTicket.id,
        subject: supportTicket.subject,
        priority: supportTicket.priority,
        category: supportTicket.category,
        status: supportTicket.status,
        createdAt: supportTicket.createdAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

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

    // TODO: Fetch user's support tickets from database
    const supportTickets = [
      {
        id: 'TICKET-123456',
        subject: 'Example Support Ticket',
        priority: 'normal',
        category: 'general',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    return NextResponse.json({
      success: true,
      tickets: supportTickets,
      count: supportTickets.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

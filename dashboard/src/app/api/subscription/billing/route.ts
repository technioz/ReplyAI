import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json({
        success: true,
        invoices: [],
        message: 'No billing history available',
        timestamp: new Date().toISOString()
      });
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2023-10-16'
      });

      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 20
      });

      const billingHistory = invoices.data.map(invoice => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency.toUpperCase(),
        status: invoice.status,
        date: new Date(invoice.created * 1000),
        description: invoice.lines.data[0]?.description || 'Subscription',
        downloadUrl: invoice.hosted_invoice_url,
        pdfUrl: invoice.invoice_pdf
      }));

      return NextResponse.json({
        success: true,
        invoices: billingHistory,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching billing history:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'EXTERNAL_SERVICE_ERROR',
        message: 'Failed to fetch billing history from Stripe' 
      }, { status: 502 });
    }

  } catch (error) {
    return handleApiError(error);
  }
}

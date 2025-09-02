import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const tones = [
      {
        id: 'professional',
        name: 'Professional',
        description: 'Formal, respectful, and business-appropriate tone',
        example: 'Thank you for sharing this insightful perspective.'
      },
      {
        id: 'casual',
        name: 'Casual',
        description: 'Relaxed, friendly, and conversational tone',
        example: 'Great point! I totally agree with this.'
      },
      {
        id: 'humorous',
        name: 'Humorous',
        description: 'Light-hearted, witty, and entertaining tone',
        example: 'This is so true it hurts! 😄'
      },
      {
        id: 'empathetic',
        name: 'Empathetic',
        description: 'Understanding, compassionate, and supportive tone',
        example: 'I can really relate to this. Thanks for sharing.'
      },
      {
        id: 'analytical',
        name: 'Analytical',
        description: 'Thoughtful, detailed, and data-driven tone',
        example: 'This raises several interesting points worth considering.'
      },
      {
        id: 'enthusiastic',
        name: 'Enthusiastic',
        description: 'Energetic, positive, and excited tone',
        example: 'This is absolutely fantastic! Love the energy!'
      },
      {
        id: 'controversial',
        name: 'Controversial',
        description: 'Provocative, challenging, and thought-provoking tone',
        example: 'This is a hot take that will definitely spark some debate.'
      }
    ];

    return NextResponse.json({
      success: true,
      tones,
      defaultTone: 'professional',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

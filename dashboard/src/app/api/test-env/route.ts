import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    AI_PROVIDER: process.env.AI_PROVIDER,
    XAI_MODEL: process.env.XAI_MODEL,
    XAI_API_KEY_SET: !!process.env.XAI_API_KEY,
    XAI_API_KEY_PREFIX: process.env.XAI_API_KEY?.substring(0, 8),
    NODE_ENV: process.env.NODE_ENV
  });
}


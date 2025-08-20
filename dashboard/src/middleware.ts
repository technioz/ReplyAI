import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_REQUESTS = 100 // Max requests per window

export function middleware(request: NextRequest) {
  // Skip rate limiting for health checks
  if (request.nextUrl.pathname === '/api/health') {
    return NextResponse.next()
  }

  // Get client IP
  const clientIP = request.ip || 
                   request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'

  // Clean up expired entries
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key)
    }
  }

  // Check rate limit
  const key = `${clientIP}:${Math.floor(now / RATE_LIMIT_WINDOW)}`
  const current = rateLimitMap.get(key) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW }

  if (current.count >= MAX_REQUESTS) {
    return NextResponse.json(
      {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil(RATE_LIMIT_WINDOW / 1000).toString(),
          'X-RateLimit-Limit': MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': current.resetTime.toString()
        }
      }
    )
  }

  // Update rate limit
  current.count++
  rateLimitMap.set(key, current)

  // Add rate limit headers
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', MAX_REQUESTS.toString())
  response.headers.set('X-RateLimit-Remaining', (MAX_REQUESTS - current.count).toString())
  response.headers.set('X-RateLimit-Reset', current.resetTime.toString())

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

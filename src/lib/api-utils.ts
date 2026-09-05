import { NextResponse, NextRequest } from 'next/server';
import { AuthService } from '@/modules/auth';
import { prisma } from './prisma';

export function apiError(message: string, status = 400, code = 'BAD_REQUEST', details?: unknown) {
  if (details) {
    console.error(`[API Error ${code}]:`, details);
  }
  return NextResponse.json(
    {
      error: {
        message,
        status,
        code,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

const FALLBACK_USER = {
  id: 'guest-session-101',
  name: 'Guest Session',
  email: 'Demo Session',
};

export async function getAuthUser(req: NextRequest): Promise<{ id: string; email: string; name: string }> {
  // Check auth token cookie
  const tokenCookie = req.cookies.get('signal_token')?.value;
  if (tokenCookie) {
    const payload = await AuthService.verifyToken(tokenCookie);
    if (payload) {
      return { id: payload.userId, email: payload.email, name: payload.name };
    }
  }

  // Database lookup with fallback
  try {
    let demoUser = await prisma.user.findUnique({ where: { email: FALLBACK_USER.email } });
    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          id: FALLBACK_USER.id,
          name: FALLBACK_USER.name,
          email: FALLBACK_USER.email,
          passwordHash: '$2a$10$demoHashPlaceholderForTestingOnly123456789012',
          preference: {
            create: { sensitivity: 'BALANCED' },
          },
        },
      });
    }
    return { id: demoUser.id, email: demoUser.email, name: demoUser.name };
  } catch {
    return FALLBACK_USER;
  }
}

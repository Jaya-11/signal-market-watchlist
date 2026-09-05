import { NextRequest, NextResponse } from 'next/server';
import { apiError, getAuthUser } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { UserSensitivity } from '@/modules/attention-scoring';

export const dynamic = 'force-dynamic';

const updatePrefSchema = z.object({
  sensitivity: z.enum(['LOW', 'BALANCED', 'HIGH']),
});

const IN_MEMORY_PREFS: Record<string, UserSensitivity> = {};

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    let sensitivity: UserSensitivity = IN_MEMORY_PREFS[user.id] || 'BALANCED';

    try {
      let pref = await prisma.userPreference.findUnique({
        where: { userId: user.id },
      });

      if (!pref) {
        pref = await prisma.userPreference.create({
          data: {
            userId: user.id,
            sensitivity: 'BALANCED',
          },
        });
      }
      sensitivity = pref.sensitivity as UserSensitivity;
    } catch {
      // Use in-memory fallback
    }

    return NextResponse.json({
      preference: { userId: user.id, sensitivity },
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    return apiError('Failed to fetch user preferences', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();

    const validation = updatePrefSchema.safeParse(body);
    if (!validation.success) {
      return apiError('Invalid preference payload', 400, 'VALIDATION_ERROR', validation.error.format());
    }

    const sens = validation.data.sensitivity as UserSensitivity;
    IN_MEMORY_PREFS[user.id] = sens;

    try {
      await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: { sensitivity: sens },
        create: { userId: user.id, sensitivity: sens },
      });
    } catch {
      // In-memory fallback updated above
    }

    return NextResponse.json({ preference: { userId: user.id, sensitivity: sens } });
  } catch (error) {
    return apiError('Failed to update user preferences', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

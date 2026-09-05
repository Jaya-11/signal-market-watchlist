import { NextRequest, NextResponse } from 'next/server';
import { apiError, getAuthUser } from '@/lib/api-utils';
import { UserVisitService } from '@/modules/users/visit-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const visitDate = await UserVisitService.recordVisit(user.id);

    return NextResponse.json({
      success: true,
      userId: user.id,
      lastVisitedAt: visitDate.toISOString(),
      message: 'Recorded user visit timestamp',
    });
  } catch (error) {
    return apiError('Failed to record visit', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiError, getAuthUser } from '@/lib/api-utils';
import { UserVisitService } from '@/modules/users/visit-service';
import { UserSensitivity } from '@/modules/attention-scoring';
import { WatchlistsService } from '@/modules/watchlists';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);

    const watchlist = await WatchlistsService.getWatchlistById(id, user.id);
    if (!watchlist) {
      return apiError('Watchlist not found', 404, 'NOT_FOUND');
    }

    const { searchParams } = new URL(req.url);
    const sensitivity = (searchParams.get('sensitivity') as UserSensitivity) || 'BALANCED';

    const report = await UserVisitService.getSinceLastVisitReport(user.id, id, sensitivity);

    return NextResponse.json({
      watchlistId: id,
      watchlistName: watchlist.name,
      ...report,
      dataTrust: {
        timestamp: new Date().toISOString(),
        dataStatus: 'FRESH',
        isDemo: true,
        notes: 'Evaluates changes relative to user visit timestamp baseline.',
      },
    });
  } catch (error) {
    return apiError('Failed to generate since-last-visit report', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

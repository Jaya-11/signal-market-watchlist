import { NextRequest, NextResponse } from 'next/server';
import { apiError, getAuthUser } from '@/lib/api-utils';
import { WatchlistsService } from '@/modules/watchlists';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; symbol: string }> }
) {
  try {
    const { id, symbol } = await params;
    const user = await getAuthUser(req);

    const removed = await WatchlistsService.removeStockFromWatchlist(id, user.id, symbol);
    if (!removed) {
      return apiError('Stock or watchlist not found', 404, 'NOT_FOUND');
    }

    return NextResponse.json({ success: true, message: `Removed ${symbol.toUpperCase()} from watchlist` });
  } catch (error) {
    return apiError('Failed to remove stock from watchlist', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiError, getAuthUser } from '@/lib/api-utils';
import { WatchlistsService, renameWatchlistSchema } from '@/modules/watchlists';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);
    const body = await req.json();

    const validation = renameWatchlistSchema.safeParse(body);
    if (!validation.success) {
      return apiError('Invalid request body', 400, 'VALIDATION_ERROR', validation.error.format());
    }

    const updated = await WatchlistsService.renameWatchlist(id, user.id, validation.data.name);
    if (!updated) {
      return apiError('Watchlist not found', 404, 'NOT_FOUND');
    }

    return NextResponse.json({ watchlist: updated });
  } catch (error) {
    return apiError('Failed to rename watchlist', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);

    const deleted = await WatchlistsService.deleteWatchlist(id, user.id);
    if (!deleted) {
      return apiError('Watchlist not found', 404, 'NOT_FOUND');
    }

    return NextResponse.json({ success: true, message: 'Watchlist deleted successfully' });
  } catch (error) {
    return apiError('Failed to delete watchlist', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

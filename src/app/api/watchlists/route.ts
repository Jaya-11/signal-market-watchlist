import { NextRequest, NextResponse } from 'next/server';
import { apiError, getAuthUser } from '@/lib/api-utils';
import { WatchlistsService, createWatchlistSchema } from '@/modules/watchlists';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const watchlists = await WatchlistsService.getUserWatchlists(user.id);
    return NextResponse.json({ watchlists });
  } catch (error) {
    return apiError('Failed to fetch watchlists', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();

    const validation = createWatchlistSchema.safeParse(body);
    if (!validation.success) {
      return apiError('Invalid request body', 400, 'VALIDATION_ERROR', validation.error.format());
    }

    const watchlist = await WatchlistsService.createWatchlist(user.id, validation.data.name);
    return NextResponse.json({ watchlist }, { status: 201 });
  } catch (error) {
    return apiError('Failed to create watchlist', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

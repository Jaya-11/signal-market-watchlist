import { NextRequest, NextResponse } from 'next/server';
import { apiError, getAuthUser } from '@/lib/api-utils';
import { WatchlistsService, addStockSchema } from '@/modules/watchlists';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getAuthUser(req);
    const body = await req.json();

    const validation = addStockSchema.safeParse(body);
    if (!validation.success) {
      return apiError('Invalid request body', 400, 'VALIDATION_ERROR', validation.error.format());
    }

    const { symbol, companyName } = validation.data;

    try {
      const stock = await WatchlistsService.addStockToWatchlist(id, user.id, symbol, companyName);
      return NextResponse.json({ stock }, { status: 201 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already in this watchlist')) {
        return apiError(message, 409, 'DUPLICATE_STOCK');
      }
      if (message.includes('Watchlist not found')) {
        return apiError(message, 404, 'NOT_FOUND');
      }
      throw err;
    }
  } catch (error) {
    return apiError('Failed to add stock to watchlist', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

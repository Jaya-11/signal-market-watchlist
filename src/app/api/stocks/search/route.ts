import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-utils';
import { getMarketDataProvider } from '@/modules/market-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    const provider = getMarketDataProvider();
    const results = await provider.searchStocks(query);

    return NextResponse.json({
      query,
      count: results.length,
      results,
      disclaimer: 'Curated deterministic Indian & US stock universe for development and demo.',
      isDemo: true,
    });
  } catch (error) {
    return apiError('Failed to search stocks', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

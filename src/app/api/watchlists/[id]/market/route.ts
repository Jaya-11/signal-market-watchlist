import { NextRequest, NextResponse } from 'next/server';
import { apiError, getAuthUser } from '@/lib/api-utils';
import { WatchlistsService } from '@/modules/watchlists';
import { getMarketDataProvider } from '@/modules/market-data';
import { SnapshotsService } from '@/modules/snapshots';
import { ChangeDetectionEngine } from '@/modules/change-detection';
import { AttentionScoringEngine, UserSensitivity } from '@/modules/attention-scoring';

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

    const provider = getMarketDataProvider();
    const symbols = watchlist.stocks.map((s) => s.symbol);

    if (symbols.length === 0) {
      return NextResponse.json({
        watchlistId: id,
        name: watchlist.name,
        items: [],
        dataTrust: {
          timestamp: new Date().toISOString(),
          dataStatus: 'FRESH',
          isDemo: true,
          notes: 'Empty watchlist.',
        },
      });
    }

    const quotes = await provider.getQuotes(symbols);

    const items = await Promise.all(
      quotes.map(async (quote) => {
        await SnapshotsService.captureSnapshot(quote);
        const baseline = await SnapshotsService.getPersonalBaseline(quote.symbol);

        const analysis = ChangeDetectionEngine.analyze(quote, baseline.volatilityAvgPercent);
        const score = AttentionScoringEngine.calculate(analysis, sensitivity);

        return {
          symbol: quote.symbol,
          companyName: quote.companyName,
          exchange: quote.exchange,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          averageVolume: quote.averageVolume,
          high52: quote.high52,
          low52: quote.low52,
          attentionScore: score.score,
          severity: score.severity,
          summary: score.summary,
          reasons: score.reasons,
          baseline: {
            volatilityAvgPercent: baseline.volatilityAvgPercent,
            sampleCount: baseline.sampleCount,
            status: baseline.status,
          },
          dataTrust: {
            timestamp: quote.timestamp,
            dataStatus: quote.status,
            isDemo: quote.isDemo,
          },
        };
      })
    );

    return NextResponse.json({
      watchlistId: id,
      name: watchlist.name,
      items,
      dataTrust: {
        timestamp: new Date().toISOString(),
        dataStatus: quotes.some((q) => q.status === 'UNAVAILABLE')
          ? 'UNAVAILABLE'
          : quotes.some((q) => q.status === 'STALE')
          ? 'STALE'
          : 'FRESH',
        isDemo: quotes[0]?.isDemo ?? true,
        notes: 'Includes personal baseline comparison & data trust indicators',
      },
    });
  } catch (error) {
    return apiError('Failed to fetch market data for watchlist', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-utils';
import { getMarketDataProvider } from '@/modules/market-data';
import { ChangeDetectionEngine } from '@/modules/change-detection';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params;
    const cleanSymbol = symbol.toUpperCase().trim();

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const provider = getMarketDataProvider();
    const history = await provider.getHistory(cleanSymbol, days);

    // Build chronological Market Story timeline from history bars
    const timeline = [];
    const bars = history.bars;

    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1];
      const curr = bars[i];
      const movePct = Number((((curr.close - prev.close) / prev.close) * 100).toFixed(2));

      // Construct temporary quote for historical step
      const mockQuote = {
        symbol: cleanSymbol,
        companyName: cleanSymbol,
        exchange: 'NSE' as const,
        price: curr.close,
        change: Number((curr.close - prev.close).toFixed(2)),
        changePercent: movePct,
        volume: curr.volume,
        averageVolume: Math.round(curr.volume * 0.8),
        high52: curr.close * 1.1,
        low52: curr.close * 0.8,
        timestamp: curr.timestamp,
        status: 'FRESH' as const,
        isDemo: true,
      };

      const analysis = ChangeDetectionEngine.analyze(mockQuote, history.volatilityAvgPercent);
      if (analysis.reasons.length > 0) {
        timeline.push({
          date: curr.timestamp,
          price: curr.close,
          changePercent: movePct,
          volume: curr.volume,
          events: analysis.reasons.map((r) => ({ title: r.title, description: r.description, severity: r.impactScoreDelta >= 20 ? 'HIGH' : 'MEDIUM' })),
        });
      }
    }

    return NextResponse.json({
      symbol: cleanSymbol,
      days,
      volatilityAvgPercent: history.volatilityAvgPercent,
      bars: history.bars,
      marketStoryTimeline: timeline,
      dataTrust: {
        timestamp: new Date().toISOString(),
        dataStatus: 'FRESH',
        isDemo: true,
      },
    });
  } catch (error) {
    return apiError('Failed to fetch stock history', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

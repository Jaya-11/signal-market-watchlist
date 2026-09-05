import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-utils';
import { getMarketDataProvider } from '@/modules/market-data';
import { SnapshotsService } from '@/modules/snapshots';
import { ChangeDetectionEngine } from '@/modules/change-detection';
import { AttentionScoringEngine, UserSensitivity } from '@/modules/attention-scoring';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await params;
    const cleanSymbol = symbol.toUpperCase().trim();

    const { searchParams } = new URL(req.url);
    const sensitivity = (searchParams.get('sensitivity') as UserSensitivity) || 'BALANCED';

    const provider = getMarketDataProvider();
    const quote = await provider.getQuote(cleanSymbol);

    if (quote.status === 'UNAVAILABLE') {
      return apiError(`Market data unavailable for symbol '${cleanSymbol}'`, 404, 'DATA_UNAVAILABLE', {
        symbol: cleanSymbol,
        status: quote.status,
        timestamp: quote.timestamp,
      });
    }

    // Capture snapshot & calculate baseline
    await SnapshotsService.captureSnapshot(quote);
    const baseline = await SnapshotsService.getPersonalBaseline(cleanSymbol);

    const analysis = ChangeDetectionEngine.analyze(quote, baseline.volatilityAvgPercent);
    const scoreResult = AttentionScoringEngine.calculate(analysis, sensitivity);

    return NextResponse.json({
      stock: {
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
      },
      attentionScore: {
        score: scoreResult.score,
        severity: scoreResult.severity,
        summary: scoreResult.summary,
        reasons: scoreResult.reasons,
        sensitivityApplied: scoreResult.sensitivityApplied,
        needsAttention: scoreResult.needsAttention,
      },
      personalBaseline: {
        volatilityAvgPercent: baseline.volatilityAvgPercent,
        averageVolume: baseline.averageVolume,
        sampleCount: baseline.sampleCount,
        status: baseline.status,
        note: baseline.note,
      },
      dataTrust: {
        timestamp: quote.timestamp,
        dataStatus: quote.status,
        isDemo: quote.isDemo,
        notes: quote.notes,
      },
    });
  } catch (error) {
    return apiError('Failed to fetch stock detail', 500, 'INTERNAL_SERVER_ERROR', String(error));
  }
}

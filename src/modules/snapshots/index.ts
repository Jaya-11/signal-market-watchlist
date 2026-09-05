import { prisma } from '@/lib/prisma';
import { getMarketDataProvider, MarketQuote } from '../market-data';

export interface PersonalBaselineResult {
  symbol: string;
  volatilityAvgPercent: number;
  averageVolume: number;
  sampleCount: number;
  status: 'CALCULATED' | 'UNAVAILABLE_FALLBACK_DEFAULT';
  note: string;
}

export class SnapshotsService {
  /**
   * Captures a MarketSnapshot for a symbol if no recent snapshot exists (within 5 mins)
   */
  public static async captureSnapshot(quote: MarketQuote, force = false): Promise<{ id: string; captured: boolean }> {
    try {
      if (!force) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existing = await prisma.marketSnapshot.findFirst({
          where: {
            symbol: quote.symbol,
            timestamp: { gte: fiveMinutesAgo },
          },
          orderBy: { timestamp: 'desc' },
        });

        if (existing) {
          return { id: existing.id, captured: false };
        }
      }

      const snapshot = await prisma.marketSnapshot.create({
        data: {
          symbol: quote.symbol,
          price: quote.price,
          changePercent: quote.changePercent,
          volume: quote.volume,
          averageVolume: quote.averageVolume,
          high52: quote.high52,
          low52: quote.low52,
          timestamp: new Date(quote.timestamp),
        },
      });

      return { id: snapshot.id, captured: true };
    } catch (error) {
      console.warn(`Failed to capture snapshot for ${quote.symbol}:`, error);
      return { id: 'fallback-id', captured: false };
    }
  }

  /**
   * Calculates personal baseline volatility and normal volume from historical snapshots
   */
  public static async getPersonalBaseline(symbol: string): Promise<PersonalBaselineResult> {
    try {
      const snapshots = await prisma.marketSnapshot.findMany({
        where: { symbol },
        orderBy: { timestamp: 'desc' },
        take: 30,
      });

      if (snapshots.length < 5) {
        // Fallback to demo provider default historical volatility
        const provider = getMarketDataProvider();
        const history = await provider.getHistory(symbol);
        return {
          symbol,
          volatilityAvgPercent: history.volatilityAvgPercent,
          averageVolume: history.bars.length > 0 ? history.bars[0].volume : 5000000,
          sampleCount: snapshots.length,
          status: 'UNAVAILABLE_FALLBACK_DEFAULT',
          note: `SIGNAL is using a conservative default baseline (${snapshots.length}/5 observations). Confidence improves as additional market observations accumulate.`,
        };
      }

      const absMoves = snapshots.map((s) => Math.abs(s.changePercent));
      const avgVol = Math.round(snapshots.reduce((acc, s) => acc + s.volume, 0) / snapshots.length);

      // Mean absolute percentage move
      const meanAbsMove = absMoves.reduce((acc, v) => acc + v, 0) / absMoves.length;
      const volatilityAvg = Number(Math.max(0.5, meanAbsMove).toFixed(2));

      return {
        symbol,
        volatilityAvgPercent: volatilityAvg,
        averageVolume: avgVol,
        sampleCount: snapshots.length,
        status: 'CALCULATED',
        note: `Calculated from ${snapshots.length} historical snapshot observations.`,
      };
    } catch {
      return {
        symbol,
        volatilityAvgPercent: 1.2,
        averageVolume: 5000000,
        sampleCount: 0,
        status: 'UNAVAILABLE_FALLBACK_DEFAULT',
        note: 'SIGNAL is using a conservative baseline for this demo. Confidence improves as additional market observations accumulate.',
      };
    }
  }
}

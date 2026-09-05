import { prisma } from '@/lib/prisma';
import { getMarketDataProvider } from '../market-data';
import { SnapshotsService } from '../snapshots';
import { ChangeDetectionEngine } from '../change-detection';
import { AttentionScoringEngine, UserSensitivity } from '../attention-scoring';
import { WatchlistsService } from '../watchlists';

export interface StockAttentionSummary {
  symbol: string;
  companyName: string;
  exchange: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE';
  price: number;
  changePercent: number;
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  reasons: Array<{ id: string; type: string; title: string; description: string; impactScoreDelta: number }>;
  freshness: string;
  isDemo: boolean;
}

export interface UnchangedStockDetail {
  symbol: string;
  companyName: string;
  exchange: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE';
  price: number;
  changePercent: number;
  normalVolatility: number;
  reason: string;
}

export interface SinceLastVisitResult {
  userId: string;
  lastVisitedAt: string;
  currentVisitAt: string;
  summaryCounters: {
    totalStocks: number;
    meaningfulChanges: number;
    highAttention: number;
    mediumAttention: number;
    unchanged: number;
  };
  highAttentionItems: StockAttentionSummary[];
  mediumAttentionItems: StockAttentionSummary[];
  unchangedSummary: {
    count: number;
    symbols: string[];
    details: UnchangedStockDetail[];
    note: string;
  };
}

const IN_MEMORY_VISITS: Record<string, Date> = {};

export class UserVisitService {
  /**
   * Log or update a user's visit timestamp
   */
  public static async recordVisit(userId: string): Promise<Date> {
    const now = new Date();
    try {
      await prisma.userVisit.create({
        data: {
          userId,
          lastVisitedAt: now,
        },
      });
    } catch {
      IN_MEMORY_VISITS[userId] = now;
    }
    return now;
  }

  /**
   * Get previous visit timestamp for user
   */
  public static async getLastVisit(userId: string): Promise<Date> {
    try {
      const visit = await prisma.userVisit.findFirst({
        where: { userId },
        orderBy: { lastVisitedAt: 'desc' },
      });
      return visit?.lastVisitedAt || IN_MEMORY_VISITS[userId] || new Date(Date.now() - 24 * 60 * 60 * 1000);
    } catch {
      return IN_MEMORY_VISITS[userId] || new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Computes the "Since Your Last Visit" change report for a watchlist
   */
  public static async getSinceLastVisitReport(
    userId: string,
    watchlistId: string,
    sensitivity: UserSensitivity = 'BALANCED'
  ): Promise<SinceLastVisitResult> {
    const lastVisitedAt = await UserVisitService.getLastVisit(userId);
    const provider = getMarketDataProvider();

    // Get watchlist with stocks via WatchlistsService (handles DB and fallback)
    const watchlist = await WatchlistsService.getWatchlistById(watchlistId, userId);
    const stocks = watchlist ? watchlist.stocks : [];

    const symbols = stocks.map((s) => s.symbol);
    if (symbols.length === 0) {
      return {
        userId,
        lastVisitedAt: lastVisitedAt.toISOString(),
        currentVisitAt: new Date().toISOString(),
        summaryCounters: {
          totalStocks: 0,
          meaningfulChanges: 0,
          highAttention: 0,
          mediumAttention: 0,
          unchanged: 0,
        },
        highAttentionItems: [],
        mediumAttentionItems: [],
        unchangedSummary: {
          count: 0,
          symbols: [],
          details: [],
          note: 'No stocks in this watchlist.',
        },
      };
    }

    const quotes = await provider.getQuotes(symbols);

    const highItems: StockAttentionSummary[] = [];
    const mediumItems: StockAttentionSummary[] = [];
    const unchangedSymbols: string[] = [];
    const unchangedDetails: UnchangedStockDetail[] = [];

    for (const quote of quotes) {
      await SnapshotsService.captureSnapshot(quote);
      const baseline = await SnapshotsService.getPersonalBaseline(quote.symbol);

      const analysis = ChangeDetectionEngine.analyze(quote, baseline.volatilityAvgPercent);
      const scoreResult = AttentionScoringEngine.calculate(analysis, sensitivity);

      const itemSummary: StockAttentionSummary = {
        symbol: quote.symbol,
        companyName: quote.companyName,
        exchange: quote.exchange,
        price: quote.price,
        changePercent: quote.changePercent,
        score: scoreResult.score,
        severity: scoreResult.severity,
        summary: scoreResult.summary,
        reasons: scoreResult.reasons,
        freshness: quote.status,
        isDemo: quote.isDemo,
      };

      if (scoreResult.severity === 'HIGH') {
        highItems.push(itemSummary);
      } else if (scoreResult.severity === 'MEDIUM') {
        mediumItems.push(itemSummary);
      } else {
        unchangedSymbols.push(quote.symbol);
        unchangedDetails.push({
          symbol: quote.symbol,
          companyName: quote.companyName,
          exchange: quote.exchange,
          price: quote.price,
          changePercent: quote.changePercent,
          normalVolatility: baseline.volatilityAvgPercent,
          reason: `Moved ${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}%, which is within its baseline volatility (±${baseline.volatilityAvgPercent}%). No anomaly flagged.`,
        });
      }
    }

    const totalMeaningful = highItems.length + mediumItems.length;

    return {
      userId,
      lastVisitedAt: lastVisitedAt.toISOString(),
      currentVisitAt: new Date().toISOString(),
      summaryCounters: {
        totalStocks: symbols.length,
        meaningfulChanges: totalMeaningful,
        highAttention: highItems.length,
        mediumAttention: mediumItems.length,
        unchanged: unchangedSymbols.length,
      },
      highAttentionItems: highItems,
      mediumAttentionItems: mediumItems,
      unchangedSummary: {
        count: unchangedSymbols.length,
        symbols: unchangedSymbols,
        details: unchangedDetails,
        note: unchangedSymbols.length > 0 ? `${unchangedSymbols.length} stock(s) traded within normal volatility bounds.` : 'All stocks recorded notable changes.',
      },
    };
  }
}


import { MarketQuote, StockHistory } from '../market-data';

export type ChangeType =
  | 'PRICE_SURGE'
  | 'PRICE_DROP'
  | 'VOLUME_SPIKE'
  | 'NEAR_52W_HIGH'
  | 'NEAR_52W_LOW'
  | 'VOLATILITY_ANOMALY';

export type ChangeSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface StructuredReason {
  id: string;
  type: ChangeType;
  title: string;
  description: string;
  impactScoreDelta: number;
}

export interface ChangeDetectionRules {
  volatilityThresholdRatio: number;
  volumeSpikeRatio: number;
  proximity52WeekPct: number;
  compoundBonus: number;
}

export const DEFAULT_RULES: ChangeDetectionRules = {
  volatilityThresholdRatio: 2.0,
  volumeSpikeRatio: 2.0,
  proximity52WeekPct: 2.0,
  compoundBonus: 15,
};

export interface ChangeAnalysisResult {
  symbol: string;
  companyName: string;
  price: number;
  changePercent: number;
  volumeRatio: number;
  isNear52WeekHigh: boolean;
  isNear52WeekLow: boolean;
  volatilityRatio: number;
  reasons: StructuredReason[];
  rawAttentionScore: number;
  baselineNote?: string;
}

export class ChangeDetectionEngine {
  public static analyze(
    quote: MarketQuote,
    historyOrBaselineVolatility?: number | StockHistory,
    rules: ChangeDetectionRules = DEFAULT_RULES
  ): ChangeAnalysisResult {
    const reasons: StructuredReason[] = [];
    let rawScore = 0;

    const absChangePct = Math.abs(quote.changePercent);
    const avgVol = quote.averageVolume > 0 ? quote.averageVolume : 1;
    const volumeRatio = Number((quote.volume / avgVol).toFixed(2));

    const normalVolatility =
      typeof historyOrBaselineVolatility === 'number'
        ? historyOrBaselineVolatility
        : historyOrBaselineVolatility?.volatilityAvgPercent || 1.2;

    const volatilityRatio = Number((absChangePct / normalVolatility).toFixed(2));

    // 1. Price Anomaly Check vs Baseline Volatility
    if (volatilityRatio >= rules.volatilityThresholdRatio) {
      const isUp = quote.changePercent > 0;
      const delta = Math.min(45, Math.round(volatilityRatio * 16));
      rawScore += delta;
      reasons.push({
        id: 'volatility_anomaly',
        type: isUp ? 'PRICE_SURGE' : 'PRICE_DROP',
        title: `Unusual ${isUp ? 'Upward' : 'Downward'} Movement`,
        description: `Moved ${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}%, which is ${volatilityRatio}x higher than its typical daily move of ±${normalVolatility}%.`,
        impactScoreDelta: delta,
      });
    } else if (absChangePct >= 3.0) {
      const delta = 25;
      rawScore += delta;
      reasons.push({
        id: 'significant_price_move',
        type: quote.changePercent > 0 ? 'PRICE_SURGE' : 'PRICE_DROP',
        title: 'Significant Price Movement',
        description: `Price moved ${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}% in current session.`,
        impactScoreDelta: delta,
      });
    }

    // 2. Volume Spike Anomaly Check
    if (volumeRatio >= rules.volumeSpikeRatio) {
      const delta = Math.min(35, Math.round((volumeRatio - 1) * 18));
      rawScore += delta;
      reasons.push({
        id: 'volume_spike',
        type: 'VOLUME_SPIKE',
        title: 'Unusually High Trading Volume',
        description: `Volume is currently ${volumeRatio}x its average (${(quote.volume / 1e6).toFixed(1)}M vs avg ${(avgVol / 1e6).toFixed(1)}M shares).`,
        impactScoreDelta: delta,
      });
    } else if (volumeRatio >= 1.4) {
      const delta = 15;
      rawScore += delta;
      reasons.push({
        id: 'elevated_volume',
        type: 'VOLUME_SPIKE',
        title: 'Elevated Trading Activity',
        description: `Volume is ${volumeRatio}x its normal average.`,
        impactScoreDelta: delta,
      });
    }

    // 3. Proximity to 52-Week High / Low
    const distToHigh = Math.abs((quote.price - quote.high52) / quote.high52) * 100;
    const distToLow = Math.abs((quote.price - quote.low52) / quote.low52) * 100;
    const isNearHigh = distToHigh <= rules.proximity52WeekPct;
    const isNearLow = distToLow <= rules.proximity52WeekPct;

    if (isNearHigh) {
      const delta = 25;
      rawScore += delta;
      reasons.push({
        id: 'near_52w_high',
        type: 'NEAR_52W_HIGH',
        title: 'Near 52-Week High',
        description: `Trading within ${distToHigh.toFixed(1)}% of its 52-week peak.`,
        impactScoreDelta: delta,
      });
    }

    if (isNearLow) {
      const delta = 25;
      rawScore += delta;
      reasons.push({
        id: 'near_52w_low',
        type: 'NEAR_52W_LOW',
        title: 'Near 52-Week Low',
        description: `Trading within ${distToLow.toFixed(1)}% of its 52-week trough.`,
        impactScoreDelta: delta,
      });
    }

    // 4. Compound Multi-Signal Bonus
    if (volatilityRatio >= rules.volatilityThresholdRatio * 0.9 && volumeRatio >= rules.volumeSpikeRatio * 0.9) {
      rawScore += rules.compoundBonus;
      reasons.push({
        id: 'compound_signal',
        type: 'VOLATILITY_ANOMALY',
        title: 'Compound Signal Confluence',
        description: `Price movement and elevated volume occurred together, making this move unusually significant.`,
        impactScoreDelta: rules.compoundBonus,
      });
    }

    return {
      symbol: quote.symbol,
      companyName: quote.companyName,
      price: quote.price,
      changePercent: quote.changePercent,
      volumeRatio,
      isNear52WeekHigh: isNearHigh,
      isNear52WeekLow: isNearLow,
      volatilityRatio,
      reasons,
      rawAttentionScore: Math.min(100, Math.max(0, rawScore)),
    };
  }
}

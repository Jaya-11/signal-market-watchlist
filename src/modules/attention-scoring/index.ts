import { ChangeAnalysisResult, ChangeSeverity, StructuredReason } from '../change-detection';

export type UserSensitivity = 'LOW' | 'BALANCED' | 'HIGH';

export interface AttentionScoreResult {
  symbol: string;
  companyName: string;
  score: number; // 0 - 100
  severity: ChangeSeverity;
  reasons: StructuredReason[];
  summary: string;
  sensitivityApplied: UserSensitivity;
  needsAttention: boolean;
}

export class AttentionScoringEngine {
  public static calculate(
    analysis: ChangeAnalysisResult,
    sensitivity: UserSensitivity = 'BALANCED'
  ): AttentionScoreResult {
    let multiplier = 1.0;
    if (sensitivity === 'LOW') {
      multiplier = 0.75; // Noise suppression mode
    } else if (sensitivity === 'HIGH') {
      multiplier = 1.25; // Early warning mode
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(analysis.rawAttentionScore * multiplier)));

    let severity: ChangeSeverity = 'LOW';
    let needsAttention = false;

    if (finalScore >= 60) {
      severity = 'HIGH';
      needsAttention = true;
    } else if (finalScore >= 30) {
      severity = 'MEDIUM';
      needsAttention = true;
    } else {
      severity = 'LOW';
      needsAttention = false;
    }

    const summary = AttentionScoringEngine.generateSummary(analysis, finalScore, severity);

    return {
      symbol: analysis.symbol,
      companyName: analysis.companyName,
      score: finalScore,
      severity,
      reasons: analysis.reasons,
      summary,
      sensitivityApplied: sensitivity,
      needsAttention,
    };
  }

  private static generateSummary(
    analysis: ChangeAnalysisResult,
    score: number,
    severity: ChangeSeverity
  ): string {
    if (analysis.reasons.length === 0 || score < 20) {
      return `Trading normally. Price moved ${analysis.changePercent > 0 ? '+' : ''}${analysis.changePercent}% within expected range. No action required.`;
    }

    const primaryReason = analysis.reasons[0];
    if (severity === 'HIGH') {
      return `High Priority: ${analysis.companyName} (${analysis.symbol}) exhibits ${primaryReason.title.toLowerCase()} with ${analysis.reasons.length > 1 ? `${analysis.reasons.length} combined market signals` : 'unusual volume/price dynamic'}.`;
    } else if (severity === 'MEDIUM') {
      return `Noticeable Change: ${analysis.companyName} recorded ${primaryReason.title.toLowerCase()} (${analysis.changePercent > 0 ? '+' : ''}${analysis.changePercent}%).`;
    }

    return `${analysis.companyName} showed minor signals within normal variance.`;
  }
}

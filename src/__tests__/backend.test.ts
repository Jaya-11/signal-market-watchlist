import assert from 'node:assert';
import { createWatchlistSchema, addStockSchema } from '../modules/watchlists';
import { DemoMarketDataProvider } from '../modules/market-data';
import { ChangeDetectionEngine } from '../modules/change-detection';
import { AttentionScoringEngine } from '../modules/attention-scoring';
import { SnapshotsService } from '../modules/snapshots';

async function runTests() {
  console.log('🚀 Starting SIGNAL Phase 2 Backend Automated Test Suite...\n');

  // Test 1: Watchlist CRUD Validation
  console.log('🧪 Test 1: Watchlist CRUD Zod Validation');
  const validName = createWatchlistSchema.safeParse({ name: 'Tech Leaders' });
  assert.strictEqual(validName.success, true);
  
  const invalidName = createWatchlistSchema.safeParse({ name: '' });
  assert.strictEqual(invalidName.success, false);
  console.log('   ✓ Watchlist validation passed');

  // Test 2: Add Stock Schema & Symbol Transformation
  console.log('🧪 Test 2: Stock Schema & Symbol Cleaning');
  const validStock = addStockSchema.safeParse({ symbol: ' tatamotors ', companyName: 'Tata Motors Ltd' });
  assert.strictEqual(validStock.success, true);
  if (validStock.success) {
    assert.strictEqual(validStock.data.symbol, 'TATAMOTORS');
  }
  console.log('   ✓ Symbol trimming and uppercase transformation passed');

  // Test 3: Meaningful Price Change Detection (Volatility Anomaly)
  console.log('🧪 Test 3: Meaningful Price Change Detection');
  const mockSurgeQuote = {
    symbol: 'TATAMOTORS',
    companyName: 'Tata Motors Limited',
    exchange: 'NSE' as const,
    price: 1045.10,
    change: 51.50,
    changePercent: 5.2, // +5.2% vs 2.1% normal volatility = ~2.47x volatility ratio
    volume: 11000000,
    averageVolume: 11000000,
    high52: 1179.05,
    low52: 603.60,
    timestamp: new Date().toISOString(),
    status: 'FRESH' as const,
    isDemo: true,
  };
  const analysisSurge = ChangeDetectionEngine.analyze(mockSurgeQuote, 2.1);
  assert.ok(analysisSurge.reasons.some((r) => r.id === 'volatility_anomaly' || r.id === 'significant_price_move'));
  assert.ok(analysisSurge.volatilityRatio > 2.0);
  console.log(`   ✓ Detected price surge (${analysisSurge.volatilityRatio}x volatility ratio)`);

  // Test 4: Unusual Volume Detection
  console.log('🧪 Test 4: Unusual Volume Detection');
  const mockVolumeSpikeQuote = {
    ...mockSurgeQuote,
    changePercent: 0.5, // Small price move
    volume: 28600000, // 2.6x normal volume
    averageVolume: 11000000,
  };
  const analysisVol = ChangeDetectionEngine.analyze(mockVolumeSpikeQuote, 2.1);
  assert.ok(analysisVol.reasons.some((r) => r.id === 'volume_spike'));
  assert.strictEqual(analysisVol.volumeRatio, 2.6);
  console.log('   ✓ Detected 2.6x volume spike anomaly');

  // Test 5: 52-Week High & Low Proximity
  console.log('🧪 Test 5: 52-Week Proximity Detection');
  const mockNearHighQuote = {
    ...mockSurgeQuote,
    price: 1175.00,
    high52: 1179.05, // within 0.3% of 52-week high
    low52: 600.00,
  };
  const analysisHigh = ChangeDetectionEngine.analyze(mockNearHighQuote, 2.1);
  assert.strictEqual(analysisHigh.isNear52WeekHigh, true);
  assert.ok(analysisHigh.reasons.some((r) => r.id === 'near_52w_high'));
  console.log('   ✓ Detected proximity to 52-week high');

  // Test 6: Attention Score Calculation & Sensitivity Scaling
  console.log('🧪 Test 6: Attention Score Calculation & Sensitivity');
  const scoreBalanced = AttentionScoringEngine.calculate(analysisSurge, 'BALANCED');
  const scoreLow = AttentionScoringEngine.calculate(analysisSurge, 'LOW');
  const scoreHigh = AttentionScoringEngine.calculate(analysisSurge, 'HIGH');

  assert.ok(scoreBalanced.score >= 0 && scoreBalanced.score <= 100);
  assert.ok(scoreLow.score <= scoreBalanced.score, 'LOW sensitivity should dampen score');
  assert.ok(scoreHigh.score >= scoreBalanced.score, 'HIGH sensitivity should increase score');
  assert.strictEqual(scoreBalanced.needsAttention, true);
  console.log(`   ✓ Score BALANCED: ${scoreBalanced.score}, LOW: ${scoreLow.score}, HIGH: ${scoreHigh.score}`);

  // Test 7: Personal Baseline & Fallback Behavior
  console.log('🧪 Test 7: Personal Baseline Fallback');
  const baseline = await SnapshotsService.getPersonalBaseline('RELIANCE');
  assert.ok(baseline.volatilityAvgPercent > 0);
  assert.ok(baseline.status === 'CALCULATED' || baseline.status === 'UNAVAILABLE_FALLBACK_DEFAULT');
  console.log(`   ✓ Baseline status: ${baseline.status} (volatility: ±${baseline.volatilityAvgPercent}%)`);

  // Test 8: Stale/Unavailable Data Handling
  console.log('🧪 Test 8: Stale/Unavailable Data Trust Handling');
  const provider = new DemoMarketDataProvider();
  const invalidQuote = await provider.getQuote('INVALID_TEST');
  assert.strictEqual(invalidQuote.status, 'UNAVAILABLE');
  assert.strictEqual(invalidQuote.isDemo, true);
  console.log('   ✓ Stale/Unavailable data status properly tagged without silent failure');

  console.log('\n✅ ALL 8 BACKEND TEST SUITES PASSED CLEANLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});

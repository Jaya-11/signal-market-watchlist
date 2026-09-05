import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function runFullQA() {
  console.log('🔍 Starting SIGNAL End-to-End Programmatic QA & Integration Audit...\n');

  // 1. Route Verification
  console.log('🌐 1. Verifying Application Page Routes & HTTP Statuses...');
  const routesToTest = [
    { path: '/dashboard', label: 'Canonical Dashboard' },
    { path: '/watchlist', label: 'Watchlist Management' },
    { path: '/stock/RELIANCE', label: 'Stock Detail (RELIANCE)' },
    { path: '/history', label: 'Change Timeline History' },
    { path: '/settings', label: 'Product Settings' },
    { path: '/login', label: 'Login Experience' },
    { path: '/api/health', label: 'Backend Health Check' },
  ];

  for (const r of routesToTest) {
    const res = await fetch(`${BASE_URL}${r.path}`);
    assert.strictEqual(res.status, 200, `Route ${r.path} should return 200 OK`);
    console.log(`   ✓ ${r.label} (${r.path}) -> 200 OK`);
  }

  // Verify Root Redirect
  const rootRes = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
  assert.ok(rootRes.status === 307 || rootRes.status === 308 || rootRes.status === 200, 'Root / should redirect or render dashboard');
  console.log(`   ✓ Root / redirect to /dashboard -> ${rootRes.status}`);

  // 2. Watchlist CRUD & Duplicate Stock Operations
  console.log('\n📋 2. Testing Watchlist Operations & Input Validation...');
  const wlGetRes = await fetch(`${BASE_URL}/api/watchlists`);
  const wlGetData = await wlGetRes.json();
  assert.strictEqual(wlGetRes.status, 200);
  assert.ok(Array.isArray(wlGetData.watchlists));
  console.log(`   ✓ GET /api/watchlists returned ${wlGetData.watchlists.length} watchlist(s)`);

  // Create Watchlist
  const createRes = await fetch(`${BASE_URL}/api/watchlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'QA Test Watchlist' }),
  });
  assert.strictEqual(createRes.status, 201, 'POST /api/watchlists should return 201 Created');
  const createData = await createRes.json();
  const createdWlId = createData.watchlist.id;
  assert.strictEqual(createData.watchlist.name, 'QA Test Watchlist');
  console.log(`   ✓ POST /api/watchlists created watchlist ID: ${createdWlId}`);

  // Rename Watchlist
  const renameRes = await fetch(`${BASE_URL}/api/watchlists/${createdWlId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'QA Renamed Watchlist' }),
  });
  assert.strictEqual(renameRes.status, 200);
  const renameData = await renameRes.json();
  assert.strictEqual(renameData.watchlist.name, 'QA Renamed Watchlist');
  console.log('   ✓ PATCH /api/watchlists/[id] renamed watchlist successfully');

  // Add Stock to Watchlist
  const addStockRes = await fetch(`${BASE_URL}/api/watchlists/${createdWlId}/stocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol: 'INFY', companyName: 'Infosys Limited' }),
  });
  assert.strictEqual(addStockRes.status, 201);
  console.log('   ✓ POST /api/watchlists/[id]/stocks added stock INFY');

  // Duplicate Stock Handling Test
  const dupStockRes = await fetch(`${BASE_URL}/api/watchlists/${createdWlId}/stocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol: 'INFY', companyName: 'Infosys Limited' }),
  });
  assert.strictEqual(dupStockRes.status, 409, 'Duplicate stock addition should return 409 Conflict');
  const dupData = await dupStockRes.json();
  assert.strictEqual(dupData.error.code, 'DUPLICATE_STOCK');
  console.log('   ✓ Duplicate stock addition properly rejected with 409 DUPLICATE_STOCK');

  // 3. Market Data & Attention Score Breakdown
  console.log('\n📊 3. Testing Watchlist Market Data & Attention Scoring APIs...');
  const marketRes = await fetch(`${BASE_URL}/api/watchlists/${createdWlId}/market`);
  assert.strictEqual(marketRes.status, 200);
  const marketData = await marketRes.json();
  assert.strictEqual(marketData.items.length, 1);
  const stockItem = marketData.items[0];
  assert.strictEqual(stockItem.symbol, 'INFY');
  assert.ok(typeof stockItem.attentionScore === 'number');
  assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(stockItem.severity));
  assert.ok(stockItem.dataTrust.isDemo === true);
  console.log(`   ✓ GET /api/watchlists/[id]/market -> INFY Attention Score: ${stockItem.attentionScore} (${stockItem.severity})`);

  // 4. "Since Last Visit" Report
  console.log('\n🕒 4. Testing "Since Your Last Visit" Analysis Report...');
  const changesRes = await fetch(`${BASE_URL}/api/watchlists/${createdWlId}/changes`);
  assert.strictEqual(changesRes.status, 200);
  const changesData = await changesRes.json();
  assert.ok(changesData.summaryCounters.totalStocks >= 1);
  console.log(`   ✓ GET /api/watchlists/[id]/changes -> Tracked stocks: ${changesData.summaryCounters.totalStocks}, Meaningful: ${changesData.summaryCounters.meaningfulChanges}`);

  // 5. Stock Detail & History APIs
  console.log('\n📈 5. Testing Stock Detail & History APIs...');
  const detailRes = await fetch(`${BASE_URL}/api/stocks/RELIANCE`);
  assert.strictEqual(detailRes.status, 200);
  const detailData = await detailRes.json();
  assert.strictEqual(detailData.stock.symbol, 'RELIANCE');
  assert.ok(detailData.personalBaseline.status);
  console.log(`   ✓ GET /api/stocks/RELIANCE -> Baseline status: ${detailData.personalBaseline.status}`);

  const histRes = await fetch(`${BASE_URL}/api/stocks/RELIANCE/history?days=30`);
  assert.strictEqual(histRes.status, 200);
  const histData = await histRes.json();
  assert.ok(Array.isArray(histData.bars));
  assert.ok(histData.bars.length > 0);
  console.log(`   ✓ GET /api/stocks/RELIANCE/history -> Returned ${histData.bars.length} historical bars`);

  // Stock Search API
  const searchRes = await fetch(`${BASE_URL}/api/stocks/search?q=tata`);
  assert.strictEqual(searchRes.status, 200);
  const searchData = await searchRes.json();
  assert.ok(searchData.results.length > 0);
  console.log(`   ✓ GET /api/stocks/search?q=tata -> Found ${searchData.results.length} result(s)`);

  // 6. User Preferences & Sensitivity API
  console.log('\n⚙️ 6. Testing User Preferences & Sensitivity Toggle...');
  const prefRes = await fetch(`${BASE_URL}/api/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sensitivity: 'HIGH' }),
  });
  assert.strictEqual(prefRes.status, 200);
  const prefData = await prefRes.json();
  assert.strictEqual(prefData.preference.sensitivity, 'HIGH');
  console.log('   ✓ POST /api/preferences updated sensitivity to HIGH');

  // Clean up test watchlist
  const deleteWlRes = await fetch(`${BASE_URL}/api/watchlists/${createdWlId}`, { method: 'DELETE' });
  assert.strictEqual(deleteWlRes.status, 200);
  console.log('   ✓ Cleaned up QA test watchlist');

  console.log('\n🎉 END-TO-END QA & INTEGRATION AUDIT COMPLETED WITH ZERO ERRORS!\n');
}

runFullQA().catch((err) => {
  console.error('❌ E2E QA Test failed:', err);
  process.exit(1);
});

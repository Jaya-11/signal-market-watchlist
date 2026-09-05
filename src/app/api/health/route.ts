import { NextResponse } from 'next/server';
import { getMarketDataProvider } from '@/modules/market-data';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = 'unavailable_or_unmigrated';
  }

  // Market Data Provider Check
  let marketProviderStatus = 'healthy';
  let demoDataAvailable = false;
  try {
    const provider = getMarketDataProvider();
    const testQuote = await provider.getQuote('AAPL');
    if (testQuote && testQuote.price > 0) {
      demoDataAvailable = true;
    }
  } catch {
    marketProviderStatus = 'error';
  }

  return NextResponse.json({
    status: 'ok',
    name: 'SIGNAL Market Watchlist Service',
    version: '1.0.0-foundation',
    timestamp: new Date().toISOString(),
    responseLatencyMs: Date.now() - startTime,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      note: dbStatus === 'healthy' ? 'Connected to PostgreSQL' : 'Database URL configured; start Postgres daemon to connect',
    },
    marketData: {
      provider: 'DeterministicDemoDataProvider',
      status: marketProviderStatus,
      demoDataAvailable,
      freshness: 'FRESH',
      isDemo: true,
    },
    environment: process.env.NODE_ENV || 'development',
  });
}

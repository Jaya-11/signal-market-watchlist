export type FreshnessStatus = 'FRESH' | 'DELAYED' | 'STALE' | 'UNAVAILABLE';

export interface MarketQuote {
  symbol: string;
  companyName: string;
  exchange: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  averageVolume: number;
  high52: number;
  low52: number;
  timestamp: string;
  status: FreshnessStatus;
  isDemo: boolean;
  notes?: string;
}

export interface HistoricalBar {
  timestamp: string;
  close: number;
  volume: number;
}

export interface StockHistory {
  symbol: string;
  bars: HistoricalBar[];
  volatilityAvgPercent: number; // typical daily standard deviation move %
  isBaselineCalculated: boolean;
  sampleCount: number;
}

export interface SearchResultStock {
  symbol: string;
  companyName: string;
  exchange: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE';
  sector?: string;
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<MarketQuote>;
  getQuotes(symbols: string[]): Promise<MarketQuote[]>;
  getHistory(symbol: string, days?: number): Promise<StockHistory>;
  searchStocks(query: string): Promise<SearchResultStock[]>;
}

/**
 * Deterministic Demo Market Data Provider
 * Provides reproducible, realistic market data for development and testing.
 * Explicitly flags all responses with isDemo: true and never disguises demo data as live data.
 */
export class DemoMarketDataProvider implements MarketDataProvider {
  private static MOCK_CATALOG: Record<
    string,
    { name: string; exchange: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE'; basePrice: number; avgVolume: number; high52: number; low52: number; volatility: number; sector: string }
  > = {
    // Indian Equities (NSE/BSE)
    RELIANCE: { name: 'Reliance Industries Ltd.', exchange: 'NSE', basePrice: 2980.50, avgVolume: 6500000, high52: 3217.90, low52: 2220.30, volatility: 0.9, sector: 'Energy' },
    TCS: { name: 'Tata Consultancy Services Ltd.', exchange: 'NSE', basePrice: 4250.00, avgVolume: 2200000, high52: 4585.90, low52: 3313.00, volatility: 0.8, sector: 'Technology' },
    INFY: { name: 'Infosys Limited', exchange: 'NSE', basePrice: 1890.25, avgVolume: 5800000, high52: 1978.00, low52: 1351.65, volatility: 1.1, sector: 'Technology' },
    HDFCBANK: { name: 'HDFC Bank Limited', exchange: 'NSE', basePrice: 1640.80, avgVolume: 12500000, high52: 1794.00, low52: 1363.55, volatility: 0.85, sector: 'Financials' },
    ICICIBANK: { name: 'ICICI Bank Limited', exchange: 'NSE', basePrice: 1210.40, avgVolume: 9800000, high52: 1257.80, low52: 928.15, volatility: 0.95, sector: 'Financials' },
    SBIN: { name: 'State Bank of India', exchange: 'NSE', basePrice: 815.60, avgVolume: 14200000, high52: 912.10, low52: 560.50, volatility: 1.4, sector: 'Financials' },
    ITC: { name: 'ITC Limited', exchange: 'NSE', basePrice: 505.20, avgVolume: 8900000, high52: 528.50, low52: 399.30, volatility: 0.65, sector: 'Consumer Goods' },
    LT: { name: 'Larsen & Toubro Ltd.', exchange: 'NSE', basePrice: 3620.00, avgVolume: 1800000, high52: 3919.90, low52: 2850.00, volatility: 1.0, sector: 'Industrials' },
    AXISBANK: { name: 'Axis Bank Limited', exchange: 'NSE', basePrice: 1175.30, avgVolume: 7400000, high52: 1339.65, low52: 932.30, volatility: 1.2, sector: 'Financials' },
    TATAMOTORS: { name: 'Tata Motors Limited', exchange: 'NSE', basePrice: 1045.10, avgVolume: 11000000, high52: 1179.05, low52: 603.60, volatility: 2.1, sector: 'Automotive' },
    MARUTI: { name: 'Maruti Suzuki India Ltd.', exchange: 'NSE', basePrice: 12350.00, avgVolume: 450000, high52: 13680.00, low52: 9735.00, volatility: 1.15, sector: 'Automotive' },
    SUNPHARMA: { name: 'Sun Pharmaceutical Industries Ltd.', exchange: 'NSE', basePrice: 1780.40, avgVolume: 2600000, high52: 1835.00, low52: 1110.00, volatility: 0.9, sector: 'Healthcare' },
    BHARTIARTL: { name: 'Bharti Airtel Limited', exchange: 'NSE', basePrice: 1560.90, avgVolume: 4900000, high52: 1612.00, low52: 895.00, volatility: 0.9, sector: 'Telecom' },
    WIPRO: { name: 'Wipro Limited', exchange: 'NSE', basePrice: 525.80, avgVolume: 6100000, high52: 569.00, low52: 375.00, volatility: 1.3, sector: 'Technology' },
    HINDUNILVR: { name: 'Hindustan Unilever Ltd.', exchange: 'NSE', basePrice: 2780.00, avgVolume: 1900000, high52: 2905.00, low52: 2172.00, volatility: 0.6, sector: 'Consumer Goods' },

    // US Equities
    AAPL: { name: 'Apple Inc.', exchange: 'NASDAQ', basePrice: 224.50, avgVolume: 48500000, high52: 237.23, low52: 164.08, volatility: 0.9, sector: 'Technology' },
    NVDA: { name: 'NVIDIA Corporation', exchange: 'NASDAQ', basePrice: 119.30, avgVolume: 62000000, high52: 140.76, low52: 40.85, volatility: 2.1, sector: 'Technology' },
    TSLA: { name: 'Tesla, Inc.', exchange: 'NASDAQ', basePrice: 210.80, avgVolume: 75000000, high52: 271.00, low52: 138.80, volatility: 2.8, sector: 'Automotive' },
    MSFT: { name: 'Microsoft Corporation', exchange: 'NASDAQ', basePrice: 417.00, avgVolume: 21000000, high52: 468.35, low52: 309.45, volatility: 1.1, sector: 'Technology' },
    AMZN: { name: 'Amazon.com, Inc.', exchange: 'NASDAQ', basePrice: 178.25, avgVolume: 38000000, high52: 201.20, low52: 118.35, volatility: 1.4, sector: 'Consumer Cyclical' },
    GOOGL: { name: 'Alphabet Inc.', exchange: 'NASDAQ', basePrice: 165.40, avgVolume: 24000000, high52: 191.75, low52: 120.21, volatility: 1.2, sector: 'Technology' },
    META: { name: 'Meta Platforms, Inc.', exchange: 'NASDAQ', basePrice: 512.10, avgVolume: 15000000, high52: 544.23, low52: 279.40, volatility: 1.8, sector: 'Technology' },
  };

  async getQuote(symbol: string): Promise<MarketQuote> {
    const cleanSymbol = symbol.toUpperCase().replace('.', '_');
    const info = DemoMarketDataProvider.MOCK_CATALOG[cleanSymbol] || {
      name: `${cleanSymbol} Corporation`,
      exchange: 'NSE' as const,
      basePrice: 500.0,
      avgVolume: 5000000,
      high52: 600.0,
      low52: 400.0,
      volatility: 1.2,
      sector: 'General',
    };

    // Deterministic simulation based on symbol hash & minute bucket
    const now = new Date();
    const minute = now.getMinutes();
    const charSum = cleanSymbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const seed = (minute + charSum) % 100;

    let moveFactor = (seed - 50) / 600; // default -8% to +8%
    let volumeMultiplier = 1.0 + ((seed % 12) / 10);

    // Specific reproducible scenarios for testing
    if (cleanSymbol === 'TATAMOTORS') {
      moveFactor = 0.052; // +5.2% surge (unusual vs 2.1% vol)
      volumeMultiplier = 2.6; // 2.6x volume spike
    } else if (cleanSymbol === 'SBIN') {
      moveFactor = -0.048; // -4.8% drop
      volumeMultiplier = 1.9;
    } else if (cleanSymbol === 'RELIANCE') {
      moveFactor = 0.004; // +0.4% normal move
      volumeMultiplier = 0.98;
    } else if (cleanSymbol === 'TCS') {
      moveFactor = 0.002;
      volumeMultiplier = 1.02;
    } else if (cleanSymbol === 'NVDA') {
      moveFactor = 0.048;
      volumeMultiplier = 2.4;
    }

    // Determine status (mostly FRESH, but allow forced STALE/UNAVAILABLE test cases if requested)
    let status: FreshnessStatus = 'FRESH';
    if (cleanSymbol === 'INVALID_TEST') {
      status = 'UNAVAILABLE';
    } else if (cleanSymbol === 'STALE_TEST') {
      status = 'STALE';
    }

    const currentPrice = Number((info.basePrice * (1 + moveFactor)).toFixed(2));
    const change = Number((currentPrice - info.basePrice).toFixed(2));
    const changePercent = Number(((change / info.basePrice) * 100).toFixed(2));
    const currentVolume = Math.round(info.avgVolume * volumeMultiplier);

    return {
      symbol: cleanSymbol.replace('_', '.'),
      companyName: info.name,
      exchange: info.exchange,
      price: currentPrice,
      change,
      changePercent,
      volume: currentVolume,
      averageVolume: info.avgVolume,
      high52: info.high52,
      low52: info.low52,
      timestamp: now.toISOString(),
      status,
      isDemo: true,
      notes: 'Deterministic Demo Market Service (NSE/BSE & US Universe)',
    };
  }

  async getQuotes(symbols: string[]): Promise<MarketQuote[]> {
    return Promise.all(symbols.map((s) => this.getQuote(s)));
  }

  async getHistory(symbol: string, days = 30): Promise<StockHistory> {
    const quote = await this.getQuote(symbol);
    const cleanSymbol = symbol.toUpperCase().replace('.', '_');
    const info = DemoMarketDataProvider.MOCK_CATALOG[cleanSymbol] || { volatility: 1.2 };

    const bars: HistoricalBar[] = [];
    const now = new Date();
    let price = quote.price;

    for (let i = days; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const varPct = (((i * 13 + cleanSymbol.length) % 17) - 8) * 0.003;
      price = Number((price * (1 + varPct)).toFixed(2));
      bars.push({
        timestamp: d.toISOString().split('T')[0],
        close: price,
        volume: Math.round(quote.averageVolume * (0.85 + ((i % 7) * 0.05))),
      });
    }

    return {
      symbol: quote.symbol,
      bars,
      volatilityAvgPercent: info.volatility,
      isBaselineCalculated: true,
      sampleCount: bars.length,
    };
  }

  async searchStocks(query: string): Promise<SearchResultStock[]> {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Return top featured Indian equities by default
      return Object.entries(DemoMarketDataProvider.MOCK_CATALOG)
        .slice(0, 10)
        .map(([sym, item]) => ({
          symbol: sym.replace('_', '.'),
          companyName: item.name,
          exchange: item.exchange,
          sector: item.sector,
        }));
    }

    return Object.entries(DemoMarketDataProvider.MOCK_CATALOG)
      .filter(
        ([sym, item]) =>
          sym.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q)
      )
      .map(([sym, item]) => ({
        symbol: sym.replace('_', '.'),
        companyName: item.name,
        exchange: item.exchange,
        sector: item.sector,
      }));
  }
}

export function getMarketDataProvider(): MarketDataProvider {
  return new DemoMarketDataProvider();
}

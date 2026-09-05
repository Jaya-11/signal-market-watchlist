'use client';

import React, { useState, useEffect, use } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DataFreshnessBadge } from '@/components/ui/DataFreshnessBadge';
import { AttentionScoreBadge } from '@/components/ui/AttentionScoreBadge';
import { StructuredReason } from '@/modules/change-detection';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  BarChart2,
  Compass,
  AlertCircle,
  Clock,
  Database,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface StockDetailData {
  stock: {
    symbol: string;
    companyName: string;
    exchange: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    averageVolume: number;
    high52: number;
    low52: number;
  };
  attentionScore: {
    score: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    summary: string;
    reasons: StructuredReason[];
    needsAttention: boolean;
  };
  personalBaseline: {
    volatilityAvgPercent: number;
    averageVolume: number;
    sampleCount: number;
    status: 'CALCULATED' | 'UNAVAILABLE_FALLBACK_DEFAULT';
    note: string;
  };
  dataTrust: {
    timestamp: string;
    dataStatus: string;
    isDemo: boolean;
    notes?: string;
  };
}

interface HistoricalBar {
  timestamp: string;
  close: number;
  volume: number;
}

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const cleanSymbol = symbol.toUpperCase().trim();

  const [detail, setDetail] = useState<StockDetailData | null>(null);
  const [historyBars, setHistoryBars] = useState<HistoricalBar[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [days, setDays] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const detailRes = await fetch(`/api/stocks/${cleanSymbol}`);
        if (!detailRes.ok) {
          throw new Error(`Stock '${cleanSymbol}' not found or market data unavailable.`);
        }
        const detailData = await detailRes.json();
        setDetail(detailData);

        const histRes = await fetch(`/api/stocks/${cleanSymbol}/history?days=${days}`);
        if (histRes.ok) {
          const histData = await histRes.json();
          setHistoryBars(histData.bars || []);
          setTimeline(histData.marketStoryTimeline || []);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stock detail');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [cleanSymbol, days]);

  return (
    <AppShell>
      <div className="space-y-8 animate-in fade-in duration-300">
        {isLoading && (
          <div className="space-y-6">
            <div className="h-32 bg-slate-900/60 rounded-3xl animate-pulse border border-slate-800/60" />
            <div className="h-64 bg-slate-900/60 rounded-3xl animate-pulse border border-slate-800/60" />
          </div>
        )}

        {error && !isLoading && (
          <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-3">
            <h2 className="text-xl font-bold text-white">Stock Data Unavailable</h2>
            <p className="text-sm text-rose-300/80">{error}</p>
          </div>
        )}

        {!isLoading && detail && (
          <div className="space-y-8">
            {/* Header Section */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-extrabold font-mono text-white">{detail.stock.symbol}</h1>
                    <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-slate-800 text-slate-300 rounded border border-slate-700">
                      {detail.stock.exchange}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{detail.stock.companyName}</p>
                </div>

                <div className="flex items-baseline gap-4 sm:text-right">
                  <div>
                    <span className="text-3xl font-extrabold font-mono text-white">{formatCurrency(detail.stock.price, detail.stock.exchange, detail.stock.symbol)}</span>
                    <div className="flex items-center sm:justify-end gap-1 text-sm font-mono font-semibold mt-1">
                      {detail.stock.changePercent >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-rose-400" />
                      )}
                      <span className={detail.stock.changePercent < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {detail.stock.changePercent > 0 ? '+' : ''}{detail.stock.changePercent}% ({formatCurrency(detail.stock.change, detail.stock.exchange, detail.stock.symbol)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <AttentionScoreBadge
                  score={detail.attentionScore.score}
                  severity={detail.attentionScore.severity}
                  symbol={detail.stock.symbol}
                  companyName={detail.stock.companyName}
                  summary={detail.attentionScore.summary}
                  reasons={detail.attentionScore.reasons}
                />
                <DataFreshnessBadge
                  status={detail.dataTrust.dataStatus as any}
                  timestamp={detail.dataTrust.timestamp}
                  isDemo={detail.dataTrust.isDemo}
                />
              </div>
            </div>

            {/* Demo Baseline Status Card */}
            {detail.personalBaseline.status === 'UNAVAILABLE_FALLBACK_DEFAULT' && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-3">
                <Database className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                    DEMO BASELINE ACTIVE
                  </h4>
                  <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                    {detail.personalBaseline.note}
                  </p>
                </div>
              </div>
            )}

            {/* Price History Chart (Recharts) */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    PRICE HISTORY
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Historical closing prices from SIGNAL market observations.</p>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-3 py-1 text-xs font-mono font-semibold rounded-lg transition ${
                        days === d ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}D
                    </button>
                  ))}
                </div>
              </div>

              {historyBars.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                  No historical snapshot bars collected yet.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyBars} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="timestamp" stroke="#64748B" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#FFF' }}
                        formatter={(val: any) => [formatCurrency(Number(val), detail.stock.exchange, detail.stock.symbol), 'Close Price']}
                      />
                      <Area type="monotone" dataKey="close" stroke="#3B82F6" strokeWidth={2} fill="url(#priceGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Key Signals Grid */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                KEY SIGNALS & METRICS
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
                    <span>Baseline Volatility</span>
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">±{detail.personalBaseline.volatilityAvgPercent}%</p>
                  <p className="text-xs text-slate-400">Typical daily move standard deviation for {detail.stock.symbol}.</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
                    <span>Volume Ratio</span>
                    <BarChart2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">
                    {(detail.stock.volume / (detail.stock.averageVolume || 1)).toFixed(2)}x
                  </p>
                  <p className="text-xs text-slate-400">
                    Current ({(detail.stock.volume / 1e6).toFixed(1)}M) vs 30-day avg ({(detail.stock.averageVolume / 1e6).toFixed(1)}M).
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase">
                    <span>52-Week Range</span>
                    <Compass className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-white">
                    {formatCurrency(detail.stock.low52, detail.stock.exchange, detail.stock.symbol).replace(/\.\d+$/, '')} – {formatCurrency(detail.stock.high52, detail.stock.exchange, detail.stock.symbol).replace(/\.\d+$/, '')}
                  </p>
                  <p className="text-xs text-slate-400">Trading range over the past 52 trading weeks.</p>
                </div>
              </div>
            </div>

            {/* Why This Matters */}
            <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 space-y-3">
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-blue-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                WHY THIS MATTERS
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed">{detail.attentionScore.summary}</p>
            </div>

            {/* Chronological Market Story */}
            {timeline.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  CHRONOLOGICAL MARKET STORY
                </h2>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {timeline.map((item: any, idx: number) => (
                    <div key={idx} className="relative flex items-start gap-4">
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-slate-950" />
                      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex-1">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                          <span>{item.date}</span>
                          <span className="font-bold text-white">{formatCurrency(item.price, detail.stock.exchange, detail.stock.symbol)} ({item.changePercent > 0 ? '+' : ''}{item.changePercent}%)</span>
                        </div>
                        {item.events.map((ev: any, eIdx: number) => (
                          <div key={eIdx} className="mt-2">
                            <span className="text-xs font-semibold text-white">{ev.title}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{ev.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

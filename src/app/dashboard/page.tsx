'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DataFreshnessBadge } from '@/components/ui/DataFreshnessBadge';
import { AttentionScoreBadge } from '@/components/ui/AttentionScoreBadge';
import { StructuredReason } from '@/modules/change-detection';
import { formatCurrency } from '@/lib/utils';
import {
  AlertTriangle,
  Flame,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Bookmark,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';

interface WatchlistMeta {
  id: string;
  name: string;
}

interface GroupedMarketStoryEvent {
  symbol: string;
  companyName: string;
  exchange?: string;
  changePercent: number;
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  highlights: string[];
  time: string;
}

interface StockAttentionItem {
  symbol: string;
  companyName: string;
  exchange?: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE';
  price: number;
  changePercent: number;
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  reasons: StructuredReason[];
  freshness: string;
  isDemo: boolean;
}

interface UnchangedStockDetail {
  symbol: string;
  companyName: string;
  exchange?: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE';
  price: number;
  changePercent: number;
  normalVolatility: number;
  reason: string;
}

interface ChangesReport {
  lastVisitedAt: string;
  summaryCounters: {
    totalStocks: number;
    meaningfulChanges: number;
    highAttention: number;
    mediumAttention: number;
    unchanged: number;
  };
  highAttentionItems: StockAttentionItem[];
  mediumAttentionItems: StockAttentionItem[];
  unchangedSummary: {
    count: number;
    symbols: string[];
    details?: UnchangedStockDetail[];
    note: string;
  };
}

export default function DashboardPage() {
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [watchlists, setWatchlists] = useState<WatchlistMeta[]>([]);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null);

  const [report, setReport] = useState<ChangesReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnchangedExpanded, setIsUnchangedExpanded] = useState(false);
  const [isWhyNotExpanded, setIsWhyNotExpanded] = useState(false);

  // Initial fetch watchlists & preferences
  useEffect(() => {
    async function init() {
      try {
        const prefRes = await fetch('/api/preferences');
        if (prefRes.ok) {
          const prefData = await prefRes.json();
          setUserName(prefData.user?.name);
          setUserEmail(prefData.user?.email);
        }

        const wlRes = await fetch('/api/watchlists');
        if (wlRes.ok) {
          const wlData = await wlRes.json();
          const lists: WatchlistMeta[] = wlData.watchlists || [];
          setWatchlists(lists);
          if (lists.length > 0) {
            setSelectedWatchlistId(lists[0].id);
          }
        }
      } catch (err) {
        console.error('Failed initialization:', err);
      }
    }
    init();
  }, []);

  // Fetch changes report when watchlist selected
  const fetchChanges = async (watchlistId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/changes`);
      if (!res.ok) {
        throw new Error('Could not fetch market changes report');
      }
      const data = await res.json();
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWatchlistId) {
      fetchChanges(selectedWatchlistId);
    }
  }, [selectedWatchlistId]);

  // Grouped Market Story generator
  const generateGroupedMarketStoryEvents = (): GroupedMarketStoryEvent[] => {
    if (!report) return [];

    const grouped: GroupedMarketStoryEvent[] = [];
    const allFlaggedItems = [...report.highAttentionItems, ...report.mediumAttentionItems];

    allFlaggedItems.forEach((item) => {
      const highlights = item.reasons.map((r) => `${r.title}: ${r.description}`);
      grouped.push({
        symbol: item.symbol,
        companyName: item.companyName,
        exchange: item.exchange,
        changePercent: item.changePercent,
        score: item.score,
        severity: item.severity,
        highlights,
        time: 'Current Session',
      });
    });

    return grouped;
  };

  const groupedMarketEvents = generateGroupedMarketStoryEvents();

  return (
    <AppShell userName={userName} userEmail={userEmail}>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header Section with Core Product Value Proposition */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {report ? `${report.summaryCounters.meaningfulChanges} things deserve your attention` : 'Smart Market Watchlist'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono mt-2">
              Your watchlist changed
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {report
                ? `${report.summaryCounters.meaningfulChanges} of ${report.summaryCounters.totalStocks} stocks changed meaningfully since your last visit.`
                : "Here's what meaningfully changed since your last visit."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {watchlists.length > 1 && (
              <select
                value={selectedWatchlistId || ''}
                onChange={(e) => setSelectedWatchlistId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                {watchlists.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => selectedWatchlistId && fetchChanges(selectedWatchlistId)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800/60" />
              ))}
            </div>
            <div className="h-64 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800/60" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white text-base">We couldn&apos;t refresh market data</h3>
              <p className="text-sm text-rose-300/80 mt-1">{error}. Your cached view remains visible below.</p>
              <button
                onClick={() => selectedWatchlistId && fetchChanges(selectedWatchlistId)}
                className="mt-3 px-3.5 py-1.5 text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg border border-rose-500/30 transition"
              >
                Retry Request
              </button>
            </div>
          </div>
        )}

        {/* Report Content */}
        {!isLoading && report && (
          <div className="space-y-10">
            {/* Compact Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Meaningful Changes</span>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-2">
                  {report.summaryCounters.meaningfulChanges}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">Out of {report.summaryCounters.totalStocks} tracked stocks</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-rose-400 uppercase tracking-wider">Needs Attention</span>
                  <Flame className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-400 mt-2">
                  {report.summaryCounters.highAttention}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">High priority anomalies</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Worth Watching</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400 mt-2">
                  {report.summaryCounters.mediumAttention}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">Medium volatility items</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Unchanged</span>
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-300 mt-2">
                  {report.summaryCounters.unchanged}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">Traded within normal bounds</span>
              </div>
            </div>

            {/* Empty Watchlist State */}
            {report.summaryCounters.totalStocks === 0 && (
              <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 text-blue-400 flex items-center justify-center">
                  <Bookmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">No stocks in this watchlist yet</h3>
                  <p className="text-sm text-slate-400 mt-1">Search for a company to start tracking meaningful changes.</p>
                </div>
                <Link
                  href="/watchlist"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition"
                >
                  Manage Watchlist →
                </Link>
              </div>
            )}

            {/* PRIMARY SECTION: NEEDS YOUR ATTENTION (HIGH) */}
            {report.highAttentionItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    NEEDS YOUR ATTENTION
                  </h2>
                  <span className="text-xs font-mono text-rose-400 font-semibold px-2.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    {report.highAttentionItems.length} HIGH PRIORITY
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.highAttentionItems.map((item) => (
                    <div
                      key={item.symbol}
                      className="p-5 rounded-2xl bg-slate-900/90 border border-rose-500/30 hover:border-rose-500/50 transition shadow-xl shadow-rose-950/20 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/stock/${item.symbol}`}
                                className="text-xl font-bold font-mono text-white hover:text-blue-400 transition"
                              >
                                {item.symbol}
                              </Link>
                              {item.exchange && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                                  {item.exchange}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{item.companyName}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-extrabold font-mono text-white">
                              {formatCurrency(item.price, item.exchange, item.symbol)}
                            </span>
                            <div className="flex items-center justify-end text-xs font-mono font-semibold text-emerald-400 mt-0.5">
                              {item.changePercent >= 0 ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                              )}
                              <span className={item.changePercent < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                {item.changePercent > 0 ? '+' : ''}{item.changePercent}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <AttentionScoreBadge
                            score={item.score}
                            severity={item.severity}
                            symbol={item.symbol}
                            companyName={item.companyName}
                            summary={item.summary}
                            reasons={item.reasons}
                          />
                        </div>

                        <p className="text-xs text-slate-300 mt-3 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                          {item.summary}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                        <DataFreshnessBadge status={item.freshness as any} isDemo={item.isDemo} compact />
                        <Link
                          href={`/stock/${item.symbol}`}
                          className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECONDARY SECTION: WORTH WATCHING (MEDIUM) */}
            {report.mediumAttentionItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    WORTH WATCHING
                  </h2>
                  <span className="text-xs font-mono text-amber-400 font-semibold px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    {report.mediumAttentionItems.length} MEDIUM
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.mediumAttentionItems.map((item) => (
                    <div
                      key={item.symbol}
                      className="p-5 rounded-2xl bg-slate-900/70 border border-amber-500/20 hover:border-amber-500/40 transition flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/stock/${item.symbol}`}
                                className="text-xl font-bold font-mono text-white hover:text-blue-400 transition"
                              >
                                {item.symbol}
                              </Link>
                              {item.exchange && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                                  {item.exchange}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{item.companyName}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-extrabold font-mono text-white">
                              {formatCurrency(item.price, item.exchange, item.symbol)}
                            </span>
                            <div className="flex items-center justify-end text-xs font-mono font-semibold text-emerald-400 mt-0.5">
                              {item.changePercent >= 0 ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                              )}
                              <span className={item.changePercent < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                {item.changePercent > 0 ? '+' : ''}{item.changePercent}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <AttentionScoreBadge
                            score={item.score}
                            severity={item.severity}
                            symbol={item.symbol}
                            companyName={item.companyName}
                            summary={item.summary}
                            reasons={item.reasons}
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                        <DataFreshnessBadge status={item.freshness as any} isDemo={item.isDemo} compact />
                        <Link
                          href={`/stock/${item.symbol}`}
                          className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* THIRD SECTION: NO MEANINGFUL CHANGE + WHY DIDN'T SIGNAL FLAG THE OTHERS */}
            {report.unchangedSummary.count > 0 && (
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-slate-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono">
                        {report.unchangedSummary.count} stock(s) haven&apos;t meaningfully changed
                      </h3>
                      <p className="text-xs text-slate-400">{report.unchangedSummary.note}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsWhyNotExpanded((prev) => !prev)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold font-mono text-blue-400 hover:text-blue-300 bg-blue-500/10 rounded-lg transition border border-blue-500/20"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Why didn&apos;t SIGNAL flag these?
                    </button>

                    <button
                      onClick={() => setIsUnchangedExpanded((prev) => !prev)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold font-mono text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                    >
                      {isUnchangedExpanded ? 'Collapse' : 'Inspect'}
                      {isUnchangedExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Compact List of Unchanged Stocks */}
                {isUnchangedExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-wrap gap-2 animate-in fade-in duration-200">
                    {report.unchangedSummary.symbols.map((sym) => (
                      <Link
                        key={sym}
                        href={`/stock/${sym}`}
                        className="px-3 py-1 text-xs font-mono font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition"
                      >
                        {sym}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Expandable Explanation: Why didn't SIGNAL flag the others? */}
                {isWhyNotExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 animate-in fade-in duration-200">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Noise Suppression Methodology
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      SIGNAL filters normal market variance using real baseline volatility bounds so your attention is focused on true anomalies:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {report.unchangedSummary.details && report.unchangedSummary.details.length > 0 ? (
                        report.unchangedSummary.details.map((dt) => (
                          <div key={dt.symbol} className="p-3 rounded-xl bg-slate-900 border border-slate-800/60 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-white flex items-center gap-1.5">
                                {dt.symbol}
                                {dt.exchange && (
                                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded">
                                    {dt.exchange}
                                  </span>
                                )}
                              </span>
                              <span className={dt.changePercent < 0 ? 'text-rose-400 font-mono font-bold' : 'text-emerald-400 font-mono font-bold'}>
                                {dt.changePercent > 0 ? '+' : ''}{dt.changePercent}%
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed">{dt.reason}</p>
                          </div>
                        ))
                      ) : (
                        report.unchangedSummary.symbols.map((sym) => (
                          <div key={sym} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/60 text-xs flex items-center justify-between">
                            <span className="font-mono font-bold text-white">{sym}</span>
                            <span className="text-slate-400 text-[11px]">Traded within normal volatility → no anomaly flag</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CHRONOLOGICAL MARKET STORY TIMELINE (Grouped per stock) */}
            {groupedMarketEvents.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white font-mono flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    CHRONOLOGICAL MARKET STORY
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Grouped signal events detected since your last visit.</p>
                </div>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {groupedMarketEvents.map((evt) => (
                    <div key={evt.symbol} className="relative flex items-start gap-4">
                      <div className="absolute -left-6 top-2 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-slate-950" />
                      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-mono text-white">{evt.symbol}</span>
                            {evt.exchange && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                                {evt.exchange}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{evt.companyName}</span>
                          </div>
                          <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-blue-600/10 text-blue-400 rounded border border-blue-500/20">
                            Attention: {evt.score} / 100
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                            Significant Move Detected ({evt.changePercent > 0 ? '+' : ''}{evt.changePercent}%)
                          </h4>
                          <p className="text-xs text-slate-400">Why SIGNAL flagged this:</p>
                          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                            {evt.highlights.map((h, idx) => (
                              <li key={idx}>{h}</li>
                            ))}
                          </ul>
                        </div>
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

'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { History as HistoryIcon, Search, Filter, AlertTriangle, TrendingUp, BarChart2, Compass } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

interface DetectedChangeEvent {
  id: string;
  symbol: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  previousValue: number;
  currentValue: number;
  reason: string;
  detectedAt: string;
}

export default function HistoryPage() {
  const [events, setEvents] = useState<DetectedChangeEvent[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load history events from user watchlists
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const wlRes = await fetch('/api/watchlists');
        if (wlRes.ok) {
          const wlData = await wlRes.json();
          const watchlists = wlData.watchlists || [];
          if (watchlists.length > 0) {
            const mRes = await fetch(`/api/watchlists/${watchlists[0].id}/market`);
            if (mRes.ok) {
              const mData = await mRes.json();
              const extracted: DetectedChangeEvent[] = [];
              (mData.items || []).forEach((item: any) => {
                (item.reasons || []).forEach((r: any, idx: number) => {
                  extracted.push({
                    id: `${item.symbol}-${r.id}-${idx}`,
                    symbol: item.symbol,
                    type: r.type || 'ANOMALY',
                    severity: item.severity,
                    previousValue: Number((item.price * (1 - item.changePercent / 100)).toFixed(2)),
                    currentValue: item.price,
                    reason: `${r.title}: ${r.description}`,
                    detectedAt: item.dataTrust?.timestamp || new Date().toISOString(),
                  });
                });
              });
              setEvents(extracted);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  const filteredEvents = events.filter((ev) => {
    if (filterSeverity !== 'ALL' && ev.severity !== filterSeverity) return false;
    if (searchSymbol && !ev.symbol.toLowerCase().includes(searchSymbol.toLowerCase())) return false;
    return true;
  });

  const getEventIcon = (type: string) => {
    if (type.includes('PRICE')) return TrendingUp;
    if (type.includes('VOLUME')) return BarChart2;
    if (type.includes('52W')) return Compass;
    return AlertTriangle;
  };

  return (
    <AppShell>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="border-b border-slate-800/80 pb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3">
            <HistoryIcon className="w-7 h-7 text-blue-400" />
            Detected Change Timeline
          </h1>
          <p className="text-sm text-slate-400 mt-1">Chronological feed of all market anomalies and attention spikes.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 ml-1" />
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-xl border transition ${
                  filterSeverity === sev
                    ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              placeholder="Filter by symbol..."
              className="pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Feed List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800/60" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-3">
            <p className="text-sm font-semibold text-slate-300">No change events match your current filter.</p>
            <p className="text-xs text-slate-500">Try adjusting severity filters or symbol search.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {filteredEvents.map((ev) => {
              const Icon = getEventIcon(ev.type);
              return (
                <div key={ev.id} className="relative flex items-start gap-4">
                  <div className={`absolute -left-6 top-2 w-3 h-3 rounded-full ring-4 ring-slate-950 ${
                    ev.severity === 'HIGH' ? 'bg-rose-500' : ev.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-500'
                  }`} />

                  <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 flex-1 space-y-2 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link href={`/stock/${ev.symbol}`} className="text-base font-bold font-mono text-white hover:text-blue-400 transition">
                          {ev.symbol}
                        </Link>
                        <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${
                          ev.severity === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : ev.severity === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                        }`}>
                          {ev.severity}
                        </span>
                      </div>

                      <span className="text-xs font-mono text-slate-400">
                        {new Date(ev.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-800 text-blue-400 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{ev.reason}</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/60">
                      <span>Prev: {formatCurrency(ev.previousValue, undefined, ev.symbol)} → Current: {formatCurrency(ev.currentValue, undefined, ev.symbol)}</span>
                      <Link href={`/stock/${ev.symbol}`} className="text-blue-400 hover:underline">
                        View Stock →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

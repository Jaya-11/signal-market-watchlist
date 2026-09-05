'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { DataFreshnessBadge } from '@/components/ui/DataFreshnessBadge';
import { AttentionScoreBadge } from '@/components/ui/AttentionScoreBadge';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  Bookmark,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface WatchlistStockItem {
  id: string;
  symbol: string;
  companyName: string;
  addedAt: string;
}

interface Watchlist {
  id: string;
  name: string;
  stocks: WatchlistStockItem[];
}

interface StockMarketData {
  symbol: string;
  companyName: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  attentionScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  reasons: any[];
  dataTrust: {
    dataStatus: string;
    isDemo: boolean;
  };
}

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [marketItems, setMarketItems] = useState<Record<string, StockMarketData>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modals & form state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameWatchlistName, setRenameWatchlistName] = useState('');

  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockSearchResults, setStockSearchResults] = useState<any[]>([]);

  // Fetch watchlists
  const loadWatchlists = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/watchlists');
      if (res.ok) {
        const data = await res.json();
        setWatchlists(data.watchlists || []);
        if (data.watchlists && data.watchlists.length > 0 && !activeWatchlistId) {
          setActiveWatchlistId(data.watchlists[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load watchlists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlists();
  }, []);

  // Fetch market data for active watchlist
  const loadMarketData = async (id: string) => {
    try {
      const res = await fetch(`/api/watchlists/${id}/market`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, StockMarketData> = {};
        (data.items || []).forEach((item: StockMarketData) => {
          map[item.symbol] = item;
        });
        setMarketItems(map);
      }
    } catch (err) {
      console.error('Failed to load market data for watchlist:', err);
    }
  };

  useEffect(() => {
    if (activeWatchlistId) {
      loadMarketData(activeWatchlistId);
    }
  }, [activeWatchlistId]);

  // Create watchlist
  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewWatchlistName('');
        setIsCreateModalOpen(false);
        await loadWatchlists();
        setActiveWatchlistId(data.watchlist.id);
      }
    } catch (err) {
      console.error('Failed to create watchlist:', err);
    }
  };

  // Rename watchlist
  const handleRenameWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWatchlistId || !renameWatchlistName.trim()) return;
    try {
      const res = await fetch(`/api/watchlists/${activeWatchlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameWatchlistName.trim() }),
      });
      if (res.ok) {
        setIsRenameModalOpen(false);
        await loadWatchlists();
      }
    } catch (err) {
      console.error('Failed to rename watchlist:', err);
    }
  };

  // Delete watchlist
  const handleDeleteWatchlist = async () => {
    if (!activeWatchlistId) return;
    if (!confirm('Are you sure you want to delete this watchlist?')) return;
    try {
      const res = await fetch(`/api/watchlists/${activeWatchlistId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActiveWatchlistId(null);
        await loadWatchlists();
      }
    } catch (err) {
      console.error('Failed to delete watchlist:', err);
    }
  };

  // Stock search inside add stock modal
  useEffect(() => {
    if (!isAddStockOpen) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(stockSearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setStockSearchResults(data.results || []);
        }
      } catch {
        setStockSearchResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [stockSearchQuery, isAddStockOpen]);

  // Add stock to active watchlist
  const handleAddStock = async (symbol: string, companyName: string) => {
    if (!activeWatchlistId) return;
    try {
      const res = await fetch(`/api/watchlists/${activeWatchlistId}/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, companyName }),
      });
      if (res.ok) {
        setIsAddStockOpen(false);
        setStockSearchQuery('');
        await loadWatchlists();
        loadMarketData(activeWatchlistId);
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Could not add stock');
      }
    } catch (err) {
      console.error('Failed to add stock:', err);
    }
  };

  // Remove stock
  const handleRemoveStock = async (symbol: string) => {
    if (!activeWatchlistId) return;
    try {
      const res = await fetch(`/api/watchlists/${activeWatchlistId}/stocks/${symbol}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadWatchlists();
        loadMarketData(activeWatchlistId);
      }
    } catch (err) {
      console.error('Failed to remove stock:', err);
    }
  };

  const activeWatchlist = watchlists.find((w) => w.id === activeWatchlistId);

  return (
    <AppShell>
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header & Watchlist Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">Watchlists</h1>
            <p className="text-sm text-slate-400 mt-1">Manage watchlists and track stock signals.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold font-mono text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              New Watchlist
            </button>
          </div>
        </div>

        {/* Watchlist Tabs */}
        {watchlists.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/60">
            {watchlists.map((wl) => (
              <button
                key={wl.id}
                onClick={() => setActiveWatchlistId(wl.id)}
                className={`px-4 py-2 text-xs font-mono font-semibold rounded-xl whitespace-nowrap transition border ${
                  activeWatchlistId === wl.id
                    ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {wl.name} ({wl.stocks.length})
              </button>
            ))}
          </div>
        )}

        {/* Watchlist Header Controls */}
        {activeWatchlist && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold font-mono text-white">{activeWatchlist.name}</h2>
              <button
                onClick={() => {
                  setRenameWatchlistName(activeWatchlist.name);
                  setIsRenameModalOpen(true);
                }}
                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                title="Rename Watchlist"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddStockOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold font-mono text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Stock
              </button>

              <button
                onClick={handleDeleteWatchlist}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                title="Delete Watchlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Stock List / Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800/60" />
            ))}
          </div>
        ) : !activeWatchlist || activeWatchlist.stocks.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800/80 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 text-blue-400 flex items-center justify-center">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No stocks in this watchlist yet</h3>
              <p className="text-sm text-slate-400 mt-1">Add stocks from Indian (NSE/BSE) or US markets to track signals.</p>
            </div>
            <button
              onClick={() => setIsAddStockOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Add Stock Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-mono uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <th className="p-4">Symbol & Company</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Session Change</th>
                  <th className="p-4">Attention Score</th>
                  <th className="p-4">Data Trust</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {activeWatchlist.stocks.map((stock) => {
                  const mData = marketItems[stock.symbol];
                  return (
                    <tr key={stock.id} className="hover:bg-slate-800/40 transition group">
                      <td className="p-4">
                        <Link href={`/stock/${stock.symbol}`} className="block">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-white hover:text-blue-400 transition">
                              {stock.symbol}
                            </span>
                            {mData?.exchange && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                                {mData.exchange}
                              </span>
                            )}
                          </div>
                          <span className="block text-xs text-slate-400 truncate max-w-xs">{stock.companyName}</span>
                        </Link>
                      </td>

                      <td className="p-4 font-mono font-bold text-white">
                        {mData ? formatCurrency(mData.price, mData.exchange, stock.symbol) : '—'}
                      </td>

                      <td className="p-4 font-mono">
                        {mData ? (
                          <div className="flex items-center gap-1">
                            {mData.changePercent >= 0 ? (
                              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-rose-400" />
                            )}
                            <span className={mData.changePercent < 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                              {mData.changePercent > 0 ? '+' : ''}{mData.changePercent}%
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="p-4">
                        {mData ? (
                          <AttentionScoreBadge
                            score={mData.attentionScore}
                            severity={mData.severity}
                            symbol={mData.symbol}
                            companyName={mData.companyName}
                            summary={mData.summary}
                            reasons={mData.reasons}
                            compact
                          />
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="p-4">
                        {mData ? (
                          <DataFreshnessBadge status={mData.dataTrust?.dataStatus as any} isDemo={mData.dataTrust?.isDemo} compact />
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRemoveStock(stock.symbol)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Watchlist Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <form onSubmit={handleCreateWatchlist} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-mono">Create New Watchlist</h3>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                placeholder="e.g. Banking & FinTech"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rename Watchlist Modal */}
        {isRenameModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <form onSubmit={handleRenameWatchlist} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-mono">Rename Watchlist</h3>
                <button type="button" onClick={() => setIsRenameModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={renameWatchlistName}
                onChange={(e) => setRenameWatchlistName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
                >
                  Save Rename
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Stock Modal */}
        {isAddStockOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-mono">Add Stock to Watchlist</h3>
                <button onClick={() => setIsAddStockOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  placeholder="Search RELIANCE, TCS, INFY, NVDA..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1">
                {stockSearchResults.map((stk) => (
                  <div
                    key={stk.symbol}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition"
                  >
                    <div>
                      <span className="font-bold font-mono text-white text-sm">{stk.symbol}</span>
                      <span className="text-xs font-mono ml-2 px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                        {stk.exchange}
                      </span>
                      <p className="text-xs text-slate-400 truncate">{stk.companyName}</p>
                    </div>
                    <button
                      onClick={() => handleAddStock(stk.symbol, stk.companyName)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

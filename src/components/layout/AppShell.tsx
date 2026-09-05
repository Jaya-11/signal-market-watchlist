'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Bookmark,
  History,
  Settings,
  Search,
  Activity,
  Menu,
  X,
  UserCheck,
  Command,
  ArrowRight,
} from 'lucide-react';
import { SearchResultStock } from '@/modules/market-data';

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, userName, userEmail }) => {
  const pathname = usePathname();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultStock[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Watchlist', href: '/watchlist', icon: Bookmark },
    { name: 'History', href: '/history', icon: History },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Hotkey listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Stock search API call
  useEffect(() => {
    if (!isSearchOpen) return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, isSearchOpen]);

  const handleSelectStock = (symbol: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(`/stock/${symbol}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-blue-500/30 selection:text-blue-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-950/90 shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider text-white font-mono">SIGNAL</span>
              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest">Smart Watchlist</span>
            </div>
          </Link>
        </div>

        {/* Global Search Trigger Button */}
        <div className="p-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs text-slate-400 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
              <span>Search stocks...</span>
            </div>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-xl transition ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Neutral User Profile */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/60">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className="p-2 rounded-lg bg-slate-800 text-blue-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{userName || 'Guest Session'}</p>
              <span className="inline-block text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                {userEmail || 'Demo Session'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800/80 sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-base font-black tracking-wider text-white font-mono">SIGNAL</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-md pt-16 px-6 pb-6 flex flex-col justify-between animate-in fade-in duration-150">
          <nav className="space-y-2 mt-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3.5 text-base font-medium rounded-xl border ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                      : 'text-slate-300 border-slate-800/60 bg-slate-900/40'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</main>

      {/* Global Stock Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <div className="flex items-center px-4 border-b border-slate-800 bg-slate-950/60">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Indian (RELIANCE, TCS, INFY) or US stocks..."
                className="w-full px-3 py-4 text-sm bg-transparent text-white placeholder-slate-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500">Searching market universe...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {searchQuery ? `No stock results found for "${searchQuery}"` : 'Type to search Indian (NSE/BSE) or US equities'}
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => handleSelectStock(item.symbol)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/70 transition group text-left"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-mono text-white group-hover:text-blue-400 transition-colors">
                            {item.symbol}
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {item.exchange}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{item.companyName}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { FreshnessStatus } from '@/modules/market-data';
import { ShieldAlert, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';

interface DataFreshnessBadgeProps {
  status?: FreshnessStatus;
  timestamp?: string;
  isDemo?: boolean;
  compact?: boolean;
}

export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  status = 'FRESH',
  timestamp,
  isDemo = true,
  compact = false,
}) => {
  const formatTimeAgo = (ts?: string) => {
    if (!ts) return 'just now';
    const seconds = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'FRESH':
        return {
          label: `Fresh · ${formatTimeAgo(timestamp)}`,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: ShieldCheck,
        };
      case 'DELAYED':
        return {
          label: `Delayed · ${formatTimeAgo(timestamp)}`,
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: Clock,
        };
      case 'STALE':
        return {
          label: `Stale · ${formatTimeAgo(timestamp)}`,
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          icon: AlertTriangle,
        };
      case 'UNAVAILABLE':
      default:
        return {
          label: 'Market data unavailable',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: ShieldAlert,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border font-mono ${config.bg}`}>
        {isDemo && <span className="font-semibold text-blue-400">Demo data ·</span>}
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isDemo && (
        <span className="inline-flex items-center text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Demo Market Data
        </span>
      )}
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-mono font-medium ${config.bg}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    </div>
  );
};

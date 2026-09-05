'use client';

import React from 'react';
import { StructuredReason } from '@/modules/change-detection';
import { X, HelpCircle, AlertCircle, TrendingUp, BarChart2, Compass } from 'lucide-react';

interface WhyPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  companyName: string;
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  reasons: StructuredReason[];
}

export const WhyPanelModal: React.FC<WhyPanelModalProps> = ({
  isOpen,
  onClose,
  symbol,
  companyName,
  score,
  severity,
  summary,
  reasons,
}) => {
  if (!isOpen) return null;

  const getReasonIcon = (type: string) => {
    switch (type) {
      case 'PRICE_SURGE':
      case 'PRICE_DROP':
        return TrendingUp;
      case 'VOLUME_SPIKE':
        return BarChart2;
      case 'NEAR_52W_HIGH':
      case 'NEAR_52W_LOW':
        return Compass;
      default:
        return AlertCircle;
    }
  };

  const getSeverityBadge = () => {
    switch (severity) {
      case 'HIGH':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'LOW':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">{symbol}</span>
              <span className="text-sm text-slate-400">{companyName}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Why was this stock flagged?</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            aria-label="Close why panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Score Header Card */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Attention Score</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold font-mono text-white">{score}</span>
                <span className="text-xs font-mono text-slate-500">/ 100</span>
              </div>
            </div>
            <span className={`px-3 py-1 text-xs font-semibold font-mono rounded-full border ${getSeverityBadge()}`}>
              {severity} ATTENTION
            </span>
          </div>

          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm text-slate-200">
            <p className="font-medium">{summary}</p>
          </div>

          {/* Structured Factors Breakdown */}
          <div>
            <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Contributing Market Factors</h4>
            {reasons.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No unusual market anomalies detected for this session.</p>
            ) : (
              <div className="space-y-3">
                {reasons.map((reason) => {
                  const Icon = getReasonIcon(reason.type);
                  return (
                    <div key={reason.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60">
                      <div className="p-2 rounded-lg bg-slate-800 text-blue-400 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">{reason.title}</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">+{reason.impactScoreDelta} pts</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{reason.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Disclaimer Footer */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <HelpCircle className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
            <p>
              SIGNAL Attention Score measures unusual market behavior relative to baseline volatility. It is calculated deterministically and is <strong>NOT</strong> an investment, buy, or sell recommendation.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

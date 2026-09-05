'use client';

import React, { useState } from 'react';
import { StructuredReason } from '@/modules/change-detection';
import { WhyPanelModal } from './WhyPanelModal';

interface AttentionScoreBadgeProps {
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  symbol: string;
  companyName: string;
  summary: string;
  reasons: StructuredReason[];
  showWhyButton?: boolean;
  compact?: boolean;
}

export const AttentionScoreBadge: React.FC<AttentionScoreBadgeProps> = ({
  score,
  severity,
  symbol,
  companyName,
  summary,
  reasons,
  showWhyButton = true,
  compact = false,
}) => {
  const [isWhyOpen, setIsWhyOpen] = useState(false);

  const getSeverityColors = () => {
    switch (severity) {
      case 'HIGH':
        return {
          stroke: '#EF4444',
          text: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/30',
          ringBg: 'stroke-rose-950',
        };
      case 'MEDIUM':
        return {
          stroke: '#F59E0B',
          text: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/30',
          ringBg: 'stroke-amber-950',
        };
      case 'LOW':
      default:
        return {
          stroke: '#64748B',
          text: 'text-slate-400',
          bg: 'bg-slate-500/10 border-slate-500/30',
          ringBg: 'stroke-slate-900',
        };
    }
  };

  const colors = getSeverityColors();
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded border ${colors.bg} ${colors.text}`}>
            {score}
          </span>
          {showWhyButton && (
            <button
              onClick={() => setIsWhyOpen(true)}
              className="text-[11px] font-medium text-slate-400 hover:text-blue-400 underline decoration-slate-600 underline-offset-2 transition"
            >
              Why?
            </button>
          )}
        </div>
        <WhyPanelModal
          isOpen={isWhyOpen}
          onClose={() => setIsWhyOpen(false)}
          symbol={symbol}
          companyName={companyName}
          score={score}
          severity={severity}
          summary={summary}
          reasons={reasons}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {/* SVG Progress Ring */}
        <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r={radius}
              strokeWidth="4"
              fill="transparent"
              className={colors.ringBg}
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              strokeWidth="4"
              stroke={colors.stroke}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span className={`absolute text-xs font-extrabold font-mono ${colors.text}`}>{score}</span>
        </div>

        <div>
          <span className={`inline-block px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${colors.bg} ${colors.text}`}>
            {severity} ATTENTION
          </span>
          {showWhyButton && (
            <div className="mt-1">
              <button
                onClick={() => setIsWhyOpen(true)}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition group"
              >
                Why this matters <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <WhyPanelModal
        isOpen={isWhyOpen}
        onClose={() => setIsWhyOpen(false)}
        symbol={symbol}
        companyName={companyName}
        score={score}
        severity={severity}
        summary={summary}
        reasons={reasons}
      />
    </>
  );
};

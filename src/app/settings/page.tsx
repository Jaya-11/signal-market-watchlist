'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Settings as SettingsIcon, Sliders, Shield, HelpCircle, Check, User } from 'lucide-react';
import { UserSensitivity } from '@/modules/attention-scoring';

export default function SettingsPage() {
  const [sensitivity, setSensitivity] = useState<UserSensitivity>('BALANCED');
  const [refreshInterval, setRefreshInterval] = useState('60');
  const [userInfo, setUserInfo] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/preferences');
        if (res.ok) {
          const data = await res.json();
          if (data.preference?.sensitivity) {
            setSensitivity(data.preference.sensitivity);
          }
          if (data.user) {
            setUserInfo({ name: data.user.name, email: data.user.email });
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSensitivity = async (newSens: UserSensitivity) => {
    setSensitivity(newSens);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensitivity: newSens }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to update sensitivity preference:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell userName={userInfo.name} userEmail={userInfo.email}>
      <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
        {/* Header */}
        <div className="border-b border-slate-800/80 pb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-blue-400" />
            Product & Engine Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">Configure change detection sensitivity and user preferences.</p>
        </div>

        {/* Sensitivity Controls */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                MEANINGFUL-CHANGE SENSITIVITY
              </h2>
              {saveSuccess && (
                <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Adjust how aggressively SIGNAL filters out routine market noise before flagging an Attention Score.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: 'LOW' as UserSensitivity,
                title: 'Low Sensitivity',
                badge: 'Noise Suppression',
                desc: 'Filters minor moves aggressively. Only surfaces high-conviction anomalies (2.5x+ volatility/volume spikes).',
              },
              {
                id: 'BALANCED' as UserSensitivity,
                title: 'Balanced (Default)',
                badge: 'Standard Baseline',
                desc: 'Balanced monitoring. Flags 2.0x+ volatility spikes, 2.0x+ volume surges, and 52-week extremes.',
              },
              {
                id: 'HIGH' as UserSensitivity,
                title: 'High Sensitivity',
                badge: 'Early Warning',
                desc: 'Early warning mode. Surfaces 1.5x+ volatility moves for proactive attention.',
              },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => handleSaveSensitivity(option.id)}
                disabled={isSaving}
                className={`p-5 rounded-2xl text-left border transition flex flex-col justify-between space-y-3 ${
                  sensitivity === option.id
                    ? 'bg-blue-600/10 border-blue-500/40 text-white shadow-xl shadow-blue-950/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold font-mono text-white">{option.title}</span>
                    {sensitivity === option.id && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-slate-800 text-blue-400">
                    {option.badge}
                  </span>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">{option.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Philosophy Explanation Box */}
        <div className="p-6 sm:p-8 rounded-3xl bg-blue-500/5 border border-blue-500/20 space-y-4">
          <div className="flex items-center gap-2 text-blue-400">
            <HelpCircle className="w-5 h-5" />
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider">HOW SIGNAL WORKS</h3>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed font-sans">
            &ldquo;SIGNAL filters normal market noise and highlights changes that are unusual relative to a stock&apos;s recent behavior.&rdquo;
          </p>
          <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
            <li>A 3% price move is normal for high-volatility stocks, but highly unusual for stable large-caps.</li>
            <li>SIGNAL compares session movement against historical standard deviation baselines.</li>
            <li>Combined signals (price + volume + 52w proximity) scale attention non-linearly.</li>
          </ul>
        </div>

        {/* Data Refresh Preference */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            DATA REFRESH PREFERENCE
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-white">Market Polling Rate</span>
              <p className="text-xs text-slate-400">Automatic background quote refresh interval.</p>
            </div>

            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs font-mono text-white rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="30">Every 30 seconds</option>
              <option value="60">Every 1 minute (Default)</option>
              <option value="300">Every 5 minutes</option>
            </select>
          </div>
        </div>

        {/* Account Info */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            ACCOUNT DETAILS
          </h2>

          <div className="space-y-3 text-xs font-mono text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-500">User Identity</span>
              <span className="text-white font-semibold">{userInfo.name || 'Active Session User'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Email Address</span>
              <span className="text-white font-semibold">{userInfo.email || 'Session Active'}</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

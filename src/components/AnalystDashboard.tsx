import React, { useEffect, useMemo, useState } from 'react';
import { AnalystProfile } from '../data/mockFiles';
import { DLPActionTier, DLPEvaluationResult } from '../utils/dlpEngine';
import { FlashingAlertBanner } from './FlashingAlertBanner';
import {
  CheckCircle2,
  XCircle,
  Sliders,
  ShieldAlert,
  Clock,
  Volume2,
  Trash2,
  RefreshCw,
  Search,
  BarChart3,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface AnalystDashboardProps {
  analyst: AnalystProfile;
  events: DLPEvaluationResult[];
  latestAlert: DLPEvaluationResult | null;
  alertsArmed: boolean;
  w1: number;
  w2: number;
  onChangeW1: (val: number) => void;
  onChangeW2: (val: number) => void;
  onResolveQuarantine: (
    eventId: string,
    resolution: 'APPROVED_BY_ANALYST' | 'REJECTED_BY_ANALYST'
  ) => void;
  onDismissAlert: () => void;
  onRetriggerAlert: (ev: DLPEvaluationResult) => void;
  onClearEvents: () => void;
  onRestoreDemoEvents: () => void;
}

export const AnalystDashboard: React.FC<AnalystDashboardProps> = ({
  analyst,
  events,
  latestAlert,
  alertsArmed,
  w1,
  w2,
  onChangeW1,
  onChangeW2,
  onResolveQuarantine,
  onDismissAlert,
  onRetriggerAlert,
  onClearEvents,
  onRestoreDemoEvents,
}) => {
  const [tierFilter, setTierFilter] = useState<'ALL' | DLPActionTier>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events[0]?.id ?? null
  );
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Auto-select newest event when events change if none is selected
  useEffect(() => {
    if (events.length === 0) {
      setSelectedEventId(null);
    } else if (!selectedEventId || !events.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // 2.5s auto-refresh heartbeat for the live feed timestamp
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      setLastRefreshedAt(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 2500);
    return () => window.clearInterval(timer);
  }, [autoRefresh]);

  const pendingQuarantine = events.filter(
    (e) => e.tier === 'REVIEW' && e.quarantineStatus === 'PENDING_REVIEW'
  );
  const blockedCount = events.filter((e) => e.tier === 'BLOCK').length;
  const reviewCount = events.filter((e) => e.tier === 'REVIEW').length;
  const allowCount = events.filter((e) => e.tier === 'ALLOW').length;

  // Channel stats for Email vs USB chart
  const channelStats = useMemo(() => {
    const compute = (ch: 'Email' | 'USB') => {
      const subset = events.filter((e) => e.channel === ch);
      return {
        total: subset.length,
        allow: subset.filter((e) => e.tier === 'ALLOW').length,
        review: subset.filter((e) => e.tier === 'REVIEW').length,
        block: subset.filter((e) => e.tier === 'BLOCK').length,
      };
    };
    const email = compute('Email');
    const usb = compute('USB');
    const maxTotal = Math.max(1, email.total, usb.total);
    return { email, usb, maxTotal };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return events.filter((e) => {
      const tierOk = tierFilter === 'ALL' ? true : e.tier === tierFilter;
      const searchOk =
        !q ||
        e.employeeName.toLowerCase().includes(q) ||
        e.filename.toLowerCase().includes(q) ||
        e.destination.toLowerCase().includes(q) ||
        e.channel.toLowerCase().includes(q);
      return tierOk && searchOk;
    });
  }, [events, tierFilter, searchTerm]);

  const drillDownEvent =
    events.find((e) => e.id === selectedEventId) || filteredEvents[0] || null;

  return (
    <div className="space-y-6">
      {latestAlert && latestAlert.shouldAlertAndVibrate && (
        <FlashingAlertBanner
          alertEvent={latestAlert}
          viewerContext="Analyst"
          alertsArmed={alertsArmed}
          onDismiss={onDismissAlert}
        />
      )}

      {/* Analyst Header + 4-Column KPI Row */}
      <div className="rounded-xl border border-emerald-900/12 bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-emerald-900/65 flex flex-wrap items-center gap-2">
            <span>Security Operations Center</span>
            <span aria-hidden="true">·</span>
            <span>DLP Quarantine &amp; Policy Monitor</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              W1={w1.toFixed(2)} / W2={w2.toFixed(2)}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-emerald-950 mt-1">
            Analyst Console — {analyst.name} ({analyst.title})
          </h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
          <div className="px-4 py-2.5 rounded-lg bg-[#f6faf7] border border-emerald-900/12">
            <div className="text-xs font-sans text-emerald-900/65">Total Events</div>
            <div className="text-xl font-bold text-emerald-950">{events.length}</div>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <div className="text-xs font-sans text-emerald-800">Allowed (0–30)</div>
            <div className="text-xl font-bold text-emerald-800">{allowCount}</div>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-amber-50/70 border border-amber-200">
            <div className="text-xs font-sans text-amber-800">Review (31–70)</div>
            <div className="text-xl font-bold text-amber-800">
              {reviewCount}{' '}
              <span className="text-xs font-normal text-amber-700">
                ({pendingQuarantine.length} held)
              </span>
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-lg bg-red-50/80 border border-red-200">
            <div className="text-xs font-sans text-red-800">Blocked (71–100)</div>
            <div className="text-xl font-bold text-red-700">{blockedCount}</div>
          </div>
        </div>
      </div>

      {/* Row 2: Channel Breakdown Chart + Weight Tuning + Quarantine Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Channel Chart (Email vs USB) & W1/W2 Policy Weights */}
        <div className="lg:col-span-5 space-y-6">
          {/* Exfiltration Attempts by Channel Chart */}
          <div className="rounded-xl border border-emerald-900/12 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/10 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-emerald-950">
                  Exfiltration Attempts by Channel
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-900/60 tabular-nums">
                Email vs USB
              </span>
            </div>

            {events.length === 0 ? (
              <div className="py-6 text-center text-xs text-emerald-900/60">
                No channel activity recorded yet. Submit a transfer or restore sample events.
              </div>
            ) : (
              <div className="space-y-4">
                {(['Email', 'USB'] as const).map((ch) => {
                  const stat = ch === 'Email' ? channelStats.email : channelStats.usb;
                  const allowW = (stat.allow / channelStats.maxTotal) * 100;
                  const reviewW = (stat.review / channelStats.maxTotal) * 100;
                  const blockW = (stat.block / channelStats.maxTotal) * 100;

                  return (
                    <div key={ch} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-950">{ch} Channel</span>
                        <span className="font-mono text-emerald-900/75 tabular-nums">
                          {stat.total} total ({stat.allow} Allow · {stat.review} Review ·{' '}
                          {stat.block} Block)
                        </span>
                      </div>
                      <div className="h-5 w-full rounded-md bg-[#eef4f0] overflow-hidden flex border border-emerald-900/10">
                        {stat.allow > 0 && (
                          <div
                            style={{ width: `${allowW}%` }}
                            className="bg-emerald-600 h-full transition-all"
                            title={`Allow: ${stat.allow}`}
                          />
                        )}
                        {stat.review > 0 && (
                          <div
                            style={{ width: `${reviewW}%` }}
                            className="bg-amber-500 h-full transition-all"
                            title={`Review: ${stat.review}`}
                          />
                        )}
                        {stat.block > 0 && (
                          <div
                            style={{ width: `${blockW}%` }}
                            className="bg-red-600 h-full transition-all"
                            title={`Block: ${stat.block}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-emerald-900/70">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
                    Allow
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                    Review
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
                    Block
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* W1 / W2 Weight Sliders */}
          <div className="rounded-xl border border-emerald-900/12 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/10 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-emerald-950">
                  Policy Scoring Weights
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeW1(0.5);
                  onChangeW2(0.5);
                }}
                className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                Reset 0.5 / 0.5
              </button>
            </div>

            <div className="p-3 rounded-lg bg-[#f6faf7] border border-emerald-900/10 font-mono text-xs text-emerald-950 tabular-nums">
              Leak Score = Content ×{' '}
              <strong className="text-emerald-700">{w1.toFixed(2)}</strong> + Behaviour ×{' '}
              <strong className="text-amber-700">{w2.toFixed(2)}</strong>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-emerald-950">W1: Content (Tags + PII Regex)</span>
                  <span className="font-mono font-bold text-emerald-700 tabular-nums">
                    {w1.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={w1}
                  onChange={(e) => onChangeW1(parseFloat(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-emerald-950">W2: Behaviour (Dest + USB + 3x Vol)</span>
                  <span className="font-mono font-bold text-amber-700 tabular-nums">
                    {w2.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={w2}
                  onChange={(e) => onChangeW2(parseFloat(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Quarantine Queue + Selected Event Drill-Down */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quarantine Review Queue */}
          <div className="rounded-xl border border-emerald-900/12 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/10 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-emerald-950">
                  Quarantine Review Queue ({pendingQuarantine.length} Pending)
                </h2>
              </div>
              <span className="text-xs text-emerald-900/60">
                Transfers scoring 31–70 awaiting analyst decision
              </span>
            </div>

            {pendingQuarantine.length === 0 ? (
              <div className="rounded-lg border border-emerald-900/10 bg-[#f9fcfa] p-5 text-center text-xs text-emerald-900/70">
                No transfers currently held in quarantine. Transfers scoring 31–70 appear here for analyst approval or rejection.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingQuarantine.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-amber-300 bg-amber-50/50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="text-amber-800 font-bold">
                          REVIEW · Score {item.finalLeakScore}/100
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-950 font-sans font-medium">
                          {item.employeeName} ({item.employeeRole})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-900/60 tabular-nums">
                          {item.timestamp}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-emerald-950 font-mono">
                        {item.filename} ({item.fileSizeBytes} B) → {item.channel}: {item.destination}
                      </div>
                      <div className="text-xs font-mono text-emerald-900/80">
                        {item.formattedSummaryLine}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onResolveQuarantine(item.id, 'APPROVED_BY_ANALYST')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveQuarantine(item.id, 'REJECTED_BY_ANALYST')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert Drill-Down Inspector */}
          <div className="rounded-xl border border-emerald-900/12 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/10 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-emerald-950">
                  Selected Event Drill-Down
                </h2>
              </div>
              {drillDownEvent && drillDownEvent.shouldAlertAndVibrate && (
                <button
                  type="button"
                  onClick={() => onRetriggerAlert(drillDownEvent)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Flash &amp; Vibrate Alert
                </button>
              )}
            </div>

            {!drillDownEvent ? (
              <div className="text-xs text-emerald-900/60 py-4 text-center">
                Select any row in the Live Feed table below to inspect its explainable score and ranked reasons.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-mono text-emerald-900/70">
                    <strong className="text-emerald-950 font-sans text-sm">
                      {drillDownEvent.employeeName}
                    </strong>{' '}
                    · {drillDownEvent.channel} → {drillDownEvent.destination} ·{' '}
                    {drillDownEvent.filename} ({drillDownEvent.fileSizeBytes} B)
                  </div>
                  <div
                    className={`font-mono text-xs font-bold ${
                      drillDownEvent.tier === 'ALLOW'
                        ? 'text-emerald-700'
                        : drillDownEvent.tier === 'REVIEW'
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  >
                    {drillDownEvent.tier} · Score {drillDownEvent.finalLeakScore}/100 (
                    {drillDownEvent.severity})
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#f6faf7] border border-emerald-900/10 font-mono text-xs text-emerald-950 leading-relaxed">
                  {drillDownEvent.formattedSummaryLine}
                </div>

                <ol className="list-decimal list-inside space-y-1 text-xs font-mono text-emerald-900/80">
                  {drillDownEvent.rankedReasons.map((r, idx) => (
                    <li key={idx}>
                      <span className="text-emerald-950 font-medium">{r.text}</span>{' '}
                      <span className="text-emerald-900/60">
                        ({r.category}
                        {r.points > 0 ? ` +${r.points} pts` : ''})
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Feed Event Table (Colour-coded rows + Auto-refresh + Drill-down selection + Reset Demo) */}
      <div className="rounded-xl border border-emerald-900/12 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-emerald-900/10 flex flex-wrap items-center justify-between gap-4 bg-[#f9fcfa]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-emerald-950">
                Live Security Event Feed
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-900/60 tabular-nums">
              {autoRefresh ? `Auto-refreshing · ${lastRefreshedAt}` : `Paused · ${lastRefreshedAt}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-white text-emerald-900/70 border-emerald-900/15'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live Feed On' : 'Live Feed Paused'}
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-emerald-900/45 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter user, file, dest..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-emerald-900/15 bg-white text-xs text-emerald-950 placeholder:text-emerald-900/40 focus:outline-none focus:border-emerald-700 w-44"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-emerald-50/80 rounded-lg border border-emerald-900/10">
              {(['ALL', 'BLOCK', 'REVIEW', 'ALLOW'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setTierFilter(tier)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    tierFilter === tier
                      ? 'bg-emerald-700 text-white'
                      : 'text-emerald-900/70 hover:text-emerald-950'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            {events.length > 0 ? (
              <button
                type="button"
                onClick={onClearEvents}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-red-50 text-red-700 border border-red-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Demo
              </button>
            ) : (
              <button
                type="button"
                onClick={onRestoreDemoEvents}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Sample Events
              </button>
            )}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="text-sm font-semibold text-emerald-950">
              No DLP events in the live feed
            </div>
            <p className="text-xs text-emerald-900/65 max-w-md mx-auto">
              Submit a file transfer from the Employee Console or restore the 8 baseline sample events to inspect traffic patterns.
            </p>
            <button
              type="button"
              onClick={onRestoreDemoEvents}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore 8 Sample Events
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-emerald-900/10 bg-[#f4f8f5] text-xs font-semibold text-emerald-900/75">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">File</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4 text-right">Size</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10 text-xs">
                {filteredEvents.map((ev) => {
                  const liveScore = Math.min(
                    100,
                    Math.round(ev.contentScore * w1 + ev.behaviourScore * w2)
                  );
                  const isSelected = drillDownEvent?.id === ev.id;

                  // Colour-coded rows: green Allow, amber Review, red Block
                  const rowBgClass =
                    ev.tier === 'ALLOW'
                      ? 'bg-emerald-50/45 hover:bg-emerald-50/90'
                      : ev.tier === 'REVIEW'
                      ? 'bg-amber-50/60 hover:bg-amber-50'
                      : 'bg-red-50/65 hover:bg-red-50';

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`cursor-pointer transition-colors ${rowBgClass} ${
                        isSelected ? 'ring-1 ring-inset ring-emerald-700' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-emerald-900/75 tabular-nums whitespace-nowrap">
                        {ev.timestamp}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-emerald-950">{ev.employeeName}</span>
                        <span className="text-emerald-900/60 ml-1.5">· {ev.employeeRole}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-emerald-950 whitespace-nowrap">
                        {ev.channel}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-950 whitespace-nowrap">
                        {ev.filename}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-900/85 break-all max-w-xs">
                        {ev.destination}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-900/80 tabular-nums whitespace-nowrap">
                        {ev.fileSizeBytes} B
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-950 tabular-nums whitespace-nowrap">
                        {liveScore}/100
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold ${
                            ev.tier === 'ALLOW'
                              ? 'text-emerald-700'
                              : ev.tier === 'REVIEW'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          {ev.tier}
                        </span>
                        {ev.quarantineStatus === 'APPROVED_BY_ANALYST' && (
                          <span className="text-emerald-700 ml-1.5">· Released</span>
                        )}
                        {ev.quarantineStatus === 'REJECTED_BY_ANALYST' && (
                          <span className="text-red-700 ml-1.5">· Rejected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

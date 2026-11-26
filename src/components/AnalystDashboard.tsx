import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AnalystProfile,
  MOCK_EMPLOYEES,
  USB_DEVICES,
  resolveUsbDeviceMetadata,
} from '../data/mockFiles';
import {
  DLPActionTier,
  DLPEvaluationResult,
  computeLiveEventScore,
} from '../utils/dlpEngine';
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
  Usb,
  Monitor,
  HardDrive,
  AlertOctagon,
  Smartphone,
  ShieldCheck,
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
  const [workstationFilter, setWorkstationFilter] = useState<string>('ALL');
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

  const authorisedMobileDevice = USB_DEVICES[0];

  // All Blocked USB Insertion Attempts (Unauthorised USB Devices)
  const blockedUsbEvents = useMemo(() => {
    return events.filter((e) => e.channel === 'USB' && e.tier === 'BLOCK');
  }, [events]);

  // Filtered Blocked USB Events by selected Workstation
  const visibleBlockedUsbEvents = useMemo(() => {
    if (workstationFilter === 'ALL') return blockedUsbEvents;
    return blockedUsbEvents.filter((e) => e.workstationId === workstationFilter);
  }, [blockedUsbEvents, workstationFilter]);

  // Time-series frequency buckets for Blocked USB Insertion Attempts over the last 60 minutes
  const usbFrequencyTimeline = useMemo(() => {
    const nowMs = Date.now();
    const buckets = [
      { label: '-60m to -45m', minAgoStart: 60, minAgoEnd: 45, count: 0, bytes: 0, workstations: new Set<string>() },
      { label: '-45m to -30m', minAgoStart: 45, minAgoEnd: 30, count: 0, bytes: 0, workstations: new Set<string>() },
      { label: '-30m to -20m', minAgoStart: 30, minAgoEnd: 20, count: 0, bytes: 0, workstations: new Set<string>() },
      { label: '-20m to -10m', minAgoStart: 20, minAgoEnd: 10, count: 0, bytes: 0, workstations: new Set<string>() },
      { label: '-10m to -2m', minAgoStart: 10, minAgoEnd: 2, count: 0, bytes: 0, workstations: new Set<string>() },
      { label: 'Last 2m (Live)', minAgoStart: 2, minAgoEnd: -5, count: 0, bytes: 0, workstations: new Set<string>() },
    ];

    visibleBlockedUsbEvents.forEach((ev) => {
      const diffMin = (nowMs - ev.timestampMs) / 60_000;
      const matched =
        buckets.find((b) => diffMin <= b.minAgoStart && diffMin > b.minAgoEnd) ||
        buckets[buckets.length - 1];
      matched.count += 1;
      matched.bytes += ev.fileSizeBytes;
      matched.workstations.add(ev.workstationId);
    });

    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    return {
      buckets: buckets.map((b) => ({
        ...b,
        workstationList: Array.from(b.workstations),
        heightPct: Math.max(b.count > 0 ? 18 : 4, Math.round((b.count / maxCount) * 100)),
      })),
      maxCount,
    };
  }, [visibleBlockedUsbEvents]);

  // High-Risk Employees & Workstations Profiling based on Blocked USB Insertions
  const workstationRiskProfiles = useMemo(() => {
    return MOCK_EMPLOYEES.map((emp) => {
      const empBlockedUsb = blockedUsbEvents.filter(
        (e) => e.employeeId === emp.id || e.workstationId === emp.workstationId
      );
      const totalBytesAttempted = empBlockedUsb.reduce((acc, e) => acc + e.fileSizeBytes, 0);
      const distinctDevices = Array.from(
        new Set(
          empBlockedUsb.map((e) => {
            const meta = e.usbMetadata || resolveUsbDeviceMetadata(e.destination);
            return `${meta.id} [${meta.vidPid}]`;
          })
        )
      );
      const latestAttempt = empBlockedUsb[0]?.timestamp || 'None';
      const riskLevel =
        empBlockedUsb.length >= 3
          ? 'CRITICAL REPEAT OFFENDER'
          : empBlockedUsb.length >= 1
          ? 'HIGH RISK WORKSTATION'
          : 'NOMINAL';

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeRole: emp.role,
        department: emp.department,
        workstationId: emp.workstationId,
        workstationIp: emp.workstationIp,
        blockedAttempts: empBlockedUsb.length,
        totalBytesAttempted,
        distinctDevices,
        latestAttempt,
        riskLevel,
      };
    }).sort((a, b) => b.blockedAttempts - a.blockedAttempts);
  }, [blockedUsbEvents]);

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
      const wsOk = workstationFilter === 'ALL' ? true : e.workstationId === workstationFilter;
      const searchOk =
        !q ||
        e.employeeName.toLowerCase().includes(q) ||
        e.workstationId.toLowerCase().includes(q) ||
        e.filename.toLowerCase().includes(q) ||
        e.destination.toLowerCase().includes(q) ||
        e.channel.toLowerCase().includes(q);
      return tierOk && wsOk && searchOk;
    });
  }, [events, tierFilter, workstationFilter, searchTerm]);

  const drillDownEvent =
    events.find((e) => e.id === selectedEventId) || filteredEvents[0] || null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="space-y-6"
    >
      {latestAlert && latestAlert.shouldAlertAndVibrate && (
        <FlashingAlertBanner
          alertEvent={latestAlert}
          viewerContext="Analyst"
          alertsArmed={alertsArmed}
          onDismiss={onDismissAlert}
        />
      )}

      {/* Analyst Header + 4-Column Blow-Up KPI Row */}
      <div className="rounded-xl border border-indigo-950/12 bg-gradient-to-r from-white via-indigo-50/40 to-rose-50/35 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 card-3d-subtle">
        <div>
          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-indigo-700">Security Operations Center</span>
            <span aria-hidden="true">·</span>
            <span>DLP Quarantine &amp; USB Hardware Forensics</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700">
              W1={w1.toFixed(2)} / W2={w2.toFixed(2)}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-950 mt-1">
            Analyst Console — {analyst.name} ({analyst.title})
          </h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
          <motion.div
            whileHover={{ scale: 1.06, y: -3 }}
            transition={{ type: 'spring', stiffness: 360, damping: 20 }}
            className="px-4 py-2.5 rounded-lg bg-white border border-indigo-200/80 shadow-2xs cursor-pointer"
            onClick={() => setTierFilter('ALL')}
          >
            <div className="text-xs font-sans text-indigo-700 font-medium">Total Events</div>
            <div className="text-xl font-bold text-slate-950">{events.length}</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.06, y: -3 }}
            transition={{ type: 'spring', stiffness: 360, damping: 20 }}
            className="px-4 py-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 cursor-pointer"
            onClick={() => setTierFilter('ALLOW')}
          >
            <div className="text-xs font-sans text-emerald-800 font-medium">Allowed (0–30)</div>
            <div className="text-xl font-bold text-emerald-800">{allowCount}</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.06, y: -3 }}
            transition={{ type: 'spring', stiffness: 360, damping: 20 }}
            className="px-4 py-2.5 rounded-lg bg-amber-50/80 border border-amber-200 cursor-pointer"
            onClick={() => setTierFilter('REVIEW')}
          >
            <div className="text-xs font-sans text-amber-800 font-medium">Review (31–70)</div>
            <div className="text-xl font-bold text-amber-800">
              {reviewCount}{' '}
              <span className="text-xs font-normal text-amber-700">
                ({pendingQuarantine.length} held)
              </span>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.06, y: -3 }}
            transition={{ type: 'spring', stiffness: 360, damping: 20 }}
            className="px-4 py-2.5 rounded-lg bg-rose-50/90 border border-rose-200 cursor-pointer"
            onClick={() => setTierFilter('BLOCK')}
          >
            <div className="text-xs font-sans text-rose-800 font-medium">Blocked (71–100)</div>
            <div className="text-xl font-bold text-rose-700">{blockedCount}</div>
          </motion.div>
        </div>
      </div>

      {/* DEDICATED SECTION: Blocked USB Insertion Forensics & Whitelisted Mobile Endpoint */}
      <div className="rounded-xl border border-rose-200/90 bg-gradient-to-br from-white via-rose-50/25 to-indigo-50/30 p-6 space-y-6 card-3d">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-rose-200/70 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-rose-700 font-semibold">
              <Usb className="w-4 h-4 text-rose-600" />
              <span>USB Access Control &amp; Hardware Forensics</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-indigo-700">
                {blockedUsbEvents.length} Blocked UNAUTHORISED USB Attempts Across{' '}
                {workstationRiskProfiles.filter((w) => w.blockedAttempts > 0).length} Workstations
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-950">
              Blocked USB Insertion Frequency &amp; High-Risk Workstation Telemetry
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl">
              Whitelists the authorized mobile endpoint (<strong>TECNO POVA 6 Neo 5G</strong>) with Access Granted while tracking unauthorized USB device insertion frequency over time, VID:PID hardware signatures, and repeat-offender workstations.
            </p>
          </div>

          {/* Workstation Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setWorkstationFilter('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                workstationFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              All Workstations ({blockedUsbEvents.length})
            </button>
            {workstationRiskProfiles.map((ws) => (
              <button
                key={ws.workstationId}
                type="button"
                onClick={() =>
                  setWorkstationFilter((prev) =>
                    prev === ws.workstationId ? 'ALL' : ws.workstationId
                  )
                }
                className={`px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  workstationFilter === ws.workstationId
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                {ws.workstationId} ({ws.blockedAttempts})
              </button>
            ))}
          </div>
        </div>

        {/* Authorised Mobile Device Status Strip in Analyst Dashboard */}
        <motion.div
          whileHover={{ scale: 1.015 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-800">
                  [AUTHORISED WHITELISTED MOBILE]
                </span>
                <span className="text-sm font-bold text-slate-950 font-mono">
                  {authorisedMobileDevice.id} ({authorisedMobileDevice.mobileModel})
                </span>
              </div>
              <div className="text-xs font-mono text-slate-600 mt-0.5">
                InstanceId: {authorisedMobileDevice.instanceId} · VID: {authorisedMobileDevice.vid} | PID: {authorisedMobileDevice.pid} | Serial: {authorisedMobileDevice.serialNumber} · {authorisedMobileDevice.connectionMode}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-mono font-bold shrink-0 self-start md:self-center">
            <ShieldCheck className="w-4 h-4" />
            AUTHORISED · Status: Access Granted
          </span>
        </motion.div>

        {/* 2-Column Split: Left = Blocked USB Frequency Over Time Chart | Right = High-Risk Employees & Workstations Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 6 Cols: Blocked USB Frequency Over Time Bar Timeline */}
          <motion.div
            whileHover={{ scale: 1.018 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="lg:col-span-6 rounded-xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between space-y-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  Blocked USB Insertion Frequency Over Time (60-Min Window)
                </h3>
                <p className="text-xs text-slate-500">
                  Temporal distribution of UNAUTHORISED USB hardware blocks
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-rose-700 tabular-nums">
                Peak: {usbFrequencyTimeline.maxCount} / bucket
              </span>
            </div>

            <div className="pt-4 pb-2 px-2">
              <div className="h-44 flex items-end justify-between gap-3 border-b border-slate-200 pb-2">
                {usbFrequencyTimeline.buckets.map((bucket) => (
                  <motion.div
                    key={bucket.label}
                    whileHover={{ scale: 1.08, y: -4 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                    className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    <div className="text-xs font-mono font-bold text-slate-800 mb-1.5 tabular-nums">
                      {bucket.count}
                    </div>
                    <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg h-32 flex items-end overflow-hidden p-0.5 border border-slate-200/70">
                      <div
                        style={{ height: `${bucket.heightPct}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          bucket.count >= 2
                            ? 'bg-gradient-to-t from-rose-700 via-rose-500 to-amber-400'
                            : bucket.count === 1
                            ? 'bg-gradient-to-t from-indigo-600 to-violet-500'
                            : 'bg-slate-200'
                        }`}
                        title={`${bucket.label}: ${bucket.count} blocked attempts (${bucket.bytes} B)`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-6 gap-2 pt-2 text-center">
                {usbFrequencyTimeline.buckets.map((bucket) => (
                  <div key={bucket.label} className="space-y-0.5">
                    <div className="text-[11px] font-mono font-semibold text-slate-700 truncate">
                      {bucket.label}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      {bucket.workstationList.length > 0
                        ? bucket.workstationList.join(', ')
                        : '0 hosts'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
                  Burst Anomaly (2+ blocks)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                  Single Attempt
                </span>
              </div>
              <span className="font-mono text-slate-500">
                Total Blocked Volume:{' '}
                {visibleBlockedUsbEvents
                  .reduce((a, b) => a + b.fileSizeBytes, 0)
                  .toLocaleString()}{' '}
                B
              </span>
            </div>
          </motion.div>

          {/* Right 6 Cols: High-Risk Employees & Workstations Leaderboard */}
          <div className="lg:col-span-6 rounded-xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-950">
                  High-Risk Employees &amp; Workstation Leaderboard
                </h3>
                <p className="text-xs text-slate-500">
                  Ranked by frequency of blocked UNAUTHORISED USB insertion attempts
                </p>
              </div>
              <Monitor className="w-4 h-4 text-indigo-600" />
            </div>

            <div className="space-y-3">
              {workstationRiskProfiles.map((prof) => {
                const isSelectedWs = workstationFilter === prof.workstationId;
                return (
                  <motion.div
                    key={prof.workstationId}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 20 }}
                    onClick={() =>
                      setWorkstationFilter((prev) =>
                        prev === prof.workstationId ? 'ALL' : prof.workstationId
                      )
                    }
                    className={`rounded-xl border p-3.5 cursor-pointer ${
                      isSelectedWs
                        ? 'border-rose-500 bg-rose-50/60 ring-1 ring-rose-500'
                        : prof.blockedAttempts >= 2
                        ? 'border-rose-200 bg-gradient-to-r from-rose-50/50 via-white to-amber-50/30 hover:border-rose-300'
                        : prof.blockedAttempts === 1
                        ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg font-mono text-xs font-bold ${
                            prof.blockedAttempts >= 2
                              ? 'bg-rose-600 text-white'
                              : prof.blockedAttempts === 1
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {prof.workstationId}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-950">
                            {prof.employeeName}{' '}
                            <span className="text-xs font-normal text-slate-600">
                              · {prof.employeeRole} ({prof.department})
                            </span>
                          </div>
                          <div className="text-xs font-mono text-slate-500">
                            IP: {prof.workstationIp} · Last USB Block: {prof.latestAttempt}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono tabular-nums">
                        <div
                          className={`text-xs font-bold ${
                            prof.blockedAttempts >= 2
                              ? 'text-rose-700'
                              : prof.blockedAttempts === 1
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {prof.riskLevel}
                        </div>
                        <div className="text-sm font-bold text-slate-950">
                          {prof.blockedAttempts} blocked USBs ({prof.totalBytesAttempted.toLocaleString()} B)
                        </div>
                      </div>
                    </div>

                    {prof.distinctDevices.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 text-xs font-mono text-slate-600">
                        <HardDrive className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Flagged Hardware:</span>
                        <span className="text-slate-900 font-medium">
                          {prof.distinctDevices.join(' · ')}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Blocked USB Insertion Metadata Forensic Table */}
        <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
                Blocked UNAUTHORISED USB Hardware Metadata Log ({visibleBlockedUsbEvents.length} Events)
              </h3>
            </div>
            {workstationFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setWorkstationFilter('ALL')}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Show All Workstations
              </button>
            )}
          </div>

          {visibleBlockedUsbEvents.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No blocked UNAUTHORISED USB insertion attempts match the current workstation filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Workstation &amp; Employee</th>
                    <th className="py-2.5 px-4">UNAUTHORISED USB Device &amp; Vendor</th>
                    <th className="py-2.5 px-4">VID:PID &amp; Serial</th>
                    <th className="py-2.5 px-4">Physical Port</th>
                    <th className="py-2.5 px-4">Target File</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 font-mono tabular-nums">
                  {visibleBlockedUsbEvents.map((ev) => {
                    const meta = ev.usbMetadata || resolveUsbDeviceMetadata(ev.destination);
                    return (
                      <tr
                        key={ev.id}
                        onClick={() => setSelectedEventId(ev.id)}
                        className="hover:bg-rose-50/50 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                          {ev.timestamp}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-indigo-900">{ev.workstationId}</span>{' '}
                          <span className="font-sans font-semibold text-slate-900">
                            · {ev.employeeName}
                          </span>{' '}
                          <span className="text-slate-500">({ev.workstationIp})</span>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-rose-800">{meta.id}</div>
                          <div className="text-[11px] font-sans text-slate-500">
                            {meta.vendor} · {meta.capacityLabel}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className="text-slate-900 font-semibold">{meta.vidPid}</span>
                          <span className="text-slate-500 ml-1.5">SN:{meta.serialNumber}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                          {meta.usbPort}
                        </td>
                        <td className="py-2.5 px-4 text-slate-900 whitespace-nowrap">
                          {ev.filename} ({ev.fileSizeBytes} B)
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEventId(ev.id);
                              onRetriggerAlert(ev);
                            }}
                            className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 font-sans font-semibold transition-colors cursor-pointer"
                          >
                            Replay Alert
                          </button>
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

      {/* Row 3: Channel Breakdown Chart + Weight Tuning + Quarantine Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Channel Chart (Email vs USB) & W1/W2 Policy Weights */}
        <div className="lg:col-span-5 space-y-6">
          {/* Exfiltration Attempts by Channel Chart */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-4 card-3d-subtle">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-950">
                  Exfiltration Attempts by Channel
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                Email vs USB
              </span>
            </div>

            {events.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
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
                        <span className="font-semibold text-slate-900">{ch} Channel</span>
                        <span className="font-mono text-slate-600 tabular-nums">
                          {stat.total} total ({stat.allow} Allow · {stat.review} Review ·{' '}
                          {stat.block} Block)
                        </span>
                      </div>
                      <div className="h-5 w-full rounded-md bg-slate-100 overflow-hidden flex border border-slate-200">
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
                            className="bg-rose-600 h-full transition-all"
                            title={`Block: ${stat.block}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
                    Allow
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                    Review
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" />
                    Block
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* W1 / W2 Weight Sliders */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-4 card-3d-subtle">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-950">
                  Policy Scoring Weights
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChangeW1(0.5);
                  onChangeW2(0.5);
                }}
                className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                Reset 0.5 / 0.5
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-900 tabular-nums">
              Leak Score = Content ×{' '}
              <strong className="text-indigo-700">{w1.toFixed(2)}</strong> + Behaviour ×{' '}
              <strong className="text-amber-700">{w2.toFixed(2)}</strong>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-900">W1: Content Inspection</span>
                  <span className="font-mono font-bold text-indigo-700 tabular-nums">
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
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-900">W2: Behaviour (Dest + USB Auth + 3x Vol)</span>
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
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-4 card-3d-subtle">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-950">
                  Quarantine Review Queue ({pendingQuarantine.length} Pending)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Transfers scoring 31–70 awaiting analyst decision
              </span>
            </div>

            {pendingQuarantine.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-5 text-center text-xs text-slate-600">
                No transfers currently held in quarantine. Transfers scoring 31–70 appear here for analyst approval or rejection.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingQuarantine.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                    className="rounded-lg border border-amber-300 bg-amber-50/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="text-amber-800 font-bold">
                          REVIEW · Score {item.finalLeakScore}/100
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-950 font-sans font-medium">
                          {item.employeeName} ({item.workstationId})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500 tabular-nums">
                          {item.timestamp}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-950 font-mono">
                        {item.filename} ({item.fileSizeBytes} B) → {item.channel}: {item.destination}
                      </div>
                      <div className="text-xs font-mono text-slate-700">
                        {item.formattedSummaryLine}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onResolveQuarantine(item.id, 'APPROVED_BY_ANALYST')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveQuarantine(item.id, 'REJECTED_BY_ANALYST')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Alert Drill-Down Inspector */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-4 card-3d-subtle">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-950">
                  Selected Event Drill-Down
                </h2>
              </div>
              {drillDownEvent && drillDownEvent.shouldAlertAndVibrate && (
                <button
                  type="button"
                  onClick={() => onRetriggerAlert(drillDownEvent)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Flash &amp; Vibrate Alert
                </button>
              )}
            </div>

            {!drillDownEvent ? (
              <div className="text-xs text-slate-500 py-4 text-center">
                Select any row in the Live Feed table below to inspect its explainable score and ranked reasons.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-mono text-slate-600">
                    <strong className="text-slate-950 font-sans text-sm">
                      {drillDownEvent.employeeName} ({drillDownEvent.workstationId})
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
                        : 'text-rose-700'
                    }`}
                  >
                    {drillDownEvent.tier} · Score {drillDownEvent.finalLeakScore}/100 (
                    {drillDownEvent.severity})
                  </div>
                </div>

                {drillDownEvent.channel === 'USB' && drillDownEvent.usbMetadata && (
                  <div
                    className={`p-3 rounded-lg border font-mono text-xs ${
                      drillDownEvent.usbMetadata.authorised
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div className="font-bold">
                      {drillDownEvent.usbMetadata.authorised
                        ? `[AUTHORISED MOBILE] ${drillDownEvent.usbMetadata.id} — Status: Access Granted`
                        : `[UNAUTHORISED USB] ${drillDownEvent.usbMetadata.id} — Status: BLOCKED!`}
                    </div>
                    <div className="mt-0.5">
                      VID: {drillDownEvent.usbMetadata.vid} | PID: {drillDownEvent.usbMetadata.pid} | Serial: {drillDownEvent.usbMetadata.serialNumber} · {drillDownEvent.usbMetadata.connectionMode || 'USB Interface'}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-900 leading-relaxed">
                  {drillDownEvent.formattedSummaryLine}
                </div>

                <ol className="list-decimal list-inside space-y-1 text-xs font-mono text-slate-700">
                  {drillDownEvent.rankedReasons.map((r, idx) => (
                    <li key={idx}>
                      <span className="text-slate-950 font-medium">{r.text}</span>{' '}
                      <span className="text-slate-500">
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

      {/* Live Feed Event Table */}
      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden card-3d-subtle">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-950">
                Live Security Event Feed
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {autoRefresh ? `Auto-refreshing · ${lastRefreshedAt}` : `Paused · ${lastRefreshedAt}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                autoRefresh
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live Feed On' : 'Live Feed Paused'}
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter user, workstation, file..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 w-48"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              {(['ALL', 'ALLOW', 'REVIEW', 'BLOCK'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierFilter(t)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    tierFilter === t
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onRestoreDemoEvents}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Sample Events
            </button>

            {events.length > 0 && (
              <button
                type="button"
                onClick={onClearEvents}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-slate-500">
              No DLP events match the current filter. Trigger a transfer from the Employee Console or restore the baseline sample events to inspect traffic patterns.
            </p>
            <button
              type="button"
              onClick={() => {
                setWorkstationFilter('ALL');
                setTierFilter('ALL');
                setSearchTerm('');
                if (events.length === 0) onRestoreDemoEvents();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters / Restore Sample Events
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-xs font-semibold text-slate-700">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">User &amp; Workstation</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">File</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4 text-right">Size</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-xs">
                {filteredEvents.map((ev) => {
                  const liveScore = computeLiveEventScore(ev, w1, w2);
                  const isSelected = drillDownEvent?.id === ev.id;

                  const rowBgClass =
                    ev.tier === 'ALLOW'
                      ? 'bg-emerald-50/45 hover:bg-emerald-50/90'
                      : ev.tier === 'REVIEW'
                      ? 'bg-amber-50/60 hover:bg-amber-50'
                      : 'bg-rose-50/65 hover:bg-rose-50';

                  return (
                    <tr
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`cursor-pointer transition-colors ${rowBgClass} ${
                        isSelected ? 'ring-1 ring-inset ring-indigo-600' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {ev.timestamp}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-950">{ev.employeeName}</span>
                        <span className="font-mono text-indigo-700 ml-1.5 font-semibold">
                          [{ev.workstationId}]
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-950 whitespace-nowrap">
                        {ev.channel}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-950 whitespace-nowrap">
                        {ev.filename}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 break-all max-w-xs">
                        {ev.destination}
                        {ev.channel === 'USB' && (
                          <span
                            className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ev.usbMetadata?.authorised
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {ev.usbMetadata?.authorised ? 'AUTHORISED' : 'UNAUTHORISED'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {ev.fileSizeBytes} B
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-950 tabular-nums whitespace-nowrap">
                        {liveScore}/100
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold ${
                            ev.tier === 'ALLOW'
                              ? 'text-emerald-700'
                              : ev.tier === 'REVIEW'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {ev.tier}
                        </span>
                        {ev.quarantineStatus === 'APPROVED_BY_ANALYST' && (
                          <span className="text-emerald-700 ml-1.5">· Released</span>
                        )}
                        {ev.quarantineStatus === 'REJECTED_BY_ANALYST' && (
                          <span className="text-rose-700 ml-1.5">· Rejected</span>
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
    </motion.div>
  );
};

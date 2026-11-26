import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BuiltInMockFileName,
  MOCK_ANALYSTS,
  MOCK_EMPLOYEES,
  MOCK_FILES,
  MockFileName,
  UsbDeviceId,
} from './data/mockFiles';
import {
  DLPChannel,
  DLPEvaluationResult,
  evaluateDLPTransfer,
} from './utils/dlpEngine';
import { armAlertsUserGesture, isVibrationSupported } from './utils/alertFeedback';
import {
  UploadedDatasetScanReport,
  analyzeUploadedFile,
} from './utils/accountsDataset';
import { EmployeeConsole } from './components/EmployeeConsole';
import { AnalystDashboard } from './components/AnalystDashboard';
import {
  Shield,
  UserCheck,
  Volume2,
  Smartphone,
  LogOut,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Usb,
  FileSpreadsheet,
} from 'lucide-react';

type ActiveRole = 'LANDING' | 'EMPLOYEE' | 'ANALYST';

function SentinelLogo3D({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims =
    size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  return (
    <div className={`relative ${dims} shrink-0 logo-3d-emblem select-none`} aria-hidden="true">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          <linearGradient id="sentinelShieldGrad" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="52%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
          <linearGradient id="sentinelInnerFacet" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ccfbf1" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        {/* Outer 3D Beveled Shield */}
        <path
          d="M32 4L56 14V30C56 45.5 45.6 56.8 32 60C18.4 56.8 8 45.5 8 30V14L32 4Z"
          fill="url(#sentinelShieldGrad)"
        />
        {/* Inner Facet Highlight */}
        <path
          d="M32 9L51 17V30C51 42.8 42.5 52.3 32 55.2V9Z"
          fill="white"
          fillOpacity="0.14"
        />
        {/* Core Data Prism Node */}
        <path
          d="M32 16L44 22V31C44 39.5 38.8 46.2 32 48.5C25.2 46.2 20 39.5 20 31V22L32 16Z"
          stroke="url(#sentinelInnerFacet)"
          strokeWidth="2.5"
          fill="#0f172a"
          fillOpacity="0.35"
        />
        {/* Central Laser Inspection Pulse */}
        <path
          d="M26 31L30 35L39 26"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function createInitialDemoEvents(): DLPEvaluationResult[] {
  // Seed realistic past events: approved Email & Corporate Encrypted USB transfers
  // PLUS blocked Commercial (Unauthorised) USB insertion attempts across time buckets & workstations
  const seeds: Array<{
    employeeId: string;
    employeeName: string;
    employeeRole: string;
    filename: BuiltInMockFileName;
    channel: DLPChannel;
    emailRecipientAddress?: string;
    usbDeviceId?: UsbDeviceId;
    userHistoryBytes: number[];
    offsetMin: number;
    isImmediatePenDriveInsertion?: boolean;
  }> = [
    {
      employeeId: 'rohan',
      employeeName: 'Rohan',
      employeeRole: 'Product Engineer',
      filename: 'hr_records.txt',
      channel: 'USB',
      usbDeviceId: 'SanDisk-Cruzer-Commercial-64GB',
      userHistoryBytes: [380, 410, 440, 370],
      offsetMin: 1,
      isImmediatePenDriveInsertion: true,
    },
    {
      employeeId: 'rohan',
      employeeName: 'Rohan',
      employeeRole: 'Product Engineer',
      filename: 'project_plan.txt',
      channel: 'USB',
      usbDeviceId: 'TECNO POVA 6 Neo 5G',
      userHistoryBytes: [380, 410, 440, 370],
      offsetMin: 5,
    },
    {
      employeeId: 'aarav',
      employeeName: 'Aarav',
      employeeRole: 'Finance Associate',
      filename: 'customer_cards.txt',
      channel: 'USB',
      usbDeviceId: 'Kingston-DataTraveler-Commercial-32GB',
      userHistoryBytes: [420, 480, 390, 450],
      offsetMin: 8,
      isImmediatePenDriveInsertion: true,
    },
    {
      employeeId: 'meera',
      employeeName: 'Meera',
      employeeRole: 'HR Specialist',
      filename: 'public_policy.txt',
      channel: 'Email',
      emailRecipientAddress: 'all-staff@company.com',
      userHistoryBytes: [500, 420, 460, 540],
      offsetMin: 12,
    },
    {
      employeeId: 'rohan',
      employeeName: 'Rohan',
      employeeRole: 'Product Engineer',
      filename: 'finance_report.txt',
      channel: 'USB',
      usbDeviceId: 'Unknown-USB (unregistered)',
      userHistoryBytes: [380, 410, 440, 370],
      offsetMin: 17,
      isImmediatePenDriveInsertion: true,
    },
    {
      employeeId: 'aarav',
      employeeName: 'Aarav',
      employeeRole: 'Finance Associate',
      filename: 'public_policy.txt',
      channel: 'Email',
      emailRecipientAddress: 'all-staff@company.com',
      userHistoryBytes: [420, 480, 390, 450],
      offsetMin: 23,
    },
    {
      employeeId: 'rohan',
      employeeName: 'Rohan',
      employeeRole: 'Product Engineer',
      filename: 'customer_cards.txt',
      channel: 'USB',
      usbDeviceId: 'SanDisk-Cruzer-Commercial-64GB',
      userHistoryBytes: [380, 410, 440, 370],
      offsetMin: 27,
      isImmediatePenDriveInsertion: true,
    },
    {
      employeeId: 'meera',
      employeeName: 'Meera',
      employeeRole: 'HR Specialist',
      filename: 'public_policy.txt',
      channel: 'USB',
      usbDeviceId: 'TECNO POVA 6 Neo 5G',
      userHistoryBytes: [500, 420, 460, 540],
      offsetMin: 34,
    },
    {
      employeeId: 'aarav',
      employeeName: 'Aarav',
      employeeRole: 'Finance Associate',
      filename: 'finance_report.txt',
      channel: 'USB',
      usbDeviceId: 'Unknown-USB (unregistered)',
      userHistoryBytes: [420, 480, 390, 450],
      offsetMin: 41,
      isImmediatePenDriveInsertion: true,
    },
    {
      employeeId: 'rohan',
      employeeName: 'Rohan',
      employeeRole: 'Product Engineer',
      filename: 'public_policy.txt',
      channel: 'Email',
      emailRecipientAddress: 'all-staff@company.com',
      userHistoryBytes: [380, 410, 440, 370],
      offsetMin: 52,
    },
  ];

  const baseMs = Date.now();
  return seeds.map((s, idx) => {
    const res = evaluateDLPTransfer({
      employeeId: s.employeeId,
      employeeName: s.employeeName,
      employeeRole: s.employeeRole,
      filename: s.filename,
      channel: s.channel,
      emailRecipientAddress: s.emailRecipientAddress,
      usbDeviceId: s.usbDeviceId,
      userHistoryBytes: s.userHistoryBytes,
      w1: 0.5,
      w2: 0.5,
      isImmediatePenDriveInsertion: s.isImmediatePenDriveInsertion,
    });
    const tsMs = baseMs - s.offsetMin * 60_000;
    const tsStr = new Date(tsMs).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return {
      ...res,
      id: `seed-${idx + 1}-${tsMs}`,
      timestamp: tsStr,
      timestampMs: tsMs,
    };
  });
}

export default function App() {
  const [activeRole, setActiveRole] = useState<ActiveRole>('LANDING');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(MOCK_EMPLOYEES[0].id);
  const [selectedAnalystId, setSelectedAnalystId] = useState<string>(MOCK_ANALYSTS[0].id);
  const [employeeInitialFile, setEmployeeInitialFile] = useState<MockFileName | undefined>(
    undefined
  );

  // User-uploaded CSV / Text file scan report (managed inside Employee Console)
  const [uploadedDataset, setUploadedDataset] = useState<UploadedDatasetScanReport | null>(null);

  const handleUploadFileContent = (filename: string, content: string, sizeBytes?: number) => {
    const report = analyzeUploadedFile(filename, content, sizeBytes);
    setUploadedDataset(report);
  };

  // User gesture arming for vibration & Web Audio siren
  const [alertsArmed, setAlertsArmed] = useState<boolean>(false);
  const [armFeedbackMsg, setArmFeedbackMsg] = useState<string | null>(null);

  // Per-user historical file size baselines
  const [userHistories, setUserHistories] = useState<Record<string, number[]>>(() => {
    const map: Record<string, number[]> = {};
    MOCK_EMPLOYEES.forEach((emp) => {
      map[emp.id] = [...emp.defaultHistoryBytes];
    });
    return map;
  });

  // Adjustable Analyst weights
  const [w1, setW1] = useState<number>(0.5);
  const [w2, setW2] = useState<number>(0.5);

  // Shared DLP event history & latest alert
  const [events, setEvents] = useState<DLPEvaluationResult[]>(() => createInitialDemoEvents());
  const [latestAlert, setLatestAlert] = useState<DLPEvaluationResult | null>(null);
  const [lastEvaluationByEmployee, setLastEvaluationByEmployee] = useState<
    Record<string, DLPEvaluationResult>
  >({});

  const activeEmployee =
    MOCK_EMPLOYEES.find((e) => e.id === selectedEmployeeId) || MOCK_EMPLOYEES[0];
  const activeAnalyst =
    MOCK_ANALYSTS.find((a) => a.id === selectedAnalystId) || MOCK_ANALYSTS[0];

  const handleEnableAlerts = () => {
    const res = armAlertsUserGesture();
    setAlertsArmed(true);
    if (res.vibrated) {
      setArmFeedbackMsg('Audio unlocked and vibration pulse confirmed.');
    } else if (res.vibrateSupported) {
      setArmFeedbackMsg('Audio and Vibration API unlocked.');
    } else {
      setArmFeedbackMsg(
        'Audio siren unlocked (vibration supported on Android Chrome; visual flashing banner active).'
      );
    }
  };

  const handleSubmitTransfer = (params: {
    filename: MockFileName;
    channel: DLPChannel;
    emailRecipientAddress?: string;
    usbDeviceId?: UsbDeviceId;
    customVid?: string;
    customPid?: string;
    customSerial?: string;
    overrideContent?: string;
    overrideSizeBytes?: number;
    isImmediatePenDriveInsertion?: boolean;
  }) => {
    const emp = activeEmployee;
    const currentHistory = userHistories[emp.id] || emp.defaultHistoryBytes;

    const evaluation = evaluateDLPTransfer({
      employeeId: emp.id,
      employeeName: emp.name,
      employeeRole: emp.role,
      workstationId: emp.workstationId,
      workstationIp: emp.workstationIp,
      filename: params.filename,
      channel: params.channel,
      emailRecipientAddress: params.emailRecipientAddress,
      usbDeviceId: params.usbDeviceId,
      customVid: params.customVid,
      customPid: params.customPid,
      customSerial: params.customSerial,
      userHistoryBytes: currentHistory,
      w1,
      w2,
      overrideContent: params.overrideContent,
      overrideSizeBytes: params.overrideSizeBytes,
      isImmediatePenDriveInsertion: params.isImmediatePenDriveInsertion,
    });

    setEvents((prev) => [evaluation, ...prev]);
    setLastEvaluationByEmployee((prev) => ({
      ...prev,
      [emp.id]: evaluation,
    }));

    if (evaluation.tier === 'ALLOW' && !evaluation.hardViolationTriggered) {
      const builtIn = MOCK_FILES[params.filename as BuiltInMockFileName];
      const recordedBytes =
        params.overrideSizeBytes ?? (builtIn ? builtIn.sizeBytes : evaluation.fileSizeBytes);
      setUserHistories((prev) => ({
        ...prev,
        [emp.id]: [...(prev[emp.id] || []), recordedBytes],
      }));
      setLatestAlert(null);
    } else {
      setLatestAlert({
        ...evaluation,
        timestampMs: Date.now(),
      });
    }
  };

  const handleResetUserHistory = (employeeId: string) => {
    const emp = MOCK_EMPLOYEES.find((e) => e.id === employeeId);
    if (!emp) return;
    setUserHistories((prev) => ({
      ...prev,
      [employeeId]: [...emp.defaultHistoryBytes],
    }));
  };

  const handleResolveQuarantine = (
    eventId: string,
    resolution: 'APPROVED_BY_ANALYST' | 'REJECTED_BY_ANALYST'
  ) => {
    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          quarantineStatus: resolution,
          resolvedByAnalyst: activeAnalyst.name,
          resolvedAt: nowStr,
          tier: resolution === 'REJECTED_BY_ANALYST' ? 'BLOCK' : ev.tier,
        };
      })
    );
  };

  const pendingReviewCount = events.filter(
    (e) => e.tier === 'REVIEW' && e.quarantineStatus === 'PENDING_REVIEW'
  ).length;

  const blockedUsbCount = events.filter(
    (e) => e.channel === 'USB' && e.tier === 'BLOCK'
  ).length;

  return (
    <div className="min-h-screen text-slate-900 flex flex-col">
      {/* Top Bar Contract: Zone 1 Wordmark — Zone 2 Nav Links — Zone 3 1 Primary Action */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <button
          type="button"
          onClick={() => setActiveRole('LANDING')}
          className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-700 via-teal-600 to-rose-600 bg-clip-text text-transparent whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          SentinelDLP
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveRole('LANDING')}
            className={`hover:text-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeRole === 'LANDING'
                ? 'text-indigo-700 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('EMPLOYEE')}
            className={`hover:text-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeRole === 'EMPLOYEE'
                ? 'text-indigo-700 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Employee Console
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('ANALYST')}
            className={`hover:text-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeRole === 'ANALYST'
                ? 'text-indigo-700 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Analyst Dashboard ({pendingReviewCount})
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleEnableAlerts}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              alertsArmed
                ? 'bg-teal-50 text-teal-800 border border-teal-300 hover:bg-teal-100'
                : 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white hover:from-indigo-700 hover:to-teal-700 shadow-xs'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            {alertsArmed ? 'Alerts Armed' : 'Enable alerts'}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <div className="flex md:hidden items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-200 overflow-x-auto">
        {(
          [
            { id: 'LANDING', label: 'Overview' },
            { id: 'EMPLOYEE', label: 'Employee Console' },
            { id: 'ANALYST', label: `Analyst (${pendingReviewCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveRole(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              activeRole === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-slate-700 bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-white/85 backdrop-blur-xs p-5 space-y-5 shrink-0">
          {/* Brand Logo Lockup in Sidebar */}
          <div className="rounded-xl border border-indigo-950/10 bg-gradient-to-br from-indigo-950 via-slate-900 to-teal-950 p-4 text-white flex items-center gap-3.5 card-3d-subtle">
            <SentinelLogo3D size="md" />
            <div>
              <div className="text-sm font-bold tracking-tight text-white">
                SentinelDLP Prism
              </div>
            </div>
          </div>

          {/* Active Session Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="text-xs font-medium text-slate-500">Active Session</div>
            {activeRole === 'LANDING' ? (
              <div className="text-sm font-semibold text-slate-900">
                Role Selection Overview
              </div>
            ) : activeRole === 'EMPLOYEE' ? (
              <div>
                <div className="text-xs font-mono font-semibold text-indigo-600">
                  EMPLOYEE CONSOLE
                </div>
                <div className="text-base font-bold text-slate-950 mt-0.5">
                  {activeEmployee.name}
                </div>
                <div className="text-xs text-slate-600">
                  {activeEmployee.role} · {activeEmployee.workstationId}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs font-mono font-semibold text-rose-600">
                  SECURITY ANALYST
                </div>
                <div className="text-base font-bold text-slate-950 mt-0.5">
                  {activeAnalyst.name}
                </div>
                <div className="text-xs text-slate-600">{activeAnalyst.title}</div>
              </div>
            )}

            <div className="pt-1 flex flex-col gap-2">
              {activeRole !== 'LANDING' && (
                <button
                  type="button"
                  onClick={() => setActiveRole('LANDING')}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-indigo-50 text-slate-900 border border-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 text-indigo-600" />
                  Switch user
                </button>
              )}

              {activeRole === 'EMPLOYEE' && (
                <button
                  type="button"
                  onClick={() => setActiveRole('ANALYST')}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  Open Analyst Dashboard ({pendingReviewCount})
                </button>
              )}

              {activeRole === 'ANALYST' && (
                <button
                  type="button"
                  onClick={() => setActiveRole('EMPLOYEE')}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  Open Employee View ({activeEmployee.name})
                </button>
              )}
            </div>
          </div>

          {/* Mobile Vibration & Audio */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                Alert &amp; Vibration Gesture
              </span>
              <span className="font-mono text-xs font-semibold text-teal-700">
                {alertsArmed ? 'ARMED' : 'READY'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleEnableAlerts}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                alertsArmed
                  ? 'bg-teal-100 text-teal-900 hover:bg-teal-200 border border-teal-300'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {alertsArmed ? 'Test Alert Pulse' : 'Enable alerts'}
            </button>

            <p className="text-xs text-slate-500 leading-relaxed">
              {isVibrationSupported()
                ? 'Android Chrome Vibration API supported.'
                : 'Audio siren + flashing crimson banner active.'}
            </p>
            {armFeedbackMsg && (
              <p className="text-xs text-teal-800 font-medium">{armFeedbackMsg}</p>
            )}
          </div>

          {/* Analyst Weight Sliders */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Analyst Weights
              </span>
              <button
                type="button"
                onClick={() => {
                  setW1(0.5);
                  setW2(0.5);
                }}
                className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                0.5 / 0.5
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>W1 (Content)</span>
                  <span className="font-mono text-indigo-700 font-bold tabular-nums">
                    {w1.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={w1}
                  onChange={(e) => setW1(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>W2 (Behaviour)</span>
                  <span className="font-mono text-amber-700 font-bold tabular-nums">
                    {w2.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={w2}
                  onChange={(e) => setW2(parseFloat(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>
            <div className="text-xs font-mono text-slate-500 tabular-nums">
              Score = C×{w1.toFixed(2)} + B×{w2.toFixed(2)}
            </div>
          </div>
        </aside>

        {/* Main Content Area with 3D Animated View Transitions */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto perspective-stage">
          <AnimatePresence mode="wait">
            {activeRole === 'LANDING' && (
              <motion.div
                key="view-landing"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="max-w-5xl mx-auto space-y-8"
              >
                {/* Hero Header with 3D Emblem Logo & Color Grading */}
                <div className="rounded-xl border border-indigo-950/12 bg-gradient-to-br from-white via-indigo-50/45 to-teal-50/55 p-6 md:p-8 space-y-5 card-3d">
                  <div className="flex flex-wrap items-center gap-4">
                    <SentinelLogo3D size="lg" />
                    <div>
                      <div className="text-xs font-mono font-semibold text-indigo-700">
                        Avishkar&apos;26 Problem Statement 17 · Cybersecurity &amp; FinTech DLP
                      </div>
                      <h1
                        className="text-2xl md:text-4xl font-bold text-slate-950 tracking-tight mt-0.5"
                        style={{ textWrap: 'balance' }}
                      >
                        Data Exfiltration Detection &amp; Prevention Console
                      </h1>
                    </div>
                  </div>

                  <p className="text-sm md:text-base text-slate-700 max-w-3xl leading-relaxed">
                    Explainable Data Loss Prevention integrating an in-console{' '}
                    <strong className="text-indigo-900">Presidio + Regex + Pandas DataFrame CSV Scanner</strong> inside the Employee Workstation, paired with{' '}
                    <strong className="text-rose-700">Commercial USB Pen Drive Denial &amp; Time-Series Workstation Forensics</strong> in the Security Analyst Dashboard.
                  </p>

                  <div className="pt-1 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleEnableAlerts}
                      className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-2 ${
                        alertsArmed
                          ? 'bg-teal-50 text-teal-800 border border-teal-300'
                          : 'bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white shadow-xs'
                      }`}
                    >
                      {alertsArmed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Alerts Armed (Tap to Test)
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          Enable alerts &amp; vibration
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveRole('EMPLOYEE')}
                      className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-white hover:bg-indigo-50 text-indigo-950 border border-indigo-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                      Upload &amp; Scan CSV in Employee Console
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveRole('ANALYST')}
                      className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-2"
                    >
                      <Usb className="w-4 h-4 text-rose-600" />
                      Inspect Blocked USB Forensics ({blockedUsbCount} Events)
                    </button>
                  </div>
                </div>

                {/* Dual-Persona Passwordless Entry Cards with Distinct Color Grading */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Employee Card — Indigo/Teal Color Grading */}
                  <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-b from-white to-indigo-50/35 p-6 flex flex-col justify-between space-y-6 card-3d">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-indigo-700">
                        <UserCheck className="w-4 h-4" />
                        01. Employee Workstation &amp; Live File Scanner
                      </div>
                      <h2 className="text-xl font-bold text-slate-950">Employee Console</h2>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Upload CSV or text files directly in the workstation for live Presidio + Regex + Pandas scanning, send outbound emails, or test corporate encrypted USBs vs commercial (unauthorised) pen drives.
                      </p>

                      <div className="pt-2 space-y-1.5">
                        <label
                          htmlFor="landing-employee-select"
                          className="block text-xs font-semibold text-slate-900"
                        >
                          Act as Employee &amp; Workstation
                        </label>
                        <select
                          id="landing-employee-select"
                          value={selectedEmployeeId}
                          onChange={(e) => setSelectedEmployeeId(e.target.value)}
                          className="w-full rounded-lg bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 focus:outline-none focus:border-indigo-600"
                        >
                          {MOCK_EMPLOYEES.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} — {emp.role} ({emp.workstationId})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveRole('EMPLOYEE')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
                    >
                      Enter Employee Console
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Security Analyst Card — Slate/Rose/Violet Color Grading */}
                  <div className="rounded-xl border border-rose-200/80 bg-gradient-to-b from-white to-rose-50/35 p-6 flex flex-col justify-between space-y-6 card-3d">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-rose-700">
                        <Shield className="w-4 h-4" />
                        02. SOC Analyst &amp; USB Forensics Console
                      </div>
                      <h2 className="text-xl font-bold text-slate-950">
                        Security Analyst Dashboard
                      </h2>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Analyze blocked commercial USB insertion frequency over time, identify high-risk repeat-offender workstations and VID:PID hardware metadata, tune W1/W2 weights, and resolve quarantines.
                      </p>

                      <div className="pt-2 space-y-1.5">
                        <label
                          htmlFor="landing-analyst-select"
                          className="block text-xs font-semibold text-slate-900"
                        >
                          Act as Security Analyst
                        </label>
                        <select
                          id="landing-analyst-select"
                          value={selectedAnalystId}
                          onChange={(e) => setSelectedAnalystId(e.target.value)}
                          className="w-full rounded-lg bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 focus:outline-none focus:border-indigo-600"
                        >
                          {MOCK_ANALYSTS.map((an) => (
                            <option key={an.id} value={an.id}>
                              {an.name} — {an.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveRole('ANALYST')}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-slate-900 via-indigo-950 to-rose-950 hover:from-slate-800 hover:to-rose-900 text-white font-semibold text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
                    >
                      Enter Security Analyst Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Protected Files & Approved Destinations Map */}
                <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden card-3d-subtle">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-950">
                      Protected Assets &amp; Approved Destinations (+ In-Console CSV Upload)
                    </h3>
                    <span className="text-xs font-mono text-indigo-700 font-semibold">
                      {Object.keys(MOCK_FILES).length} Built-in Assets ·{' '}
                      {uploadedDataset
                        ? `Uploaded: ${uploadedDataset.filename}`
                        : 'Live CSV Upload Available in Employee Console'}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700">
                          <th className="py-2.5 px-5">Filename</th>
                          <th className="py-2.5 px-4">Approved Destination</th>
                          <th className="py-2.5 px-4 text-right">Size</th>
                          <th className="py-2.5 px-5">Classification &amp; Sensitive Fields</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 font-mono">
                        {uploadedDataset && (
                          <tr className="bg-teal-50/60 hover:bg-teal-50 transition-colors">
                            <td className="py-3 px-5 font-bold text-slate-950">
                              [UPLOADED] {uploadedDataset.filename}
                            </td>
                            <td className="py-3 px-4 text-teal-700 font-semibold">
                              finance@company.com
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                              {uploadedDataset.fileSizeBytes} B
                            </td>
                            <td className="py-3 px-5 font-sans text-slate-700">
                              Verified via Presidio + Pandas ({uploadedDataset.totalRows} rows,{' '}
                              {uploadedDataset.sensitiveColumnsDetected.length} sensitive columns)
                            </td>
                          </tr>
                        )}
                        {Object.values(MOCK_FILES).map((f) => (
                          <tr key={f.filename} className="hover:bg-indigo-50/35 transition-colors">
                            <td className="py-3 px-5 font-semibold text-slate-950">
                              {f.filename}
                            </td>
                            <td className="py-3 px-4 text-indigo-700 font-semibold">
                              {f.approvedDestination}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                              {f.sizeBytes} B
                            </td>
                            <td className="py-3 px-5 font-sans text-slate-600">
                              {f.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeRole === 'EMPLOYEE' && (
              <EmployeeConsole
                key="view-employee"
                employee={activeEmployee}
                userHistoryBytes={
                  userHistories[activeEmployee.id] || activeEmployee.defaultHistoryBytes
                }
                w1={w1}
                w2={w2}
                alertsArmed={alertsArmed}
                latestAlert={latestAlert}
                lastEvaluationForUser={lastEvaluationByEmployee[activeEmployee.id] || null}
                initialSelectedFile={employeeInitialFile}
                uploadedDataset={uploadedDataset}
                onUploadFileContent={handleUploadFileContent}
                onClearUploadedDataset={() => setUploadedDataset(null)}
                onSubmitTransfer={handleSubmitTransfer}
                onResetUserHistory={handleResetUserHistory}
                onDismissAlert={() => setLatestAlert(null)}
              />
            )}

            {activeRole === 'ANALYST' && (
              <AnalystDashboard
                key="view-analyst"
                analyst={activeAnalyst}
                events={events}
                latestAlert={latestAlert}
                alertsArmed={alertsArmed}
                w1={w1}
                w2={w2}
                onChangeW1={setW1}
                onChangeW2={setW2}
                onResolveQuarantine={handleResolveQuarantine}
                onDismissAlert={() => setLatestAlert(null)}
                onRetriggerAlert={(ev) =>
                  setLatestAlert({
                    ...ev,
                    timestampMs: Date.now(),
                  })
                }
                onClearEvents={() => {
                  setEvents([]);
                  setLatestAlert(null);
                }}
                onRestoreDemoEvents={() => {
                  setEvents(createInitialDemoEvents());
                  setLatestAlert(null);
                }}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

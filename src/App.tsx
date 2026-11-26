import React, { useEffect, useState } from 'react';
import {
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
import { STREAMLIT_APP_PY_CODE } from './utils/streamlitExport';
import {
  AccountsDatasetSummary,
  formatAccountsDlpExtract,
  summarizeAccountRecords,
} from './utils/accountsDataset';
import { EmployeeConsole } from './components/EmployeeConsole';
import { AnalystDashboard } from './components/AnalystDashboard';
import { BankingDatasetPanel } from './components/BankingDatasetPanel';
import {
  Shield,
  UserCheck,
  Volume2,
  Smartphone,
  LogOut,
  Download,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Code2,
  Database,
} from 'lucide-react';

type ActiveRole = 'LANDING' | 'EMPLOYEE' | 'ANALYST' | 'DATASET';

function createInitialDemoEvents(): DLPEvaluationResult[] {
  // Seed 8 realistic safe past events across Email & Registered USB so charts & averages start populated
  const seeds: Array<{
    employeeId: string;
    employeeName: string;
    employeeRole: string;
    filename: MockFileName;
    channel: DLPChannel;
    emailRecipientAddress?: string;
    usbDeviceId?: UsbDeviceId;
    userHistoryBytes: number[];
    offsetMin: number;
  }> = [
    {
      employeeId: 'rohan',
      employeeName: 'Rohan',
      employeeRole: 'Product Engineer',
      filename: 'project_plan.txt',
      channel: 'USB',
      usbDeviceId: 'Registered-USB-01',
      userHistoryBytes: [380, 410, 440, 370],
      offsetMin: 4,
    },
    {
      employeeId: 'meera',
      employeeName: 'Meera',
      employeeRole: 'HR Specialist',
      filename: 'public_policy.txt',
      channel: 'Email',
      emailRecipientAddress: 'all-staff@company.com',
      userHistoryBytes: [500, 420, 460, 540],
      offsetMin: 9,
    },
    {
      employeeId: 'aarav',
      employeeName: 'Aarav',
      employeeRole: 'Finance Associate',
      filename: 'public_policy.txt',
      channel: 'Email',
      emailRecipientAddress: 'all-staff@company.com',
      userHistoryBytes: [420, 480, 390, 450],
      offsetMin: 15,
    },
    {
      employeeId: 'rohan',
      employeeName: 'Rohan',
      employeeRole: 'Product Engineer',
      filename: 'project_plan.txt',
      channel: 'Email',
      emailRecipientAddress: 'team@company.com',
      userHistoryBytes: [380, 410, 440, 370],
      offsetMin: 21,
    },
    {
      employeeId: 'meera',
      employeeName: 'Meera',
      employeeRole: 'HR Specialist',
      filename: 'public_policy.txt',
      channel: 'USB',
      usbDeviceId: 'Registered-USB-01',
      userHistoryBytes: [500, 420, 460, 540],
      offsetMin: 28,
    },
    {
      employeeId: 'aarav',
      employeeName: 'Aarav',
      employeeRole: 'Finance Associate',
      filename: 'project_plan.txt',
      channel: 'Email',
      emailRecipientAddress: 'team@company.com',
      userHistoryBytes: [420, 480, 390, 450],
      offsetMin: 35,
    },
    {
      employeeId: 'rohan',
      employeeName: 'Rohan',
      employeeRole: 'Product Engineer',
      filename: 'public_policy.txt',
      channel: 'Email',
      emailRecipientAddress: 'all-staff@company.com',
      userHistoryBytes: [380, 410, 440, 370],
      offsetMin: 44,
    },
    {
      employeeId: 'aarav',
      employeeName: 'Aarav',
      employeeRole: 'Finance Associate',
      filename: 'public_policy.txt',
      channel: 'USB',
      usbDeviceId: 'Registered-USB-01',
      userHistoryBytes: [420, 480, 390, 450],
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

  // Live Banking CSV Dataset state (public/assets/aistudio/accounts_288e8b18.csv)
  const [accountsDataset, setAccountsDataset] = useState<AccountsDatasetSummary>(() =>
    summarizeAccountRecords([], false)
  );
  const datasetLoading = false;
  const liveCsvExtractContent = '';
  const liveCsvExtractBytes = 0;

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

  const [showPythonModal, setShowPythonModal] = useState<boolean>(false);

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
    overrideContent?: string;
    overrideSizeBytes?: number;
  }) => {
    const emp = activeEmployee;
    const currentHistory = userHistories[emp.id] || emp.defaultHistoryBytes;

    const evaluation = evaluateDLPTransfer({
      employeeId: emp.id,
      employeeName: emp.name,
      employeeRole: emp.role,
      filename: params.filename,
      channel: params.channel,
      emailRecipientAddress: params.emailRecipientAddress,
      usbDeviceId: params.usbDeviceId,
      userHistoryBytes: currentHistory,
      w1,
      w2,
      overrideContent: params.overrideContent,
      overrideSizeBytes: params.overrideSizeBytes,
    });

    setEvents((prev) => [evaluation, ...prev]);
    setLastEvaluationByEmployee((prev) => ({
      ...prev,
      [emp.id]: evaluation,
    }));

    if (evaluation.tier === 'ALLOW' && !evaluation.hardViolationTriggered) {
      const recordedBytes = params.overrideSizeBytes ?? MOCK_FILES[params.filename].sizeBytes;
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

  const handleDownloadStreamlitScript = () => {
    const blob = new Blob([STREAMLIT_APP_PY_CODE], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'app.py';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pendingReviewCount = events.filter(
    (e) => e.tier === 'REVIEW' && e.quarantineStatus === 'PENDING_REVIEW'
  ).length;

  return (
    <div className="min-h-screen bg-[#f6faf7] text-[#0d2116] flex flex-col">
      {/* Top Bar Contract: Zone 1 Wordmark — Zone 2 4 Nav Links — Zone 3 1 Primary Action */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-emerald-900/12 bg-white sticky top-0 z-30">
        <button
          type="button"
          onClick={() => setActiveRole('LANDING')}
          className="text-lg font-bold tracking-tight text-emerald-950 whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          SentinelDLP
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-emerald-900/70">
          <button
            type="button"
            onClick={() => setActiveRole('LANDING')}
            className={`hover:text-emerald-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeRole === 'LANDING'
                ? 'text-emerald-800 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('EMPLOYEE')}
            className={`hover:text-emerald-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeRole === 'EMPLOYEE'
                ? 'text-emerald-800 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Employee Console
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('ANALYST')}
            className={`hover:text-emerald-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeRole === 'ANALYST'
                ? 'text-emerald-800 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Analyst Dashboard ({pendingReviewCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveRole('DATASET')}
            className={`hover:text-emerald-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeRole === 'DATASET'
                ? 'text-emerald-800 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Banking Dataset
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleEnableAlerts}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              alertsArmed
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-emerald-700 text-white hover:bg-emerald-800'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            {alertsArmed ? 'Alerts Armed' : 'Enable alerts'}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <div className="flex md:hidden items-center gap-2 px-4 py-2.5 bg-white border-b border-emerald-900/10 overflow-x-auto">
        {(
          [
            { id: 'LANDING', label: 'Overview' },
            { id: 'EMPLOYEE', label: 'Employee' },
            { id: 'ANALYST', label: `Analyst (${pendingReviewCount})` },
            { id: 'DATASET', label: 'Banking CSV' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveRole(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              activeRole === tab.id
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-900/75 bg-[#f6faf7]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-emerald-900/12 bg-white p-5 space-y-5 shrink-0">
          {/* Active Session Card */}
          <div className="rounded-xl border border-emerald-900/12 bg-[#f9fcfa] p-4 space-y-3">
            <div className="text-xs font-medium text-emerald-900/60">Active Session</div>
            {activeRole === 'LANDING' ? (
              <div className="text-sm font-semibold text-emerald-950">
                Role Selection Overview
              </div>
            ) : activeRole === 'DATASET' ? (
              <div>
                <div className="text-xs font-mono font-semibold text-emerald-700">
                  BANKING DATASET
                </div>
                <div className="text-base font-bold text-emerald-950 mt-0.5">
                  accounts_288e8b18.csv
                </div>
                <div className="text-xs text-emerald-900/65">
                  {accountsDataset.totalKnownRows.toLocaleString()} protected accounts
                </div>
              </div>
            ) : activeRole === 'EMPLOYEE' ? (
              <div>
                <div className="text-xs font-mono font-semibold text-emerald-700">
                  EMPLOYEE CONSOLE
                </div>
                <div className="text-base font-bold text-emerald-950 mt-0.5">
                  {activeEmployee.name}
                </div>
                <div className="text-xs text-emerald-900/65">
                  {activeEmployee.role} · {activeEmployee.department}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs font-mono font-semibold text-emerald-700">
                  SECURITY ANALYST
                </div>
                <div className="text-base font-bold text-emerald-950 mt-0.5">
                  {activeAnalyst.name}
                </div>
                <div className="text-xs text-emerald-900/65">{activeAnalyst.title}</div>
              </div>
            )}

            <div className="pt-1 flex flex-col gap-2">
              {activeRole !== 'LANDING' && (
                <button
                  type="button"
                  onClick={() => setActiveRole('LANDING')}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-900/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 text-emerald-700" />
                  Switch user
                </button>
              )}

              {activeRole === 'EMPLOYEE' && (
                <button
                  type="button"
                  onClick={() => setActiveRole('ANALYST')}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-300 hover:bg-cyan-200 text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Open Analyst Dashboard ({pendingReviewCount})
                </button>
              )}

              {activeRole === 'ANALYST' && (
                <button
                  type="button"
                  onClick={() => setActiveRole('EMPLOYEE')}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-300 hover:bg-cyan-200 text-slate-950 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Open Employee View ({activeEmployee.name})
                </button>
              )}
            </div>
          </div>

          {/* Mobile Vibration & Audio */}
          <div className="rounded-xl border border-emerald-900/12 bg-[#f9fcfa] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                Alert &amp; Vibration Gesture
              </span>
              <span className="font-mono text-xs font-semibold text-emerald-800">
                {alertsArmed ? 'ARMED' : 'READY'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleEnableAlerts}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                alertsArmed
                  ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300'
                  : 'bg-cyan-300 hover:bg-cyan-200 text-slate-950'
              }`}
            >
              {alertsArmed ? 'Test Alert Pulse' : 'Enable alerts'}
            </button>

            <p className="text-xs text-emerald-900/65 leading-relaxed">
              {isVibrationSupported()
                ? 'Android Chrome Vibration API supported.'
                : 'Audio siren + flashing red banner active.'}
            </p>
            {armFeedbackMsg && (
              <p className="text-xs text-emerald-800 font-medium">{armFeedbackMsg}</p>
            )}
          </div>

          {/* Analyst Weight Sliders */}
          <div className="rounded-xl border border-emerald-900/12 bg-[#f9fcfa] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                Analyst Weights
              </span>
              <button
                type="button"
                onClick={() => {
                  setW1(0.5);
                  setW2(0.5);
                }}
                className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                0.5 / 0.5
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs text-emerald-900/75 mb-1">
                  <span>W1 (Content)</span>
                  <span className="font-mono text-emerald-800 font-bold tabular-nums">
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
                  className="w-full accent-emerald-700 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-emerald-900/75 mb-1">
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
            <div className="text-xs font-mono text-emerald-900/65 tabular-nums">
              Score = C×{w1.toFixed(2)} + B×{w2.toFixed(2)}
            </div>
          </div>

          {/* Streamlit Python Export */}
          <div className="rounded-xl border border-emerald-900/12 bg-[#f9fcfa] p-4 space-y-2.5">
            <div className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-emerald-700" />
              Python Streamlit Export
            </div>
            <p className="text-xs text-emerald-900/65">
              Download <code className="font-mono text-emerald-800">app.py</code> for local Streamlit execution.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadStreamlitScript}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-900/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                Download app.py
              </button>
              <button
                type="button"
                onClick={() => setShowPythonModal(true)}
                className="py-2 px-3 rounded-lg text-xs font-medium bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-900/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                View
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeRole === 'LANDING' && (
            <div className="max-w-6xl mx-auto space-y-8 text-slate-100">
              {/* Hero Header */}
              <div className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#080b18] p-7 md:p-11 space-y-5 shadow-[0_0_55px_rgba(34,211,238,0.08)]">
                <div className="text-xs font-mono font-semibold text-emerald-700">
                  Avishkar&apos;26 Problem Statement 17 · Cybersecurity &amp; FinTech DLP
                </div>
                <h1
                  className="relative text-4xl md:text-6xl font-bold text-white tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Protect every move. Secure every asset.
                </h1>
                <p className="relative text-sm md:text-base text-slate-300 max-w-3xl leading-relaxed">
                  Explainable two-channel Data Loss Prevention monitoring{' '}
                  <strong className="text-emerald-950">Email</strong> and{' '}
                  <strong className="text-emerald-950">USB</strong> transfers. Inspects corporate documents and your uploaded{' '}
                  <code className="font-mono text-emerald-800">accounts_288e8b18.csv</code> banking dataset for PII, verifies approved destinations and 3x volume baselines, and triggers instant visual and tactile alerts.
                </p>

                <div className="relative pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleEnableAlerts}
                    className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-2 ${
                      alertsArmed
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-cyan-300 hover:bg-cyan-200 text-slate-950'
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
                    onClick={() => setActiveRole('DATASET')}
                    className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-[#f6faf7] hover:bg-emerald-50 text-emerald-950 border border-emerald-900/15 transition-colors cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center gap-2"
                  >
                    <Database className="icon-3d icon-3d-motion w-4 h-4 text-cyan-300" />
                    Inspect Uploaded Banking CSV ({accountsDataset.totalKnownRows.toLocaleString()} rows)
                  </button>
                </div>
              </div>

              {/* Dual-Persona Passwordless Entry Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {/* Employee Card */}
                <div className="rounded-xl border border-emerald-900/12 bg-white p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-emerald-700">
                      <UserCheck className="icon-3d icon-3d-motion w-4 h-4" />
                      01. Employee Workstation
                    </div>
                    <h2 className="text-xl font-bold text-emerald-950">Employee Page</h2>
                    <p className="text-xs text-emerald-900/70 leading-relaxed">
                      Simulate sending corporate files or the live banking CSV extract via Email or copying to Registered / Unregistered USB storage.
                    </p>

                    <div className="pt-2 space-y-1.5">
                      <label
                        htmlFor="landing-employee-select"
                        className="block text-xs font-semibold text-emerald-950"
                      >
                        Act as Employee
                      </label>
                      <select
                        id="landing-employee-select"
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="w-full rounded-lg bg-[#f9fcfa] border border-emerald-900/20 px-3.5 py-2.5 text-sm text-emerald-950 focus:outline-none focus:border-emerald-700"
                      >
                        {MOCK_EMPLOYEES.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} — {emp.role} ({emp.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveRole('EMPLOYEE')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-cyan-300 hover:bg-cyan-200 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Enter Employee Page
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Security Analyst Card */}
                <div className="rounded-xl border border-emerald-900/12 bg-white p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-emerald-700">
                      <Shield className="icon-3d icon-3d-motion w-4 h-4" />
                      02. SOC Analyst Console
                    </div>
                    <h2 className="text-xl font-bold text-emerald-950">
                      Security Analyst Page
                    </h2>
                    <p className="text-xs text-emerald-900/70 leading-relaxed">
                      Monitor colour-coded live egress feeds, inspect Email vs USB channel charts, tune W1/W2 scoring weights, and resolve quarantined transfers.
                    </p>

                    <div className="pt-2 space-y-1.5">
                      <label
                        htmlFor="landing-analyst-select"
                        className="block text-xs font-semibold text-emerald-950"
                      >
                        Act as Security Analyst
                      </label>
                      <select
                        id="landing-analyst-select"
                        value={selectedAnalystId}
                        onChange={(e) => setSelectedAnalystId(e.target.value)}
                        className="w-full rounded-lg bg-[#f9fcfa] border border-emerald-900/20 px-3.5 py-2.5 text-sm text-emerald-950 focus:outline-none focus:border-emerald-700"
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
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Enter Security Analyst Page
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Protected Files & Approved Destinations Map */}
              <div className="rounded-xl border border-emerald-900/12 bg-white overflow-hidden">
                <div className="px-6 py-4 border-b border-emerald-900/10 bg-[#f9fcfa] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-emerald-950">
                    Protected Files &amp; Approved Destinations
                  </h3>
                  <span className="text-xs font-mono text-emerald-800">
                    {Object.keys(MOCK_FILES).length} Monitored Assets
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-emerald-900/10 bg-[#f4f8f5] text-emerald-900/70">
                        <th className="py-2.5 px-5">Filename</th>
                        <th className="py-2.5 px-4">Approved Destination</th>
                        <th className="py-2.5 px-4 text-right">Size</th>
                        <th className="py-2.5 px-5">Classification &amp; Sensitive Fields</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/8 font-mono">
                      {Object.values(MOCK_FILES).map((f) => (
                        <tr key={f.filename} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3 px-5 font-semibold text-emerald-950">
                            {f.filename}
                          </td>
                          <td className="py-3 px-4 text-emerald-700 font-semibold">
                            {f.approvedDestination}
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-900/80 tabular-nums">
                            {f.sizeBytes} B
                          </td>
                          <td className="py-3 px-5 font-sans text-emerald-900/75">
                            {f.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeRole === 'EMPLOYEE' && (
            <EmployeeConsole
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
              liveCsvExtractContent={liveCsvExtractContent}
              liveCsvExtractBytes={liveCsvExtractBytes}
              onSubmitTransfer={handleSubmitTransfer}
              onResetUserHistory={handleResetUserHistory}
              onDismissAlert={() => setLatestAlert(null)}
            />
          )}

          {activeRole === 'ANALYST' && (
            <AnalystDashboard
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

          {activeRole === 'DATASET' && (
            <BankingDatasetPanel
              dataset={accountsDataset}
              loading={datasetLoading}
              onTestTransferWithCsv={() => {
                setEmployeeInitialFile(undefined);
                setActiveRole('EMPLOYEE');
              }}
            />
          )}
        </main>
      </div>

      {/* Streamlit Python Source Modal */}
      {showPythonModal && (
        <div className="fixed inset-0 z-50 bg-emerald-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-900/15 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-emerald-900/10 flex items-center justify-between gap-4 bg-[#f9fcfa]">
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Streamlit Python Script (<code className="font-mono text-emerald-700">app.py</code>)
                </h3>
                <p className="text-xs text-emerald-900/70">
                  Self-contained Streamlit prototype with mock_files creation, scoring engine, and mobile vibration trigger.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadStreamlitScript}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-300 hover:bg-cyan-200 text-slate-950 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download app.py
                </button>
                <button
                  type="button"
                  onClick={() => setShowPythonModal(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-900/15 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="p-5 text-xs font-mono text-emerald-950 overflow-auto flex-1 bg-[#f6faf7]">
              {STREAMLIT_APP_PY_CODE}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

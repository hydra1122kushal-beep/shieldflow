import React, { useState, useEffect } from 'react';
import {
  APPROVED_DESTINATIONS,
  EmployeeProfile,
  MOCK_FILES,
  MockFileName,
  USB_DEVICES,
  UsbDeviceId,
  getEmailRecipientsForFile,
} from '../data/mockFiles';
import { DLPChannel, DLPEvaluationResult } from '../utils/dlpEngine';
import { HighlightedFilePreview } from './HighlightedFilePreview';
import { FlashingAlertBanner } from './FlashingAlertBanner';
import {
  Mail,
  Usb,
  Send,
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  RotateCcw,
  FileText,
  Scale,
} from 'lucide-react';

interface EmployeeConsoleProps {
  employee: EmployeeProfile;
  userHistoryBytes: number[];
  w1: number;
  w2: number;
  alertsArmed: boolean;
  latestAlert: DLPEvaluationResult | null;
  lastEvaluationForUser: DLPEvaluationResult | null;
  initialSelectedFile?: MockFileName;
  liveCsvExtractContent?: string;
  liveCsvExtractBytes?: number;
  onSubmitTransfer: (params: {
    filename: MockFileName;
    channel: DLPChannel;
    emailRecipientAddress?: string;
    usbDeviceId?: UsbDeviceId;
    overrideContent?: string;
    overrideSizeBytes?: number;
  }) => void;
  onResetUserHistory: (employeeId: string) => void;
  onDismissAlert: () => void;
}

const FILE_OPTIONS: MockFileName[] = [
  'public_policy.txt',
  'project_plan.txt',
  'customer_cards.txt',
  'finance_report.txt',
  'hr_records.txt',
];

export const EmployeeConsole: React.FC<EmployeeConsoleProps> = ({
  employee,
  userHistoryBytes,
  w1,
  w2,
  alertsArmed,
  latestAlert,
  lastEvaluationForUser,
  initialSelectedFile,
  liveCsvExtractContent,
  liveCsvExtractBytes,
  onSubmitTransfer,
  onResetUserHistory,
  onDismissAlert,
}) => {
  const [selectedFile, setSelectedFile] = useState<MockFileName>(
    initialSelectedFile || 'customer_cards.txt'
  );
  const [channel, setChannel] = useState<DLPChannel>('Email');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string; size: number } | null>(null);

  const emailOptions = getEmailRecipientsForFile(selectedFile);
  const [selectedEmailRecipient, setSelectedEmailRecipient] = useState<string>(
    emailOptions[0].address
  );
  const [selectedUsbDevice, setSelectedUsbDevice] = useState<UsbDeviceId>('Registered-USB-01');

  useEffect(() => {
    if (initialSelectedFile) {
      setSelectedFile(initialSelectedFile);
    }
  }, [initialSelectedFile]);

  useEffect(() => {
    const newOptions = getEmailRecipientsForFile(selectedFile);
    setSelectedEmailRecipient(newOptions[0].address);
  }, [selectedFile]);

  const currentFile = MOCK_FILES[selectedFile];
  const isLiveCsvSelected = false;
  const effectiveSizeBytes = uploadedFile?.size ?? (isLiveCsvSelected && liveCsvExtractBytes ? liveCsvExtractBytes : currentFile.sizeBytes);
  const approvedDest = APPROVED_DESTINATIONS[selectedFile];

  const avgBytes =
    userHistoryBytes.length > 0
      ? Math.round(userHistoryBytes.reduce((a, b) => a + b, 0) / userHistoryBytes.length)
      : 435;
  const projectedRatio = Number((effectiveSizeBytes / Math.max(1, avgBytes)).toFixed(1));
  const isVolumeAnomaly = projectedRatio >= 3.0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitTransfer({
      filename: selectedFile,
      channel,
      emailRecipientAddress: channel === 'Email' ? selectedEmailRecipient : undefined,
      usbDeviceId: channel === 'USB' ? selectedUsbDevice : undefined,
      overrideContent: uploadedFile?.content ?? (isLiveCsvSelected ? liveCsvExtractContent : undefined),
      overrideSizeBytes: uploadedFile?.size ?? (isLiveCsvSelected ? liveCsvExtractBytes : undefined),
    });
  };

  return (
    <div className="space-y-6">
      {latestAlert && latestAlert.shouldAlertAndVibrate && (
        <FlashingAlertBanner
          alertEvent={latestAlert}
          viewerContext="Employee"
          alertsArmed={alertsArmed}
          onDismiss={onDismissAlert}
        />
      )}

      {/* Top Context Strip */}
      <div className="rounded-xl border border-emerald-900/12 bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-emerald-900/65 flex flex-wrap items-center gap-2">
            <span>Employee Egress Workstation</span>
            <span aria-hidden="true">·</span>
            <span>{employee.department}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Weights: W1={w1.toFixed(2)} / W2={w2.toFixed(2)}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-emerald-950 mt-1">
            Acting as {employee.name} ({employee.role})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-[#f6faf7] border border-emerald-900/12 px-4 py-2.5 rounded-lg">
          <div className="text-xs">
            <div className="text-emerald-900/65">
              Transfer Baseline ({userHistoryBytes.length} recent events)
            </div>
            <div className="font-mono text-sm font-semibold text-emerald-950 tabular-nums mt-0.5">
              Avg: {avgBytes} B · File: {effectiveSizeBytes} B ({projectedRatio}x)
              {isVolumeAnomaly && (
                <span className="text-amber-700 ml-2 font-bold">
                  3x Volume Anomaly
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onResetUserHistory(employee.id)}
            title="Reset historical average to default ~435 B"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-900/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
            Reset Baseline
          </button>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Outbound Transfer Check Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-6 rounded-xl border border-emerald-900/12 bg-white p-6 space-y-6"
        >
          <div className="border-b border-emerald-900/10 pb-4">
            <h2 className="text-lg font-bold text-emerald-950">
              Outbound Data Transfer Check
            </h2>
            <p className="text-xs text-emerald-900/70 mt-1">
              Choose a file from the sample list or upload your own text or CSV file to scan before sending.
            </p>
          </div>

          {/* 1. File Select */}
          <div className="space-y-2">
            <label
              htmlFor="mock-file-select"
              className="block text-xs font-semibold text-emerald-950"
            >
              1. Select Protected File
            </label>
            <select
              id="mock-file-select"
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value as MockFileName)}
              className="w-full rounded-lg bg-[#f9fcfa] border border-emerald-900/20 px-3.5 py-2.5 text-sm text-emerald-950 font-mono focus:outline-none focus:border-emerald-700"
            >
              {FILE_OPTIONS.map((fname) => (
                <option key={fname} value={fname}>
                  {MOCK_FILES[fname].label} — {MOCK_FILES[fname].sizeBytes} B
                </option>
              ))}
            </select>
            <label className="block rounded-lg border border-dashed border-emerald-700/40 bg-emerald-50/50 p-3 text-xs text-emerald-950">
              <span className="font-semibold">Or upload a file to scan before sending</span>
              <input type="file" className="mt-2 block w-full" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const content = await file.text();
                setUploadedFile({ name: file.name, content, size: file.size });
              }} />
              {uploadedFile && <span className="mt-1 block">Selected: {uploadedFile.name} ({uploadedFile.size} bytes) <button type="button" className="underline" onClick={() => setUploadedFile(null)}>Clear</button></span>}
              <span className="mt-1 block text-emerald-900/60">Text and CSV files are scanned in this demo. Upload contents stay in this browser.</span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-emerald-900/70">
              <span>
                Approved Destination:{' '}
                <strong className="font-mono text-emerald-800">{approvedDest}</strong>
              </span>
              <span className="font-mono tabular-nums">
                Size Ratio: {projectedRatio}x user average
              </span>
            </div>
          </div>

          {/* 2. Channel Toggle */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-emerald-950">
              2. Select Exfiltration Channel
            </span>
            <div className="grid grid-cols-2 gap-3 p-1 bg-[#f4f8f5] rounded-lg border border-emerald-900/10">
              <button
                type="button"
                onClick={() => setChannel('Email')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  channel === 'Email'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-900/75 hover:text-emerald-950 hover:bg-white/60'
                }`}
              >
                <Mail className="w-4 h-4" />
                Send Email
              </button>
              <button
                type="button"
                onClick={() => setChannel('USB')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  channel === 'USB'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-900/75 hover:text-emerald-950 hover:bg-white/60'
                }`}
              >
                <Usb className="w-4 h-4" />
                Copy to USB
              </button>
            </div>
          </div>

          {/* 3. Destination Select */}
          {channel === 'Email' ? (
            <div className="space-y-2">
              <label
                htmlFor="email-recipient-select"
                className="block text-xs font-semibold text-emerald-950"
              >
                3. Recipient Email Address
              </label>
              <select
                id="email-recipient-select"
                value={selectedEmailRecipient}
                onChange={(e) => setSelectedEmailRecipient(e.target.value)}
                className="w-full rounded-lg bg-[#f9fcfa] border border-emerald-900/20 px-3.5 py-2.5 text-sm text-emerald-950 font-mono focus:outline-none focus:border-emerald-700"
              >
                {emailOptions.map((opt) => (
                  <option key={opt.address} value={opt.address}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-emerald-900/65">
                Sending to <code className="font-mono">personal_gmail</code> or an unknown external address instead of <code className="font-mono text-emerald-800">{approvedDest}</code> triggers an immediate violation alert and vibration.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label
                htmlFor="usb-device-select"
                className="block text-xs font-semibold text-emerald-950"
              >
                3. Target USB Removable Storage Device
              </label>
              <select
                id="usb-device-select"
                value={selectedUsbDevice}
                onChange={(e) => setSelectedUsbDevice(e.target.value as UsbDeviceId)}
                className="w-full rounded-lg bg-[#f9fcfa] border border-emerald-900/20 px-3.5 py-2.5 text-sm text-emerald-950 font-mono focus:outline-none focus:border-emerald-700"
              >
                {USB_DEVICES.map((usb) => (
                  <option key={usb.id} value={usb.id}>
                    {usb.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-emerald-900/65">
                Using <code className="font-mono text-red-700">Unknown-USB (unregistered)</code> always raises an immediate violation alert and vibrates.
              </p>
            </div>
          )}

          {/* Quick Demo Scenario Presets */}
          <div className="pt-4 border-t border-emerald-900/10 space-y-2.5">
            <div className="text-xs font-semibold text-emerald-950">
              Quick Test Scenarios (1-Click Fill)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile('public_policy.txt');
                  setChannel('Email');
                  setSelectedEmailRecipient('all-staff@company.com');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
              >
                Policy to Approved Email (Allow)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile('project_plan.txt');
                  setChannel('Email');
                  setSelectedEmailRecipient('audit-partner@trusted-partner.com');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
              >
                Project Plan to Partner (Review)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile('customer_cards.txt');
                  setChannel('Email');
                  setSelectedEmailRecipient('someone@gmail.com');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors cursor-pointer"
              >
                Cards to Gmail (Block)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile('accounts_288e8b18.csv');
                  setChannel('Email');
                  setSelectedEmailRecipient('someone@gmail.com');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors cursor-pointer"
              >
                Bank CSV to Gmail (Block)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile('hr_records.txt');
                  setChannel('USB');
                  setSelectedUsbDevice('Unknown-USB (unregistered)');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors cursor-pointer"
              >
                HR Records to Unknown-USB (Block)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile('project_plan.txt');
                  setChannel('USB');
                  setSelectedUsbDevice('Registered-USB-01');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
              >
                Plan to Registered-USB (Allow)
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            Submit Transfer Check
          </button>
        </form>

        {/* Right Column: Immediate Decision + File Preview */}
        <div className="lg:col-span-6 space-y-6">
          {lastEvaluationForUser ? (
            <div
              className={`rounded-xl border bg-white p-5 space-y-4 ${
                lastEvaluationForUser.tier === 'ALLOW'
                  ? 'border-emerald-300'
                  : lastEvaluationForUser.tier === 'REVIEW'
                  ? 'border-amber-300'
                  : 'border-red-300'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {lastEvaluationForUser.tier === 'ALLOW' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
                  ) : lastEvaluationForUser.tier === 'REVIEW' ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  ) : (
                    <XOctagon className="w-6 h-6 text-red-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-mono text-emerald-900/60">
                      DLP Decision · {lastEvaluationForUser.timestamp}
                    </div>
                    <h3
                      className={`text-xl font-bold ${
                        lastEvaluationForUser.tier === 'ALLOW'
                          ? 'text-emerald-800'
                          : lastEvaluationForUser.tier === 'REVIEW'
                          ? 'text-amber-800'
                          : 'text-red-700'
                      }`}
                    >
                      {lastEvaluationForUser.tier === 'ALLOW'
                        ? lastEvaluationForUser.channel === 'Email'
                          ? 'Email Sent'
                          : 'File copied to USB'
                        : lastEvaluationForUser.tier === 'REVIEW'
                        ? 'Held for Review (Quarantined)'
                        : 'Blocked (Transfer Denied)'}
                    </h3>
                  </div>
                </div>

                <div className="text-right font-mono tabular-nums">
                  <div className="text-xs text-emerald-900/60">Leak Score</div>
                  <div className="text-2xl font-bold text-emerald-950">
                    {lastEvaluationForUser.finalLeakScore}
                    <span className="text-sm text-emerald-900/50">/100</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#f6faf7] border border-emerald-900/10 font-mono text-xs tabular-nums">
                <div>
                  <div className="text-emerald-900/60">Content Score</div>
                  <div className="text-sm font-bold text-emerald-950 mt-0.5">
                    {lastEvaluationForUser.contentScore} × {lastEvaluationForUser.w1.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-emerald-900/60">Behaviour Score</div>
                  <div className="text-sm font-bold text-emerald-950 mt-0.5">
                    {lastEvaluationForUser.behaviourScore} × {lastEvaluationForUser.w2.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-emerald-900/60">Action Tier</div>
                  <div className="text-sm font-bold text-emerald-950 mt-0.5">
                    {lastEvaluationForUser.tier} ({lastEvaluationForUser.severity})
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-700" />
                  Explainable Forensic Reasoning
                </div>
                <div className="p-3 rounded-lg bg-[#f9fcfa] border border-emerald-900/10 font-mono text-xs text-emerald-950 leading-relaxed">
                  {lastEvaluationForUser.formattedSummaryLine}
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-emerald-900/80 pt-1">
                  {lastEvaluationForUser.rankedReasons.map((r, i) => (
                    <li key={i} className="font-mono">
                      <span className="text-emerald-950 font-medium">{r.text}</span>{' '}
                      <span className="text-emerald-900/60">
                        [{r.category}
                        {r.points > 0 ? `: +${r.points} pts` : ''}]
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-900/12 bg-white p-5 flex items-center gap-3 text-emerald-900/75 text-sm">
              <FileText className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>
                Select a file and destination on the left, then click <strong>Submit Transfer Check</strong> to evaluate content, destination behaviour, and volume baselines.
              </span>
            </div>
          )}

          <HighlightedFilePreview
            filename={selectedFile}
            overrideContent={uploadedFile?.content ?? (isLiveCsvSelected ? liveCsvExtractContent : undefined)}
            overrideSizeBytes={uploadedFile?.size ?? (isLiveCsvSelected ? liveCsvExtractBytes : undefined)}
          />
        </div>
      </div>
    </div>
  );
};

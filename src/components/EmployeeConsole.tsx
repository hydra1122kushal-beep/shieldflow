import React, { useState, useEffect, useRef } from 'react';
import {
  BuiltInMockFileName,
  EmployeeProfile,
  MOCK_FILES,
  MockFileName,
  UsbDeviceId,
  getApprovedDestination,
  getEmailRecipientsForFile,
} from '../data/mockFiles';
import { UploadedDatasetScanReport } from '../utils/accountsDataset';
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
  Upload,
  ShieldBan,
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
  uploadedDataset: UploadedDatasetScanReport | null;
  onUploadFileContent: (filename: string, content: string, sizeBytes?: number) => void;
  onSubmitTransfer: (params: {
    filename: MockFileName;
    channel: DLPChannel;
    emailRecipientAddress?: string;
    usbDeviceId?: UsbDeviceId;
    overrideContent?: string;
    overrideSizeBytes?: number;
    isImmediatePenDriveInsertion?: boolean;
  }) => void;
  onResetUserHistory: (employeeId: string) => void;
  onDismissAlert: () => void;
}

const BUILT_IN_FILE_OPTIONS: BuiltInMockFileName[] = [
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
  uploadedDataset,
  onUploadFileContent,
  onSubmitTransfer,
  onResetUserHistory,
  onDismissAlert,
}) => {
  const [selectedFile, setSelectedFile] = useState<MockFileName>(
    initialSelectedFile || 'customer_cards.txt'
  );
  const [channel, setChannel] = useState<DLPChannel>('Email');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const emailOptions = getEmailRecipientsForFile(selectedFile);
  const [selectedEmailRecipient, setSelectedEmailRecipient] = useState<string>(
    emailOptions[0].address
  );

  useEffect(() => {
    if (initialSelectedFile) {
      setSelectedFile(initialSelectedFile);
    }
  }, [initialSelectedFile]);

  useEffect(() => {
    const newOptions = getEmailRecipientsForFile(selectedFile);
    setSelectedEmailRecipient(newOptions[0].address);
  }, [selectedFile]);

  const isUploadedSelected =
    Boolean(uploadedDataset) && selectedFile === uploadedDataset?.filename;

  const builtInFile = MOCK_FILES[selectedFile as BuiltInMockFileName];
  const effectiveContent = isUploadedSelected
    ? uploadedDataset!.rawContent
    : builtInFile
    ? builtInFile.content
    : '';
  const effectiveSizeBytes = isUploadedSelected
    ? uploadedDataset!.fileSizeBytes
    : builtInFile
    ? builtInFile.sizeBytes
    : 420;
  const approvedDest = getApprovedDestination(selectedFile);

  const avgBytes =
    userHistoryBytes.length > 0
      ? Math.round(userHistoryBytes.reduce((a, b) => a + b, 0) / userHistoryBytes.length)
      : 435;
  const projectedRatio = Number((effectiveSizeBytes / Math.max(1, avgBytes)).toFixed(1));
  const isVolumeAnomaly = projectedRatio >= 3.0;

  // Trigger IMMEDIATE CRITICAL ALERT as soon as a Pen Drive is inserted / selected
  const triggerImmediatePenDriveInsertionAlert = (targetFilename?: MockFileName) => {
    const fileToUse = targetFilename || selectedFile;
    const isUploaded = Boolean(uploadedDataset) && fileToUse === uploadedDataset?.filename;
    setChannel('USB');
    onSubmitTransfer({
      filename: fileToUse,
      channel: 'USB',
      usbDeviceId: 'PenDrive-USB-Inserted (Strictly Prohibited)',
      overrideContent: isUploaded ? uploadedDataset?.rawContent : undefined,
      overrideSizeBytes: isUploaded ? uploadedDataset?.fileSizeBytes : undefined,
      isImmediatePenDriveInsertion: true,
    });
  };

  // Also listen for real hardware WebUSB connect events if browser supports navigator.usb
  useEffect(() => {
    const nav = navigator as Navigator & {
      usb?: {
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    };
    if (!nav.usb || !nav.usb.addEventListener) return;

    const handleHardwareUsbConnect = () => {
      triggerImmediatePenDriveInsertionAlert();
    };
    nav.usb.addEventListener('connect', handleHardwareUsbConnect);
    return () => {
      nav.usb?.removeEventListener?.('connect', handleHardwareUsbConnect);
    };
  });

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      if (content.trim()) {
        onUploadFileContent(file.name, content, file.size);
        setSelectedFile(file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitTransfer({
      filename: selectedFile,
      channel,
      emailRecipientAddress: channel === 'Email' ? selectedEmailRecipient : undefined,
      usbDeviceId:
        channel === 'USB' ? 'PenDrive-USB-Inserted (Strictly Prohibited)' : undefined,
      overrideContent: isUploadedSelected ? uploadedDataset?.rawContent : undefined,
      overrideSizeBytes: isUploadedSelected ? uploadedDataset?.fileSizeBytes : undefined,
      isImmediatePenDriveInsertion: channel === 'USB',
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
          <div className="border-b border-emerald-900/10 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-emerald-950">
                Outbound Data Transfer Check
              </h2>
              <p className="text-xs text-emerald-900/70 mt-1">
                Select a file from <code className="font-mono text-emerald-800">mock_files/</code> or upload your own CSV/text file for Presidio + Regex + Pandas scanning.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.json,.log"
              onChange={handleLocalFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-700" />
              Upload CSV / File
            </button>
          </div>

          {/* 1. File Select */}
          <div className="space-y-2">
            <label
              htmlFor="mock-file-select"
              className="block text-xs font-semibold text-emerald-950"
            >
              1. Select Protected File (or Uploaded CSV)
            </label>
            <select
              id="mock-file-select"
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value as MockFileName)}
              className="w-full rounded-lg bg-[#f9fcfa] border border-emerald-900/20 px-3.5 py-2.5 text-sm text-emerald-950 font-mono focus:outline-none focus:border-emerald-700"
            >
              {uploadedDataset && (
                <option value={uploadedDataset.filename}>
                  [UPLOADED] {uploadedDataset.filename} ({uploadedDataset.totalRows} rows) —{' '}
                  {uploadedDataset.fileSizeBytes} B
                </option>
              )}
              {BUILT_IN_FILE_OPTIONS.map((fname) => (
                <option key={fname} value={fname}>
                  {MOCK_FILES[fname].label} — {MOCK_FILES[fname].sizeBytes} B
                </option>
              ))}
            </select>

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

          {/* 2. Channel Toggle — Selecting Pen Drive / USB immediately fires "Say No to Pendrive" alert */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-emerald-950">
              2. Select Exfiltration Channel (Pen Drive Insertion Triggers Immediate Alert)
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
                onClick={() => triggerImmediatePenDriveInsertionAlert()}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  channel === 'USB'
                    ? 'bg-red-700 text-white'
                    : 'text-red-800 bg-red-50/70 hover:bg-red-100 border border-red-200'
                }`}
              >
                <Usb className="w-4 h-4" />
                Insert Pen Drive (No USB)
              </button>
            </div>
          </div>

          {/* 3. Destination Select or SAY NO TO PENDRIVE Lockdown Card */}
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
            <div className="rounded-xl border-2 border-red-300 bg-red-50/80 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-600 text-white shrink-0">
                  <ShieldBan className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold text-red-800 uppercase tracking-wide">
                    ZERO-TRUST REMOVABLE MEDIA POLICY · 0 AUTHORISED PEN DRIVES
                  </div>
                  <h3 className="text-base font-bold text-red-950">
                    SAY NO TO PENDRIVE — Immediate Alert Triggered on Insertion
                  </h3>
                  <p className="text-xs text-red-900/85 leading-relaxed">
                    The authorised pen drive function has been permanently disabled. Inserting any USB Pen Drive immediately triggers a <strong>CRITICAL BLOCK (Risk 100)</strong>, sounds the hardware siren, vibrates the device, and logs the incident to the SOC Analyst live feed.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-red-200 text-xs font-mono text-red-900">
                <span>Detected Port Event: PenDrive-USB-Inserted</span>
                <button
                  type="button"
                  onClick={() => triggerImmediatePenDriveInsertionAlert()}
                  className="px-3 py-1.5 rounded-lg font-sans font-semibold bg-red-700 hover:bg-red-800 text-white transition-colors cursor-pointer"
                >
                  Re-Trigger Pen Drive Insertion Alert
                </button>
              </div>
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
                  setSelectedFile('hr_records.txt');
                  triggerImmediatePenDriveInsertionAlert('hr_records.txt');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Insert Pen Drive — Say No to Pendrive (Immediate Block Alert)
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              channel === 'USB'
                ? 'bg-red-700 hover:bg-red-800 text-white'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            {channel === 'USB'
              ? 'Pen Drive Prohibited — Re-Verify Block Alert'
              : 'Submit Email Transfer Check'}
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
                        ? 'Email Sent'
                        : lastEvaluationForUser.tier === 'REVIEW'
                        ? 'Held for Review (Quarantined)'
                        : lastEvaluationForUser.channel === 'USB'
                        ? 'Blocked — SAY NO TO PENDRIVE'
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
                Select or upload a file on the left, then test an Email transfer or click <strong>Insert Pen Drive (No USB)</strong> to verify immediate Pen Drive blocking.
              </span>
            </div>
          )}

          <HighlightedFilePreview
            filename={selectedFile}
            overrideContent={isUploadedSelected ? effectiveContent : undefined}
            overrideSizeBytes={isUploadedSelected ? effectiveSizeBytes : undefined}
            isUploadedFile={isUploadedSelected}
          />
        </div>
      </div>
    </div>
  );
};

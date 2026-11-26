import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BuiltInMockFileName,
  EmployeeProfile,
  MOCK_FILES,
  MockFileName,
  USB_DEVICES,
  UsbDeviceId,
  getApprovedDestination,
  getEmailRecipientsForFile,
  resolveUsbDeviceMetadata,
} from '../data/mockFiles';
import {
  SAMPLE_CSV_TEMPLATES,
  UploadedDatasetScanReport,
} from '../utils/accountsDataset';
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
  FileSpreadsheet,
  Sparkles,
  Trash2,
  HardDrive,
  Monitor,
  ShieldCheck,
  ShieldAlert,
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
  onClearUploadedDataset: () => void;
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
  onClearUploadedDataset,
  onSubmitTransfer,
  onResetUserHistory,
  onDismissAlert,
}) => {
  const [selectedFile, setSelectedFile] = useState<MockFileName>(
    initialSelectedFile || 'customer_cards.txt'
  );
  const [channel, setChannel] = useState<DLPChannel>('Email');
  const [selectedUsbDevice, setSelectedUsbDevice] = useState<UsbDeviceId>('Registered-USB-01');
  const [customUsbInput, setCustomUsbInput] = useState<string>('');
  const [useCustomUsbInput, setUseCustomUsbInput] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
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

  const activeUsbId = useCustomUsbInput && customUsbInput.trim()
    ? customUsbInput.trim()
    : selectedUsbDevice;
  const activeUsbMeta = resolveUsbDeviceMetadata(activeUsbId);

  // When a commercial (unauthorised) pen drive is inserted/selected, immediately trigger the denial alert
  const handleSelectOrInsertUsbDevice = (deviceId: UsbDeviceId, targetFile?: MockFileName) => {
    setUseCustomUsbInput(false);
    setSelectedUsbDevice(deviceId);
    setChannel('USB');

    const meta = resolveUsbDeviceMetadata(deviceId);
    if (!meta.authorised) {
      const fileToUse = targetFile || selectedFile;
      const isUploaded = Boolean(uploadedDataset) && fileToUse === uploadedDataset?.filename;
      onSubmitTransfer({
        filename: fileToUse,
        channel: 'USB',
        usbDeviceId: deviceId,
        overrideContent: isUploaded ? uploadedDataset?.rawContent : undefined,
        overrideSizeBytes: isUploaded ? uploadedDataset?.fileSizeBytes : undefined,
        isImmediatePenDriveInsertion: true,
      });
    }
  };

  // Listen for physical hardware WebUSB connection events
  useEffect(() => {
    const nav = navigator as Navigator & {
      usb?: {
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    };
    if (!nav.usb || !nav.usb.addEventListener) return;

    const handleHardwareUsbConnect = () => {
      handleSelectOrInsertUsbDevice('Unknown-USB (unregistered)');
    };
    nav.usb.addEventListener('connect', handleHardwareUsbConnect);
    return () => {
      nav.usb?.removeEventListener?.('connect', handleHardwareUsbConnect);
    };
  });

  const processFileObject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = typeof ev.target?.result === 'string' ? ev.target.result : '';
      if (content.trim()) {
        onUploadFileContent(file.name, content, file.size);
        setSelectedFile(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileObject(file);
    }
    e.target.value = '';
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileObject(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitTransfer({
      filename: selectedFile,
      channel,
      emailRecipientAddress: channel === 'Email' ? selectedEmailRecipient : undefined,
      usbDeviceId: channel === 'USB' ? activeUsbId : undefined,
      overrideContent: isUploadedSelected ? uploadedDataset?.rawContent : undefined,
      overrideSizeBytes: isUploadedSelected ? uploadedDataset?.fileSizeBytes : undefined,
      isImmediatePenDriveInsertion: channel === 'USB' && !activeUsbMeta.authorised,
    });
  };

  const totalEntityHits = uploadedDataset
    ? Object.values(uploadedDataset.entityCountsByType).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, rotateX: 3, y: 12 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 perspective-stage"
    >
      {latestAlert && latestAlert.shouldAlertAndVibrate && (
        <FlashingAlertBanner
          alertEvent={latestAlert}
          viewerContext="Employee"
          alertsArmed={alertsArmed}
          onDismiss={onDismissAlert}
        />
      )}

      {/* Top Context Strip with Multi-Color Graded Accent Bar */}
      <div className="rounded-xl border border-indigo-950/12 bg-gradient-to-r from-white via-indigo-50/40 to-teal-50/50 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 card-3d-subtle">
        <div>
          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-indigo-700">Employee Egress Workstation</span>
            <span aria-hidden="true">·</span>
            <span>{employee.department}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-teal-800 font-semibold flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5 text-teal-700" />
              {employee.workstationId} ({employee.workstationIp})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700">
              Weights: W1={w1.toFixed(2)} / W2={w2.toFixed(2)}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-950 mt-1">
            Acting as {employee.name} ({employee.role})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white/90 border border-indigo-900/12 px-4 py-2.5 rounded-lg shadow-2xs">
          <div className="text-xs">
            <div className="text-slate-500">
              Transfer Baseline ({userHistoryBytes.length} recent events)
            </div>
            <div className="font-mono text-sm font-semibold text-slate-900 tabular-nums mt-0.5">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-50 hover:bg-indigo-50 text-slate-800 border border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
            Reset Baseline
          </button>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Outbound Transfer Check Form + Embedded CSV Upload Scanner */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-6 rounded-xl border border-slate-200/90 bg-white p-6 space-y-6 card-3d"
        >
          <div className="border-b border-slate-200/80 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Outbound Data Transfer &amp; Live File Scanner
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Upload a CSV/text file for instant Presidio + Regex + Pandas verification or choose a protected asset from <code className="font-mono text-indigo-700">mock_files/</code>.
              </p>
            </div>
          </div>

          {/* Embedded CSV & Document Upload Dropzone inside Employee Console */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleFileDrop}
            className={`rounded-xl border-2 border-dashed p-4 transition-all ${
              isDraggingFile
                ? 'border-indigo-600 bg-indigo-50/70'
                : uploadedDataset
                ? 'border-teal-500/50 bg-gradient-to-br from-teal-50/50 via-white to-indigo-50/40'
                : 'border-indigo-200 bg-gradient-to-br from-indigo-50/35 via-white to-teal-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.json,.log"
              onChange={handleLocalFileUpload}
              className="hidden"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-600 to-teal-600 text-white shadow-xs shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {uploadedDataset
                      ? `Scanned File: ${uploadedDataset.filename} (${uploadedDataset.totalRows} rows)`
                      : 'Upload CSV or Text File (Presidio + Regex + Pandas)'}
                  </div>
                  <div className="text-xs text-slate-600">
                    {uploadedDataset
                      ? `${totalEntityHits} PII/Financial entities · ${uploadedDataset.sensitiveColumnsDetected.length} sensitive columns`
                      : 'Drag & drop a local .csv or .txt file or load a 1-click sample below'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploadedDataset ? 'Replace File' : 'Upload File'}
                </button>
                {uploadedDataset && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearUploadedDataset();
                      setSelectedFile('customer_cards.txt');
                    }}
                    title="Remove uploaded file"
                    className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 1-Click Test CSV Templates */}
            <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-indigo-900 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Test CSVs:
              </span>
              {Object.entries(SAMPLE_CSV_TEMPLATES).map(([key, tpl]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onUploadFileContent(
                      tpl.filename,
                      tpl.content,
                      new Blob([tpl.content]).size
                    );
                    setSelectedFile(tpl.filename);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    selectedFile === tpl.filename
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {tpl.filename}
                </button>
              ))}
            </div>
          </div>

          {/* 1. File Select */}
          <div className="space-y-2">
            <label
              htmlFor="mock-file-select"
              className="block text-xs font-semibold text-slate-900"
            >
              1. Active File for Outbound Transfer
            </label>
            <select
              id="mock-file-select"
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value as MockFileName)}
              className="w-full rounded-lg bg-slate-50/80 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 font-mono focus:outline-none focus:border-indigo-600"
            >
              {uploadedDataset && (
                <option value={uploadedDataset.filename}>
                  [UPLOADED CSV/FILE] {uploadedDataset.filename} ({uploadedDataset.totalRows} rows) —{' '}
                  {uploadedDataset.fileSizeBytes} B
                </option>
              )}
              {BUILT_IN_FILE_OPTIONS.map((fname) => (
                <option key={fname} value={fname}>
                  {MOCK_FILES[fname].label} — {MOCK_FILES[fname].sizeBytes} B
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600">
              <span>
                Approved Destination:{' '}
                <strong className="font-mono text-teal-700">{approvedDest}</strong>
              </span>
              <span className="font-mono tabular-nums">
                Size Ratio: {projectedRatio}x user average
              </span>
            </div>
          </div>

          {/* 2. Channel Toggle — Switching to USB opens the USB Device Input without pre-denying */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-900">
              2. Select Exfiltration Channel
            </span>
            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setChannel('Email')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  channel === 'Email'
                    ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
                }`}
              >
                <Mail className="w-4 h-4" />
                Send Email
              </button>
              <button
                type="button"
                onClick={() => setChannel('USB')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  channel === 'USB'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
                }`}
              >
                <Usb className="w-4 h-4" />
                Copy to USB / Pen Drive
              </button>
            </div>
          </div>

          {/* 3. Destination Select: Email Recipient OR USB Pen Drive Input (Corporate vs Commercial Unauthorised) */}
          <AnimatePresence mode="wait">
            {channel === 'Email' ? (
              <motion.div
                key="channel-email"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-2"
              >
                <label
                  htmlFor="email-recipient-select"
                  className="block text-xs font-semibold text-slate-900"
                >
                  3. Recipient Email Address
                </label>
                <select
                  id="email-recipient-select"
                  value={selectedEmailRecipient}
                  onChange={(e) => setSelectedEmailRecipient(e.target.value)}
                  className="w-full rounded-lg bg-slate-50/80 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 font-mono focus:outline-none focus:border-indigo-600"
                >
                  {emailOptions.map((opt) => (
                    <option key={opt.address} value={opt.address}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-600">
                  Sending to <code className="font-mono text-rose-700">personal_gmail</code> or an unknown external address instead of <code className="font-mono text-teal-700">{approvedDest}</code> triggers an immediate violation alert and vibration.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="channel-usb"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="usb-device-select"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    3. Select or Input USB Pen Drive Device
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomUsbInput((v) => !v)}
                    className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {useCustomUsbInput ? 'Use Preset USB List' : 'Enter Custom USB Name/Serial'}
                  </button>
                </div>

                {!useCustomUsbInput ? (
                  <select
                    id="usb-device-select"
                    value={selectedUsbDevice}
                    onChange={(e) => handleSelectOrInsertUsbDevice(e.target.value as UsbDeviceId)}
                    className="w-full rounded-lg bg-slate-50/80 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 font-mono focus:outline-none focus:border-indigo-600"
                  >
                    {USB_DEVICES.map((usb) => (
                      <option key={usb.id} value={usb.id}>
                        {usb.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customUsbInput}
                      onChange={(e) => setCustomUsbInput(e.target.value)}
                      placeholder="e.g., Sony-MicroVault-Commercial-32GB or Registered-CorpVault-02"
                      className="flex-1 rounded-lg bg-slate-50/80 border border-slate-300 px-3.5 py-2 text-sm text-slate-950 font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                )}

                {/* Live USB Hardware Telemetry Preview Card */}
                <div
                  className={`rounded-xl border p-3.5 space-y-2 transition-colors ${
                    activeUsbMeta.authorised
                      ? 'border-teal-300 bg-gradient-to-r from-teal-50/70 to-emerald-50/50'
                      : 'border-rose-300 bg-gradient-to-r from-rose-50/85 to-amber-50/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <HardDrive
                        className={`w-4 h-4 ${
                          activeUsbMeta.authorised ? 'text-teal-700' : 'text-rose-700'
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-950 font-mono">
                        {activeUsbMeta.id}
                      </span>
                    </div>
                    {activeUsbMeta.authorised ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Authorised Corporate Encrypted Vault (Risk 20)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Commercial (Unauthorised) Pen Drive — DENIED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-mono text-slate-700">
                    <div>
                      <span className="text-slate-500 block font-sans">Vendor</span>
                      {activeUsbMeta.vendor}
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Hardware VID:PID</span>
                      {activeUsbMeta.vidPid}
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Serial Number</span>
                      {activeUsbMeta.serialNumber}
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">Bus / Port</span>
                      {activeUsbMeta.usbPort}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Demo Scenario Presets */}
          <div className="pt-4 border-t border-slate-200/80 space-y-2.5">
            <div className="text-xs font-semibold text-slate-900">
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
                  setChannel('USB');
                  setUseCustomUsbInput(false);
                  setSelectedUsbDevice('Registered-USB-01');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer"
              >
                Plan to Corporate Encrypted USB (Allow)
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
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors cursor-pointer"
              >
                Cards to Gmail (Block)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile('hr_records.txt');
                  handleSelectOrInsertUsbDevice('SanDisk-Cruzer-Commercial-64GB', 'hr_records.txt');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                Insert Commercial Pen Drive (Immediate Denial Alert)
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-lg font-semibold text-sm transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm ${
              channel === 'USB' && !activeUsbMeta.authorised
                ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-teal-700 hover:from-indigo-700 hover:to-teal-800 text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            {channel === 'USB'
              ? activeUsbMeta.authorised
                ? 'Submit Corporate USB Transfer Check'
                : 'Commercial Pen Drive Denied — Trigger Block Alert'
              : 'Submit Email Transfer Check'}
          </button>
        </form>

        {/* Right Column: Immediate Decision + Embedded Presidio/Pandas CSV Verification + Highlighted File Preview */}
        <div className="lg:col-span-6 space-y-6">
          {lastEvaluationForUser ? (
            <div
              className={`rounded-xl border bg-white p-5 space-y-4 card-3d ${
                lastEvaluationForUser.tier === 'ALLOW'
                  ? 'border-emerald-300'
                  : lastEvaluationForUser.tier === 'REVIEW'
                  ? 'border-amber-300'
                  : 'border-rose-300'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {lastEvaluationForUser.tier === 'ALLOW' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  ) : lastEvaluationForUser.tier === 'REVIEW' ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                  ) : (
                    <XOctagon className="w-6 h-6 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-mono text-slate-500">
                      DLP Decision · {lastEvaluationForUser.timestamp} · {lastEvaluationForUser.workstationId}
                    </div>
                    <h3
                      className={`text-xl font-bold ${
                        lastEvaluationForUser.tier === 'ALLOW'
                          ? 'text-emerald-800'
                          : lastEvaluationForUser.tier === 'REVIEW'
                          ? 'text-amber-800'
                          : 'text-rose-700'
                      }`}
                    >
                      {lastEvaluationForUser.tier === 'ALLOW'
                        ? lastEvaluationForUser.channel === 'Email'
                          ? 'Email Sent'
                          : 'Copied to Corporate Encrypted USB'
                        : lastEvaluationForUser.tier === 'REVIEW'
                        ? 'Held for Review (Quarantined)'
                        : lastEvaluationForUser.channel === 'USB'
                        ? 'Commercial Pen Drive Denied (Blocked)'
                        : 'Blocked (Transfer Denied)'}
                    </h3>
                  </div>
                </div>

                <div className="text-right font-mono tabular-nums">
                  <div className="text-xs text-slate-500">Leak Score</div>
                  <div className="text-2xl font-bold text-slate-950">
                    {lastEvaluationForUser.finalLeakScore}
                    <span className="text-sm text-slate-400">/100</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 font-mono text-xs tabular-nums">
                <div>
                  <div className="text-slate-500">Content Score</div>
                  <div className="text-sm font-bold text-indigo-950 mt-0.5">
                    {lastEvaluationForUser.contentScore} × {lastEvaluationForUser.w1.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Behaviour Score</div>
                  <div className="text-sm font-bold text-amber-900 mt-0.5">
                    {lastEvaluationForUser.behaviourScore} × {lastEvaluationForUser.w2.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Action Tier</div>
                  <div className="text-sm font-bold text-slate-950 mt-0.5">
                    {lastEvaluationForUser.tier} ({lastEvaluationForUser.severity})
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-indigo-600" />
                  Explainable Forensic Reasoning
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 font-mono text-xs text-slate-900 leading-relaxed">
                  {lastEvaluationForUser.formattedSummaryLine}
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700 pt-1">
                  {lastEvaluationForUser.rankedReasons.map((r, i) => (
                    <li key={i} className="font-mono">
                      <span className="text-slate-950 font-medium">{r.text}</span>{' '}
                      <span className="text-slate-500">
                        [{r.category}
                        {r.points > 0 ? `: +${r.points} pts` : ''}]
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/60 via-white to-teal-50/50 p-5 flex items-center gap-3 text-slate-700 text-sm card-3d-subtle">
              <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>
                Upload a CSV/text file or select a corporate file on the left, then evaluate an Email transfer or test corporate vs commercial USB pen drive insertion.
              </span>
            </div>
          )}

          {/* Embedded Presidio + Pandas DataFrame Verification Summary (when an uploaded file is active) */}
          {isUploadedSelected && uploadedDataset && (
            <div className="rounded-xl border border-indigo-200 bg-white p-5 space-y-4 card-3d">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-950">
                    Presidio + Regex + Pandas DataFrame Scan Verification
                  </h3>
                </div>
                <span className="text-xs font-mono text-indigo-700 font-semibold">
                  {uploadedDataset.totalRows} rows × {uploadedDataset.totalColumns} cols · Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {uploadedDataset.verificationSteps.map((step) => (
                  <div
                    key={step.engine}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{step.engine}</span>
                      <span className="font-mono font-semibold text-teal-700">
                        {step.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-mono leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                ))}
              </div>

              {uploadedDataset.isTabularCsv && uploadedDataset.rows.length > 0 && (
                <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="py-2 px-2.5">#</th>
                        {uploadedDataset.columns.map((col) => (
                          <th
                            key={col.name}
                            className={`py-2 px-2.5 ${
                              col.isSensitiveColumn ? 'text-rose-800 bg-rose-50/80' : ''
                            }`}
                          >
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {uploadedDataset.rows.slice(0, 12).map((row, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/30">
                          <td className="py-1.5 px-2.5 text-slate-400">{idx + 1}</td>
                          {uploadedDataset.columns.map((col) => (
                            <td
                              key={col.name}
                              className={`py-1.5 px-2.5 ${
                                col.isSensitiveColumn
                                  ? 'font-semibold text-rose-900 bg-rose-50/30'
                                  : 'text-slate-800'
                              }`}
                            >
                              {String(row[col.name] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
    </motion.div>
  );
};

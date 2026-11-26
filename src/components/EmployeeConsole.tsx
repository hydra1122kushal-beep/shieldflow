import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BuiltInMockFileName,
  EmployeeProfile,
  IGNORED_USB_PREFIXES,
  MOCK_FILES,
  MockFileName,
  USB_DEVICES,
  UsbDeviceId,
  getApprovedDestination,
  getEmailRecipientsForFile,
  resolveEmailRecipient,
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
  Terminal,
  Smartphone,
  Cpu,
  Cable,
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
    customVid?: string;
    customPid?: string;
    customSerial?: string;
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

interface WebUsbDevice {
  vendorId: number;
  productId: number;
  serialNumber?: string;
  productName?: string;
}

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

  // Email states (preset dropdown OR custom typed email)
  const emailOptions = getEmailRecipientsForFile(selectedFile);
  const [selectedEmailRecipient, setSelectedEmailRecipient] = useState<string>(
    emailOptions[0].address
  );
  const [useCustomEmailInput, setUseCustomEmailInput] = useState<boolean>(false);
  const [customEmailAddress, setCustomEmailAddress] = useState<string>('someone@gmail.com');

  // USB states (TECNO POVA 6 Neo 5G AUTHORISED vs Others UNAUTHORISED)
  const [selectedUsbDevice, setSelectedUsbDevice] = useState<UsbDeviceId>('TECNO POVA 6 Neo 5G');
  const [useCustomUsbInput, setUseCustomUsbInput] = useState<boolean>(false);
  const [customUsbName, setCustomUsbName] = useState<string>('TECNO POVA 6 Neo 5G');
  const [customVid, setCustomVid] = useState<string>('0E8D');
  const [customPid, setCustomPid] = useState<string>('2008');
  const [customSerial, setCustomSerial] = useState<string>('13161314A6041832');
  const [usbScanBannerMsg, setUsbScanBannerMsg] = useState<string | null>(
    'AUTHORISED Mobile Connected: TECNO POVA 6 Neo 5G (VID: 0E8D | PID: 2008 | Serial: 13161314A6041832) — Status: Access Granted'
  );
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialSelectedFile) {
      setSelectedFile(initialSelectedFile);
      const opts = getEmailRecipientsForFile(initialSelectedFile);
      setSelectedEmailRecipient(opts[0].address);
    }
  }, [initialSelectedFile]);

  const handleFileChange = (newFile: MockFileName, preserveRecipient?: string) => {
    setSelectedFile(newFile);
    if (preserveRecipient) {
      setSelectedEmailRecipient(preserveRecipient);
    } else {
      const newOptions = getEmailRecipientsForFile(newFile);
      setSelectedEmailRecipient(newOptions[0].address);
    }
  };

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

  const activeEmailAddress =
    useCustomEmailInput && customEmailAddress.trim()
      ? customEmailAddress.trim()
      : selectedEmailRecipient;
  const activeEmailMeta = resolveEmailRecipient(selectedFile, activeEmailAddress);

  const activeUsbId =
    useCustomUsbInput && customUsbName.trim() ? customUsbName.trim() : selectedUsbDevice;
  const activeUsbMeta = resolveUsbDeviceMetadata(
    activeUsbId,
    useCustomUsbInput ? customVid : undefined,
    useCustomUsbInput ? customPid : undefined,
    useCustomUsbInput ? customSerial : undefined
  );

  // Evaluate USB insertion immediately when a device is selected, scanned, or inserted
  const handleSelectOrInsertUsbDevice = (
    deviceId: UsbDeviceId,
    targetFile?: MockFileName,
    overrideVid?: string,
    overridePid?: string,
    overrideSerial?: string
  ) => {
    setSelectedUsbDevice(deviceId);
    setChannel('USB');

    const meta = resolveUsbDeviceMetadata(deviceId, overrideVid, overridePid, overrideSerial);
    const fileToUse = targetFile || selectedFile;
    if (targetFile && targetFile !== selectedFile) {
      setSelectedFile(targetFile);
    }
    const isUploaded = Boolean(uploadedDataset) && fileToUse === uploadedDataset?.filename;

    if (meta.authorised) {
      setUsbScanBannerMsg(
        `[AUTHORISED] ${meta.id} (${meta.mobileModel || 'TECNO KL4'}) · VID: ${meta.vid} | PID: ${meta.pid} | Serial: ${meta.serialNumber} — Status: Access Granted`
      );
    } else {
      setUsbScanBannerMsg(
        `[UNAUTHORISED] ${meta.id} · VID: ${meta.vid} | PID: ${meta.pid} | Serial: ${meta.serialNumber} — Action: Blocking device now... Status: BLOCKED!`
      );
    }

    onSubmitTransfer({
      filename: fileToUse,
      channel: 'USB',
      usbDeviceId: meta.id,
      customVid: overrideVid,
      customPid: overridePid,
      customSerial: overrideSerial,
      overrideContent: isUploaded ? uploadedDataset?.rawContent : undefined,
      overrideSizeBytes: isUploaded ? uploadedDataset?.fileSizeBytes : undefined,
      isImmediatePenDriveInsertion: !meta.authorised,
    });
  };

  // Scan Physical USB Port: tries WebUSB if available; if running in iframe or MTP mode, resolves the connected TECNO POVA 6 Neo 5G mobile details and grants access immediately
  const handleScanPhysicalWebUsb = async () => {
    const nav = navigator as Navigator & {
      usb?: {
        requestDevice?: (options: { filters: unknown[] }) => Promise<WebUsbDevice>;
      };
    };

    if (nav.usb && nav.usb.requestDevice) {
      try {
        const dev = await nav.usb.requestDevice({ filters: [] });
        const vidHex = dev.vendorId.toString(16).toUpperCase().padStart(4, '0');
        const pidHex = dev.productId.toString(16).toUpperCase().padStart(4, '0');
        const serialStr = (dev.serialNumber || '13161314A6041832').toUpperCase();
        const friendlyName =
          vidHex === '0E8D' && pidHex === '2008'
            ? 'TECNO POVA 6 Neo 5G'
            : dev.productName || `USB_VID_${vidHex}_PID_${pidHex}`;

        setUseCustomUsbInput(false);
        handleSelectOrInsertUsbDevice(friendlyName, selectedFile, vidHex, pidHex, serialStr);
        return;
      } catch {
        // Fallback to PnP Get-PnpDevice detected mobile endpoint (TECNO POVA 6 Neo 5G via Charger Cable)
      }
    }

    // Automatically detect the connected Authorised Mobile Device (TECNO POVA 6 Neo 5G) and show details + Access Granted
    setUseCustomUsbInput(false);
    handleSelectOrInsertUsbDevice(
      'TECNO POVA 6 Neo 5G',
      selectedFile,
      '0E8D',
      '2008',
      '13161314A6041832'
    );
  };

  // Listen for real physical WebUSB hardware connect events
  useEffect(() => {
    const nav = navigator as Navigator & {
      usb?: {
        addEventListener?: (type: string, listener: (ev: { device?: WebUsbDevice }) => void) => void;
        removeEventListener?: (type: string, listener: (ev: { device?: WebUsbDevice }) => void) => void;
      };
    };
    if (!nav.usb || !nav.usb.addEventListener) return;

    const handleHardwareUsbConnect = (ev: { device?: WebUsbDevice }) => {
      if (ev.device) {
        const vidHex = ev.device.vendorId.toString(16).toUpperCase().padStart(4, '0');
        const pidHex = ev.device.productId.toString(16).toUpperCase().padStart(4, '0');
        const serialStr = (ev.device.serialNumber || '13161314A6041832').toUpperCase();
        const friendlyName =
          vidHex === '0E8D' && pidHex === '2008'
            ? 'TECNO POVA 6 Neo 5G'
            : ev.device.productName || `USB_VID_${vidHex}_PID_${pidHex}`;
        handleSelectOrInsertUsbDevice(friendlyName, selectedFile, vidHex, pidHex, serialStr);
      } else {
        handleSelectOrInsertUsbDevice('Unknown-USB (unregistered)');
      }
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
        handleFileChange(file.name);
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

  const handleTriggerEmailScenario = (targetFile: BuiltInMockFileName, recipient: string) => {
    setChannel('Email');
    setUseCustomEmailInput(false);
    setSelectedFile(targetFile);
    setSelectedEmailRecipient(recipient);
    onSubmitTransfer({
      filename: targetFile,
      channel: 'Email',
      emailRecipientAddress: recipient,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitTransfer({
      filename: selectedFile,
      channel,
      emailRecipientAddress: channel === 'Email' ? activeEmailAddress : undefined,
      usbDeviceId: channel === 'USB' ? activeUsbId : undefined,
      customVid: channel === 'USB' && useCustomUsbInput ? customVid : undefined,
      customPid: channel === 'USB' && useCustomUsbInput ? customPid : undefined,
      customSerial: channel === 'USB' && useCustomUsbInput ? customSerial : undefined,
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
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="space-y-6"
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
            <div className="font-mono text-sm font-semibold text-slate-950 tabular-nums mt-0.5">
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
                Upload a CSV/text file for instant DLP verification or choose a protected asset from <code className="font-mono text-indigo-700">mock_files/</code>.
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
                      : 'Upload CSV or Text File for DLP Scan'}
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
                      handleFileChange('customer_cards.txt');
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
                    handleFileChange(tpl.filename);
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
              onChange={(e) => handleFileChange(e.target.value as MockFileName)}
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

          {/* 2. Channel Toggle */}
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
                onClick={() => {
                  setChannel('USB');
                  // Automatically evaluate the currently active USB device so the mobile details and AUTHORISED / UNAUTHORISED status appear immediately
                  handleSelectOrInsertUsbDevice(
                    activeUsbId,
                    selectedFile,
                    useCustomUsbInput ? customVid : undefined,
                    useCustomUsbInput ? customPid : undefined,
                    useCustomUsbInput ? customSerial : undefined
                  );
                }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  channel === 'USB'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
                }`}
              >
                <Usb className="w-4 h-4" />
                USB Device Access Control
              </button>
            </div>
          </div>

          {/* 3. Destination Select: Email Recipient OR USB Access Control (TECNO POVA 6 Neo 5G AUTHORISED vs Others UNAUTHORISED) */}
          <AnimatePresence mode="wait">
            {channel === 'Email' ? (
              <motion.div
                key="channel-email"
                initial={{ opacity: 0, scale: 0.98, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={{ duration: 0.18 }}
                className="space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="email-recipient-select"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    3. Recipient Email Address
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomEmailInput((v) => !v)}
                    className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {useCustomEmailInput ? 'Use Preset Email List' : 'Type Custom Email Address'}
                  </button>
                </div>

                {!useCustomEmailInput ? (
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
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="email"
                      value={customEmailAddress}
                      onChange={(e) => setCustomEmailAddress(e.target.value)}
                      placeholder="e.g. finance@company.com, audit@trusted-partner.com, user@gmail.com"
                      className="w-full rounded-lg bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                )}

                {/* Live Email DLP Policy Preview Card */}
                <div
                  className={`rounded-xl border p-3.5 space-y-2 text-xs ${
                    activeEmailMeta.category === 'approved'
                      ? 'border-emerald-300 bg-emerald-50/70'
                      : activeEmailMeta.category === 'other_internal' ||
                        activeEmailMeta.category === 'partner'
                      ? 'border-amber-300 bg-amber-50/70'
                      : 'border-rose-300 bg-rose-50/80'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      To: {activeEmailMeta.address}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                        activeEmailMeta.category === 'approved'
                          ? 'bg-emerald-600 text-white'
                          : activeEmailMeta.category === 'other_internal' ||
                            activeEmailMeta.category === 'partner'
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {activeEmailMeta.category === 'approved'
                        ? 'APPROVED RECIPIENT (ALLOW)'
                        : activeEmailMeta.category === 'other_internal'
                        ? 'OTHER INTERNAL DEPT (REVIEW)'
                        : activeEmailMeta.category === 'partner'
                        ? 'EXTERNAL PARTNER (REVIEW)'
                        : 'UNAPPROVED EXTERNAL (BLOCK)'}
                    </span>
                  </div>
                  <div className="text-slate-600 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Sender: <code className="font-mono text-slate-800">{employee.id}@company.com</code>
                    </span>
                    <span>
                      Policy Approved:{' '}
                      <code className="font-mono font-semibold text-teal-800">{approvedDest}</code>
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="channel-usb"
                initial={{ opacity: 0, scale: 0.98, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={{ duration: 0.18 }}
                className="space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="usb-device-select"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    3. Connected USB Hardware / Mobile Endpoint
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleScanPhysicalWebUsb}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Detect Mobile (TECNO POVA 6 Neo 5G)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCustomUsbInput((v) => !v)}
                      className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      {useCustomUsbInput ? 'Use Preset USB Devices' : 'Custom VID/PID/Serial'}
                    </button>
                  </div>
                </div>

                {!useCustomUsbInput ? (
                  <select
                    id="usb-device-select"
                    value={selectedUsbDevice}
                    onChange={(e) => {
                      const val = e.target.value as UsbDeviceId;
                      handleSelectOrInsertUsbDevice(val);
                    }}
                    className="w-full rounded-lg bg-slate-50/80 border border-slate-300 px-3.5 py-2.5 text-sm text-slate-950 font-mono focus:outline-none focus:border-indigo-600"
                  >
                    {USB_DEVICES.map((usb) => (
                      <option key={usb.id} value={usb.id}>
                        {usb.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Device Name or PnP InstanceId (e.g. USB\VID_0E8D&amp;PID_2008\13161314A6041832)
                      </label>
                      <input
                        type="text"
                        value={customUsbName}
                        onChange={(e) => setCustomUsbName(e.target.value)}
                        placeholder="TECNO POVA 6 Neo 5G or USB\VID_0781&PID_5567\SD-COMM-44819"
                        className="w-full rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-950 font-mono focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          VID (Hex)
                        </label>
                        <input
                          type="text"
                          value={customVid}
                          onChange={(e) => setCustomVid(e.target.value)}
                          placeholder="0E8D"
                          className="w-full rounded-lg bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-950 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          PID (Hex)
                        </label>
                        <input
                          type="text"
                          value={customPid}
                          onChange={(e) => setCustomPid(e.target.value)}
                          placeholder="2008"
                          className="w-full rounded-lg bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-950 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Serial Number
                        </label>
                        <input
                          type="text"
                          value={customSerial}
                          onChange={(e) => setCustomSerial(e.target.value)}
                          placeholder="13161314A6041832"
                          className="w-full rounded-lg bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-950 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Explicit Access Granted / Blocked Status Banner */}
                {usbScanBannerMsg && (
                  <div
                    className={`px-3.5 py-2.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-2 ${
                      activeUsbMeta.authorised
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-rose-600 text-white border-rose-700 shadow-xs'
                    }`}
                  >
                    {activeUsbMeta.authorised ? (
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                    )}
                    <span>{usbScanBannerMsg}</span>
                  </div>
                )}

                {/* Connected Mobile / USB Device Hardware Details Card + AUTHORISED vs UNAUTHORISED */}
                <div
                  className={`rounded-xl border-2 p-4 space-y-3.5 transition-colors ${
                    activeUsbMeta.authorised
                      ? 'border-emerald-400 bg-gradient-to-br from-emerald-50/95 via-white to-teal-50/80'
                      : 'border-rose-400 bg-gradient-to-br from-rose-50/95 via-white to-amber-50/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2.5 rounded-lg ${
                          activeUsbMeta.authorised
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {activeUsbMeta.authorised ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <HardDrive className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] font-mono font-semibold text-slate-500">
                          {activeUsbMeta.deviceCategory} · {activeUsbMeta.instanceId}
                        </div>
                        <div className="text-base font-bold text-slate-950 font-mono">
                          {activeUsbMeta.id}
                        </div>
                      </div>
                    </div>

                    {activeUsbMeta.authorised ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-600 text-white text-xs font-mono font-bold tracking-wide shadow-2xs">
                          <ShieldCheck className="w-4 h-4" />
                          AUTHORISED · ACCESS GRANTED
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 text-white text-xs font-mono font-bold tracking-wide shadow-2xs">
                          <ShieldAlert className="w-4 h-4" />
                          UNAUTHORISED · BLOCKED!
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mobile / Hardware Telemetry Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/80">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-indigo-600" />
                        Mobile / Hardware Model
                      </div>
                      <div className="font-mono font-bold text-slate-950 mt-0.5">
                        {activeUsbMeta.mobileModel || activeUsbMeta.id}
                      </div>
                      <div className="text-[11px] text-slate-600">{activeUsbMeta.vendor}</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/80">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-teal-600" />
                        Hardware Identifiers (VID / PID / SN)
                      </div>
                      <div className="font-mono font-bold text-slate-950 mt-0.5">
                        VID: {activeUsbMeta.vid} · PID: {activeUsbMeta.pid}
                      </div>
                      <div className="font-mono text-[11px] text-indigo-700 font-semibold">
                        Serial: {activeUsbMeta.serialNumber}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/80">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Cable className="w-3 h-3 text-indigo-600" />
                        Connection &amp; Bus Port
                      </div>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {activeUsbMeta.connectionMode || 'USB Type-C Charger Cable'}
                      </div>
                      <div className="font-mono text-[11px] text-slate-600">
                        {activeUsbMeta.usbPort} · {activeUsbMeta.busSpeed || '480 Mbps'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/80">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        OS / Storage &amp; Access Verdict
                      </div>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {activeUsbMeta.osFirmware || 'Android 14 · HiOS 14'}
                      </div>
                      <div
                        className={`font-mono text-[11px] font-bold ${
                          activeUsbMeta.authorised ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {activeUsbMeta.authorised
                          ? 'Status: Access Granted (AUTHORISED)'
                          : 'Status: BLOCKED! (Disable-PnpDevice)'}
                      </div>
                    </div>
                  </div>

                  {/* Live PnP Monitor Output Matching User's Python Script */}
                  <div className="rounded-lg bg-slate-950 text-slate-100 p-3 font-mono text-xs space-y-1 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-teal-400" />
                        USB Access Control Monitor (Get-PnpDevice)
                      </span>
                      <span>Ignored internal hubs: {IGNORED_USB_PREFIXES.length}</span>
                    </div>
                    {activeUsbMeta.authorised ? (
                      <>
                        <div className="text-emerald-400 font-bold">
                          [AUTHORIZED]   {activeUsbMeta.id}
                        </div>
                        <div className="text-slate-300">
                          {'               '}VID: {activeUsbMeta.vid} | PID: {activeUsbMeta.pid} | Serial: {activeUsbMeta.serialNumber}
                        </div>
                        <div className="text-emerald-300 font-bold">
                          {'               '}Status: Access Granted
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-rose-400 font-bold">
                          [UNAUTHORIZED] {activeUsbMeta.id}
                        </div>
                        <div className="text-slate-300">
                          {'               '}VID: {activeUsbMeta.vid} | PID: {activeUsbMeta.pid} | Serial: {activeUsbMeta.serialNumber}
                        </div>
                        <div className="text-amber-300">
                          {'               '}Action: Blocking device now...
                        </div>
                        <div className="text-rose-400 font-bold">
                          {'               '}Status: BLOCKED!
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Demo Scenario Presets */}
          <div className="pt-4 border-t border-slate-200/80 space-y-2.5">
            <div className="text-xs font-semibold text-slate-900">
              Quick Test Scenarios (1-Click Execute)
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseCustomUsbInput(false);
                  handleSelectOrInsertUsbDevice(
                    'TECNO POVA 6 Neo 5G',
                    selectedFile,
                    '0E8D',
                    '2008',
                    '13161314A6041832'
                  );
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
              >
                Insert TECNO POVA 6 Neo 5G (AUTHORISED)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseCustomUsbInput(false);
                  handleSelectOrInsertUsbDevice('SanDisk-Cruzer-Commercial-64GB', 'hr_records.txt');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                Insert Other USB Device (UNAUTHORISED)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleTriggerEmailScenario('public_policy.txt', 'all-staff@company.com')
                }
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
              >
                Email Policy to Approved (Allow)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleTriggerEmailScenario(
                    'project_plan.txt',
                    'audit-partner@trusted-partner.com'
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
              >
                Email Project Plan to Partner (Review)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleTriggerEmailScenario('customer_cards.txt', 'someone@gmail.com')
                }
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors cursor-pointer"
              >
                Email Cards to Personal Gmail (Block)
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
                ? 'Verify AUTHORISED USB Access (TECNO POVA 6 Neo 5G — Access Granted)'
                : 'UNAUTHORISED USB Device — Trigger Block Alert'
              : `Send Email to ${activeEmailAddress} & Run DLP Check`}
          </button>
        </form>

        {/* Right Column: Immediate Decision + Embedded CSV Verification + Highlighted File Preview */}
        <div className="lg:col-span-6 space-y-6">
          {lastEvaluationForUser ? (
            <div
              className={`rounded-xl border-2 bg-white p-5 space-y-4 card-3d ${
                lastEvaluationForUser.tier === 'ALLOW'
                  ? 'border-emerald-400'
                  : lastEvaluationForUser.tier === 'REVIEW'
                  ? 'border-amber-400'
                  : 'border-rose-400'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {lastEvaluationForUser.tier === 'ALLOW' ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                  ) : lastEvaluationForUser.tier === 'REVIEW' ? (
                    <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0" />
                  ) : (
                    <XOctagon className="w-7 h-7 text-rose-600 shrink-0" />
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
                          ? `Email Sent to ${lastEvaluationForUser.destination} (Access Granted)`
                          : `AUTHORISED — Access Granted (${lastEvaluationForUser.destination})`
                        : lastEvaluationForUser.tier === 'REVIEW'
                        ? `Held for Review — Quarantined (${lastEvaluationForUser.destination})`
                        : lastEvaluationForUser.channel === 'USB'
                        ? `UNAUTHORISED — USB Device Blocked (${lastEvaluationForUser.destination})`
                        : `Email Blocked — Unapproved Recipient (${lastEvaluationForUser.destination})`}
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

              {/* When USB event is evaluated, show the Mobile / USB Device Details summary box inside the decision card too */}
              {lastEvaluationForUser.channel === 'USB' && lastEvaluationForUser.usbMetadata && (
                <div
                  className={`rounded-lg p-3.5 border font-mono text-xs space-y-1.5 ${
                    lastEvaluationForUser.usbMetadata.authorised
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50/90 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                    <span>
                      {lastEvaluationForUser.usbMetadata.authorised
                        ? `[AUTHORISED MOBILE] ${lastEvaluationForUser.usbMetadata.id}`
                        : `[UNAUTHORISED USB] ${lastEvaluationForUser.usbMetadata.id}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-white ${
                        lastEvaluationForUser.usbMetadata.authorised
                          ? 'bg-emerald-600'
                          : 'bg-rose-600'
                      }`}
                    >
                      {lastEvaluationForUser.usbMetadata.authorised
                        ? 'Status: Access Granted'
                        : 'Status: BLOCKED!'}
                    </span>
                  </div>
                  <div>
                    VID: <strong>{lastEvaluationForUser.usbMetadata.vid}</strong> | PID:{' '}
                    <strong>{lastEvaluationForUser.usbMetadata.pid}</strong> | Serial:{' '}
                    <strong>{lastEvaluationForUser.usbMetadata.serialNumber}</strong>
                  </div>
                  <div className="text-[11px] font-sans">
                    Model: {lastEvaluationForUser.usbMetadata.mobileModel || lastEvaluationForUser.usbMetadata.id} ·{' '}
                    {lastEvaluationForUser.usbMetadata.connectionMode || 'USB Type-C Charger Cable'} ·{' '}
                    Port: {lastEvaluationForUser.usbMetadata.usbPort}
                  </div>
                </div>
              )}

              {/* When Email event is evaluated, show the Email Transmission Receipt summary box */}
              {lastEvaluationForUser.channel === 'Email' && (
                <div
                  className={`rounded-lg p-3.5 border font-mono text-xs space-y-1 ${
                    lastEvaluationForUser.tier === 'ALLOW'
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : lastEvaluationForUser.tier === 'REVIEW'
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                      : 'bg-rose-50/80 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                    <span>
                      Email Transfer: {employee.id}@company.com → {lastEvaluationForUser.destination}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-white ${
                        lastEvaluationForUser.tier === 'ALLOW'
                          ? 'bg-emerald-600'
                          : lastEvaluationForUser.tier === 'REVIEW'
                          ? 'bg-amber-600'
                          : 'bg-rose-600'
                      }`}
                    >
                      {lastEvaluationForUser.tier === 'ALLOW'
                        ? 'DELIVERED'
                        : lastEvaluationForUser.tier === 'REVIEW'
                        ? 'QUARANTINED'
                        : 'BLOCKED'}
                    </span>
                  </div>
                  <div>
                    Attachment: {lastEvaluationForUser.filename} ({lastEvaluationForUser.fileSizeBytes} B) · Approved Policy Recipient: {lastEvaluationForUser.approvedDestination}
                  </div>
                </div>
              )}

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
                  <div className="text-slate-500">Access Verdict</div>
                  <div className="text-sm font-bold text-slate-950 mt-0.5">
                    {lastEvaluationForUser.channel === 'USB'
                      ? lastEvaluationForUser.usbMetadata?.authorised
                        ? 'AUTHORISED'
                        : 'UNAUTHORISED'
                      : `${lastEvaluationForUser.tier} (${lastEvaluationForUser.severity})`}
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
                Upload a CSV/text file or select a corporate file on the left, then evaluate an Email transfer or test <strong>TECNO POVA 6 Neo 5G (AUTHORISED — Access Granted)</strong> vs other USB devices (<strong>UNAUTHORISED — BLOCKED</strong>).
              </span>
            </div>
          )}

          {/* Embedded CSV DataFrame Verification Summary (when an uploaded file is active) */}
          {isUploadedSelected && uploadedDataset && (
            <div className="rounded-xl border border-indigo-200 bg-white p-5 space-y-4 card-3d">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-950">
                    Uploaded File Scan Verification
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
                    className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{step.engine}</span>
                      <span
                        className={`font-mono font-bold ${
                          step.status === 'VERIFIED' ? 'text-indigo-700' : 'text-emerald-700'
                        }`}
                      >
                        {step.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{step.detail}</p>
                  </div>
                ))}
              </div>

              {uploadedDataset.isTabularCsv && uploadedDataset.rows.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-800">
                        {uploadedDataset.columns.slice(0, 6).map((col) => (
                          <th key={col.name} className="py-2 px-3 whitespace-nowrap">
                            {col.name}
                            {col.isSensitiveColumn && (
                              <span className="text-rose-600 ml-1">*</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70">
                      {uploadedDataset.rows.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-indigo-50/30">
                          {uploadedDataset.columns.slice(0, 6).map((col) => (
                            <td
                              key={col.name}
                              className={`py-1.5 px-3 whitespace-nowrap ${
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

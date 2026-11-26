import {
  BuiltInMockFileName,
  EmailRecipientCategory,
  EmailRecipientOption,
  MOCK_EMPLOYEES,
  MOCK_FILES,
  MockFileName,
  UsbDeviceId,
  UsbDeviceMetadata,
  getApprovedDestination,
  resolveEmailRecipient,
  resolveUsbDeviceMetadata,
} from '../data/mockFiles';
import { analyzeUploadedFile } from './accountsDataset';

export type DLPChannel = 'Email' | 'USB';
export type DLPActionTier = 'ALLOW' | 'REVIEW' | 'BLOCK';
export type DLPSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DLPReason {
  category: 'CONTENT' | 'BEHAVIOUR' | 'VOLUME' | 'VIOLATION_RULE';
  points: number;
  text: string;
  isHardViolation?: boolean;
}

export interface ContentDetectionSummary {
  tagsDetected: string[];
  creditCardsCount: number;
  ssnCount: number;
  panCount: number;
  aadhaarCount: number;
  bankAccountCount: number;
  routingNumberCount: number;
  emailCount: number;
  phoneCount: number;
  sensitiveCsvColumns: string[];
  csvRowCount: number;
  contentScore: number;
  contentReasons: DLPReason[];
}

export interface DLPEvaluationResult {
  id: string;
  timestamp: string;
  timestampMs: number;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  workstationId: string;
  workstationIp: string;
  filename: MockFileName;
  fileSizeBytes: number;
  userAvgBytesBefore: number;
  volumeMultiplier: number;
  channel: DLPChannel;
  destination: string;
  approvedDestination: string;
  emailRecipientCategory?: EmailRecipientCategory;
  usbMetadata?: UsbDeviceMetadata;
  contentScore: number;
  behaviourScore: number;
  w1: number;
  w2: number;
  rawWeightedScore: number;
  finalLeakScore: number;
  tier: DLPActionTier;
  severity: DLPSeverity;
  hardViolationTriggered: boolean;
  hardViolationSummary: string | null;
  shouldAlertAndVibrate: boolean;
  rankedReasons: DLPReason[];
  formattedSummaryLine: string;
  detectionSummary: ContentDetectionSummary;
  quarantineStatus?: 'PENDING_REVIEW' | 'APPROVED_BY_ANALYST' | 'REJECTED_BY_ANALYST';
  resolvedByAnalyst?: string;
  resolvedAt?: string;
}

const REGEX_PATTERNS = {
  tagConfidential: /\[CONFIDENTIAL\]/g,
  tagInternalOnly: /\[INTERNAL ONLY\]/g,
  tagFinancialData: /\[FINANCIAL_DATA\]/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  inPan: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
  inAadhaar: /\b[2-9]\d{3}[\s-]\d{4}[\s-]\d{4}\b/g,
  bankAccount: /\bACCT-\d{6,14}\b/g,
  routingNumber: /\b(?:ABA-\d{9}|[A-Z]{4}0[A-Z0-9]{6})\b/g,
  csvBankRecord: /^\d+,\d+,\d+,(?:Current|Savings|Salary|Fixed Deposit|NRI),\d+(?:\.\d+)?/gm,
  phone: /(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]\d{3}[-\s]\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
};

export function analyzeFileContent(
  filename: MockFileName,
  overrideContent?: string
): ContentDetectionSummary {
  const builtInFile = MOCK_FILES[filename as BuiltInMockFileName];
  const text = overrideContent ?? (builtInFile ? builtInFile.content : '');
  const approvedDest = getApprovedDestination(filename);

  const tagsDetected: string[] = [];
  const contentReasons: DLPReason[] = [];
  let rawPoints = 0;

  const confMatches = text.match(REGEX_PATTERNS.tagConfidential) || [];
  if (confMatches.length > 0) {
    tagsDetected.push('[CONFIDENTIAL]');
    rawPoints += 35;
    contentReasons.push({
      category: 'CONTENT',
      points: 35,
      text: 'Tagged [CONFIDENTIAL] security classification label',
    });
  }

  const finMatches = text.match(REGEX_PATTERNS.tagFinancialData) || [];
  if (finMatches.length > 0) {
    tagsDetected.push('[FINANCIAL_DATA]');
    rawPoints += 35;
    contentReasons.push({
      category: 'CONTENT',
      points: 35,
      text: 'Tagged [FINANCIAL_DATA] restricted treasury label',
    });
  }

  const intMatches = text.match(REGEX_PATTERNS.tagInternalOnly) || [];
  if (intMatches.length > 0) {
    tagsDetected.push('[INTERNAL ONLY]');
    rawPoints += 35;
    contentReasons.push({
      category: 'CONTENT',
      points: 35,
      text: 'Tagged [INTERNAL ONLY] sensitivity label',
    });
  }

  const ccMatches = text.match(REGEX_PATTERNS.creditCard) || [];
  if (ccMatches.length > 0) {
    const pts = Math.min(65, ccMatches.length * 4 + 5);
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${ccMatches.length} credit card numbers detected`,
    });
  }

  const ssnMatches = text.match(REGEX_PATTERNS.ssn) || [];
  if (ssnMatches.length > 0) {
    const pts = Math.min(55, ssnMatches.length * 4 + 7);
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${ssnMatches.length} SSN numbers detected`,
    });
  }

  const panMatches = text.match(REGEX_PATTERNS.inPan) || [];
  if (panMatches.length > 0) {
    const pts = Math.min(50, panMatches.length * 4 + 8);
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${panMatches.length} Indian tax PAN numbers detected`,
    });
  }

  const aadhaarMatches = text.match(REGEX_PATTERNS.inAadhaar) || [];
  if (aadhaarMatches.length > 0) {
    const pts = Math.min(55, aadhaarMatches.length * 4 + 8);
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${aadhaarMatches.length} Aadhaar identity numbers detected`,
    });
  }

  const bankMatches = text.match(REGEX_PATTERNS.bankAccount) || [];
  const routingMatches = text.match(REGEX_PATTERNS.routingNumber) || [];
  const csvBankMatches = text.match(REGEX_PATTERNS.csvBankRecord) || [];

  if (bankMatches.length > 0 || routingMatches.length > 0) {
    const pts = Math.min(60, (bankMatches.length + routingMatches.length) * 3 + 5);
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${bankMatches.length} bank account numbers and ${routingMatches.length} routing/IFSC codes`,
    });
  }

  if (csvBankMatches.length > 0) {
    const pts = Math.min(55, csvBankMatches.length * 4 + 10);
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${csvBankMatches.length} customer bank ledger records (account_id, customer_id, balance)`,
    });
  }

  let sensitiveCsvColumns: string[] = [];
  let csvRowCount = 0;
  if (/\.(csv|tsv)$/i.test(filename) || text.includes(',')) {
    const report = analyzeUploadedFile(filename, text);
    if (report.isTabularCsv) {
      sensitiveCsvColumns = report.sensitiveColumnsDetected;
      csvRowCount = report.totalRows;
      if (sensitiveCsvColumns.length > 0) {
        const colPts = Math.min(45, sensitiveCsvColumns.length * 10 + 10);
        rawPoints += colPts;
        contentReasons.push({
          category: 'CONTENT',
          points: colPts,
          text: `Detected ${sensitiveCsvColumns.length} sensitive columns (${sensitiveCsvColumns.join(', ')}) across ${csvRowCount} rows`,
        });
      }
    }
  }

  const phoneMatches = text.match(REGEX_PATTERNS.phone) || [];
  if (phoneMatches.length > 0) {
    const pts = Math.min(18, Math.round(phoneMatches.length * 1.5));
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${phoneMatches.length} phone numbers detected`,
    });
  }

  const emailMatches = (text.match(REGEX_PATTERNS.email) || []).filter(
    (e) => e.toLowerCase() !== approvedDest.toLowerCase()
  );
  if (emailMatches.length > 0) {
    const pts = Math.min(18, Math.round(emailMatches.length * 1.5));
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${emailMatches.length} email addresses detected`,
    });
  }

  const contentScore = Math.min(100, Math.round(rawPoints));

  return {
    tagsDetected,
    creditCardsCount: ccMatches.length,
    ssnCount: ssnMatches.length,
    panCount: panMatches.length,
    aadhaarCount: aadhaarMatches.length,
    bankAccountCount: bankMatches.length + csvBankMatches.length,
    routingNumberCount: routingMatches.length,
    emailCount: emailMatches.length,
    phoneCount: phoneMatches.length,
    sensitiveCsvColumns,
    csvRowCount,
    contentScore,
    contentReasons,
  };
}

export function computeLiveEventScore(
  ev: DLPEvaluationResult,
  w1: number,
  w2: number
): number {
  if (ev.channel === 'USB' && ev.usbMetadata?.authorised) {
    return Math.min(30, Math.round(ev.contentScore * 0.25));
  }
  if (ev.channel === 'Email' && ev.emailRecipientCategory === 'approved') {
    return Math.min(28, Math.round(ev.contentScore * 0.25));
  }
  const weighted = Math.min(100, Math.round(ev.contentScore * w1 + ev.behaviourScore * w2));
  if (ev.hardViolationTriggered) {
    return Math.max(85, weighted);
  }
  return weighted;
}

export function evaluateDLPTransfer(params: {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  workstationId?: string;
  workstationIp?: string;
  filename: MockFileName;
  channel: DLPChannel;
  emailRecipientAddress?: string;
  usbDeviceId?: UsbDeviceId;
  customVid?: string;
  customPid?: string;
  customSerial?: string;
  userHistoryBytes: number[];
  w1: number;
  w2: number;
  overrideContent?: string;
  overrideSizeBytes?: number;
  isImmediatePenDriveInsertion?: boolean;
}): DLPEvaluationResult {
  const {
    employeeId,
    employeeName,
    employeeRole,
    filename,
    channel,
    emailRecipientAddress,
    usbDeviceId,
    customVid,
    customPid,
    customSerial,
    userHistoryBytes,
    w1,
    w2,
    overrideContent,
    overrideSizeBytes,
  } = params;

  const empObj = MOCK_EMPLOYEES.find((e) => e.id === employeeId) || MOCK_EMPLOYEES[0];
  const workstationId = params.workstationId || empObj.workstationId;
  const workstationIp = params.workstationIp || empObj.workstationIp;

  const builtInFile = MOCK_FILES[filename as BuiltInMockFileName];
  const fileSizeBytes =
    overrideSizeBytes ??
    (overrideContent ? new Blob([overrideContent]).size : builtInFile ? builtInFile.sizeBytes : 500);
  const approvedDestination = getApprovedDestination(filename);
  const detectionSummary = analyzeFileContent(filename, overrideContent);
  const contentScore = detectionSummary.contentScore;

  const userAvgBytesBefore =
    userHistoryBytes.length > 0
      ? Math.round(userHistoryBytes.reduce((acc, v) => acc + v, 0) / userHistoryBytes.length)
      : 450;

  const volumeMultiplier = Number((fileSizeBytes / Math.max(1, userAvgBytesBefore)).toFixed(1));

  let behaviourRaw = 0;
  const behaviourReasons: DLPReason[] = [];
  let hardViolationTriggered = false;
  let hardViolationSummary: string | null = null;
  let destinationLabel = '';
  let emailRecipientCategory: EmailRecipientCategory | undefined = undefined;
  let usbMetadata: UsbDeviceMetadata | undefined = undefined;

  if (channel === 'Email') {
    const chosen: EmailRecipientOption = resolveEmailRecipient(filename, emailRecipientAddress);
    destinationLabel = chosen.address;
    emailRecipientCategory = chosen.category;

    behaviourRaw += chosen.riskPoints;

    if (chosen.category === 'approved') {
      behaviourReasons.push({
        category: 'BEHAVIOUR',
        points: 0,
        text: `Destination matches original approved recipient (${approvedDestination}) — Email Authorised`,
      });
    } else if (chosen.category === 'other_internal') {
      behaviourReasons.push({
        category: 'BEHAVIOUR',
        points: chosen.riskPoints,
        text: `Sent to internal department (${chosen.address}) instead of original approved (${approvedDestination})`,
      });
    } else if (chosen.category === 'partner') {
      behaviourReasons.push({
        category: 'BEHAVIOUR',
        points: chosen.riskPoints,
        text: `External partner destination (${chosen.address}) differs from approved (${approvedDestination})`,
      });
    } else if (chosen.category === 'personal_gmail') {
      hardViolationTriggered = true;
      hardViolationSummary = `VIOLATION RULE: Email sent to non-identified personal webmail (${chosen.address}) instead of approved destination (${approvedDestination})`;
      behaviourReasons.push({
        category: 'VIOLATION_RULE',
        points: chosen.riskPoints,
        isHardViolation: true,
        text: `destination is a personal webmail (${chosen.address}) instead of ${approvedDestination}`,
      });
    } else if (chosen.category === 'unknown_external') {
      hardViolationTriggered = true;
      hardViolationSummary = `VIOLATION RULE: Email sent to non-identified unknown external address (${chosen.address}) instead of approved destination (${approvedDestination})`;
      behaviourReasons.push({
        category: 'VIOLATION_RULE',
        points: chosen.riskPoints,
        isHardViolation: true,
        text: `destination is an unknown external address (${chosen.address}) instead of ${approvedDestination}`,
      });
    }
  } else {
    // USB CHANNEL:
    // Whitelisted device (TECNO POVA 6 Neo 5G | VID: 0E8D | PID: 2008 | Serial: 13161314A6041832) -> AUTHORISED (Access Granted)
    // All other USB devices -> UNAUTHORISED (Disable-PnpDevice / BLOCKED!)
    const chosenUsb = resolveUsbDeviceMetadata(usbDeviceId, customVid, customPid, customSerial);
    usbMetadata = chosenUsb;
    destinationLabel = chosenUsb.id;
    behaviourRaw += chosenUsb.riskPoints;

    if (!chosenUsb.authorised) {
      hardViolationTriggered = true;
      hardViolationSummary = `[UNAUTHORISED] ${chosenUsb.id} | VID: ${chosenUsb.vid} | PID: ${chosenUsb.pid} | Serial: ${chosenUsb.serialNumber} — Action: Blocking device now... Status: BLOCKED!`;
      behaviourReasons.push({
        category: 'VIOLATION_RULE',
        points: chosenUsb.riskPoints,
        isHardViolation: true,
        text: `[UNAUTHORISED] ${chosenUsb.id} (VID: ${chosenUsb.vid} | PID: ${chosenUsb.pid} | Serial: ${chosenUsb.serialNumber}) — Action: Blocking device now... Status: BLOCKED!`,
      });
    } else {
      behaviourReasons.push({
        category: 'BEHAVIOUR',
        points: 0,
        text: `[AUTHORISED] ${chosenUsb.id} (VID: ${chosenUsb.vid} | PID: ${chosenUsb.pid} | Serial: ${chosenUsb.serialNumber}) — Status: Access Granted`,
      });
    }
  }

  const isApprovedTransfer =
    (channel === 'USB' && Boolean(usbMetadata?.authorised)) ||
    (channel === 'Email' && emailRecipientCategory === 'approved');

  // Volume check: 3x or more user average (only apply volume penalty when transfer is not to an approved destination/device)
  if (volumeMultiplier >= 3.0 && !isApprovedTransfer) {
    const volPts = volumeMultiplier >= 5.0 ? 25 : 20;
    behaviourRaw += volPts;
    behaviourReasons.push({
      category: 'VOLUME',
      points: volPts,
      text: `file size ${volumeMultiplier}x user average (${fileSizeBytes} B vs ${userAvgBytesBefore} B avg)`,
    });
  }

  const behaviourScore = Math.min(100, Math.round(behaviourRaw));

  // Leak score = Content x W1 + Behaviour x W2
  const rawWeightedScore =
    channel === 'USB' && usbMetadata?.authorised
      ? Math.min(30, Math.round(contentScore * 0.25))
      : channel === 'Email' && emailRecipientCategory === 'approved'
      ? Math.min(28, Math.round(contentScore * 0.25))
      : Math.min(100, Math.round(contentScore * w1 + behaviourScore * w2));

  let tier: DLPActionTier = 'ALLOW';
  if (isApprovedTransfer) {
    tier = 'ALLOW';
  } else if (rawWeightedScore >= 71) {
    tier = 'BLOCK';
  } else if (rawWeightedScore >= 31) {
    tier = 'REVIEW';
  } else {
    tier = 'ALLOW';
  }

  // Enforce mandatory violation rules: UNAUTHORISED USB devices and Personal/External Emails are always BLOCKED
  if (hardViolationTriggered) {
    tier = 'BLOCK';
  }

  const finalLeakScore = hardViolationTriggered
    ? Math.max(85, rawWeightedScore)
    : rawWeightedScore;

  let severity: DLPSeverity = 'LOW';
  if (finalLeakScore >= 75 || (hardViolationTriggered && finalLeakScore >= 50)) {
    severity = 'CRITICAL';
  } else if (finalLeakScore >= 50 || hardViolationTriggered) {
    severity = 'HIGH';
  } else if (finalLeakScore >= 31) {
    severity = 'MEDIUM';
  }

  const allReasons = [...detectionSummary.contentReasons, ...behaviourReasons]
    .filter((r) => r.points > 0 || r.isHardViolation || isApprovedTransfer)
    .sort((a, b) => {
      if (a.isHardViolation && !b.isHardViolation) return -1;
      if (!a.isHardViolation && b.isHardViolation) return 1;
      return b.points - a.points;
    });

  if (allReasons.length === 0) {
    allReasons.push({
      category: 'BEHAVIOUR',
      points: 0,
      text: `Public document sent to approved destination (${approvedDestination}) within normal volume baseline`,
    });
  }

  const numberedReasonsText = allReasons
    .map((r, idx) => `${idx + 1}) ${r.text}`)
    .join(' ');

  const formattedSummaryLine = `Score ${finalLeakScore}, ${severity}, ${tier}: ${numberedReasonsText}`;

  const shouldAlertAndVibrate = hardViolationTriggered || tier === 'REVIEW' || tier === 'BLOCK';

  const now = new Date();
  return {
    id: `dlp-${now.getTime()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    timestampMs: now.getTime(),
    employeeId,
    employeeName,
    employeeRole,
    workstationId,
    workstationIp,
    filename,
    fileSizeBytes,
    userAvgBytesBefore,
    volumeMultiplier,
    channel,
    destination: destinationLabel,
    approvedDestination,
    emailRecipientCategory,
    usbMetadata,
    contentScore,
    behaviourScore,
    w1,
    w2,
    rawWeightedScore,
    finalLeakScore,
    tier,
    severity,
    hardViolationTriggered,
    hardViolationSummary,
    shouldAlertAndVibrate,
    rankedReasons: allReasons,
    formattedSummaryLine,
    detectionSummary,
    quarantineStatus: tier === 'REVIEW' ? 'PENDING_REVIEW' : undefined,
  };
}

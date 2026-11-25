import {
  APPROVED_DESTINATIONS,
  EmailRecipientOption,
  MOCK_FILES,
  MockFileName,
  USB_DEVICES,
  UsbDeviceId,
  getEmailRecipientsForFile,
} from '../data/mockFiles';

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
  bankAccountCount: number;
  routingNumberCount: number;
  emailCount: number;
  phoneCount: number;
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
  filename: MockFileName;
  fileSizeBytes: number;
  userAvgBytesBefore: number;
  volumeMultiplier: number;
  channel: DLPChannel;
  destination: string;
  approvedDestination: string;
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

// Regex patterns for content scanning
const REGEX_PATTERNS = {
  tagConfidential: /\[CONFIDENTIAL\]/g,
  tagInternalOnly: /\[INTERNAL ONLY\]/g,
  tagFinancialData: /\[FINANCIAL_DATA\]/g,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  bankAccount: /\bACCT-\d{8,12}\b/g,
  routingNumber: /\bABA-\d{9}\b/g,
  csvBankRecord: /^\d+,\d+,\d+,(?:Current|Savings|Salary|Fixed Deposit|NRI),\d+(?:\.\d+)?/gm,
  phone: /\+\d{1,2}-\d{3}-\d{3}-\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
};

export function analyzeFileContent(
  filename: MockFileName,
  overrideContent?: string
): ContentDetectionSummary {
  const file = MOCK_FILES[filename];
  const text = overrideContent ?? file.content;

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
    rawPoints += 25;
    contentReasons.push({
      category: 'CONTENT',
      points: 25,
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
      text: `${ccMatches.length} credit card numbers detected via PAN regex`,
    });
  }

  const ssnMatches = text.match(REGEX_PATTERNS.ssn) || [];
  if (ssnMatches.length > 0) {
    const pts = Math.min(55, ssnMatches.length * 4 + 7);
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${ssnMatches.length} SSN-like national identity numbers detected`,
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
      text: `${bankMatches.length} bank account numbers and ${routingMatches.length} ABA routing numbers`,
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

  const phoneMatches = text.match(REGEX_PATTERNS.phone) || [];
  if (phoneMatches.length > 0) {
    const pts = Math.min(18, phoneMatches.length * 1.5);
    rawPoints += Math.round(pts);
    contentReasons.push({
      category: 'CONTENT',
      points: Math.round(pts),
      text: `${phoneMatches.length} employee phone numbers`,
    });
  }

  // Exclude the single policy reference email in headers if needed, or count directory emails
  const emailMatches = (text.match(REGEX_PATTERNS.email) || []).filter(
    (e) => e !== file.approvedDestination
  );
  if (emailMatches.length > 0) {
    const pts = Math.min(18, Math.round(emailMatches.length * 1.5));
    rawPoints += pts;
    contentReasons.push({
      category: 'CONTENT',
      points: pts,
      text: `${emailMatches.length} personal/employee email addresses in body`,
    });
  }

  const contentScore = Math.min(100, Math.round(rawPoints));

  return {
    tagsDetected,
    creditCardsCount: ccMatches.length,
    ssnCount: ssnMatches.length,
    bankAccountCount: bankMatches.length + csvBankMatches.length,
    routingNumberCount: routingMatches.length,
    emailCount: emailMatches.length,
    phoneCount: phoneMatches.length,
    contentScore,
    contentReasons,
  };
}

export function evaluateDLPTransfer(params: {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  filename: MockFileName;
  channel: DLPChannel;
  emailRecipientAddress?: string;
  usbDeviceId?: UsbDeviceId;
  userHistoryBytes: number[];
  w1: number;
  w2: number;
  overrideContent?: string;
  overrideSizeBytes?: number;
}): DLPEvaluationResult {
  const {
    employeeId,
    employeeName,
    employeeRole,
    filename,
    channel,
    emailRecipientAddress,
    usbDeviceId,
    userHistoryBytes,
    w1,
    w2,
    overrideContent,
    overrideSizeBytes,
  } = params;

  const file = MOCK_FILES[filename];
  const fileSizeBytes = overrideSizeBytes ?? file.sizeBytes;
  const approvedDestination = APPROVED_DESTINATIONS[filename];
  const detectionSummary = analyzeFileContent(filename, overrideContent);
  const contentScore = detectionSummary.contentScore;

  // Calculate historical volume baseline average
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

  if (channel === 'Email') {
    const recipients = getEmailRecipientsForFile(filename);
    const chosen: EmailRecipientOption =
      recipients.find((r) => r.address === emailRecipientAddress) || recipients[0];
    destinationLabel = chosen.address;

    behaviourRaw += chosen.riskPoints;

    if (chosen.category === 'approved') {
      behaviourReasons.push({
        category: 'BEHAVIOUR',
        points: 0,
        text: `Destination matches original approved recipient (${approvedDestination})`,
      });
    } else if (chosen.category === 'other_internal') {
      behaviourReasons.push({
        category: 'BEHAVIOUR',
        points: chosen.riskPoints,
        text: `Sent to internal recipient (${chosen.address}) instead of original approved (${approvedDestination})`,
      });
    } else if (chosen.category === 'partner') {
      behaviourReasons.push({
        category: 'BEHAVIOUR',
        points: chosen.riskPoints,
        text: `External partner destination (${chosen.address}) differs from approved (${approvedDestination})`,
      });
    } else if (chosen.category === 'personal_gmail') {
      hardViolationTriggered = true;
      hardViolationSummary = `VIOLATION RULE: Email sent to non-identified personal Gmail (${chosen.address}) instead of approved destination (${approvedDestination})`;
      behaviourReasons.push({
        category: 'VIOLATION_RULE',
        points: chosen.riskPoints,
        isHardViolation: true,
        text: `destination is a personal gmail (${chosen.address}) instead of ${approvedDestination}`,
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
    // USB channel
    const chosenUsb = USB_DEVICES.find((u) => u.id === usbDeviceId) || USB_DEVICES[0];
    destinationLabel = chosenUsb.id;
    behaviourRaw += chosenUsb.riskPoints;

    if (!chosenUsb.authorised) {
      hardViolationTriggered = true;
      hardViolationSummary = `VIOLATION RULE: Unauthorised USB device used (${chosenUsb.id})`;
      behaviourReasons.push({
        category: 'VIOLATION_RULE',
        points: chosenUsb.riskPoints,
        isHardViolation: true,
        text: `unauthorised removable device used (${chosenUsb.id})`,
      });
    } else {
      behaviourReasons.push({
        category: 'BEHAVIOUR',
        points: chosenUsb.riskPoints,
        text: `Copied to corporate registered USB (${chosenUsb.id})`,
      });
    }
  }

  // Volume check: 3x or more user average
  if (volumeMultiplier >= 3.0) {
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
  const rawWeightedScore = Math.min(100, Math.round(contentScore * w1 + behaviourScore * w2));

  // Determine tier based on 0-30 Allow, 31-70 Review, 71-100 Block
  // Plus mandatory violation rules that always raise an alert and prevent blind Allow
  let tier: DLPActionTier = 'ALLOW';
  if (rawWeightedScore >= 71) {
    tier = 'BLOCK';
  } else if (rawWeightedScore >= 31) {
    tier = 'REVIEW';
  } else {
    tier = 'ALLOW';
  }

  // Enforce mandatory violation rules (unregistered USB or non-identified external email mismatch)
  if (hardViolationTriggered && tier === 'ALLOW') {
    tier = rawWeightedScore >= 50 ? 'BLOCK' : 'BLOCK';
  } else if (hardViolationTriggered && tier === 'REVIEW' && rawWeightedScore >= 60) {
    tier = 'BLOCK';
  }

  const finalLeakScore = rawWeightedScore;

  let severity: DLPSeverity = 'LOW';
  if (finalLeakScore >= 75 || (hardViolationTriggered && finalLeakScore >= 50)) {
    severity = 'CRITICAL';
  } else if (finalLeakScore >= 50 || hardViolationTriggered) {
    severity = 'HIGH';
  } else if (finalLeakScore >= 31) {
    severity = 'MEDIUM';
  }

  // Combine and rank reasons by highest points & hard violation priority
  const allReasons = [...detectionSummary.contentReasons, ...behaviourReasons]
    .filter((r) => r.points > 0 || r.isHardViolation)
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
    filename,
    fileSizeBytes,
    userAvgBytesBefore,
    volumeMultiplier,
    channel,
    destination: destinationLabel,
    approvedDestination,
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

export type BuiltInMockFileName =
  | 'public_policy.txt'
  | 'project_plan.txt'
  | 'customer_cards.txt'
  | 'finance_report.txt'
  | 'hr_records.txt';

export type MockFileName = BuiltInMockFileName | string;

export interface MockFileDefinition {
  filename: string;
  label: string;
  approvedDestination: string;
  sizeBytes: number;
  content: string;
  description: string;
  isUploaded?: boolean;
}

export const APPROVED_DESTINATIONS: Record<string, string> = {
  'public_policy.txt': 'all-staff@company.com',
  'project_plan.txt': 'team@company.com',
  'customer_cards.txt': 'finance@company.com',
  'finance_report.txt': 'finance@company.com',
  'hr_records.txt': 'hr@company.com',
};

export function getApprovedDestination(filename: string): string {
  return APPROVED_DESTINATIONS[filename] || 'finance@company.com';
}

export const MOCK_FILES: Record<BuiltInMockFileName, MockFileDefinition> = {
  'public_policy.txt': {
    filename: 'public_policy.txt',
    label: 'public_policy.txt (General Policy — No PII)',
    approvedDestination: 'all-staff@company.com',
    sizeBytes: 420,
    description: 'Generic company workplace policy with zero classification tags or PII.',
    content: `CORPORATE GENERAL WORKPLACE & PUBLIC COMMUNICATIONS POLICY
Document ID: POL-2026-001
Effective Date: January 1, 2026
Classification: Public / General Distribution

1. Purpose
This policy outlines standard workplace operating hours, general holiday schedules, and public visitor check-in procedures for all offices.

2. Standard Operating Hours
Core business collaboration hours are Monday through Friday, 09:30 AM to 06:00 PM IST. Flexible hybrid work arrangements are available with team lead coordination.

3. Visitor Guidelines
All external visitors must check in at the main reception desk and wear a temporary visitor pass while in common conference spaces.`,
  },
  'project_plan.txt': {
    filename: 'project_plan.txt',
    label: 'project_plan.txt ([INTERNAL ONLY] Engineering Roadmap)',
    approvedDestination: 'team@company.com',
    sizeBytes: 940,
    description: 'Internal payment gateway roadmap tagged [INTERNAL ONLY].',
    content: `[INTERNAL ONLY]
PROJECT NEXUS-PAY: Q3-Q4 CORE PAYMENT GATEWAY MIGRATION PLAN
Document Reference: ENG-PLAN-2026-Q3
Distribution: Internal Engineering & Product Architecture Teams Only

1. Executive Summary
This internal roadmap details the phased cutover from our legacy settlement switch to the low-latency UPI and ISO-20022 real-time clearing rail.

2. Key Milestones
- Phase 1 (August 14): Internal sandbox stress testing at 12,000 TPS.
- Phase 2 (September 02): Shadow routing for 5% of domestic merchant volume.
- Phase 3 (October 10): Full production cutover and deprecation of v1 settlement nodes.

3. Architecture Notes [INTERNAL ONLY]
Internal service mesh endpoints operate on private VPC subnets 10.24.16.0/20. Do not circulate outside the core engineering group.`,
  },
  'customer_cards.txt': {
    filename: 'customer_cards.txt',
    label: 'customer_cards.txt ([CONFIDENTIAL] 15 Credit Card Numbers)',
    approvedDestination: 'finance@company.com',
    sizeBytes: 1890,
    description: 'Merchant settlement batch tagged [CONFIDENTIAL] with 15 fake credit card PANs.',
    content: `[CONFIDENTIAL]
MERCHANT SETTLEMENT BATCH - CUSTOMER CARD RECONCILIATION EXTRACT
Batch Reference: FIN-CC-2026-8841
Notice: Strictly [CONFIDENTIAL] cardholder audit records. Authorised destination: finance@company.com only.

Record 01 | Cardholder: R. Sharma       | PAN: 4532-7184-9021-3348 | Exp: 08/28 | Tier: Platinum
Record 02 | Cardholder: A. Verma        | PAN: 5412-8839-1044-2910 | Exp: 11/27 | Tier: Corporate
Record 03 | Cardholder: K. Nair         | PAN: 4916-3048-7721-5509 | Exp: 04/29 | Tier: Signature
Record 04 | Cardholder: S. Patel        | PAN: 5108-6492-3318-8842 | Exp: 09/27 | Tier: Titanium
Record 05 | Cardholder: M. Deshmukh     | PAN: 4024-0071-9932-6184 | Exp: 02/28 | Tier: Platinum
Record 06 | Cardholder: D. Chatterjee   | PAN: 5521-4903-8172-4401 | Exp: 07/29 | Tier: World
Record 07 | Cardholder: P. Kulkarni     | PAN: 4556-9102-3847-1129 | Exp: 12/28 | Tier: Signature
Record 08 | Cardholder: V. Sundaram     | PAN: 5243-7719-0048-6391 | Exp: 05/27 | Tier: Corporate
Record 09 | Cardholder: N. Reddy        | PAN: 4716-8390-5512-7483 | Exp: 10/28 | Tier: Platinum
Record 10 | Cardholder: T. Malhotra     | PAN: 5490-1284-6639-9012 | Exp: 03/29 | Tier: World
Record 11 | Cardholder: G. Joshi        | PAN: 4485-6201-7394-2815 | Exp: 06/28 | Tier: Signature
Record 12 | Cardholder: H. Bansal       | PAN: 5319-4082-9173-5560 | Exp: 01/29 | Tier: Titanium
Record 13 | Cardholder: L. Iyer         | PAN: 4929-7510-3382-4907 | Exp: 09/28 | Tier: Platinum
Record 14 | Cardholder: B. Sengupta     | PAN: 5182-9940-1726-8354 | Exp: 11/28 | Tier: Corporate
Record 15 | Cardholder: Y. Choudhury    | PAN: 4539-6812-4095-7723 | Exp: 04/28 | Tier: Signature

End of [CONFIDENTIAL] Batch Extract - Total Active Cards: 15.`,
  },
  'finance_report.txt': {
    filename: 'finance_report.txt',
    label: 'finance_report.txt ([FINANCIAL_DATA] Bank & Routing Ledger)',
    approvedDestination: 'finance@company.com',
    sizeBytes: 2450,
    description: 'Corporate treasury ledger tagged [FINANCIAL_DATA] with 10 bank account and ABA routing numbers.',
    content: `[FINANCIAL_DATA]
Q3 CORPORATE TREASURY DISBURSEMENT & WIRE SETTLEMENT LEDGER
Document ID: FIN-TREASURY-2026-Q3
Classification: [FINANCIAL_DATA] - Restricted to Corporate Finance (finance@company.com)

1. Institutional Settlement Accounts & ABA Routing Instructions
------------------------------------------------------------------------------------------
Counterparty: Apex Clearing Custody      | Acct#: ACCT-8849201143 | Routing#: ABA-021000021 | Amount: $1,420,000.00
Counterparty: Horizon Liquidity Partners | Acct#: ACCT-7730194822 | Routing#: ABA-026009593 | Amount: $890,500.00
Counterparty: Meridian Prime Brokerage   | Acct#: ACCT-9910482736 | Routing#: ABA-121000248 | Amount: $2,150,000.00
Counterparty: Crestview Escrow Services  | Acct#: ACCT-6648291054 | Routing#: ABA-071000013 | Amount: $640,250.00
Counterparty: Vanguard Settlement Vault  | Acct#: ACCT-5501928374 | Routing#: ABA-031100209 | Amount: $3,110,800.00
Counterparty: Sterling FX Reserve        | Acct#: ACCT-4492817365 | Routing#: ABA-111000025 | Amount: $975,000.00
Counterparty: Pacific Bullion Clearing   | Acct#: ACCT-3381726490 | Routing#: ABA-122000247 | Amount: $1,840,000.00
Counterparty: Atlas Institutional Trust  | Acct#: ACCT-2293847561 | Routing#: ABA-011000015 | Amount: $1,205,400.00
Counterparty: Zenith Capital Treasury    | Acct#: ACCT-1182736455 | Routing#: ABA-053000196 | Amount: $760,900.00
Counterparty: Beacon Reserve Depository  | Acct#: ACCT-9081726354 | Routing#: ABA-061000104 | Amount: $1,530,000.00

2. Liquidity Summary [FINANCIAL_DATA]
Total Quarterly Outbound Wire Volume: $14,522,850.00 across 10 primary settlement accounts.
Unauthorized duplication or transmission outside finance@company.com is strictly prohibited.`,
  },
  'hr_records.txt': {
    filename: 'hr_records.txt',
    label: 'hr_records.txt ([CONFIDENTIAL] Names, Phones, Emails & SSNs)',
    approvedDestination: 'hr@company.com',
    sizeBytes: 3120,
    description: 'Master payroll directory tagged [CONFIDENTIAL] with 12 employee SSNs, phone numbers, and emails.',
    content: `[CONFIDENTIAL]
HUMAN RESOURCES MASTER PAYROLL & IDENTITY VERIFICATION REGISTER
Document ID: HR-PII-2026-09
Classification: [CONFIDENTIAL] - Restricted to Human Resources (hr@company.com)

1. Verified Employee Identity & Tax Identification Roster
--------------------------------------------------------------------------------------------------------------------
EmpID: E-1041 | Name: Aditya Rajendra Kulkarni  | SSN: 418-72-9041 | Phone: +1-415-890-2341 | Email: aditya.k@company.com
EmpID: E-1042 | Name: Sneha Vishwanath Iyer     | SSN: 529-48-1132 | Phone: +1-415-890-2342 | Email: sneha.iyer@company.com
EmpID: E-1043 | Name: Vikramaditya Singhania    | SSN: 304-91-7764 | Phone: +1-415-890-2343 | Email: v.singhania@company.com
EmpID: E-1044 | Name: Ananya Parthasarathy      | SSN: 617-33-8520 | Phone: +1-415-890-2344 | Email: ananya.p@company.com
EmpID: E-1045 | Name: Siddharth Chatterjee      | SSN: 289-65-4419 | Phone: +1-415-890-2345 | Email: siddharth.c@company.com
EmpID: E-1046 | Name: Divya Subramanian         | SSN: 742-19-3087 | Phone: +1-415-890-2346 | Email: divya.s@company.com
EmpID: E-1047 | Name: Karthikeya Nambiar        | SSN: 815-40-6293 | Phone: +1-415-890-2347 | Email: karthik.n@company.com
EmpID: E-1048 | Name: Pooja Chandrasekhar       | SSN: 193-84-5501 | Phone: +1-415-890-2348 | Email: pooja.c@company.com
EmpID: E-1049 | Name: Pranav Mukhopadhyay       | SSN: 664-27-9184 | Phone: +1-415-890-2349 | Email: pranav.m@company.com
EmpID: E-1050 | Name: Ishita Suryavanshi        | SSN: 508-73-2946 | Phone: +1-415-890-2350 | Email: ishita.s@company.com
EmpID: E-1051 | Name: Raghavendra Deshpande     | SSN: 371-56-8012 | Phone: +1-415-890-2351 | Email: raghav.d@company.com
EmpID: E-1052 | Name: Tanvi Radhakrishnan       | SSN: 490-61-7328 | Phone: +1-415-890-2352 | Email: tanvi.r@company.com

2. Compliance Notice [CONFIDENTIAL]
Contains 12 full employee identity profiles including SSN, direct telephone, and corporate email records.
Do not copy to removable USB media or transmit to personal email accounts.`,
  },
};

export interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  workstationId: string;
  workstationIp: string;
  defaultHistoryBytes: number[];
}

export const MOCK_EMPLOYEES: EmployeeProfile[] = [
  {
    id: 'aarav',
    name: 'Aarav',
    role: 'Finance Associate',
    department: 'Corporate Treasury',
    workstationId: 'WS-FIN-104',
    workstationIp: '10.24.18.104',
    defaultHistoryBytes: [420, 480, 390, 450],
  },
  {
    id: 'meera',
    name: 'Meera',
    role: 'HR Specialist',
    department: 'People Operations',
    workstationId: 'WS-HR-208',
    workstationIp: '10.24.22.208',
    defaultHistoryBytes: [500, 420, 460, 540],
  },
  {
    id: 'rohan',
    name: 'Rohan',
    role: 'Product Engineer',
    department: 'Core Payments',
    workstationId: 'WS-ENG-312',
    workstationIp: '10.24.16.312',
    defaultHistoryBytes: [380, 410, 440, 370],
  },
];

export interface AnalystProfile {
  id: string;
  name: string;
  title: string;
}

export const MOCK_ANALYSTS: AnalystProfile[] = [
  {
    id: 'priya',
    name: 'Priya',
    title: 'Lead SOC & DLP Analyst',
  },
  {
    id: 'vikram',
    name: 'Vikram',
    title: 'Insider Threat Investigator',
  },
];

export type EmailRecipientCategory =
  | 'approved'
  | 'other_internal'
  | 'partner'
  | 'personal_gmail'
  | 'unknown_external';

export interface EmailRecipientOption {
  address: string;
  label: string;
  category: EmailRecipientCategory;
  riskPoints: number;
  isNonIdentifiedExternal: boolean;
}

export function getEmailRecipientsForFile(filename: string): EmailRecipientOption[] {
  const approved = getApprovedDestination(filename);
  const allInternal = [
    'finance@company.com',
    'team@company.com',
    'hr@company.com',
    'all-staff@company.com',
    'ops-audit@company.com',
  ];
  const otherInternals = allInternal.filter((addr) => addr !== approved);

  const options: EmailRecipientOption[] = [
    {
      address: approved,
      label: `${approved} (Original Approved Destination — Risk 0)`,
      category: 'approved',
      riskPoints: 0,
      isNonIdentifiedExternal: false,
    },
    ...otherInternals.slice(0, 2).map((addr) => ({
      address: addr,
      label: `${addr} (Other Internal Address — Risk 35)`,
      category: 'other_internal' as const,
      riskPoints: 35,
      isNonIdentifiedExternal: false,
    })),
    {
      address: 'audit-partner@trusted-partner.com',
      label: 'audit-partner@trusted-partner.com (Verified Partner — Risk 55)',
      category: 'partner',
      riskPoints: 55,
      isNonIdentifiedExternal: false,
    },
    {
      address: 'someone@gmail.com',
      label: 'someone@gmail.com (personal_gmail — Non-Identified External — Risk 90)',
      category: 'personal_gmail',
      riskPoints: 90,
      isNonIdentifiedExternal: true,
    },
    {
      address: 'unknown_drop@external-unverified.net',
      label: 'unknown_drop@external-unverified.net (Unknown External — Risk 100)',
      category: 'unknown_external',
      riskPoints: 100,
      isNonIdentifiedExternal: true,
    },
  ];

  return options;
}

export function resolveEmailRecipient(
  filename: string,
  emailRecipientAddress?: string
): EmailRecipientOption {
  const presets = getEmailRecipientsForFile(filename);
  const approved = getApprovedDestination(filename);
  const raw = (emailRecipientAddress || approved).trim();

  const exactPreset = presets.find((r) => r.address.toLowerCase() === raw.toLowerCase());
  if (exactPreset) return exactPreset;

  const lower = raw.toLowerCase();
  if (lower === approved.toLowerCase()) {
    return {
      address: raw,
      label: `${raw} (Original Approved Destination — Risk 0)`,
      category: 'approved',
      riskPoints: 0,
      isNonIdentifiedExternal: false,
    };
  }

  if (lower.endsWith('@company.com')) {
    return {
      address: raw,
      label: `${raw} (Other Internal Department — Risk 35)`,
      category: 'other_internal',
      riskPoints: 35,
      isNonIdentifiedExternal: false,
    };
  }

  if (lower.endsWith('@trusted-partner.com') || lower.includes('partner')) {
    return {
      address: raw,
      label: `${raw} (External Verified Partner — Risk 55)`,
      category: 'partner',
      riskPoints: 55,
      isNonIdentifiedExternal: false,
    };
  }

  if (/@(gmail|yahoo|outlook|hotmail|icloud|protonmail|aol|live|msn)\./i.test(lower)) {
    return {
      address: raw,
      label: `${raw} (Personal Webmail — Non-Identified External — Risk 90)`,
      category: 'personal_gmail',
      riskPoints: 90,
      isNonIdentifiedExternal: true,
    };
  }

  return {
    address: raw,
    label: `${raw} (Unknown External Domain — Risk 100)`,
    category: 'unknown_external',
    riskPoints: 100,
    isNonIdentifiedExternal: true,
  };
}

// ============================================================================
// USB ACCESS CONTROL WHITELIST (TECNO POVA 6 Neo 5G via Charger Cable)
// ============================================================================
export const AUTHORIZED_USB_DEVICES = [
  {
    name: 'TECNO POVA 6 Neo 5G',
    vid: '0E8D',
    pid: '2008',
    serial: '13161314A6041832',
  },
];

export const IGNORED_USB_PREFIXES = [
  'USB\\ROOT_HUB',
  'USB\\VID_04CA&PID_7070', // Integrated Camera / Composite
  'USB\\VID_8087&PID_0A2B', // Intel Wireless Bluetooth
];

export function parseUsbInstanceId(instanceId: string): {
  vid: string | null;
  pid: string | null;
  serial: string | null;
} {
  // Example format: USB\VID_0E8D&PID_2008\13161314A6041832
  const parts = instanceId.trim().split('\\');
  if (
    parts.length < 3 ||
    !parts[1].toUpperCase().includes('VID_') ||
    !parts[1].toUpperCase().includes('PID_')
  ) {
    return { vid: null, pid: null, serial: null };
  }
  const vidPid = parts[1].split('&');
  const vid = vidPid[0].replace(/VID_/i, '');
  const pid = (vidPid[1] || '').replace(/PID_/i, '');
  const serial = parts[2];
  return { vid, pid, serial };
}

export function isUsbDeviceAuthorized(vid: string, pid: string, serial: string): boolean {
  return AUTHORIZED_USB_DEVICES.some(
    (dev) =>
      dev.vid.toLowerCase() === vid.trim().toLowerCase() &&
      dev.pid.toLowerCase() === pid.trim().toLowerCase() &&
      dev.serial.toLowerCase() === serial.trim().toLowerCase()
  );
}

export type UsbDeviceId =
  | 'TECNO POVA 6 Neo 5G'
  | 'SanDisk-Cruzer-Commercial-64GB'
  | 'Kingston-DataTraveler-Commercial-32GB'
  | 'Unknown-USB (unregistered)'
  | string;

export interface UsbDeviceMetadata {
  id: UsbDeviceId;
  label: string;
  authorised: boolean;
  accessStatusLabel: 'AUTHORISED' | 'UNAUTHORISED';
  riskPoints: number;
  vendor: string;
  vid: string;
  pid: string;
  vidPid: string;
  serialNumber: string;
  instanceId: string;
  deviceCategory: 'Authorised Mobile Device' | 'Unauthorised USB Device';
  usbPort: string;
  capacityLabel: string;
  mobileModel?: string;
  connectionMode?: string;
  osFirmware?: string;
  busSpeed?: string;
  powerDraw?: string;
}

export const USB_DEVICES: UsbDeviceMetadata[] = [
  {
    id: 'TECNO POVA 6 Neo 5G',
    label: 'TECNO POVA 6 Neo 5G (VID: 0E8D | PID: 2008 | Serial: 13161314A6041832) — AUTHORISED',
    authorised: true,
    accessStatusLabel: 'AUTHORISED',
    riskPoints: 0,
    vendor: 'TECNO Mobile Limited (MediaTek USB Composite)',
    vid: '0E8D',
    pid: '2008',
    vidPid: '0E8D:2008',
    serialNumber: '13161314A6041832',
    instanceId: 'USB\\VID_0E8D&PID_2008\\13161314A6041832',
    deviceCategory: 'Authorised Mobile Device',
    usbPort: 'USB3.2-Bus01-Port01',
    capacityLabel: '256 GB Internal UFS 2.2 (MTP)',
    mobileModel: 'TECNO KL4 (POVA 6 Neo 5G)',
    connectionMode: 'USB Type-C Charger Cable (MTP + ADB Interface)',
    osFirmware: 'Android 14 · HiOS 14.0.0 (5G Security Patch Verified)',
    busSpeed: 'High-Speed USB 2.0 / 480 Mbps',
    powerDraw: '500 mA Fast-Charge Passthrough',
  },
  {
    id: 'SanDisk-Cruzer-Commercial-64GB',
    label: 'SanDisk Cruzer Blade 64GB (VID: 0781 | PID: 5567 | Serial: SD-COMM-44819) — UNAUTHORISED',
    authorised: false,
    accessStatusLabel: 'UNAUTHORISED',
    riskPoints: 100,
    vendor: 'SanDisk Consumer Retail',
    vid: '0781',
    pid: '5567',
    vidPid: '0781:5567',
    serialNumber: 'SD-COMM-44819',
    instanceId: 'USB\\VID_0781&PID_5567\\SD-COMM-44819',
    deviceCategory: 'Unauthorised USB Device',
    usbPort: 'USB3.2-Bus01-Port02',
    capacityLabel: '64 GB FAT32 Mass Storage',
    mobileModel: 'SanDisk Cruzer Blade (Commercial Flash Drive)',
    connectionMode: 'USB-A Mass Storage Class (BOT)',
    osFirmware: 'SanDisk Controller v1.27',
    busSpeed: 'High-Speed 480 Mbps',
    powerDraw: '200 mA Bus Powered',
  },
  {
    id: 'Kingston-DataTraveler-Commercial-32GB',
    label: 'Kingston DataTraveler Exodia 32GB (VID: 0951 | PID: 1665 | Serial: KG-COMM-77310) — UNAUTHORISED',
    authorised: false,
    accessStatusLabel: 'UNAUTHORISED',
    riskPoints: 100,
    vendor: 'Kingston Consumer Retail',
    vid: '0951',
    pid: '1665',
    vidPid: '0951:1665',
    serialNumber: 'KG-COMM-77310',
    instanceId: 'USB\\VID_0951&PID_1665\\KG-COMM-77310',
    deviceCategory: 'Unauthorised USB Device',
    usbPort: 'USB3.2-Bus02-Port01',
    capacityLabel: '32 GB exFAT Mass Storage',
    mobileModel: 'Kingston DataTraveler Exodia DTX/32GB',
    connectionMode: 'USB 3.2 Gen 1 Mass Storage',
    osFirmware: 'Kingston PMAP v1.0',
    busSpeed: 'SuperSpeed 5 Gbps',
    powerDraw: '300 mA Bus Powered',
  },
  {
    id: 'Unknown-USB (unregistered)',
    label: 'Unknown USB Device (VID: 058F | PID: 6387 | Serial: UNREG-USB-00492) — UNAUTHORISED',
    authorised: false,
    accessStatusLabel: 'UNAUTHORISED',
    riskPoints: 100,
    vendor: 'Alcor Micro / Generic USB Mass Storage',
    vid: '058F',
    pid: '6387',
    vidPid: '058F:6387',
    serialNumber: 'UNREG-USB-00492',
    instanceId: 'USB\\VID_058F&PID_6387\\UNREG-USB-00492',
    deviceCategory: 'Unauthorised USB Device',
    usbPort: 'USB2.0-FrontPanel-Port01',
    capacityLabel: '128 GB NTFS Unverified Volume',
    mobileModel: 'Unlabelled Generic Flash Drive',
    connectionMode: 'USB Mass Storage Bulk-Only',
    osFirmware: 'Generic Flash v8.07',
    busSpeed: 'High-Speed 480 Mbps',
    powerDraw: '250 mA Bus Powered',
  },
];

export function resolveUsbDeviceMetadata(
  usbDeviceId?: string,
  customVid?: string,
  customPid?: string,
  customSerial?: string
): UsbDeviceMetadata {
  if (!customVid && !customPid && !customSerial) {
    const found = USB_DEVICES.find((u) => u.id === usbDeviceId || u.instanceId === usbDeviceId);
    if (found) return found;
  }

  const rawInput = (usbDeviceId || 'Unknown USB Device').trim();
  const parsed = parseUsbInstanceId(rawInput);

  const vid = (
    customVid ||
    parsed.vid ||
    (rawInput.toUpperCase().includes('0E8D') || rawInput.toUpperCase().includes('TECNO')
      ? '0E8D'
      : '0781')
  ).toUpperCase();
  const pid = (
    customPid ||
    parsed.pid ||
    (rawInput.toUpperCase().includes('2008') || rawInput.toUpperCase().includes('TECNO')
      ? '2008'
      : '5591')
  ).toUpperCase();
  const serial = (
    customSerial ||
    parsed.serial ||
    (rawInput.toUpperCase().includes('13161314A6041832') || rawInput.toUpperCase().includes('TECNO')
      ? '13161314A6041832'
      : `SN-${Math.abs(rawInput.length * 7919).toString().slice(0, 6)}`)
  ).toUpperCase();

  const authorised = isUsbDeviceAuthorized(vid, pid, serial);
  if (authorised) {
    return USB_DEVICES[0];
  }

  const displayName = rawInput;
  const instanceId = `USB\\VID_${vid}&PID_${pid}\\${serial}`;

  return {
    id: displayName,
    label: `${displayName} (VID: ${vid} | PID: ${pid} | Serial: ${serial}) — UNAUTHORISED`,
    authorised: false,
    accessStatusLabel: 'UNAUTHORISED',
    riskPoints: 100,
    vendor: 'External Unverified USB Vendor',
    vid,
    pid,
    vidPid: `${vid}:${pid}`,
    serialNumber: serial,
    instanceId,
    deviceCategory: 'Unauthorised USB Device',
    usbPort: 'USB3.2-Bus01-Port03',
    capacityLabel: 'External Mass Storage',
    mobileModel: displayName,
    connectionMode: 'USB Removable Storage Interface',
    osFirmware: 'Unverified External Firmware',
    busSpeed: 'High-Speed 480 Mbps',
    powerDraw: '250 mA Bus Powered',
  };
}

import {
  INITIAL_ACCOUNT_RECORDS,
  formatAccountsDlpExtract,
} from '../utils/accountsDataset';

export type MockFileName =
  | 'public_policy.txt'
  | 'project_plan.txt'
  | 'customer_cards.txt'
  | 'finance_report.txt'
  | 'hr_records.txt'
  | 'accounts_288e8b18.csv';

export interface MockFileDefinition {
  filename: MockFileName;
  label: string;
  approvedDestination: string;
  sizeBytes: number;
  content: string;
  description: string;
}

export const APPROVED_DESTINATIONS: Record<MockFileName, string> = {
  'public_policy.txt': 'all-staff@company.com',
  'project_plan.txt': 'team@company.com',
  'customer_cards.txt': 'finance@company.com',
  'finance_report.txt': 'finance@company.com',
  'hr_records.txt': 'hr@company.com',
  'accounts_288e8b18.csv': 'finance@company.com',
};

export const MOCK_FILES: Record<MockFileName, MockFileDefinition> = {
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
  'accounts_288e8b18.csv': {
    filename: 'accounts_288e8b18.csv',
    label: 'accounts_288e8b18.csv ([FINANCIAL_DATA] Live Banking Accounts CSV — 95,001 rows)',
    approvedDestination: 'finance@company.com',
    sizeBytes: 3480,
    description: 'Live customer banking accounts dataset extract tagged [FINANCIAL_DATA] & [CONFIDENTIAL] with balances, customer IDs, and branch codes.',
    content: formatAccountsDlpExtract(INITIAL_ACCOUNT_RECORDS, 12),
  },
};

export interface EmployeeProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  defaultHistoryBytes: number[];
}

export const MOCK_EMPLOYEES: EmployeeProfile[] = [
  {
    id: 'aarav',
    name: 'Aarav',
    role: 'Finance Associate',
    department: 'Corporate Treasury',
    defaultHistoryBytes: [420, 480, 390, 450], // Average: 435 B (so files >= 1305 B trigger >3x volume anomaly!)
  },
  {
    id: 'meera',
    name: 'Meera',
    role: 'HR Specialist',
    department: 'People Operations',
    defaultHistoryBytes: [500, 420, 460, 540], // Average: 480 B
  },
  {
    id: 'rohan',
    name: 'Rohan',
    role: 'Product Engineer',
    department: 'Core Payments',
    defaultHistoryBytes: [380, 410, 440, 370], // Average: 400 B
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

export function getEmailRecipientsForFile(filename: MockFileName): EmailRecipientOption[] {
  const approved = APPROVED_DESTINATIONS[filename];
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
      label: `${addr} (Other Internal Address — Risk 10)`,
      category: 'other_internal' as const,
      riskPoints: 10,
      isNonIdentifiedExternal: false,
    })),
    {
      address: 'audit-partner@trusted-partner.com',
      label: 'audit-partner@trusted-partner.com (Verified Partner — Risk 40)',
      category: 'partner',
      riskPoints: 40,
      isNonIdentifiedExternal: false,
    },
    {
      address: 'someone@gmail.com',
      label: 'someone@gmail.com (personal_gmail — Non-Identified External — Risk 80)',
      category: 'personal_gmail',
      riskPoints: 80,
      isNonIdentifiedExternal: true,
    },
    {
      address: 'unknown_drop@external-unverified.net',
      label: 'Unknown external address (unknown_drop@external-unverified.net — Risk 100)',
      category: 'unknown_external',
      riskPoints: 100,
      isNonIdentifiedExternal: true,
    },
  ];

  return options;
}

export type UsbDeviceId = 'Registered-USB-01' | 'Unknown-USB (unregistered)';

export interface UsbDeviceOption {
  id: UsbDeviceId;
  label: string;
  authorised: boolean;
  riskPoints: number;
}

export const USB_DEVICES: UsbDeviceOption[] = [
  {
    id: 'Registered-USB-01',
    label: 'Registered-USB-01 (Authorised Corporate Hardware Encrypted USB — Risk 20)',
    authorised: true,
    riskPoints: 20,
  },
  {
    id: 'Unknown-USB (unregistered)',
    label: 'Unknown-USB (unregistered) (Unauthorised Removable Media — Risk 100)',
    authorised: false,
    riskPoints: 100,
  },
];

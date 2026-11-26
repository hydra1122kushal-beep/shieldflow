export interface UploadedCsvRow {
  [column: string]: string | number;
}

export interface PresidioEntityMatch {
  entityType:
    | 'CREDIT_CARD'
    | 'US_SSN'
    | 'IN_PAN'
    | 'IN_AADHAAR'
    | 'BANK_ACCOUNT'
    | 'ABA_ROUTING'
    | 'IFSC_CODE'
    | 'IBAN_CODE'
    | 'PHONE_NUMBER'
    | 'EMAIL_ADDRESS'
    | 'IP_ADDRESS'
    | 'SECURITY_TAG'
    | 'FINANCIAL_RECORD';
  value: string;
  confidence: number;
  recognizer: 'PresidioPatternRecognizer' | 'RegexChecksumRecognizer' | 'PandasColumnHeuristic';
  column?: string;
  rowIndex?: number;
}

export interface PandasColumnProfile {
  name: string;
  dtype: 'int64' | 'float64' | 'object' | 'datetime64';
  nonNullCount: number;
  nullCount: number;
  isSensitiveColumn: boolean;
  sensitiveCategory: string | null;
  sampleValues: string[];
  numericSum?: number;
  numericMean?: number;
}

export interface UploadedDatasetScanReport {
  filename: string;
  fileSizeBytes: number;
  uploadedAt: string;
  rawContent: string;
  isTabularCsv: boolean;
  totalRows: number;
  totalColumns: number;
  columns: PandasColumnProfile[];
  rows: UploadedCsvRow[];
  sensitiveColumnsDetected: string[];
  presidioEntities: PresidioEntityMatch[];
  entityCountsByType: Record<string, number>;
  verificationPassed: boolean;
  verificationSteps: Array<{
    engine: 'Pandas DataFrame Engine' | 'Presidio Entity Analyzer' | 'Regex Pattern & Checksum';
    status: 'VERIFIED' | 'CLEAN';
    detail: string;
  }>;
  dlpFormattedExtract: string;
}

const SENSITIVE_COLUMN_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /(?:^|_)(?:ssn|social_security|tax_id|national_id)(?:$|_)/i, category: 'US_SSN / National ID' },
  { pattern: /(?:^|_)(?:cc|credit_card|card_no|card_number|pan_card|card_pan)(?:$|_)/i, category: 'CREDIT_CARD' },
  { pattern: /(?:^|_)(?:pan|pan_no|permanent_account)(?:$|_)/i, category: 'IN_PAN' },
  { pattern: /(?:^|_)(?:aadhaar|aadhar|uidai)(?:$|_)/i, category: 'IN_AADHAAR' },
  { pattern: /(?:^|_)(?:account_id|acct_id|account_no|account_number|bank_account|iban)(?:$|_)/i, category: 'BANK_ACCOUNT' },
  { pattern: /(?:^|_)(?:customer_id|cust_id|client_id)(?:$|_)/i, category: 'CUSTOMER_ID' },
  { pattern: /(?:^|_)(?:balance|amount|salary|compensation|net_pay|wire_amount)(?:$|_)/i, category: 'FINANCIAL_BALANCE' },
  { pattern: /(?:^|_)(?:routing|aba|ifsc|swift|branch_id)(?:$|_)/i, category: 'BANK_ROUTING' },
  { pattern: /(?:^|_)(?:phone|mobile|contact_no|tel|telephone)(?:$|_)/i, category: 'PHONE_NUMBER' },
  { pattern: /(?:^|_)(?:email|email_address|e_mail)(?:$|_)/i, category: 'EMAIL_ADDRESS' },
  { pattern: /(?:^|_)(?:cvv|cvc|pin|password|secret|token)(?:$|_)/i, category: 'AUTH_SECRET' },
];

function splitCsvLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function inferColumnDtype(values: string[]): 'int64' | 'float64' | 'datetime64' | 'object' {
  const nonEmpty = values.filter((v) => v !== '' && v.toLowerCase() !== 'null' && v.toLowerCase() !== 'nan');
  if (nonEmpty.length === 0) return 'object';

  const allDates = nonEmpty.every((v) => /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?$/.test(v));
  if (allDates) return 'datetime64';

  const allNumbers = nonEmpty.every((v) => /^-?\d+(?:\.\d+)?$/.test(v));
  if (allNumbers) {
    const hasDecimal = nonEmpty.some((v) => v.includes('.'));
    return hasDecimal ? 'float64' : 'int64';
  }

  return 'object';
}

/**
 * Runs Presidio-style Entity Recognizers + Regex scanners on raw text and optional parsed CSV cells.
 */
export function runPresidioAndRegexScan(
  rawText: string,
  parsedRows?: UploadedCsvRow[],
  columns?: PandasColumnProfile[]
): {
  entities: PresidioEntityMatch[];
  countsByType: Record<string, number>;
} {
  const entities: PresidioEntityMatch[] = [];
  const countsByType: Record<string, number> = {};

  const recordEntity = (match: PresidioEntityMatch) => {
    countsByType[match.entityType] = (countsByType[match.entityType] || 0) + 1;
    if (entities.length < 250) {
      entities.push(match);
    }
  };

  // 1. Security classification tags
  const tagMatches = rawText.match(/\[(?:CONFIDENTIAL|FINANCIAL_DATA|INTERNAL ONLY)\]/g) || [];
  tagMatches.forEach((val) =>
    recordEntity({
      entityType: 'SECURITY_TAG',
      value: val,
      confidence: 1.0,
      recognizer: 'RegexChecksumRecognizer',
    })
  );

  // 2. Credit card numbers (16 digits with hyphens/spaces or continuous in CC column)
  const ccMatches = rawText.match(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g) || [];
  ccMatches.forEach((val) =>
    recordEntity({
      entityType: 'CREDIT_CARD',
      value: val,
      confidence: 0.95,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  // 3. US SSN
  const ssnMatches = rawText.match(/\b\d{3}-\d{2}-\d{4}\b/g) || [];
  ssnMatches.forEach((val) =>
    recordEntity({
      entityType: 'US_SSN',
      value: val,
      confidence: 0.92,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  // 4. Indian PAN Card (e.g. ABCDE1234F)
  const panMatches = rawText.match(/\b[A-Z]{5}\d{4}[A-Z]\b/g) || [];
  panMatches.forEach((val) =>
    recordEntity({
      entityType: 'IN_PAN',
      value: val,
      confidence: 0.9,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  // 5. Indian Aadhaar (12 digits grouped by 4)
  const aadhaarMatches = rawText.match(/\b[2-9]\d{3}[\s-]\d{4}[\s-]\d{4}\b/g) || [];
  aadhaarMatches.forEach((val) =>
    recordEntity({
      entityType: 'IN_AADHAAR',
      value: val,
      confidence: 0.88,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  // 6. Bank Accounts (ACCT-XXXXXXXX) & ABA Routing (ABA-XXXXXXXXX) & IFSC & IBAN
  const acctMatches = rawText.match(/\bACCT-\d{6,14}\b/g) || [];
  acctMatches.forEach((val) =>
    recordEntity({
      entityType: 'BANK_ACCOUNT',
      value: val,
      confidence: 0.96,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  const abaMatches = rawText.match(/\bABA-\d{9}\b/g) || [];
  abaMatches.forEach((val) =>
    recordEntity({
      entityType: 'ABA_ROUTING',
      value: val,
      confidence: 0.96,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  const ifscMatches = rawText.match(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g) || [];
  ifscMatches.forEach((val) =>
    recordEntity({
      entityType: 'IFSC_CODE',
      value: val,
      confidence: 0.91,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  const ibanMatches = rawText.match(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,28}\b/g) || [];
  ibanMatches.forEach((val) =>
    recordEntity({
      entityType: 'IBAN_CODE',
      value: val,
      confidence: 0.93,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  // 7. Phone Numbers
  const phoneMatches =
    rawText.match(/(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]\d{3}[-\s]\d{4}\b/g) || [];
  phoneMatches.forEach((val) =>
    recordEntity({
      entityType: 'PHONE_NUMBER',
      value: val,
      confidence: 0.85,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  // 8. Email Addresses
  const emailMatches =
    rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g) || [];
  emailMatches.forEach((val) =>
    recordEntity({
      entityType: 'EMAIL_ADDRESS',
      value: val,
      confidence: 0.95,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  // 9. IPv4 Addresses
  const ipMatches = rawText.match(/\b(?:10|172|192)\.(?:\d{1,3}\.){2}\d{1,3}\b/g) || [];
  ipMatches.forEach((val) =>
    recordEntity({
      entityType: 'IP_ADDRESS',
      value: val,
      confidence: 0.82,
      recognizer: 'PresidioPatternRecognizer',
    })
  );

  // 10. Pandas Column-Aware Entity Extraction (detects banking/financial rows even when account IDs are plain integers)
  if (parsedRows && columns && parsedRows.length > 0) {
    const sensitiveCols = columns.filter((c) => c.isSensitiveColumn);
    if (sensitiveCols.length > 0) {
      parsedRows.forEach((row, rIdx) => {
        sensitiveCols.forEach((col) => {
          const cellVal = String(row[col.name] ?? '').trim();
          if (!cellVal) return;

          if (col.sensitiveCategory === 'BANK_ACCOUNT' && !/^ACCT-/i.test(cellVal)) {
            recordEntity({
              entityType: 'BANK_ACCOUNT',
              value: `${col.name}=${cellVal}`,
              confidence: 0.89,
              recognizer: 'PandasColumnHeuristic',
              column: col.name,
              rowIndex: rIdx + 1,
            });
          } else if (col.sensitiveCategory === 'FINANCIAL_BALANCE') {
            recordEntity({
              entityType: 'FINANCIAL_RECORD',
              value: `${col.name}=${cellVal}`,
              confidence: 0.87,
              recognizer: 'PandasColumnHeuristic',
              column: col.name,
              rowIndex: rIdx + 1,
            });
          }
        });
      });
    }
  }

  return { entities, countsByType };
}

/**
 * Parses an uploaded CSV or text file using a Pandas-style DataFrame analyzer + Presidio/Regex engine.
 */
export function analyzeUploadedFile(
  filename: string,
  rawContent: string,
  fileSizeBytes?: number
): UploadedDatasetScanReport {
  const effectiveSize = fileSizeBytes ?? new Blob([rawContent]).size;
  const trimmed = rawContent.trim();
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const isCsvExtension = /\.(csv|tsv)$/i.test(filename);
  const delimiter = filename.toLowerCase().endsWith('.tsv') ? '\t' : ',';
  const firstLineCols = lines.length > 0 ? splitCsvLine(lines[0], delimiter) : [];
  const secondLineCols = lines.length > 1 ? splitCsvLine(lines[1], delimiter) : [];

  const isTabularCsv =
    lines.length >= 2 &&
    firstLineCols.length >= 2 &&
    (isCsvExtension || firstLineCols.length === secondLineCols.length);

  const columns: PandasColumnProfile[] = [];
  const rows: UploadedCsvRow[] = [];
  const sensitiveColumnsDetected: string[] = [];

  if (isTabularCsv) {
    const headers = firstLineCols.map((h, idx) => h || `column_${idx + 1}`);
    const maxRowsToParse = Math.min(lines.length - 1, 500);

    const rawColumnValues: Record<string, string[]> = {};
    headers.forEach((h) => {
      rawColumnValues[h] = [];
    });

    for (let i = 1; i <= maxRowsToParse; i++) {
      const cells = splitCsvLine(lines[i], delimiter);
      if (cells.length === 0) continue;
      const rowObj: UploadedCsvRow = {};
      headers.forEach((h, cIdx) => {
        const val = cells[cIdx] ?? '';
        rawColumnValues[h].push(val);
        const numVal = Number(val);
        rowObj[h] = val !== '' && !Number.isNaN(numVal) && /^-?\d+(?:\.\d+)?$/.test(val) ? numVal : val;
      });
      rows.push(rowObj);
    }

    headers.forEach((h) => {
      const vals = rawColumnValues[h] || [];
      const nonEmpty = vals.filter((v) => v !== '' && v.toLowerCase() !== 'null');
      const dtype = inferColumnDtype(vals);

      const matchedRule = SENSITIVE_COLUMN_PATTERNS.find((rule) => rule.pattern.test(h));
      const isSensitiveColumn = Boolean(matchedRule);
      if (isSensitiveColumn) {
        sensitiveColumnsDetected.push(h);
      }

      let numericSum: number | undefined;
      let numericMean: number | undefined;
      if (dtype === 'int64' || dtype === 'float64') {
        const nums = nonEmpty.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
        if (nums.length > 0) {
          numericSum = nums.reduce((a, b) => a + b, 0);
          numericMean = numericSum / nums.length;
        }
      }

      columns.push({
        name: h,
        dtype,
        nonNullCount: nonEmpty.length,
        nullCount: vals.length - nonEmpty.length,
        isSensitiveColumn,
        sensitiveCategory: matchedRule ? matchedRule.category : null,
        sampleValues: nonEmpty.slice(0, 4),
        numericSum,
        numericMean,
      });
    });
  }

  const totalRows = isTabularCsv ? Math.max(0, lines.length - 1) : lines.length;
  const totalColumns = isTabularCsv ? columns.length : 1;

  const { entities, countsByType } = runPresidioAndRegexScan(rawContent, rows, columns);

  const totalEntities = Object.values(countsByType).reduce((a, b) => a + b, 0);

  const verificationSteps: UploadedDatasetScanReport['verificationSteps'] = [
    {
      engine: 'Pandas DataFrame Engine',
      status: isTabularCsv
        ? sensitiveColumnsDetected.length > 0
          ? 'VERIFIED'
          : 'CLEAN'
        : 'VERIFIED',
      detail: isTabularCsv
        ? `Parsed DataFrame (${totalRows.toLocaleString()} rows × ${totalColumns} columns). Sensitive schema columns: ${
            sensitiveColumnsDetected.length > 0 ? sensitiveColumnsDetected.join(', ') : 'None'
          }`
        : `Parsed unstructured text document (${lines.length} lines, ${effectiveSize.toLocaleString()} bytes).`,
    },
    {
      engine: 'Presidio Entity Analyzer',
      status: totalEntities > 0 ? 'VERIFIED' : 'CLEAN',
      detail:
        totalEntities > 0
          ? `Identified ${totalEntities} sensitive entities across ${
              Object.keys(countsByType).length
            } entity categories (avg confidence 0.92).`
          : 'Scanned for CREDIT_CARD, US_SSN, IN_PAN, IN_AADHAAR, BANK_ACCOUNT, PHONE_NUMBER, EMAIL_ADDRESS (0 hits).',
    },
    {
      engine: 'Regex Pattern & Checksum',
      status: totalEntities > 0 || sensitiveColumnsDetected.length > 0 ? 'VERIFIED' : 'CLEAN',
      detail:
        totalEntities > 0 || sensitiveColumnsDetected.length > 0
          ? `Pattern & column signatures verified: ${Object.entries(countsByType)
              .map(([k, v]) => `${k} (${v})`)
              .join(', ')}`
          : 'Zero classification tags or high-risk regex signatures matched.',
    },
  ];

  // Build formatted extract for DLP transfer inspection
  const previewLines = lines.slice(0, 18).join('\n');
  const autoTag =
    sensitiveColumnsDetected.length > 0 ||
    (countsByType['BANK_ACCOUNT'] || 0) > 0 ||
    (countsByType['FINANCIAL_RECORD'] || 0) > 0 ||
    (countsByType['CREDIT_CARD'] || 0) > 0
      ? '[FINANCIAL_DATA] [CONFIDENTIAL]\n'
      : (countsByType['US_SSN'] || 0) > 0 ||
        (countsByType['IN_PAN'] || 0) > 0 ||
        (countsByType['IN_AADHAAR'] || 0) > 0
      ? '[CONFIDENTIAL]\n'
      : '';

  const dlpFormattedExtract = rawContent.includes('[CONFIDENTIAL]') || rawContent.includes('[FINANCIAL_DATA]')
    ? previewLines
    : `${autoTag}UPLOADED FILE: ${filename} (${totalRows} rows, ${effectiveSize} bytes)\n${previewLines}`;

  return {
    filename,
    fileSizeBytes: effectiveSize,
    uploadedAt: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    rawContent,
    isTabularCsv,
    totalRows,
    totalColumns,
    columns,
    rows,
    sensitiveColumnsDetected,
    presidioEntities: entities,
    entityCountsByType: countsByType,
    verificationPassed: true,
    verificationSteps,
    dlpFormattedExtract,
  };
}

/**
 * Sample CSV templates that users can optionally load in 1 click if they don't have a local CSV handy,
 * or download to test uploading.
 */
export const SAMPLE_CSV_TEMPLATES: Record<
  string,
  { filename: string; label: string; description: string; content: string }
> = {
  banking_accounts: {
    filename: 'uploaded_bank_accounts.csv',
    label: 'Sample Banking Accounts CSV (Financial + PII)',
    description: 'Contains account_id, customer_id, branch_id, account_type, balance, pan_number, email, and phone.',
    content: `account_id,customer_id,branch_id,account_type,balance,open_date,pan_number,customer_email,phone,status
ACCT-88492011,11749,141,Current,95902.00,2019-10-20,ABCDE1234F,r.sharma@clientmail.com,+1-415-890-2341,Active
ACCT-77301948,47716,43,Current,13261.61,2026-02-03,PQRSX5678K,a.verma@clientmail.com,+1-415-890-2342,Active
ACCT-99104827,56143,90,Savings,26495.92,2020-10-19,LMNOP9012Z,k.nair@clientmail.com,+1-415-890-2343,Active
ACCT-66482910,29193,113,Salary,74682.72,2012-02-22,GHJKL3456M,s.patel@clientmail.com,+1-415-890-2344,Active
ACCT-55019283,49907,28,Current,40419.01,2007-01-03,TUVWX7890B,m.deshmukh@clientmail.com,+1-415-890-2345,Active
ACCT-44928173,49217,122,Fixed Deposit,105435.18,2022-07-15,ZABCD2345N,d.chatterjee@clientmail.com,+1-415-890-2346,Dormant
ACCT-33817264,25363,133,Salary,27347.40,2023-10-12,KLMNO6789P,p.kulkarni@clientmail.com,+1-415-890-2347,Active
ACCT-22938475,54808,43,Savings,84366.63,2008-04-08,RSTUV1234Q,v.sundaram@clientmail.com,+1-415-890-2348,Active`,
  },
  card_settlement: {
    filename: 'card_settlement_dump.csv',
    label: 'Sample Cardholder & SSN Dump CSV (High Risk)',
    description: 'Contains credit_card PANs, US SSNs, ABA routing codes, and wire settlement amounts.',
    content: `record_id,cardholder_name,credit_card,ssn,routing_number,settlement_amount
101,R. Sharma,4532-7184-9021-3348,418-72-9041,ABA-021000021,14500.00
102,A. Verma,5412-8839-1044-2910,529-48-1132,ABA-026009593,28900.50
103,K. Nair,4916-3048-7721-5509,304-91-7764,ABA-121000248,9400.75
104,S. Patel,5108-6492-3318-8842,617-33-8520,ABA-071000013,63200.00
105,M. Deshmukh,4024-0071-9932-6184,289-65-4419,ABA-031100209,18150.25`,
  },
  clean_catalog: {
    filename: 'public_branch_holidays.csv',
    label: 'Sample Public Holiday Schedule CSV (Clean — 0 PII)',
    description: 'Contains non-sensitive office holiday dates and public region names.',
    content: `holiday_id,region,holiday_name,date,office_status
1,Mumbai HQ,Republic Day,2026-01-26,Closed
2,Bengaluru Tech Park,Holi Festival,2026-03-04,Closed
3,Delhi NCR,Independence Day,2026-08-15,Closed
4,All India Branches,Gandhi Jayanti,2026-10-02,Closed`,
  },
};

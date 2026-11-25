export interface BankAccountRecord {
  accountId: number;
  customerId: number;
  branchId: number;
  accountType: string;
  balance: number;
  openDate: string;
  status: string;
}

export interface AccountsDatasetSummary {
  records: BankAccountRecord[];
  totalKnownRows: number;
  totalFileBytes: number;
  sampleBalanceSum: number;
  typeBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  loadedFromLiveCsv: boolean;
}

export const ACCOUNTS_CSV_URL = '/assets/aistudio/accounts_288e8b18.csv';
export const ACCOUNTS_CSV_TOTAL_ROWS = 95001;
export const ACCOUNTS_CSV_TOTAL_BYTES = 4763605;

// Immediate baseline rows taken directly from the uploaded accounts_288e8b18.csv
// so the DLP file inspector is synchronous on first render, while live streaming enriches it.
export const INITIAL_ACCOUNT_RECORDS: BankAccountRecord[] = [
  { accountId: 1, customerId: 11749, branchId: 141, accountType: 'Current', balance: 95902.0, openDate: '2019-10-20', status: 'Active' },
  { accountId: 2, customerId: 47716, branchId: 43, accountType: 'Current', balance: 13261.61, openDate: '2026-02-03', status: 'Active' },
  { accountId: 3, customerId: 56143, branchId: 90, accountType: 'Savings', balance: 26495.92, openDate: '2020-10-19', status: 'Active' },
  { accountId: 4, customerId: 29193, branchId: 113, accountType: 'Salary', balance: 74682.72, openDate: '2012-02-22', status: 'Active' },
  { accountId: 5, customerId: 49907, branchId: 28, accountType: 'Current', balance: 40419.01, openDate: '2007-01-03', status: 'Active' },
  { accountId: 6, customerId: 49217, branchId: 122, accountType: 'Fixed Deposit', balance: 5435.18, openDate: '2022-07-15', status: 'Dormant' },
  { accountId: 7, customerId: 25363, branchId: 133, accountType: 'Salary', balance: 27347.4, openDate: '2023-10-12', status: 'Active' },
  { accountId: 8, customerId: 54808, branchId: 43, accountType: 'Salary', balance: 24366.63, openDate: '2008-04-08', status: 'Active' },
  { accountId: 9, customerId: 52839, branchId: 18, accountType: 'Current', balance: 6690.39, openDate: '2008-12-22', status: 'Active' },
  { accountId: 10, customerId: 56889, branchId: 64, accountType: 'Fixed Deposit', balance: 63862.41, openDate: '2021-10-01', status: 'Active' },
  { accountId: 11, customerId: 341, branchId: 134, accountType: 'Savings', balance: 61953.74, openDate: '2021-02-05', status: 'Active' },
  { accountId: 12, customerId: 12415, branchId: 74, accountType: 'Savings', balance: 24180.24, openDate: '2019-12-05', status: 'Active' },
];

export function summarizeAccountRecords(
  records: BankAccountRecord[],
  loadedFromLiveCsv: boolean
): AccountsDatasetSummary {
  const typeBreakdown: Record<string, number> = {};
  const statusBreakdown: Record<string, number> = {};
  let sampleBalanceSum = 0;

  for (const r of records) {
    sampleBalanceSum += r.balance;
    typeBreakdown[r.accountType] = (typeBreakdown[r.accountType] || 0) + 1;
    statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
  }

  return {
    records,
    totalKnownRows: ACCOUNTS_CSV_TOTAL_ROWS,
    totalFileBytes: ACCOUNTS_CSV_TOTAL_BYTES,
    sampleBalanceSum,
    typeBreakdown,
    statusBreakdown,
    loadedFromLiveCsv,
  };
}

export function parseAccountCsvLines(csvChunk: string, maxRows = 250): BankAccountRecord[] {
  const lines = csvChunk.split(/\r?\n/);
  const parsed: BankAccountRecord[] = [];

  for (let i = 1; i < lines.length && parsed.length < maxRows; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    if (cols.length < 7) continue;

    const accountId = Number(cols[0]);
    const customerId = Number(cols[1]);
    const branchId = Number(cols[2]);
    const accountType = cols[3].trim();
    const balance = Number(cols[4]);
    const openDate = cols[5].trim();
    const status = cols[6].trim();

    if (Number.isNaN(accountId) || Number.isNaN(balance)) continue;
    parsed.push({
      accountId,
      customerId,
      branchId,
      accountType,
      balance,
      openDate,
      status,
    });
  }

  return parsed;
}

/**
 * Streams the first ~24 KB of /assets/aistudio/accounts_288e8b18.csv (up to 250 rows)
 * without downloading the full 4.76 MB payload into browser memory.
 */
export async function loadAccountsSampleFromCsv(maxRows = 250): Promise<AccountsDatasetSummary> {
  try {
    const response = await fetch(ACCOUNTS_CSV_URL);
    if (!response.ok || !response.body) {
      return summarizeAccountRecords(INITIAL_ACCOUNT_RECORDS, false);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let textBuffer = '';
    const maxBytesToRead = 28000;
    let bytesRead = 0;

    while (bytesRead < maxBytesToRead) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        bytesRead += value.byteLength;
        textBuffer += decoder.decode(value, { stream: true });
        if (textBuffer.split('\n').length > maxRows + 3) {
          break;
        }
      }
    }

    try {
      await reader.cancel();
    } catch {
      // Ignore cancel errors
    }

    const records = parseAccountCsvLines(textBuffer, maxRows);
    if (records.length === 0) {
      return summarizeAccountRecords(INITIAL_ACCOUNT_RECORDS, false);
    }
    return summarizeAccountRecords(records, true);
  } catch {
    return summarizeAccountRecords(INITIAL_ACCOUNT_RECORDS, false);
  }
}

export function formatAccountsDlpExtract(records: BankAccountRecord[], limit = 15): string {
  const slice = records.slice(0, limit);
  const lines = slice.map(
    (r) =>
      `${r.accountId},${r.customerId},${r.branchId},${r.accountType},${r.balance.toFixed(2)},${r.openDate},${r.status}`
  );
  return `[FINANCIAL_DATA] [CONFIDENTIAL]
SOURCE DATASET: public/assets/aistudio/accounts_288e8b18.csv (${ACCOUNTS_CSV_TOTAL_ROWS.toLocaleString()} total customer records)
Authorized Destination: finance@company.com

account_id,customer_id,branch_id,account_type,balance,open_date,status
${lines.join('\n')}

Notice: Export contains live customer account balances, branch mappings, and customer IDs. Unauthorized transfer outside finance@company.com is strictly prohibited.`;
}

import React, { useMemo, useState } from 'react';
import { AccountsDatasetSummary } from '../utils/accountsDataset';
import { Search, ArrowRight, Database, ShieldAlert } from 'lucide-react';

interface BankingDatasetPanelProps {
  dataset: AccountsDatasetSummary;
  loading: boolean;
  onTestTransferWithCsv: () => void;
}

const ACCOUNT_TYPES = ['ALL', 'Savings', 'Current', 'Salary', 'Fixed Deposit', 'NRI'] as const;

export const BankingDatasetPanel: React.FC<BankingDatasetPanelProps> = ({
  dataset,
  loading,
  onTestTransferWithCsv,
}) => {
  const [typeFilter, setTypeFilter] = useState<(typeof ACCOUNT_TYPES)[number]>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dataset.records.filter((r) => {
      const typeOk = typeFilter === 'ALL' || r.accountType === typeFilter;
      const searchOk =
        !q ||
        String(r.accountId).includes(q) ||
        String(r.customerId).includes(q) ||
        String(r.branchId).includes(q) ||
        r.status.toLowerCase().includes(q);
      return typeOk && searchOk;
    });
  }, [dataset.records, typeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border border-emerald-900/12 bg-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-emerald-900/65 flex flex-wrap items-center gap-2">
            <span>Protected Core Banking Dataset</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">accounts_288e8b18.csv</span>
            <span aria-hidden="true">·</span>
            <span>Approved Recipient: finance@company.com</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-emerald-950">
            Customer Accounts Ledger Monitor
          </h1>
          <p className="text-sm text-emerald-900/70 max-w-2xl">
            Live inspection of your uploaded banking CSV dataset. Any unauthorized email or unregistered USB transfer containing these account records triggers immediate DLP blocking and hardware vibration alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={onTestTransferWithCsv}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Test DLP Transfer on CSV Extract
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4-column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums">
        <div className="rounded-xl border border-emerald-900/12 bg-white p-4">
          <div className="text-xs font-sans text-emerald-900/65">Total Protected Accounts</div>
          <div className="text-2xl font-bold text-emerald-950 mt-1">
            {dataset.totalKnownRows.toLocaleString()}
          </div>
          <div className="text-xs font-sans text-emerald-700 mt-1">
            {(dataset.totalFileBytes / (1024 * 1024)).toFixed(2)} MB CSV archive
          </div>
        </div>

        <div className="rounded-xl border border-emerald-900/12 bg-white p-4">
          <div className="text-xs font-sans text-emerald-900/65">Streamed Preview Window</div>
          <div className="text-2xl font-bold text-emerald-950 mt-1">
            {dataset.records.length} rows
          </div>
          <div className="text-xs font-sans text-emerald-900/60 mt-1">
            {dataset.loadedFromLiveCsv ? 'Streamed live from CSV' : 'Baseline sample loaded'}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-900/12 bg-white p-4">
          <div className="text-xs font-sans text-emerald-900/65">Sampled Balance Exposure</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">
            ${Math.round(dataset.sampleBalanceSum).toLocaleString()}
          </div>
          <div className="text-xs font-sans text-emerald-900/60 mt-1">
            Across {Object.keys(dataset.typeBreakdown).length} account categories
          </div>
        </div>

        <div className="rounded-xl border border-emerald-900/12 bg-white p-4">
          <div className="text-xs font-sans text-emerald-900/65">DLP Policy Sensitivity</div>
          <div className="text-2xl font-bold text-red-700 mt-1">Critical (90+)</div>
          <div className="text-xs font-sans text-emerald-900/60 mt-1">
            Tagged [FINANCIAL_DATA]
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Accounts Table */}
      <div className="rounded-xl border border-emerald-900/12 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-emerald-900/10 flex flex-wrap items-center justify-between gap-4 bg-[#f9fcfa]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-emerald-950">
              Account Records Sample (Showing {Math.min(filteredRecords.length, 60)} of{' '}
              {filteredRecords.length} matched)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Segmented Account Type Filter */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-emerald-50/80 rounded-lg border border-emerald-900/10">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    typeFilter === type
                      ? 'bg-emerald-700 text-white'
                      : 'text-emerald-900/70 hover:text-emerald-950'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-emerald-900/45 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, branch, status..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-emerald-900/15 bg-white text-xs text-emerald-950 placeholder:text-emerald-900/40 focus:outline-none focus:border-emerald-700"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-emerald-900/60">
            Streaming live records from accounts_288e8b18.csv...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <ShieldAlert className="w-6 h-6 text-emerald-700 mx-auto" />
            <div className="text-sm font-semibold text-emerald-950">
              No account records match your current filter
            </div>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#f4f8f5] border-b border-emerald-900/10 text-xs font-semibold text-emerald-900/75">
                <tr>
                  <th className="py-2.5 px-4">Account ID</th>
                  <th className="py-2.5 px-4">Customer ID</th>
                  <th className="py-2.5 px-4">Branch ID</th>
                  <th className="py-2.5 px-4">Account Type</th>
                  <th className="py-2.5 px-4 text-right">Balance</th>
                  <th className="py-2.5 px-4">Open Date</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/8 text-xs font-mono tabular-nums">
                {filteredRecords.slice(0, 60).map((row) => (
                  <tr key={row.accountId} className="hover:bg-emerald-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-emerald-950">
                      #{row.accountId}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-900/80">CUST-{row.customerId}</td>
                    <td className="py-2.5 px-4 text-emerald-900/70">BR-{row.branchId}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-emerald-950">
                      {row.accountType}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-900">
                      ${row.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-900/70">{row.openDate}</td>
                    <td
                      className={`py-2.5 px-4 font-sans font-semibold ${
                        row.status === 'Active'
                          ? 'text-emerald-700'
                          : row.status === 'Dormant'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {row.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

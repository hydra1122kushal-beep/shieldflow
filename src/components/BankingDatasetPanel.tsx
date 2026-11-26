import React, { useMemo, useRef, useState } from 'react';
import {
  SAMPLE_CSV_TEMPLATES,
  UploadedDatasetScanReport,
} from '../utils/accountsDataset';
import { analyzeFileContent } from '../utils/dlpEngine';
import { HighlightedFilePreview } from './HighlightedFilePreview';
import {
  Upload,
  Search,
  ArrowRight,
  Database,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  Sparkles,
  Download,
} from 'lucide-react';

interface BankingDatasetPanelProps {
  uploadedDataset: UploadedDatasetScanReport | null;
  onUploadFileContent: (filename: string, content: string, sizeBytes?: number) => void;
  onClearUploadedDataset: () => void;
  onTestTransferWithUploaded: () => void;
}

export const BankingDatasetPanel: React.FC<BankingDatasetPanelProps> = ({
  uploadedDataset,
  onUploadFileContent,
  onClearUploadedDataset,
  onTestTransferWithUploaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileProcess = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = typeof e.target?.result === 'string' ? e.target.result : '';
      if (!text.trim()) {
        setUploadError('The uploaded file is empty. Please upload a valid CSV or text file.');
        return;
      }
      onUploadFileContent(file.name, text, file.size);
    };
    reader.onerror = () => {
      setUploadError('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDownloadSampleCsv = (key: string) => {
    const tpl = SAMPLE_CSV_TEMPLATES[key];
    if (!tpl) return;
    const blob = new Blob([tpl.content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = tpl.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const contentDetection = useMemo(() => {
    if (!uploadedDataset) return null;
    return analyzeFileContent(uploadedDataset.filename, uploadedDataset.rawContent);
  }, [uploadedDataset]);

  const filteredRows = useMemo(() => {
    if (!uploadedDataset || !uploadedDataset.isTabularCsv) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return uploadedDataset.rows;
    return uploadedDataset.rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [uploadedDataset, searchQuery]);

  const totalEntityHits = useMemo(() => {
    if (!uploadedDataset) return 0;
    return Object.values(uploadedDataset.entityCountsByType).reduce((a, b) => a + b, 0);
  }, [uploadedDataset]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border border-emerald-900/12 bg-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-emerald-900/65 flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold text-emerald-700">
              PRESIDIO + REGEX + PANDAS DATAFRAME ENGINE
            </span>
            <span aria-hidden="true">·</span>
            <span>No Pre-Inserted CSV</span>
            <span aria-hidden="true">·</span>
            <span>Live Upload &amp; Scan Verification</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-emerald-950">
            CSV &amp; Document Upload DLP Scanner
          </h1>
          <p className="text-sm text-emerald-900/70 max-w-2xl">
            Upload any <code className="font-mono text-emerald-800">.csv</code>,{' '}
            <code className="font-mono text-emerald-800">.tsv</code>, or{' '}
            <code className="font-mono text-emerald-800">.txt</code> file from your computer. The scanner automatically parses tabular columns with a Pandas-style DataFrame inspector and extracts PII &amp; financial entities using Microsoft Presidio recognizer patterns and regex rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,.json,.log"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            {uploadedDataset ? 'Upload Another CSV / File' : 'Upload CSV / Text File'}
          </button>

          {uploadedDataset && (
            <>
              <button
                type="button"
                onClick={onTestTransferWithUploaded}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Test Egress Transfer in Employee Console
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClearUploadedDataset}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove File
              </button>
            </>
          )}
        </div>
      </div>

      {/* Upload Dropzone & 1-Click Test CSV Generators */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-6 transition-colors ${
          isDragging
            ? 'border-emerald-600 bg-emerald-50/70'
            : 'border-emerald-900/20 bg-white'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-emerald-950">
                {uploadedDataset
                  ? `Active Uploaded File: ${uploadedDataset.filename} (${uploadedDataset.fileSizeBytes.toLocaleString()} B)`
                  : 'Drop a CSV or Text File Here to Scan & Verify'}
              </h2>
              <p className="text-xs text-emerald-900/70 leading-relaxed">
                Supports banking ledgers, customer card dumps, HR payroll CSVs, or unstructured text documents. Parses up to 500 DataFrame rows in-browser with zero external upload latency.
              </p>
              {uploadError && (
                <p className="text-xs font-semibold text-red-700 pt-1">{uploadError}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Browse Local File...
            </button>
          </div>
        </div>

        {/* Quick Verification CSV Templates */}
        <div className="mt-5 pt-4 border-t border-emerald-900/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              Verify Scanner with Test CSVs:
            </span>
            {Object.entries(SAMPLE_CSV_TEMPLATES).map(([key, tpl]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  onUploadFileContent(
                    tpl.filename,
                    tpl.content,
                    new Blob([tpl.content]).size
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#f6faf7] hover:bg-emerald-50 text-emerald-900 border border-emerald-900/15 transition-colors cursor-pointer"
              >
                Scan {tpl.filename}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleDownloadSampleCsv('banking_accounts')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample CSV to Disk
          </button>
        </div>
      </div>

      {/* When a file is uploaded, display full Presidio + Regex + Pandas Verification Report */}
      {uploadedDataset && contentDetection && (
        <>
          {/* 4-column Verification KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums">
            <div className="rounded-xl border border-emerald-900/12 bg-white p-4">
              <div className="text-xs font-sans text-emerald-900/65">Pandas DataFrame Shape</div>
              <div className="text-2xl font-bold text-emerald-950 mt-1">
                {uploadedDataset.totalRows.toLocaleString()} × {uploadedDataset.totalColumns}
              </div>
              <div className="text-xs font-sans text-emerald-700 mt-1">
                {uploadedDataset.isTabularCsv ? 'Tabular CSV parsed' : 'Unstructured text lines'}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-900/12 bg-white p-4">
              <div className="text-xs font-sans text-emerald-900/65">Sensitive Schema Columns</div>
              <div className="text-2xl font-bold text-emerald-950 mt-1">
                {uploadedDataset.sensitiveColumnsDetected.length}
              </div>
              <div className="text-xs font-sans text-emerald-900/60 mt-1 truncate">
                {uploadedDataset.sensitiveColumnsDetected.length > 0
                  ? uploadedDataset.sensitiveColumnsDetected.join(', ')
                  : 'No sensitive column headers'}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-900/12 bg-white p-4">
              <div className="text-xs font-sans text-emerald-900/65">Presidio &amp; Regex Entities</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {totalEntityHits.toLocaleString()} hits
              </div>
              <div className="text-xs font-sans text-emerald-900/60 mt-1">
                Across {Object.keys(uploadedDataset.entityCountsByType).length} entity types
              </div>
            </div>

            <div className="rounded-xl border border-emerald-900/12 bg-white p-4">
              <div className="text-xs font-sans text-emerald-900/65">Verified Content Risk Score</div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  contentDetection.contentScore >= 70
                    ? 'text-red-700'
                    : contentDetection.contentScore >= 30
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {contentDetection.contentScore}/100
              </div>
              <div className="text-xs font-sans text-emerald-900/60 mt-1">
                {contentDetection.contentScore >= 70
                  ? 'Critical Financial / PII Data'
                  : contentDetection.contentScore >= 30
                  ? 'Restricted Internal Data'
                  : 'Clean / Public Content'}
              </div>
            </div>
          </div>

          {/* 3-Stage Engine Verification Checklist */}
          <div className="rounded-xl border border-emerald-900/12 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/10 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-emerald-950">
                  Multi-Engine Scan Verification Report ({uploadedDataset.filename})
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-700 font-semibold">
                VERIFIED AT {uploadedDataset.uploadedAt}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {uploadedDataset.verificationSteps.map((step) => (
                <div
                  key={step.engine}
                  className="rounded-lg border border-emerald-900/10 bg-[#f9fcfa] p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-950">{step.engine}</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {step.status}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900/75 leading-relaxed font-mono">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>

            {/* Presidio Entity Breakdown Table */}
            {Object.keys(uploadedDataset.entityCountsByType).length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-emerald-950">
                  Presidio Entity Recognizer Breakdown
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(uploadedDataset.entityCountsByType).map(([etype, count]) => (
                    <div
                      key={etype}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-mono text-amber-950 flex items-center gap-2"
                    >
                      <span className="font-bold">{etype}</span>
                      <span className="text-amber-800">{count} matches</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pandas Column Schema Profiling */}
            {uploadedDataset.isTabularCsv && uploadedDataset.columns.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-xs font-semibold text-emerald-950">
                  Pandas DataFrame Column Schema &amp; Sensitivity Profile (<code className="font-mono">df.dtypes</code>)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-emerald-900/10 bg-[#f4f8f5] text-emerald-900/70">
                        <th className="py-2 px-3">Column Name</th>
                        <th className="py-2 px-3">Pandas Dtype</th>
                        <th className="py-2 px-3">Non-Null</th>
                        <th className="py-2 px-3">Sensitivity Classification</th>
                        <th className="py-2 px-3">Sample / Numeric Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/8 font-mono">
                      {uploadedDataset.columns.map((col) => (
                        <tr
                          key={col.name}
                          className={col.isSensitiveColumn ? 'bg-red-50/40' : ''}
                        >
                          <td className="py-2 px-3 font-semibold text-emerald-950">
                            {col.name}
                          </td>
                          <td className="py-2 px-3 text-emerald-800">{col.dtype}</td>
                          <td className="py-2 px-3 tabular-nums">{col.nonNullCount}</td>
                          <td className="py-2 px-3">
                            {col.isSensitiveColumn ? (
                              <span className="text-red-700 font-bold">
                                SENSITIVE ({col.sensitiveCategory})
                              </span>
                            ) : (
                              <span className="text-emerald-700">Standard Attribute</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-emerald-900/75 truncate max-w-xs">
                            {col.numericSum !== undefined
                              ? `Sum: ${col.numericSum.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })} | Mean: ${(col.numericMean || 0).toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}`
                              : col.sampleValues.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Interactive DataFrame Row Inspector (if tabular CSV) */}
          {uploadedDataset.isTabularCsv && uploadedDataset.rows.length > 0 && (
            <div className="rounded-xl border border-emerald-900/12 bg-white overflow-hidden">
              <div className="px-5 py-4 border-b border-emerald-900/10 flex flex-wrap items-center justify-between gap-4 bg-[#f9fcfa]">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-700" />
                  <h2 className="text-sm font-bold text-emerald-950">
                    Parsed DataFrame Rows (Showing {Math.min(filteredRows.length, 60)} of{' '}
                    {filteredRows.length} matched)
                  </h2>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-emerald-900/45 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter rows by value..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-emerald-900/15 bg-white text-xs text-emerald-950 placeholder:text-emerald-900/40 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {filteredRows.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <ShieldAlert className="w-6 h-6 text-emerald-700 mx-auto" />
                  <div className="text-sm font-semibold text-emerald-950">
                    No DataFrame rows match your filter
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#f4f8f5] border-b border-emerald-900/10 text-xs font-semibold text-emerald-900/75">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        {uploadedDataset.columns.map((col) => (
                          <th
                            key={col.name}
                            className={`py-2.5 px-3 ${
                              col.isSensitiveColumn ? 'text-red-800 bg-red-50/60' : ''
                            }`}
                          >
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/8 text-xs font-mono tabular-nums">
                      {filteredRows.slice(0, 60).map((row, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                          <td className="py-2 px-3 text-emerald-900/50">{idx + 1}</td>
                          {uploadedDataset.columns.map((col) => (
                            <td
                              key={col.name}
                              className={`py-2 px-3 ${
                                col.isSensitiveColumn
                                  ? 'font-semibold text-red-950 bg-red-50/20'
                                  : 'text-emerald-950'
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

          {/* Highlighted Raw Content Preview */}
          <HighlightedFilePreview
            filename={uploadedDataset.filename}
            overrideContent={uploadedDataset.rawContent}
            overrideSizeBytes={uploadedDataset.fileSizeBytes}
            isUploadedFile={true}
          />
        </>
      )}
    </div>
  );
};

import React from 'react';
import { BuiltInMockFileName, MOCK_FILES, MockFileName, getApprovedDestination } from '../data/mockFiles';
import { analyzeFileContent } from '../utils/dlpEngine';
import { FileText, ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface HighlightedFilePreviewProps {
  filename: MockFileName;
  overrideContent?: string;
  overrideSizeBytes?: number;
  isUploadedFile?: boolean;
}

const COMBINED_HIGHLIGHT_REGEX =
  /(\[CONFIDENTIAL\]|\[FINANCIAL_DATA\]|\[INTERNAL ONLY\]|\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{3}-\d{2}-\d{4}\b|\b[A-Z]{5}\d{4}[A-Z]\b|\b[2-9]\d{3}[\s-]\d{4}[\s-]\d{4}\b|\bACCT-\d{6,14}\b|\bABA-\d{9}\b|\b[A-Z]{4}0[A-Z0-9]{6}\b|\b\d+,\d+,\d+,(?:Current|Savings|Salary|Fixed Deposit|NRI),\d+(?:\.\d+)?|(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]\d{3}[-\s]\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)/g;

export const HighlightedFilePreview: React.FC<HighlightedFilePreviewProps> = ({
  filename,
  overrideContent,
  overrideSizeBytes,
  isUploadedFile,
}) => {
  const builtInFile = MOCK_FILES[filename as BuiltInMockFileName];
  const contentToInspect = overrideContent ?? (builtInFile ? builtInFile.content : '');
  const sizeBytes =
    overrideSizeBytes ??
    (overrideContent ? new Blob([overrideContent]).size : builtInFile ? builtInFile.sizeBytes : 0);
  const approvedDest = getApprovedDestination(filename);
  const detection = analyzeFileContent(filename, contentToInspect);
  const parts = contentToInspect.split(COMBINED_HIGHLIGHT_REGEX);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden card-3d-subtle">
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-mono font-semibold text-slate-950">
            {isUploadedFile ? `uploaded/${filename}` : `mock_files/${filename}`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{sizeBytes.toLocaleString()} Bytes</span>
          <span aria-hidden="true">·</span>
          <span>
            Approved:{' '}
            <strong className="font-mono text-teal-700">{approvedDest}</strong>
          </span>
        </div>

        <div className="text-xs font-mono tabular-nums flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Scan Verified
          </span>
          {detection.contentScore === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Content Score: 0/100 (Public)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              Content Score: {detection.contentScore}/100
            </span>
          )}
        </div>
      </div>

      {/* Findings strip without the removed "Presidio + Regex + Pandas Scanner:" prefix */}
      <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
        {detection.tagsDetected.length > 0 && (
          <span className="text-rose-700 font-mono font-medium">
            Tags: {detection.tagsDetected.join(', ')}
          </span>
        )}
        {detection.sensitiveCsvColumns.length > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-rose-700 font-mono font-medium">
              Columns: [{detection.sensitiveCsvColumns.join(', ')}] ({detection.csvRowCount} rows)
            </span>
          </>
        )}
        {detection.creditCardsCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-800 font-mono tabular-nums">
              Credit Cards: {detection.creditCardsCount}
            </span>
          </>
        )}
        {detection.ssnCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-800 font-mono tabular-nums">
              SSNs: {detection.ssnCount}
            </span>
          </>
        )}
        {detection.panCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-800 font-mono tabular-nums">
              PAN: {detection.panCount}
            </span>
          </>
        )}
        {detection.aadhaarCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-800 font-mono tabular-nums">
              Aadhaar: {detection.aadhaarCount}
            </span>
          </>
        )}
        {(detection.bankAccountCount > 0 || detection.routingNumberCount > 0) && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-800 font-mono tabular-nums">
              Bank Accounts: {detection.bankAccountCount}
              {detection.routingNumberCount > 0 ? ` / Routing: ${detection.routingNumberCount}` : ''}
            </span>
          </>
        )}
        {detection.phoneCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-teal-800 font-mono tabular-nums">
              Phones: {detection.phoneCount}
            </span>
          </>
        )}
        {detection.emailCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-teal-800 font-mono tabular-nums">
              Emails: {detection.emailCount}
            </span>
          </>
        )}
        {detection.contentReasons.length === 0 && (
          <span className="text-emerald-700">No sensitive tags, PII entities, or financial columns detected</span>
        )}
      </div>

      {/* Highlighted content */}
      <pre className="p-5 text-xs font-mono leading-relaxed text-slate-800 bg-slate-50/40 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (!part) return null;
          if (
            part === '[CONFIDENTIAL]' ||
            part === '[FINANCIAL_DATA]' ||
            part === '[INTERNAL ONLY]'
          ) {
            return (
              <mark
                key={index}
                className="bg-rose-100 text-rose-900 border border-rose-300 px-1 py-0.5 rounded font-bold"
              >
                {part}
              </mark>
            );
          }
          if (
            /^\b(?:\d{4}[-\s]?){3}\d{4}\b$/.test(part) ||
            /^\b\d{3}-\d{2}-\d{4}\b$/.test(part) ||
            /^\b[A-Z]{5}\d{4}[A-Z]\b$/.test(part) ||
            /^\b[2-9]\d{3}[\s-]\d{4}[\s-]\d{4}\b$/.test(part) ||
            /^\bACCT-\d{6,14}\b$/.test(part) ||
            /^\bABA-\d{9}\b$/.test(part) ||
            /^\b[A-Z]{4}0[A-Z0-9]{6}\b$/.test(part) ||
            /^\d+,\d+,\d+,(?:Current|Savings|Salary|Fixed Deposit|NRI),\d+(?:\.\d+)?$/.test(part)
          ) {
            return (
              <mark
                key={index}
                className="bg-amber-100 text-amber-950 border border-amber-300 px-1 rounded font-semibold"
              >
                {part}
              </mark>
            );
          }
          if (
            /^(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]\d{3}[-\s]\d{4}\b$/.test(part) ||
            /^\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b$/.test(part)
          ) {
            return (
              <mark
                key={index}
                className="bg-teal-100 text-teal-900 border border-teal-300 px-1 rounded"
              >
                {part}
              </mark>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </pre>
    </div>
  );
};

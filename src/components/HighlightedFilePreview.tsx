import React from 'react';
import { MOCK_FILES, MockFileName } from '../data/mockFiles';
import { analyzeFileContent } from '../utils/dlpEngine';
import { FileText, ShieldCheck, AlertOctagon } from 'lucide-react';

interface HighlightedFilePreviewProps {
  filename: MockFileName;
  overrideContent?: string;
  overrideSizeBytes?: number;
}

const COMBINED_HIGHLIGHT_REGEX =
  /(\[CONFIDENTIAL\]|\[FINANCIAL_DATA\]|\[INTERNAL ONLY\]|\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{3}-\d{2}-\d{4}\b|\bACCT-\d{8,12}\b|\bABA-\d{9}\b|\b\d+,\d+,\d+,(?:Current|Savings|Salary|Fixed Deposit|NRI),\d+(?:\.\d+)?|\+\d{1,2}-\d{3}-\d{3}-\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)/g;

export const HighlightedFilePreview: React.FC<HighlightedFilePreviewProps> = ({
  filename,
  overrideContent,
  overrideSizeBytes,
}) => {
  const file = MOCK_FILES[filename];
  const contentToInspect = overrideContent ?? file.content;
  const sizeBytes = overrideSizeBytes ?? file.sizeBytes;
  const detection = analyzeFileContent(filename, contentToInspect);
  const parts = contentToInspect.split(COMBINED_HIGHLIGHT_REGEX);

  return (
    <div className="rounded-xl border border-emerald-900/12 bg-white overflow-hidden">
      <div className="px-5 py-3.5 border-b border-emerald-900/10 flex flex-wrap items-center justify-between gap-3 bg-[#f9fcfa]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-950/70">
          <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-mono font-semibold text-emerald-950">
            {filename === 'accounts_288e8b18.csv'
              ? 'accounts_288e8b18.csv'
              : `mock_files/${file.filename}`}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{sizeBytes.toLocaleString()} Bytes</span>
          <span aria-hidden="true">·</span>
          <span>
            Approved:{' '}
            <strong className="font-mono text-emerald-800">{file.approvedDestination}</strong>
          </span>
        </div>

        <div className="text-xs font-mono tabular-nums">
          {detection.contentScore === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Content Score: 0/100 (Public)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              Content Score: {detection.contentScore}/100
            </span>
          )}
        </div>
      </div>

      {/* Findings strip — clean typographic separators */}
      <div className="px-5 py-2.5 bg-white border-b border-emerald-900/10 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-emerald-950/70">
        <span className="font-semibold text-emerald-950">Regex Scanner:</span>
        {detection.tagsDetected.length > 0 && (
          <span className="text-red-700 font-mono font-medium">
            Tags: {detection.tagsDetected.join(', ')}
          </span>
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
        {(detection.bankAccountCount > 0 || detection.routingNumberCount > 0) && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-800 font-mono tabular-nums">
              Bank Records: {detection.bankAccountCount}
              {detection.routingNumberCount > 0 ? ` / ABA: ${detection.routingNumberCount}` : ''}
            </span>
          </>
        )}
        {detection.phoneCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-800 font-mono tabular-nums">
              Phones: {detection.phoneCount}
            </span>
          </>
        )}
        {detection.emailCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-800 font-mono tabular-nums">
              Emails: {detection.emailCount}
            </span>
          </>
        )}
        {detection.contentReasons.length === 0 && (
          <span className="text-emerald-700">No sensitive tags or PII patterns detected</span>
        )}
      </div>

      {/* Highlighted content */}
      <pre className="p-5 text-xs font-mono leading-relaxed text-emerald-950/85 bg-[#fbfdfb] overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
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
                className="bg-red-100 text-red-900 border border-red-300 px-1 py-0.5 rounded font-bold"
              >
                {part}
              </mark>
            );
          }
          if (
            /^\b(?:\d{4}[-\s]?){3}\d{4}\b$/.test(part) ||
            /^\b\d{3}-\d{2}-\d{4}\b$/.test(part) ||
            /^\bACCT-\d{8,12}\b$/.test(part) ||
            /^\bABA-\d{9}\b$/.test(part) ||
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
            /^\+\d{1,2}-\d{3}-\d{3}-\d{4}\b$/.test(part) ||
            /^\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b$/.test(part)
          ) {
            return (
              <mark
                key={index}
                className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-1 rounded"
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

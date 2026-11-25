import React, { useEffect, useState } from 'react';
import { Smartphone, Volume2, XCircle, ShieldAlert } from 'lucide-react';
import { DLPEvaluationResult } from '../utils/dlpEngine';
import { triggerDLPAlertHardware } from '../utils/alertFeedback';

interface FlashingAlertBannerProps {
  alertEvent: DLPEvaluationResult;
  viewerContext: 'Employee' | 'Analyst';
  alertsArmed: boolean;
  onDismiss?: () => void;
}

export const FlashingAlertBanner: React.FC<FlashingAlertBannerProps> = ({
  alertEvent,
  viewerContext,
  alertsArmed,
  onDismiss,
}) => {
  const [vibrateStatus, setVibrateStatus] = useState<{
    vibrated: boolean;
    vibrateSupported: boolean;
  }>({
    vibrated: false,
    vibrateSupported: false,
  });

  useEffect(() => {
    const res = triggerDLPAlertHardware(true);
    setVibrateStatus(res);
  }, [alertEvent.id, alertEvent.timestampMs, viewerContext]);

  const handleManualReTrigger = () => {
    const res = triggerDLPAlertHardware(true);
    setVibrateStatus(res);
  };

  return (
    <div
      key={`${viewerContext}-${alertEvent.id}-${alertEvent.timestampMs}`}
      role="alert"
      aria-live="assertive"
      className="dlp-flashing-banner rounded-xl border-2 p-5 text-white transition-all"
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-lg bg-red-950/60 border border-white/25 shrink-0 mt-0.5">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-red-50">
              <span className="font-bold tracking-wide text-white">
                {alertEvent.tier === 'BLOCK'
                  ? 'BLOCKED · Exfiltration Prevented'
                  : 'HELD FOR REVIEW · Quarantined'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                Leak Score {alertEvent.finalLeakScore}/100 ({alertEvent.severity})
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{alertEvent.timestamp}</span>
            </div>

            <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
              {viewerContext === 'Employee'
                ? `Transfer ${alertEvent.tier === 'BLOCK' ? 'Blocked' : 'Quarantined'}: ${alertEvent.filename} via ${alertEvent.channel}`
                : `SOC Alert: ${alertEvent.employeeName} (${alertEvent.employeeRole}) triggered ${alertEvent.tier} on ${alertEvent.filename}`}
            </h2>

            {alertEvent.hardViolationTriggered && alertEvent.hardViolationSummary && (
              <p className="text-xs md:text-sm font-semibold text-white bg-black/25 px-3 py-2 rounded-lg border border-white/20">
                {alertEvent.hardViolationSummary}
              </p>
            )}

            <div className="bg-black/25 rounded-lg p-3.5 border border-white/20 font-mono text-xs text-red-50 space-y-1.5">
              <div className="font-semibold text-white">{alertEvent.formattedSummaryLine}</div>
              <ol className="list-decimal list-inside space-y-1 text-red-50/95">
                {alertEvent.rankedReasons.map((reason, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="font-semibold text-white">{reason.text}</span>{' '}
                    <span className="text-red-100/85">
                      ({reason.category}
                      {reason.points > 0 ? ` +${reason.points} pts` : ''})
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-red-50">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Smartphone className="w-3.5 h-3.5" />
                <code className="font-mono">navigator.vibrate([300, 100, 300, 100, 600])</code>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {vibrateStatus.vibrated
                  ? 'Hardware Vibration Fired'
                  : vibrateStatus.vibrateSupported
                  ? alertsArmed
                    ? 'Vibration Triggered'
                    : 'Tap "Enable alerts" to unlock browser gesture'
                  : 'Visual Banner + Audio Siren Active (Vibration on Android Chrome)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end lg:self-start">
          <button
            type="button"
            onClick={handleManualReTrigger}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-red-800 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Test Beep &amp; Vibrate
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-black/25 hover:bg-black/40 text-white border border-white/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <XCircle className="w-3.5 h-3.5" />
              Acknowledge
            </button>
          )}
        </div>
      </div>

      <div
        data-alert-trigger-key={`${viewerContext}-${alertEvent.id}-${alertEvent.timestampMs}`}
        className="sr-only"
      >
        {`navigator.vibrate([300, 100, 300, 100, 600]) triggered at ${alertEvent.timestampMs}`}
      </div>
    </div>
  );
};

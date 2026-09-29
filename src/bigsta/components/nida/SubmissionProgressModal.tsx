import React from 'react';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  X,
  FileCheck,
  Check,
} from 'lucide-react';
import { WorkflowStep, SubmissionStepId } from './submissionWorkflow';

interface SubmissionProgressModalProps {
  isOpen: boolean;
  steps: WorkflowStep[];
  currentStepId: SubmissionStepId | null;
  isCompleted: boolean;
  error: string | null;
  onRetry?: () => void;
  onClose?: () => void;
  title?: string;
}

export const SubmissionProgressModal: React.FC<SubmissionProgressModalProps> = ({
  isOpen,
  steps,
  currentStepId,
  isCompleted,
  error,
  onRetry,
  onClose,
  title = 'Form Submission Workflow',
}) => {
  if (!isOpen) return null;

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-progress-title"
        className="w-full max-w-lg bg-[#0F1115] border border-[#4C5055]/70 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] overscroll-contain animate-in zoom-in-95 duration-200"
      >
        {/* Header with high-tech authority badge */}
        <div className="px-4 sm:px-6 py-4 bg-[#14171C] border-b border-[#4C5055]/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#47A5FF]/20 to-[#47A5FF]/5 border border-[#47A5FF]/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(71,165,255,0.2)]">
              {error ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-[#47A5FF] animate-pulse" />
              )}
            </div>
            <div>
              <h2
                id="submission-progress-title"
                className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2"
              >
                <span>{title}</span>
              </h2>
            </div>
          </div>

          {error && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A0A4A8] hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-[#1A1E24] h-1.5 shrink-0 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              error
                ? 'bg-rose-500'
                : isCompleted
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-[#47A5FF] via-sky-400 to-[#2563eb]'
            }`}
            style={{ width: `${error ? 100 : progressPercent}%` }}
          />
        </div>

        {/* Scrollable Steps Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 sm:space-y-3 font-sans text-xs">
          {/* Status summary pill */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-[#4C5055]/40 mb-3">
            <span className="text-[11px] font-medium text-[#A0A4A8]">Workflow Stages</span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                error
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : isCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-[#47A5FF]/15 text-[#47A5FF] border border-[#47A5FF]/30'
              }`}
            >
              {error ? 'Action Needed' : isCompleted ? '9/9 Completed' : `${completedCount} of 9 Completed`}
            </span>
          </div>

          {/* 9 Process Steps */}
          <div className="space-y-2">
            {steps.map((step) => {
              const isCurrent = step.id === currentStepId;
              const isDone = step.status === 'completed';
              const isFailed = step.status === 'failed';

              return (
                <div
                  key={step.id}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                    isFailed
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                      : isDone
                      ? 'bg-[#121820]/90 border-emerald-500/30 text-slate-200'
                      : isCurrent
                      ? 'bg-[#47A5FF]/10 border-[#47A5FF]/50 text-white shadow-[0_0_15px_rgba(71,165,255,0.1)]'
                      : 'bg-[#14171C]/50 border-[#4C5055]/30 text-[#7D8287] opacity-70'
                  }`}
                >
                  {/* Step Status Icon / Number */}
                  <div className="shrink-0 mt-0.5">
                    {isDone ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : isFailed ? (
                      <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-[#47A5FF]/20 border border-[#47A5FF]/60 flex items-center justify-center text-[#47A5FF]">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[#1E2228] border border-[#4C5055]/40 flex items-center justify-center text-[10px] font-mono font-bold text-[#7D8287]">
                        {step.stepNumber}
                      </div>
                    )}
                  </div>

                  {/* Step Label & Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-semibold text-xs text-white truncate">
                        Step {step.stepNumber}: {step.label}
                      </div>
                      <span className="text-[10px] uppercase font-mono font-semibold shrink-0">
                        {isDone ? (
                          <span className="text-emerald-400">Verified</span>
                        ) : isFailed ? (
                          <span className="text-rose-400">Failed</span>
                        ) : isCurrent ? (
                          <span className="text-[#47A5FF] animate-pulse">Running</span>
                        ) : (
                          <span className="text-[#7D8287]">Pending</span>
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A0A4A8] mt-0.5 leading-tight truncate sm:whitespace-normal">
                      {step.description}
                    </p>
                    {isFailed && step.errorMessage && (
                      <div className="mt-1.5 p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-[11px] text-rose-200 leading-snug">
                        {step.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Friendly Error Banner if failed */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 mt-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-300 leading-relaxed">
                <span className="font-bold text-white">Validation Notice: </span>
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#14171C] border-t border-[#4C5055]/50 flex items-center justify-between gap-3 shrink-0">
          {error ? (
            <div className="w-full flex items-center gap-2.5">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1E2228] hover:bg-[#282C31] text-white border border-[#4C5055]/70 text-xs font-semibold transition-all cursor-pointer text-center"
                >
                  Edit Form Details
                </button>
              )}
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#47A5FF] to-[#2563eb] text-white text-xs font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Submission</span>
                </button>
              )}
            </div>
          ) : isCompleted ? (
            <div className="w-full flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Card successfully populated! Opening editor...</span>
              </div>
              <Loader2 className="w-4 h-4 animate-spin text-[#47A5FF]" />
            </div>
          ) : (
            <div className="w-full flex items-center justify-between text-xs text-[#A0A4A8]">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#47A5FF]" />
                <span className="text-white font-medium">Processing Step {currentStepId ? steps.find(s => s.id === currentStepId)?.stepNumber || 1 : 1} of 9...</span>
              </div>
              <span className="text-[11px] text-[#7D8287] font-mono">Please wait</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

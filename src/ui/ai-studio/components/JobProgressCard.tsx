/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Loader2, AlertCircle, CheckCircle2, XCircle, RotateCcw, X, Clock } from 'lucide-react';
import { AiJob } from '../../../domain/ai/studio/AiStudioProvider';

interface JobProgressCardProps {
  job: AiJob;
  elapsedSeconds?: number;
  onCancel?: (jobId: string) => void;
  onRetry?: (jobId: string) => void;
  onDismiss?: (jobId: string) => void;
}

export const JobProgressCard: React.FC<JobProgressCardProps> = ({
  job,
  elapsedSeconds = 0,
  onCancel,
  onRetry,
  onDismiss,
}) => {
  const isRunning = job.status === 'queued' || job.status === 'processing';
  const isDone = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isCancelled = job.status === 'cancelled';

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#141722] border border-zinc-800 rounded-xl p-3.5 space-y-2.5 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
          {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {isFailed && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {isCancelled && <XCircle className="w-4 h-4 text-zinc-500" />}

          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-200">
              {job.provider}
            </span>
            <span className="text-[10px] text-zinc-400 capitalize">
              Status: <span className={isRunning ? 'text-emerald-400' : isDone ? 'text-emerald-300' : isFailed ? 'text-rose-400' : 'text-zinc-400'}>{job.status}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-zinc-800">
              <Clock className="w-3 h-3 text-emerald-400" />
              {formatElapsed(elapsedSeconds)}
            </span>
          )}

          {isRunning && onCancel && (
            <button
              onClick={() => onCancel(job.id)}
              className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-rose-900/40 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-700/50 transition"
            >
              Cancel
            </button>
          )}

          {isFailed && onRetry && (
            <button
              onClick={() => onRetry(job.id)}
              className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-emerald-900/40 text-zinc-300 hover:text-emerald-300 border border-zinc-700 hover:border-emerald-700/50 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}

          {onDismiss && (
            <button
              onClick={() => onDismiss(job.id)}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Stage & Status */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-200 font-medium truncate max-w-[85%] flex items-center gap-1.5">
            {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />}
            <span>{job.stage || (isRunning ? 'Processing request with provider...' : isDone ? 'Generation verified & ready' : 'Generation failed')}</span>
          </span>
          <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
            {isDone ? 'READY' : isFailed ? 'FAILED' : isCancelled ? 'CANCELLED' : 'ACTIVE'}
          </span>
        </div>
        <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isFailed
                ? 'bg-rose-500 w-full'
                : isDone
                ? 'bg-emerald-500 w-full'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-300 animate-pulse w-full'
            }`}
          />
        </div>
      </div>

      {isFailed && job.error && (
        <div className="p-2 rounded bg-rose-950/40 border border-rose-800/40 text-[11px] text-rose-300 break-words">
          {job.error}
        </div>
      )}
    </div>
  );
};

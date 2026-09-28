/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, CheckCircle2, Cpu, ExternalLink } from 'lucide-react';
import { ModelCapabilityItem } from '../../../domain/ai/studio/useAiStudioCapabilities';

interface ProviderStatusBannerProps {
  model?: ModelCapabilityItem;
  isConfigured: boolean;
  featureTitle: string;
}

export const ProviderStatusBanner: React.FC<ProviderStatusBannerProps> = ({
  model,
  isConfigured,
  featureTitle,
}) => {
  if (!isConfigured) {
    return (
      <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-amber-300 font-bold">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>{featureTitle} is Not Configured</span>
        </div>
        <p className="text-zinc-300 leading-relaxed text-[11px]">
          No active API key detected for the <strong>{model?.provider || 'Google GenAI'}</strong> provider. To enable real generation with model <code>{model?.modelId || 'Veo / Gemini'}</code>, attach your <code>GEMINI_API_KEY</code> in the <strong>Settings &gt; Secrets</strong> panel.
        </p>
        <div className="flex items-center gap-2 pt-1 text-[10px] text-zinc-400 font-mono">
          <span className="px-1.5 py-0.5 rounded bg-black/50 border border-zinc-700">Environment: unconfigured</span>
          <span className="px-1.5 py-0.5 rounded bg-black/50 border border-zinc-700">Required: GEMINI_API_KEY</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f121c] border border-zinc-800/80 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 font-medium text-[11px]">Active Model:</span>
          <span className="font-mono text-emerald-400 font-bold text-[11px] bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
            {model?.modelId || 'Google GenAI'}
          </span>
        </div>
        <span className="text-[11px] text-zinc-400 hidden sm:inline">• {model?.provider}</span>
      </div>

      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
        {model?.supportedResolutions && (
          <span className="px-1.5 py-0.5 rounded bg-black/40 border border-zinc-800">
            {model.supportedResolutions.join(' / ')}
          </span>
        )}
        {model?.maxDurationSec && (
          <span className="px-1.5 py-0.5 rounded bg-black/40 border border-zinc-800">
            Up to {model.maxDurationSec}s
          </span>
        )}
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30">
          Real Model Verified
        </span>
      </div>
    </div>
  );
};

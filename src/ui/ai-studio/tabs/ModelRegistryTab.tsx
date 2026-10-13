/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  CheckCircle,
  AlertCircle,
  Cpu,
  Cloud,
  HardDrive,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';
import { ModelRegistry } from '../../../lib/ai/registry';
import { AIModelMeta, AITaskType, AIProviderId, AICostTier, AIExecutionType } from '../../../lib/ai/types';

export const ModelRegistryTab: React.FC = () => {
  const registry = useMemo(() => ModelRegistry.getInstance(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedCostTier, setSelectedCostTier] = useState<string>('all');

  const models = useMemo(() => {
    return registry.filterModels({
      searchQuery: searchQuery.trim() || undefined,
      task: selectedTask !== 'all' ? (selectedTask as AITaskType) : undefined,
      provider: selectedProvider !== 'all' ? (selectedProvider as AIProviderId) : undefined,
      costTier: selectedCostTier !== 'all' ? (selectedCostTier as AICostTier) : undefined,
    });
  }, [registry, searchQuery, selectedTask, selectedProvider, selectedCostTier]);

  const getCostBadge = (tier: AICostTier) => {
    switch (tier) {
      case 'free_local':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Zap className="w-3 h-3" />
            FREE / LOCAL
          </span>
        );
      case 'free_tier':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <Cloud className="w-3 h-3" />
            FREE TIER
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            OPTIONAL PAID
          </span>
        );
    }
  };

  const getExecutionBadge = (exec: AIExecutionType) => {
    switch (exec) {
      case 'local':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            Client Browser (0 Cloud Cost)
          </span>
        );
      case 'cloud':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            Cloud Serverless
          </span>
        );
      case 'hybrid':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            Hybrid Client / Server
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            Catalog & Registry
          </span>
          <span className="text-[11px] font-mono text-zinc-500">100% Transparent Cost & Hardware Attribution</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          VeeCut AI Model Registry
        </h2>
        <p className="text-zinc-400 text-xs">
          Comprehensive inventory of every open-source, local, and external model. Every feature is truthfully labeled: FREE / LOCAL, FREE TIER, or OPTIONAL PAID.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#10131c] border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models by name, ID, or task..."
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Task Filter */}
        <select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden"
        >
          <option value="all">All Tasks</option>
          <option value="text-to-image">Text to Image</option>
          <option value="text-to-video">Text to Video</option>
          <option value="speech-to-text">Speech to Text</option>
          <option value="text-to-speech">Text to Speech</option>
          <option value="background-removal">Background Removal</option>
          <option value="translation">Translation</option>
          <option value="image-enhancement">Image Enhancement</option>
          <option value="smart-editor">Smart Editor</option>
        </select>

        {/* Provider Filter */}
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden"
        >
          <option value="all">All Providers</option>
          <option value="local">Local (Browser / Zero Cost)</option>
          <option value="huggingface">Hugging Face</option>
          <option value="gemini">Google Gemini (Optional)</option>
        </select>

        {/* Cost Filter */}
        <select
          value={selectedCostTier}
          onChange={(e) => setSelectedCostTier(e.target.value)}
          className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-hidden"
        >
          <option value="all">All Cost Tiers</option>
          <option value="free_local">FREE / LOCAL</option>
          <option value="free_tier">FREE TIER</option>
          <option value="paid">OPTIONAL PAID</option>
        </select>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((m) => (
          <div
            key={m.id}
            className="bg-[#121520] border border-zinc-800 hover:border-zinc-700 rounded-xl p-4.5 flex flex-col justify-between space-y-4 transition shadow-sm"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                {getCostBadge(m.costTier)}
                <span className="text-[10px] font-mono text-zinc-500 uppercase">{m.provider}</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">{m.name}</h3>
                <p className="text-[10px] font-mono text-emerald-400/90 truncate mt-0.5">{m.id}</p>
              </div>

              <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">{m.description}</p>
            </div>

            <div className="space-y-2 pt-3 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs">
                {getExecutionBadge(m.execution)}
                <span className="text-[10px] font-mono text-zinc-400">
                  {m.requiresGPU ? 'GPU Required' : 'CPU / Serverless'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {m.capabilities.slice(0, 2).map((cap, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
                <span>License: {m.license}</span>
                <span className="capitalize">{m.task.replace(/-/g, ' ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

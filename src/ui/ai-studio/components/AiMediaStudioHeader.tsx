/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sparkles,
  Video,
  Clapperboard,
  FileAudio,
  Music,
  Mic,
  Image as ImageIcon,
  LayoutGrid,
  ArrowLeft,
  Film,
  Layers,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

export type AiStudioTab =
  | 'overview'
  | 'text_to_video'
  | 'image_to_video'
  | 'transcription'
  | 'music'
  | 'voice'
  | 'images';

interface AiMediaStudioHeaderProps {
  activeTab: AiStudioTab;
  onSelectTab: (tab: AiStudioTab) => void;
  activeJobCount?: number;
  onReturnToEditor: () => void;
}

export const AiMediaStudioHeader: React.FC<AiMediaStudioHeaderProps> = ({
  activeTab,
  onSelectTab,
  activeJobCount = 0,
  onReturnToEditor,
}) => {
  const tabs: { id: AiStudioTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'text_to_video', label: 'Text to Video', icon: Video },
    { id: 'image_to_video', label: 'Image to Video', icon: Clapperboard },
    { id: 'transcription', label: 'Transcription', icon: FileAudio },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'images', label: 'Images', icon: ImageIcon },
  ];

  return (
    <header className="h-12 bg-[#0c0e15] border-b border-zinc-800/90 px-4 flex items-center justify-between select-none shrink-0 z-20">
      {/* 1. Left: Brand & Return to Timeline */}
      <div className="flex items-center gap-3">
        <button
          onClick={onReturnToEditor}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition group"
          title="Return to Timeline & Video Editor"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-emerald-400" />
          <span>Editor</span>
        </button>

        <div className="h-4 w-px bg-zinc-800" />

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-bold tracking-tight text-white">AI Media Studio</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold hidden sm:inline">
              PRO SUITE
            </span>
          </div>
        </div>
      </div>

      {/* 2. Center: 7 Main Tabs */}
      <nav className="flex items-center gap-1 bg-[#12151f] p-1 rounded-lg border border-zinc-800/80 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Right: Active Job Counter & Quick Link */}
      <div className="flex items-center gap-2">
        {activeJobCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{activeJobCount} Active Job{activeJobCount > 1 ? 's' : ''}</span>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-500 hidden md:inline">Ready to generate</span>
        )}

        <button
          onClick={onReturnToEditor}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-xs shadow-emerald-500/20 transition active:scale-95"
        >
          <Film className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Timeline</span>
        </button>
      </div>
    </header>
  );
};

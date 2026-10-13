/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Video,
  Clapperboard,
  FileAudio,
  Music,
  Mic,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  Plus,
  Play,
  Download,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Film,
  Zap,
  Languages,
  Wand2,
  Subtitles,
  Scissors,
  Sliders,
} from 'lucide-react';
import { AiStudioTab } from '../components/AiMediaStudioHeader';
import { AiJob } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';

interface OverviewTabProps {
  onSelectTab: (tab: AiStudioTab) => void;
  recentJobs: AiJob[];
  onRetryJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onStartQuickJob: (type: any, input: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  onSelectTab,
  recentJobs,
  onRetryJob,
  onCancelJob,
  onStartQuickJob,
}) => {
  const { applyAIResultToTimeline, saveAIResultToMediaPool } = useEditor();
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickType, setQuickType] = useState<'text_to_video' | 'image_generation' | 'music_generation'>('image_generation');

  const capabilities = [
    {
      id: 'images' as AiStudioTab,
      title: 'AI Image & BG Cutout',
      model: 'FLUX.1 Schnell & Local Saliency',
      description: 'Generate high-res stills with FLUX, remove backgrounds with alpha matting, and upscale up to 4x.',
      icon: ImageIcon,
      tier: 'FREE TIER & LOCAL',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      tags: ['FLUX.1', 'RMBG Cutout', 'Super-Res 4x'],
    },
    {
      id: 'transcription' as AiStudioTab,
      title: 'Speech to Text & SRT',
      model: 'Local Web Speech & Whisper v3',
      description: 'Zero-cost offline speech-to-text recognition with millisecond timestamp cues, SRT & VTT exports.',
      icon: FileAudio,
      tier: 'FREE / LOCAL',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      tags: ['Zero Latency', 'Whisper v3', 'SRT / VTT'],
    },
    {
      id: 'voice' as AiStudioTab,
      title: 'AI Voice & Speech TTS',
      model: 'Meta MMS-TTS & Browser Synthesis',
      description: 'Zero-cost voice generator supporting English, Urdu, Pashto, Spanish, and global accents with live audio export.',
      icon: Mic,
      tier: 'FREE / LOCAL',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      tags: ['Urdu / Pashto', 'WAV Export', 'Meta MMS'],
    },
    {
      id: 'captions' as AiStudioTab,
      title: 'Auto Captions & Styling',
      model: 'Karaoke & Timeline Styler',
      description: 'Build animated subtitle tracks with custom typography, bounce animations, and position controls.',
      icon: Subtitles,
      tier: 'FREE / LOCAL',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      tags: ['Karaoke', 'Custom Fonts', 'Direct Timeline'],
    },
    {
      id: 'translation' as AiStudioTab,
      title: 'AI Transcript Translation',
      model: 'Meta NLLB-200',
      description: 'High-fidelity multilingual translation for video transcripts: English ↔ Urdu, English ↔ Pashto, and 200+ tongues.',
      icon: Languages,
      tier: 'FREE TIER',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      tags: ['English ↔ Urdu', 'Pashto', '200+ Languages'],
    },
    {
      id: 'smart_editor' as AiStudioTab,
      title: 'AI Smart Editor',
      model: 'VeeCut Copilot Schema',
      description: 'Type natural language instructions to auto-cut silence, generate captions, add soundtracks, and trim clips.',
      icon: Wand2,
      tier: 'FREE / LOCAL',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      tags: ['Cut Silence', '30s Cuts', 'Verified Actions'],
    },
    {
      id: 'text_to_video' as AiStudioTab,
      title: 'Text to Video',
      model: 'Open Weights & Veo 3',
      description: 'Generate cinematic video shots from natural language prompts with camera motion trajectories.',
      icon: Video,
      tier: 'FREE / OPTIONAL PAID',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      tags: ['1080p', '16:9 / 9:16', 'ModelScope / Veo'],
    },
    {
      id: 'models' as AiStudioTab,
      title: 'Central Model Registry',
      model: 'Model Catalog & Licenses',
      description: 'Transparent inventory of all open-source, local, and external models with truthful cost attribution.',
      icon: Layers,
      tier: 'CATALOG',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      tags: ['Open Weights', 'Truthful Labels', 'Apache 2.0 / MIT'],
    },
  ];

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;

    if (quickType === 'image_generation') {
      onSelectTab('images');
    } else if (quickType === 'text_to_video') {
      onSelectTab('text_to_video');
    } else if (quickType === 'music_generation') {
      onSelectTab('music');
    }
  };

  const handleAddToTimeline = async (job: AiJob) => {
    if (!job.output) return;
    try {
      await applyAIResultToTimeline({
        title: job.output.title || `AI ${job.type}`,
        type:
          job.type === 'music_generation' || job.type === 'voice_conversation'
            ? 'Audio Mixing'
            : job.type === 'audio_to_transcript'
            ? 'captions'
            : 'ai_video',
        videoUrl: job.output.videoUrl,
        imageUrl: job.output.imageUrl,
        audioData: job.output.audioData || job.output.audioUrl,
        captions: job.output.captions,
        durationSec: job.output.duration || job.output.durationSeconds || job.output.durationSec || 5,
      });
      notifyToast(`Added "${job.output.title || 'AI Asset'}" to Timeline!`, 'success');
    } catch (err: any) {
      notifyToast(err.message || 'Failed to place on timeline', 'error');
    }
  };

  const handleSaveToMediaPool = async (job: AiJob) => {
    if (!job.output) return;
    try {
      const asset = await saveAIResultToMediaPool({
        title: job.output.title || `AI ${job.type}`,
        type:
          job.type === 'music_generation' || job.type === 'voice_conversation'
            ? 'Audio Mixing'
            : job.type === 'audio_to_transcript'
            ? 'captions'
            : 'ai_video',
        videoUrl: job.output.videoUrl,
        imageUrl: job.output.imageUrl,
        audioData: job.output.audioData || job.output.audioUrl,
        durationSec: job.output.duration || job.output.durationSeconds || job.output.durationSec || 5,
      });
      if (asset) {
        notifyToast(`Saved "${asset.name}" to Media Library!`, 'success');
      }
    } catch (err: any) {
      notifyToast(err.message || 'Failed to save to Media Library', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* 1. Hero & Quick Launcher Banner */}
      <div className="relative rounded-2xl bg-[#121520] border border-zinc-800/80 p-5 sm:p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-48 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Zero-Cost & Open-Source AI Architecture
                </span>
                <span className="text-[11px] font-mono text-zinc-500">Hugging Face & Local Engines</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                VeeCut Open AI Suite
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl mt-0.5">
                Generate images with FLUX.1, transcribe speech with Whisper, synthesize Urdu/Pashto/English voiceovers, remove backgrounds locally, and execute smart editor commands with zero mandatory cloud fees.
              </p>
            </div>

            <button
              onClick={() => onSelectTab('models')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-semibold text-zinc-300 hover:text-white transition shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Model Registry & Licenses</span>
            </button>
          </div>

          {/* Quick Launcher Form */}
          <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row gap-2 pt-2">
            <select
              value={quickType}
              onChange={(e) => setQuickType(e.target.value as any)}
              className="bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-hidden focus:border-emerald-500 shrink-0"
            >
              <option value="image_generation">AI Image (FLUX.1)</option>
              <option value="text_to_video">AI Video</option>
              <option value="music_generation">AI Music</option>
            </select>

            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="Enter a prompt to create an asset for your timeline..."
              className="flex-1 bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500"
            />

            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Studio</span>
            </button>
          </form>
        </div>
      </div>

      {/* 2. Grid of Capabilities */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
            AI Tools & Pipelines ({capabilities.length})
          </h3>
          <span className="text-xs text-zinc-500">Click any card to open dedicated workspace</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {capabilities.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.id}
                onClick={() => onSelectTab(c.id)}
                className="group relative bg-[#121520] hover:bg-[#151928] border border-zinc-800/90 hover:border-emerald-500/50 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${c.badgeClass}`}
                    >
                      {c.tier}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                      {c.title}
                    </h4>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">{c.model}</p>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{c.description}</p>
                </div>

                <div className="flex flex-wrap gap-1 pt-2 border-t border-zinc-800/80">
                  {c.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Recent AI Creations Queue */}
      {recentJobs.length > 0 && (
        <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Recent AI Generations & Timeline Bridges ({recentJobs.length})
            </h3>
            <span className="text-[11px] text-zinc-500">Directly sync to timeline or media library</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentJobs.slice(0, 6).map((job) => (
              <div
                key={job.id}
                className="bg-zinc-950/70 border border-zinc-800/90 rounded-lg p-3 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="uppercase text-emerald-400 font-semibold">{job.type}</span>
                    <span
                      className={`capitalize px-1.5 py-0.2 rounded font-bold ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : job.status === 'failed'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-white line-clamp-1 mt-1">
                    {job.output?.title || job.input?.prompt || job.stage}
                  </p>
                </div>

                {job.status === 'completed' && job.output && (
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-zinc-800/80">
                    <button
                      onClick={() => handleSaveToMediaPool(job)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium transition"
                    >
                      Save to Media
                    </button>
                    <button
                      onClick={() => handleAddToTimeline(job)}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add to Timeline</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

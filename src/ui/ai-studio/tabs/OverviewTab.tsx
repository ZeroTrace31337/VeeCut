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
  const [quickType, setQuickType] = useState<'text_to_video' | 'image_generation' | 'music_generation'>('text_to_video');

  const capabilities = [
    {
      id: 'text_to_video' as AiStudioTab,
      title: 'Text to Video',
      model: 'Veo 3 (veo-3.1-fast-generate-preview)',
      description: 'Generate high-fidelity cinematic video footage directly from natural language prompts.',
      icon: Video,
      accent: 'emerald',
      ratio: '16:9 / 9:16',
      tags: ['4K / 1080p', 'Cinematic', 'Veo 3 Fast'],
    },
    {
      id: 'image_to_video' as AiStudioTab,
      title: 'Image to Video',
      model: 'Veo 3 Motion Animate',
      description: 'Transform still photographs and generated concept art into fluid moving camera shots.',
      icon: Clapperboard,
      accent: 'emerald',
      ratio: '16:9 / 9:16',
      tags: ['Pan & Zoom', 'Drone Orbit', 'Camera Control'],
    },
    {
      id: 'transcription' as AiStudioTab,
      title: 'Audio to Transcript',
      model: 'Gemini 3.5 Transcribe',
      description: 'Transcribe spoken audio with microsecond timestamp cues and generate timeline subtitle tracks.',
      icon: FileAudio,
      accent: 'emerald',
      ratio: 'Multi-language',
      tags: ['SRT & VTT', 'Word Cues', 'Auto Subtitles'],
    },
    {
      id: 'music' as AiStudioTab,
      title: 'AI Music Generation',
      model: 'Lyria Neural Audio Engine',
      description: 'Compose original background scores, trailer themes, and rhythmic tracks matching your edits.',
      icon: Music,
      accent: 'amber',
      ratio: '24-bit WAV',
      tags: ['BPM Tempo', 'Custom Moods', 'Orchestral / Lo-Fi'],
    },
    {
      id: 'voice' as AiStudioTab,
      title: 'AI Voice Conversation',
      model: 'Gemini 3.8 Flash Voice',
      description: 'Synthesize single narrations or multi-speaker podcast dialogues with expressive vocal personas.',
      icon: Mic,
      accent: 'emerald',
      ratio: 'Multi-speaker',
      tags: ['Dual Dialogue', '5 Prebuilt Voices', 'Script Sync'],
    },
    {
      id: 'images' as AiStudioTab,
      title: 'Image Gen & Editing',
      model: 'Gemini 3.1 Flash Image',
      description: 'Generate production-ready textures, background plates, and seamlessly edit existing imagery.',
      icon: ImageIcon,
      accent: 'amber',
      ratio: '1:1, 16:9, 9:16',
      tags: ['Inpainting', 'Style Transfer', 'Animate with Veo'],
    },
  ];

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;

    if (quickType === 'text_to_video') {
      onStartQuickJob('text_to_video', {
        prompt: quickPrompt,
        aspectRatio: '16:9',
        resolution: '720p',
        duration: 5,
      });
      onSelectTab('text_to_video');
    } else if (quickType === 'image_generation') {
      onStartQuickJob('image_generation', {
        prompt: quickPrompt,
        aspectRatio: '16:9',
        style: 'Cinematic',
      });
      onSelectTab('images');
    } else if (quickType === 'music_generation') {
      onStartQuickJob('music_generation', {
        prompt: quickPrompt,
        genre: 'Cinematic',
        mood: 'Epic',
        durationSeconds: 20,
        bpm: 120,
      });
      onSelectTab('music');
    }
  };

  const handleAddToTimeline = async (job: AiJob) => {
    if (!job.output) return;
    try {
      await applyAIResultToTimeline({
        title: job.output.title || `AI ${job.type}`,
        type: job.type === 'music_generation' || job.type === 'voice_conversation' ? 'Audio Mixing' : job.type === 'audio_to_transcript' ? 'captions' : 'ai_video',
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
        type: job.type === 'music_generation' || job.type === 'voice_conversation' ? 'Audio Mixing' : job.type === 'audio_to_transcript' ? 'captions' : 'ai_video',
        videoUrl: job.output.videoUrl,
        imageUrl: job.output.imageUrl,
        audioData: job.output.audioData || job.output.audioUrl,
        durationSec: job.output.duration || job.output.durationSeconds || job.output.durationSec || 5,
      });
      if (asset) {
        notifyToast(`Saved "${asset.name}" to Media Pool!`, 'success');
      }
    } catch (err: any) {
      notifyToast(err.message || 'Failed to save to Media Pool', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* 1. Hero & Quick Launcher Banner */}
      <div className="relative rounded-2xl bg-[#121520] border border-zinc-800/80 p-5 sm:p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-48 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                  Unified AI Media Studio
                </span>
                <span className="text-[11px] font-mono text-zinc-500">6 Core Capabilities</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                Create, Animate & Score Your Project
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl mt-0.5">
                Generate high-resolution video with Veo 3, animate still images, transcribe audio, synthesize music tracks, craft dual-speaker conversations, and send every result directly to the timeline.
              </p>
            </div>
          </div>

          {/* Quick Prompt Bar */}
          <form onSubmit={handleQuickSubmit} className="pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#0c0e14] border border-zinc-800 rounded-xl p-1.5 focus-within:border-emerald-500/60 transition">
              <div className="flex items-center gap-1 px-2 shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-800/80 pb-1 sm:pb-0">
                <select
                  value={quickType}
                  onChange={(e: any) => setQuickType(e.target.value)}
                  className="bg-transparent text-xs text-zinc-300 font-semibold focus:outline-none cursor-pointer py-1"
                >
                  <option value="text_to_video" className="bg-zinc-900 text-white">Text to Video</option>
                  <option value="image_generation" className="bg-zinc-900 text-white">AI Image</option>
                  <option value="music_generation" className="bg-zinc-900 text-white">AI Music</option>
                </select>
              </div>

              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder={
                  quickType === 'text_to_video'
                    ? "e.g. Drone flight through glowing neon rainforest canopy at twilight, 4K..."
                    : quickType === 'image_generation'
                    ? "e.g. Cinematic wide anamorphic photograph of a lone astronaut on Mars..."
                    : "e.g. Epic cinematic trailer score with deep sub bass drops and sweeping strings..."
                }
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition active:scale-95 shadow-xs shadow-emerald-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                <span>Generate</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. 6 Core Creative Capabilities Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-200 tracking-tight">Studio Capabilities</h3>
          <span className="text-[11px] text-zinc-500">Every asset connects to VeeCut Timeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.id}
                onClick={() => onSelectTab(cap.id)}
                className="group bg-[#121520] hover:bg-[#151926] border border-zinc-800/80 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-black/40 border border-zinc-800">
                      {cap.ratio}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-zinc-100 text-sm group-hover:text-emerald-300 transition">
                      {cap.title}
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-mono block mb-1">
                      {cap.model}
                    </span>
                    <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cap.tags.map((tag) => (
                      <span key={tag} className="text-[9px] text-zinc-400 bg-zinc-850 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Recent Generation Jobs & Timeline Insertion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-200 tracking-tight">Recent Studio Generations</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {recentJobs.length} Record{recentJobs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">Persistent across studio sessions</span>
        </div>

        {recentJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center bg-[#10131d] space-y-2">
            <Sparkles className="w-6 h-6 text-zinc-600 mx-auto" />
            <span className="text-xs font-semibold text-zinc-400 block">No AI generations yet</span>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              Select any capability above or use the quick bar to generate video, audio, transcripts, and images.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentJobs.slice(0, 6).map((job) => {
              const isDone = job.status === 'completed';
              const isProcessing = job.status === 'processing' || job.status === 'queued';
              const isFailed = job.status === 'failed';

              return (
                <div
                  key={job.id}
                  className="bg-[#121520] border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {job.type.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] font-medium ${isDone ? 'text-emerald-400' : isProcessing ? 'text-amber-400' : 'text-rose-400'}`}>
                          ● {job.status}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-zinc-200 block truncate">
                        {job.output?.title || job.input?.prompt || job.input?.motionPrompt || job.stage}
                      </span>
                    </div>

                    {isProcessing && (
                      <button
                        onClick={() => onCancelJob(job.id)}
                        className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-300 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Processing Progress or Finished preview */}
                  {isProcessing && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>{job.stage}</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-850 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {isDone && (
                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSaveToMediaPool(job)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                          title="Save asset to Media Pool"
                        >
                          Media Pool
                        </button>
                        <button
                          onClick={() => handleAddToTimeline(job)}
                          className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                          title="Insert clip onto active track at playhead"
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                          <span>Timeline</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isFailed && (
                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-rose-400 truncate max-w-[70%]">
                        {job.error || 'Execution failed'}
                      </span>
                      <button
                        onClick={() => onRetryJob(job.id)}
                        className="text-[10px] text-emerald-400 hover:underline font-semibold"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

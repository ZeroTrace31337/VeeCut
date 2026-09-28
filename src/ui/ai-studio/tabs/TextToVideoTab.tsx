/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Video,
  Play,
  Pause,
  Plus,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  Film,
  Sliders,
  Maximize2,
  Check,
  RefreshCw,
  Clock,
  Compass,
} from 'lucide-react';
import { AiJob, TextToVideoRequest } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { JobProgressCard } from '../components/JobProgressCard';
import { useAiStudioCapabilities } from '../../../domain/ai/studio/useAiStudioCapabilities';
import { ProviderStatusBanner } from '../components/ProviderStatusBanner';

interface TextToVideoTabProps {
  onStartJob: (type: 'text_to_video', input: TextToVideoRequest) => Promise<AiJob>;
  activeJob: AiJob | null;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  elapsedSeconds?: number;
}

const STYLE_PRESETS = [
  { id: 'Cinematic', label: 'Cinematic 35mm', desc: 'Anamorphic lens, shallow depth of field, warm grade' },
  { id: 'Photorealistic', label: 'Photorealistic Drone', desc: 'Crisp 4K textures, natural sunlight, aerial motion' },
  { id: 'Cyberpunk', label: 'Cyberpunk Neon', desc: 'Rain reflections, vibrant cyan/magenta glow, dark urban' },
  { id: '3D Render', label: '3D Octane / Unreal', desc: 'Volumetric god rays, raytraced reflections, stylized' },
  { id: 'Vintage Film', label: 'Vintage 70s Kodak', desc: 'Organic celluloid grain, soft contrast, warm glow' },
  { id: 'Anime', label: 'Makoto Anime', desc: 'Lush skies, painterly clouds, radiant sunlight' },
];

const PROMPT_SUGGESTIONS = [
  'Cinematic aerial drone shot sweeping over jagged Icelandic black sand beach with turquoise surf, 4K 60fps',
  'Futuristic neon bullet train speeding through towering rain-drenched cyberpunk metropolis at dusk',
  'Golden hour close-up tracking shot of an autumn leaf floating down a crystal clear alpine stream',
  'An ancient moss-covered stone temple emerging through misty morning rainforest canopy, rays of sunlight',
];

export const TextToVideoTab: React.FC<TextToVideoTabProps> = ({
  onStartJob,
  activeJob,
  onCancelJob,
  onRetryJob,
  elapsedSeconds = 0,
}) => {
  const { applyAIResultToTimeline, saveAIResultToMediaPool } = useEditor();
  const { isConfigured, getModel } = useAiStudioCapabilities();
  const modelInfo = getModel('text_to_video');

  const [prompt, setPrompt] = useState(
    'Cinematic aerial drone shot over majestic mountain ridge with volumetric mist at sunset, 4K'
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [duration, setDuration] = useState(5);
  const [style, setStyle] = useState('Cinematic');

  // Video Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isCurrentJobActive = activeJob?.type === 'text_to_video' && (activeJob.status === 'queued' || activeJob.status === 'processing');
  const latestOutput = activeJob?.type === 'text_to_video' && activeJob.status === 'completed' ? activeJob.output : null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      await onStartJob('text_to_video', {
        prompt,
        aspectRatio,
        resolution,
        duration,
        style,
      });
      notifyToast('Veo 3 generation started! Rendering frames in background...', 'info');
    } catch (err: any) {
      notifyToast(err.message || 'Failed to start video generation', 'error');
    }
  };

  const handleAddToTimeline = async () => {
    if (!latestOutput?.videoUrl) return;
    try {
      await applyAIResultToTimeline({
        title: latestOutput.title || `Veo: ${prompt.substring(0, 24)}`,
        type: 'ai_video',
        videoUrl: latestOutput.videoUrl,
        durationSec: latestOutput.duration || duration,
      });
      notifyToast('Veo video placed on timeline!', 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to add video to timeline', 'error');
    }
  };

  const handleSaveToMediaPool = async () => {
    if (!latestOutput?.videoUrl) return;
    try {
      const asset = await saveAIResultToMediaPool({
        title: latestOutput.title || `Veo: ${prompt.substring(0, 24)}`,
        type: 'ai_video',
        videoUrl: latestOutput.videoUrl,
        durationSec: latestOutput.duration || duration,
      });
      if (asset) {
        notifyToast(`Saved "${asset.name}" to Media Pool!`, 'success');
      }
    } catch (e: any) {
      notifyToast(e.message || 'Failed to save to Media Pool', 'error');
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              Veo 3 Architecture
            </span>
            <span className="text-[11px] font-mono text-zinc-500">veo-3.1-fast-generate-preview</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">Text → Video Generation</h2>
          <p className="text-zinc-400 text-xs">
            Generate original footage with precise motion and cinematic aesthetic. Supports 16:9 widescreen or 9:16 vertical video.
          </p>
        </div>
      </div>

      {/* Model Capability & Provider Status */}
      <ProviderStatusBanner
        model={modelInfo}
        isConfigured={isConfigured}
        featureTitle="AI Video Generation"
      />

      {/* Main Studio 2-Column Split: Generator Controls Left, Preview Player Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form & Prompts (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prompt Area */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200">Creative Scene Prompt</label>
              <button
                type="button"
                onClick={() => {
                  const random = PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)];
                  setPrompt(random);
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
              >
                <Compass className="w-3 h-3" />
                <span>Inspire me</span>
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe your scene in detail: subject, lighting, camera movement, environment..."
              className="w-full bg-[#0c0e14] border border-zinc-800 focus:border-emerald-500 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed transition"
            />

            {/* Quick Prompt Starters */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-zinc-500">Suggestions:</span>
              {PROMPT_SUGGESTIONS.slice(0, 2).map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(s)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-850 hover:bg-zinc-800 px-2 py-0.5 rounded truncate max-w-[200px] border border-zinc-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio & Resolution Specs */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-200 block">Aspect Ratio & Quality</span>

            <div className="grid grid-cols-2 gap-3">
              {/* Aspect Ratio Options: Strictly 16:9 or 9:16 */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1.5">Canvas Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition ${
                      aspectRatio === '16:9'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#0c0e14] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="w-3.5 h-2.5 border border-current rounded-xs" />
                    <span>16:9 Landscape</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition ${
                      aspectRatio === '9:16'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#0c0e14] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="w-2.5 h-3.5 border border-current rounded-xs" />
                    <span>9:16 Portrait</span>
                  </button>
                </div>
              </div>

              {/* Resolution selection */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1.5">Resolution</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution('720p')}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition ${
                      resolution === '720p'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#0c0e14] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    720p HD (Fast)
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolution('1080p')}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition ${
                      resolution === '1080p'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#0c0e14] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    1080p Full HD
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Aesthetic Style Presets */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-200 block">Cinematography Style</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STYLE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setStyle(p.id)}
                  className={`p-2.5 rounded-lg text-left border transition ${
                    style === p.id
                      ? 'bg-emerald-500/15 border-emerald-500/80 text-emerald-300'
                      : 'bg-[#0c0e14] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-bold block">{p.label}</span>
                  <span className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!isConfigured || isCurrentJobActive || !prompt.trim()}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs tracking-wider uppercase transition active:scale-98 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
          >
            {!isConfigured ? (
              <span>AI Video Generation is not configured</span>
            ) : isCurrentJobActive ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Veo 3 Synthesizing Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Generate Video with Veo 3</span>
              </>
            )}
          </button>

          {/* Active Job Progress */}
          {activeJob && activeJob.type === 'text_to_video' && (
            <JobProgressCard
              job={activeJob}
              elapsedSeconds={elapsedSeconds}
              onCancel={onCancelJob}
              onRetry={onRetryJob}
            />
          )}
        </div>

        {/* Right Column: Video Preview & First-Class Integration (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">Video Canvas Preview</span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                {aspectRatio} • {resolution}
              </span>
            </div>

            {/* Video Player Box */}
            <div
              className={`w-full bg-black rounded-xl overflow-hidden border border-zinc-800 relative flex items-center justify-center ${
                aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[280px] mx-auto' : 'aspect-video'
              }`}
            >
              {latestOutput?.videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={latestOutput.videoUrl}
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Play / Pause Overlay Button */}
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs flex items-center justify-center text-white transition active:scale-95 z-10"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                  </button>
                </>
              ) : isCurrentJobActive ? (
                <div className="text-center p-6 space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <span className="text-xs font-semibold text-zinc-200 block">
                    Generating Veo 3 Video
                  </span>
                  <p className="text-[11px] text-zinc-400 max-w-xs">
                    {activeJob?.stage || 'Rendering frames...'}
                  </p>
                </div>
              ) : (
                <div className="text-center p-6 space-y-2 text-zinc-600">
                  <Video className="w-8 h-8 mx-auto" />
                  <span className="text-xs font-medium block">No video generated yet</span>
                  <span className="text-[10px] text-zinc-500">Configure prompt and click Generate</span>
                </div>
              )}
            </div>

            {/* Timeline & Media Pool Insertion Actions */}
            {latestOutput?.videoUrl && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-300 block">VeeCut Asset Integration</span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAddToTimeline}
                    className="py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add to Timeline</span>
                  </button>

                  <button
                    onClick={handleSaveToMediaPool}
                    className="py-2.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-zinc-700"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save to Media Pool</span>
                  </button>
                </div>

                <a
                  href={latestOutput.videoUrl}
                  download="veo-cinematic-video.mp4"
                  className="w-full py-2 rounded-lg bg-[#0c0e14] hover:bg-zinc-850 text-zinc-300 text-xs font-medium transition flex items-center justify-center gap-1.5 border border-zinc-800 block text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4 File</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

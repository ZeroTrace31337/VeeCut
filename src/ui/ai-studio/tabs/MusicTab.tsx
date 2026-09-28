/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Music,
  Play,
  Pause,
  Plus,
  Download,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Sliders,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { AiJob, MusicGenRequest } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { JobProgressCard } from '../components/JobProgressCard';
import { useAiStudioCapabilities } from '../../../domain/ai/studio/useAiStudioCapabilities';
import { ProviderStatusBanner } from '../components/ProviderStatusBanner';

interface MusicTabProps {
  onStartJob: (type: 'music_generation', input: MusicGenRequest) => Promise<AiJob>;
  activeJob: AiJob | null;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  elapsedSeconds?: number;
}

const GENRES = [
  'Cinematic',
  'Orchestral Trailer',
  'Lo-Fi Chill Hop',
  'Cyberpunk Synthwave',
  'Ambient & Drone',
  'Deep House & EDM',
  'Acoustic Indie',
];

const MOODS = ['Epic', 'Dramatic', 'Uplifting', 'Melancholic', 'Suspenseful', 'Warm & Relaxing'];

const MUSIC_PROMPTS = [
  'Epic cinematic orchestral hybrid with soaring violins, driving brass, and deep sub bass impacts',
  'Midnight Tokyo lo-fi chill hop with gentle electric piano chords, vinyl crackle, and soft hip hop beat',
  'Pulsing cyberpunk synthwave bassline with retro 80s analog synthesizers and gated snare drums',
  'Warm acoustic folk guitar melody with gentle strings and sunrise ambient atmosphere',
];

export const MusicTab: React.FC<MusicTabProps> = ({
  onStartJob,
  activeJob,
  onCancelJob,
  onRetryJob,
  elapsedSeconds = 0,
}) => {
  const { applyAIResultToTimeline, saveAIResultToMediaPool } = useEditor();
  const { isConfigured, getModel } = useAiStudioCapabilities();
  const modelInfo = getModel('music_generation');

  const [prompt, setPrompt] = useState(
    'Epic cinematic trailer score with dramatic brass riser, sweeping strings, and heavy bass drop'
  );
  const [genre, setGenre] = useState('Cinematic');
  const [mood, setMood] = useState('Epic');
  const [durationSeconds, setDurationSeconds] = useState(25);
  const [bpm, setBpm] = useState(124);

  // Audio Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isCurrentJobActive = activeJob?.type === 'music_generation' && (activeJob.status === 'queued' || activeJob.status === 'processing');
  const latestOutput = activeJob?.type === 'music_generation' && activeJob.status === 'completed' ? activeJob.output : null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      await onStartJob('music_generation', {
        prompt,
        genre,
        mood,
        durationSeconds,
        bpm,
      });
      notifyToast('Synthesizing music track with Lyria engine...', 'info');
    } catch (err: any) {
      notifyToast(err.message || 'Failed to start music generation', 'error');
    }
  };

  const handleAddToTimeline = async () => {
    if (!latestOutput?.audioData && !latestOutput?.audioUrl) return;
    try {
      await applyAIResultToTimeline({
        title: latestOutput.title || `${genre} ${mood} Score`,
        type: 'Audio Mixing',
        audioData: latestOutput.audioData || latestOutput.audioUrl,
        durationSec: latestOutput.durationSeconds || durationSeconds,
      });
      notifyToast('Music track inserted into timeline audio track!', 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to add music to timeline', 'error');
    }
  };

  const handleSaveToMediaPool = async () => {
    if (!latestOutput?.audioData && !latestOutput?.audioUrl) return;
    try {
      const asset = await saveAIResultToMediaPool({
        title: latestOutput.title || `${genre} ${mood} Score`,
        type: 'Audio Mixing',
        audioData: latestOutput.audioData || latestOutput.audioUrl,
        durationSec: latestOutput.durationSeconds || durationSeconds,
      });
      if (asset) {
        notifyToast(`Saved "${asset.name}" to Media Pool!`, 'success');
      }
    } catch (e: any) {
      notifyToast(e.message || 'Failed to save to Media Pool', 'error');
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
              Neural Audio Engine
            </span>
            <span className="text-[11px] font-mono text-zinc-500">Lyria & 24-bit PCM Synthesizer</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">AI Music Generation</h2>
          <p className="text-zinc-400 text-xs">
            Generate royalty-free scores, cinematic cues, and ambient soundscapes with tempo and harmonic key controls.
          </p>
        </div>
      </div>

      {/* Model Capability & Provider Status */}
      <ProviderStatusBanner
        model={modelInfo}
        isConfigured={isConfigured}
        featureTitle="AI Music Generation"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Music Generation Parameters (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prompt Box */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200">Musical Prompt & Instruments</label>
              <button
                type="button"
                onClick={() => {
                  const random = MUSIC_PROMPTS[Math.floor(Math.random() * MUSIC_PROMPTS.length)];
                  setPrompt(random);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
              >
                <Compass className="w-3 h-3" />
                <span>Preset prompt</span>
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe instruments, lead melody, bass texture, percussion style..."
              className="w-full bg-[#0c0e14] border border-zinc-800 focus:border-amber-500 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Genre & Mood Selectors */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-200 block">Genre & Mood</span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Musical Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-[#0c0e14] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Harmonic Mood</label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full bg-[#0c0e14] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                >
                  {MOODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration & BPM Sliders */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Duration</span>
                  <span className="font-mono text-zinc-200">{durationSeconds}s</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>Tempo (BPM)</span>
                  <span className="font-mono text-zinc-200">{bpm} BPM</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={160}
                  step={2}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!isConfigured || isCurrentJobActive || !prompt.trim()}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs tracking-wider uppercase transition active:scale-98 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
          >
            {!isConfigured ? (
              <span>AI Music Generation is not configured</span>
            ) : isCurrentJobActive ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Audio Stems...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Generate Music Track</span>
              </>
            )}
          </button>

          {/* Job Progress */}
          {activeJob && activeJob.type === 'music_generation' && (
            <JobProgressCard
              job={activeJob}
              elapsedSeconds={elapsedSeconds}
              onCancel={onCancelJob}
              onRetry={onRetryJob}
            />
          )}
        </div>

        {/* Right Column: Audio Player & Waveform Visualizer (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">Track Preview & Waveform</span>
              <span className="text-[10px] font-mono text-zinc-400">
                {bpm} BPM • {durationSeconds}s
              </span>
            </div>

            {/* Waveform Player */}
            <div className="bg-[#0c0e14] border border-zinc-800 rounded-xl p-4 space-y-4">
              {latestOutput?.audioData || latestOutput?.audioUrl ? (
                <>
                  <audio
                    ref={audioRef}
                    src={latestOutput.audioData || latestOutput.audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />

                  {/* Synthetic Waveform Bars */}
                  <div className="h-20 flex items-center gap-1 justify-center px-2 bg-black/40 rounded-lg overflow-hidden border border-zinc-850">
                    {(latestOutput.waveformPeaks || Array.from({ length: 48 }, (_, i) => Math.sin(i * 0.25) * 0.5 + 0.5)).map((peak: number, i: number) => {
                      const dur = latestOutput.durationSeconds || durationSeconds;
                      const progress = currentTime / (dur || 1);
                      const isPlayed = i / 48 <= progress;

                      return (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all ${
                            isPlayed ? 'bg-amber-400' : 'bg-zinc-700'
                          }`}
                          style={{ height: `${Math.max(15, peak * 100)}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-zinc-400">
                      {Math.floor(currentTime)}s / {latestOutput.durationSeconds || durationSeconds}s
                    </span>

                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-black transition active:scale-95 shadow-sm shadow-amber-500/30"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                    </button>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      24-bit WAV
                    </span>
                  </div>
                </>
              ) : isCurrentJobActive ? (
                <div className="text-center p-6 space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                  <span className="text-xs font-semibold text-zinc-200 block">
                    Generating Harmonics & Beats
                  </span>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                    {activeJob?.stage || 'Synthesizing audio...'}
                  </p>
                </div>
              ) : (
                <div className="text-center p-8 space-y-2 text-zinc-600">
                  <Music className="w-8 h-8 mx-auto" />
                  <span className="text-xs font-medium block">No music generated yet</span>
                  <span className="text-[10px] text-zinc-500">Pick genre and click Generate</span>
                </div>
              )}
            </div>

            {/* Insertion Actions */}
            {(latestOutput?.audioData || latestOutput?.audioUrl) && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-300 block">VeeCut Asset Integration</span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAddToTimeline}
                    className="py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add to Audio Track</span>
                  </button>

                  <button
                    onClick={handleSaveToMediaPool}
                    className="py-2.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-zinc-700"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Save to Media Pool</span>
                  </button>
                </div>

                <a
                  href={latestOutput.audioData || latestOutput.audioUrl}
                  download="ai-music-score.wav"
                  className="w-full py-2 rounded-lg bg-[#0c0e14] hover:bg-zinc-850 text-zinc-300 text-xs font-medium transition flex items-center justify-center gap-1.5 border border-zinc-800 block text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download WAV File</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

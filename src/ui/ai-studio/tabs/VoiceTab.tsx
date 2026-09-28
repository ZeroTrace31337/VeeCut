/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Mic,
  Play,
  Pause,
  Plus,
  Download,
  Users,
  User,
  Sparkles,
  Layers,
  RefreshCw,
  MessageSquareText,
  Volume2,
} from 'lucide-react';
import { AiJob, VoiceConversationRequest } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { JobProgressCard } from '../components/JobProgressCard';
import { useAiStudioCapabilities } from '../../../domain/ai/studio/useAiStudioCapabilities';
import { ProviderStatusBanner } from '../components/ProviderStatusBanner';

interface VoiceTabProps {
  onStartJob: (type: 'voice_conversation', input: VoiceConversationRequest) => Promise<AiJob>;
  activeJob: AiJob | null;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  elapsedSeconds?: number;
}

const VOICES = [
  { id: 'Puck', label: 'Puck', desc: 'Warm, dynamic, articulate' },
  { id: 'Kore', label: 'Kore', desc: 'Clear, modern, engaging' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Deep, resonant, authoritative' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Smooth, friendly, conversational' },
  { id: 'Charon', label: 'Charon', desc: 'Cinematic, dramatic, grounded' },
];

const EMOTIONS = [
  'Enthusiastic',
  'Cinematic Narrator',
  'Curious Podcast Co-host',
  'Calm Tech Educator',
  'Inspiring Storyteller',
];

const DEFAULT_SCRIPT = `Alex: Welcome back to our creative workshop! Today we are exploring the new VeeCut AI Media Studio.
Sam: That's right! Every single asset you generate goes straight into the timeline with zero extra friction.
Alex: Exactly. Let's create something extraordinary together.`;

export const VoiceTab: React.FC<VoiceTabProps> = ({
  onStartJob,
  activeJob,
  onCancelJob,
  onRetryJob,
  elapsedSeconds = 0,
}) => {
  const { applyAIResultToTimeline, saveAIResultToMediaPool } = useEditor();
  const { isConfigured, getModel } = useAiStudioCapabilities();
  const modelInfo = getModel('voice_conversation');

  const [mode, setMode] = useState<'dialogue' | 'single'>('dialogue');
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [singleText, setSingleText] = useState(
    'Welcome to VeeCut Studio. Seamlessly assemble, color grade, and master your story with real-time AI tools.'
  );
  const [speakerA, setSpeakerA] = useState('Alex');
  const [speakerB, setSpeakerB] = useState('Sam');
  const [voiceA, setVoiceA] = useState('Puck');
  const [voiceB, setVoiceB] = useState('Kore');
  const [emotion, setEmotion] = useState('Enthusiastic');

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isCurrentJobActive = activeJob?.type === 'voice_conversation' && (activeJob.status === 'queued' || activeJob.status === 'processing');
  const latestOutput = activeJob?.type === 'voice_conversation' && activeJob.status === 'completed' ? activeJob.output : null;

  const handleGenerate = async () => {
    try {
      await onStartJob('voice_conversation', {
        mode,
        script: mode === 'dialogue' ? script : undefined,
        text: mode === 'single' ? singleText : undefined,
        speakerA,
        speakerB,
        voiceA,
        voiceB,
        emotion,
      });
      notifyToast('Synthesizing speech with Gemini 3.8 Flash Voice...', 'info');
    } catch (err: any) {
      notifyToast(err.message || 'Failed to synthesize voice conversation', 'error');
    }
  };

  const handleAddToTimeline = async () => {
    if (!latestOutput?.audioData && !latestOutput?.audioUrl) return;
    try {
      await applyAIResultToTimeline({
        title: latestOutput.title || 'AI Voice Track',
        type: 'Audio Mixing',
        audioData: latestOutput.audioData || latestOutput.audioUrl,
        durationSec: latestOutput.durationSec || 6,
      });
      notifyToast('Voice track placed on timeline audio track!', 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to add voice to timeline', 'error');
    }
  };

  const handleGenerateCaptionsFromVoice = async () => {
    if (!latestOutput?.cues || !Array.isArray(latestOutput.cues) || latestOutput.cues.length === 0) {
      notifyToast('No timed dialogue cues available for this generation.', 'warning');
      return;
    }

    try {
      await applyAIResultToTimeline({
        title: 'Voice Dialogue Subtitles',
        type: 'captions',
        captions: latestOutput.cues,
      });
      notifyToast('Synced subtitle clips created on timeline!', 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to place subtitles on timeline', 'error');
    }
  };

  const handleSaveToMediaPool = async () => {
    if (!latestOutput?.audioData && !latestOutput?.audioUrl) return;
    try {
      const asset = await saveAIResultToMediaPool({
        title: latestOutput.title || 'AI Voice Track',
        type: 'Audio Mixing',
        audioData: latestOutput.audioData || latestOutput.audioUrl,
        durationSec: latestOutput.durationSec || 6,
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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              Gemini 3.8 Flash Voice
            </span>
            <span className="text-[11px] font-mono text-zinc-500">Multi-Speaker Dialogue Engine</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">AI Voice & Conversation</h2>
          <p className="text-zinc-400 text-xs">
            Generate lifelike single-speaker voiceovers or multi-speaker podcast conversations directly into timeline audio tracks.
          </p>
        </div>
      </div>

      {/* Model Capability & Provider Status */}
      <ProviderStatusBanner
        model={modelInfo}
        isConfigured={isConfigured}
        featureTitle="AI Voice & Conversation"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Script & Voice Setup (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-[#121520] p-1.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setMode('dialogue')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'dialogue'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Multi-Speaker Dialogue</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'single'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Single Narration</span>
            </button>
          </div>

          {/* Script Editor */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <label className="text-xs font-bold text-zinc-200 block">
              {mode === 'dialogue' ? 'Dialogue Script (Speaker: Line)' : 'Narration Text'}
            </label>

            {mode === 'dialogue' ? (
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={5}
                placeholder="SpeakerA: Line 1...\nSpeakerB: Line 2..."
                className="w-full bg-[#0c0e14] border border-zinc-800 focus:border-emerald-500 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none font-mono leading-relaxed"
              />
            ) : (
              <textarea
                value={singleText}
                onChange={(e) => setSingleText(e.target.value)}
                rows={4}
                placeholder="Enter narration text to synthesize..."
                className="w-full bg-[#0c0e14] border border-zinc-800 focus:border-emerald-500 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
              />
            )}
          </div>

          {/* Voices Configuration */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-200 block">Voice Assignment & Persona</span>

            {mode === 'dialogue' ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Speaker A */}
                <div className="space-y-1.5 p-3 rounded-lg bg-[#0c0e14] border border-zinc-800">
                  <div className="flex justify-between items-center text-[11px] text-zinc-400">
                    <span className="font-semibold text-emerald-400">Speaker A</span>
                    <input
                      type="text"
                      value={speakerA}
                      onChange={(e) => setSpeakerA(e.target.value)}
                      className="bg-zinc-850 px-2 py-0.5 rounded text-[11px] text-white w-20 text-right focus:outline-none"
                    />
                  </div>
                  <select
                    value={voiceA}
                    onChange={(e) => setVoiceA(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id}>{v.label} ({v.desc})</option>
                    ))}
                  </select>
                </div>

                {/* Speaker B */}
                <div className="space-y-1.5 p-3 rounded-lg bg-[#0c0e14] border border-zinc-800">
                  <div className="flex justify-between items-center text-[11px] text-zinc-400">
                    <span className="font-semibold text-amber-400">Speaker B</span>
                    <input
                      type="text"
                      value={speakerB}
                      onChange={(e) => setSpeakerB(e.target.value)}
                      className="bg-zinc-850 px-2 py-0.5 rounded text-[11px] text-white w-20 text-right focus:outline-none"
                    />
                  </div>
                  <select
                    value={voiceB}
                    onChange={(e) => setVoiceB(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id}>{v.label} ({v.desc})</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Narrator Voice</label>
                <select
                  value={voiceA}
                  onChange={(e) => setVoiceA(e.target.value)}
                  className="w-full bg-[#0c0e14] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                >
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>{v.label} ({v.desc})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Persona / Tone */}
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Emotion & Speaking Style</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                className="w-full bg-[#0c0e14] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none"
              >
                {EMOTIONS.map((em) => (
                  <option key={em} value={em}>{em}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!isConfigured || isCurrentJobActive || (mode === 'dialogue' ? !script.trim() : !singleText.trim())}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs tracking-wider uppercase transition active:scale-98 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
          >
            {!isConfigured ? (
              <span>AI Voice Generation is not configured</span>
            ) : isCurrentJobActive ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Dialogue Acoustics...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Generate Voice Audio</span>
              </>
            )}
          </button>

          {/* Job Progress */}
          {activeJob && activeJob.type === 'voice_conversation' && (
            <JobProgressCard
              job={activeJob}
              elapsedSeconds={elapsedSeconds}
              onCancel={onCancelJob}
              onRetry={onRetryJob}
            />
          )}
        </div>

        {/* Right Column: Audio Playback & Dialogue Cues (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">Conversation Audio Player</span>
              <span className="text-[10px] font-mono text-zinc-400">
                {mode === 'dialogue' ? 'Dual-Speaker' : 'Single'}
              </span>
            </div>

            {/* Audio Player Card */}
            <div className="bg-[#0c0e14] border border-zinc-800 rounded-xl p-4 space-y-3">
              {latestOutput?.audioData || latestOutput?.audioUrl ? (
                <>
                  <audio
                    ref={audioRef}
                    src={latestOutput.audioData || latestOutput.audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />

                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-black transition active:scale-95 shadow-sm"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
                    </button>

                    <div className="flex flex-col text-right">
                      <span className="text-xs font-semibold text-zinc-200">
                        {latestOutput.title || 'Synthesized Speech'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        Duration: ~{latestOutput.durationSec || 5}s
                      </span>
                    </div>
                  </div>

                  {/* Dialogue breakdown */}
                  {latestOutput.cues && Array.isArray(latestOutput.cues) && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2 border-t border-zinc-850">
                      <span className="text-[10px] font-mono text-zinc-400">Dialogue Segments:</span>
                      {latestOutput.cues.map((c: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-zinc-900/60 border border-zinc-850 text-xs space-y-0.5">
                          <span className="font-bold text-[10px] text-emerald-400">{c.speaker}:</span>
                          <p className="text-zinc-300 text-[11px]">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : isCurrentJobActive ? (
                <div className="text-center p-6 space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <span className="text-xs font-semibold text-zinc-200 block">
                    Generating Vocal Harmonics
                  </span>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                    {activeJob?.stage || 'Synthesizing voice...'}
                  </p>
                </div>
              ) : (
                <div className="text-center p-8 space-y-2 text-zinc-600">
                  <Mic className="w-8 h-8 mx-auto" />
                  <span className="text-xs font-medium block">No voice generated yet</span>
                  <span className="text-[10px] text-zinc-500">Enter script and click Generate</span>
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
                    className="py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add to Audio Track</span>
                  </button>

                  <button
                    onClick={handleSaveToMediaPool}
                    className="py-2.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-zinc-700"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save to Media Pool</span>
                  </button>
                </div>

                {latestOutput.cues && (
                  <button
                    onClick={handleGenerateCaptionsFromVoice}
                    className="w-full py-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-emerald-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-emerald-500/30"
                  >
                    <MessageSquareText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Generate Subtitles for Timeline</span>
                  </button>
                )}

                <a
                  href={latestOutput.audioData || latestOutput.audioUrl}
                  download="ai-voice-conversation.wav"
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

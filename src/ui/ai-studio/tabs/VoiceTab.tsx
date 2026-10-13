/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
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
  Volume2,
  Zap,
  Globe,
} from 'lucide-react';
import { AiJob, VoiceConversationRequest } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { AIRouter } from '../../../lib/ai/router';
import { AIProviderId } from '../../../lib/ai/types';

interface VoiceTabProps {
  onStartJob: (type: 'voice_conversation', input: VoiceConversationRequest) => Promise<AiJob>;
  activeJob: AiJob | null;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  elapsedSeconds?: number;
}

const LANGUAGES = [
  { code: 'eng', name: 'English (US / UK)' },
  { code: 'urd', name: 'Urdu (اردو)' },
  { code: 'pus', name: 'Pashto (پښتو)' },
  { code: 'spa', name: 'Spanish (Español)' },
  { code: 'fra', name: 'French (Français)' },
  { code: 'deu', name: 'German (Deutsch)' },
  { code: 'ara', name: 'Arabic (العربية)' },
  { code: 'hin', name: 'Hindi (हिन्दी)' },
];

const DEFAULT_SCRIPT = `Alex: Welcome back to our creative workshop! Today we are exploring the new VeeCut AI Media Studio.
Sam: That's right! Every single asset you generate goes straight into the timeline with zero extra friction.
Alex: Exactly. Let's create something extraordinary together.`;

export const VoiceTab: React.FC<VoiceTabProps> = ({
  onStartJob,
  activeJob,
}) => {
  const { applyAIResultToTimeline, saveAIResultToMediaPool } = useEditor();

  const [providerId, setProviderId] = useState<AIProviderId>('local');
  const [language, setLanguage] = useState('eng');
  const [text, setText] = useState(
    'Welcome to VeeCut Studio. Seamlessly assemble, color grade, and master your story with zero-cost open-source AI.'
  );

  // Multi-speaker state (for Gemini option)
  const [isDialogueMode, setIsDialogueMode] = useState(false);
  const [script, setScript] = useState(DEFAULT_SCRIPT);

  // Audio Playback State
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [durationSec, setDurationSec] = useState<number>(5);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Local Voice options
  const [localVoices, setLocalVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        setLocalVoices(v);
        if (v.length > 0 && !selectedVoiceName) {
          setSelectedVoiceName(v[0].name);
        }
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoiceName]);

  const handleGenerate = async () => {
    if (isDialogueMode && providerId === 'gemini') {
      try {
        await onStartJob('voice_conversation', {
          mode: 'dialogue',
          script,
          speakerA: 'Alex',
          speakerB: 'Sam',
          voiceA: 'Puck',
          voiceB: 'Kore',
          emotion: 'Enthusiastic',
        });
        notifyToast('Synthesizing conversation with Gemini Flash Voice...', 'info');
      } catch (err: any) {
        notifyToast(err.message || 'Failed to synthesize conversation', 'error');
      }
      return;
    }

    if (!text.trim()) {
      notifyToast('Please enter text to synthesize.', 'warning');
      return;
    }

    setIsSynthesizing(true);
    try {
      const router = AIRouter.getInstance();
      const res = await router.generateSpeechTTS({
        text,
        language,
        voiceName: selectedVoiceName,
        providerId,
      });

      setAudioUrl(res.audioUrl);
      setDurationSec(res.durationSec);
      notifyToast(`Generated speech using ${res.provider === 'local' ? 'Local Browser Engine' : 'Meta MMS-TTS'}!`, 'success');
    } catch (err: any) {
      notifyToast(err.message || 'Speech synthesis failed', 'error');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleAddToTimeline = async () => {
    if (!audioUrl) return;
    try {
      await applyAIResultToTimeline({
        title: `AI Voice (${language.toUpperCase()})`,
        type: 'Audio Mixing',
        audioData: audioUrl,
        durationSec,
      });
      notifyToast('Voice track placed onto timeline!', 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to add to timeline', 'error');
    }
  };

  const handleSaveToMediaPool = async () => {
    if (!audioUrl) return;
    try {
      const asset = await saveAIResultToMediaPool({
        title: `AI Voice (${language.toUpperCase()})`,
        type: 'Audio Mixing',
        audioData: audioUrl,
        durationSec,
      });
      if (asset) {
        notifyToast(`Saved "${asset.name}" to Media Library!`, 'success');
      }
    } catch (e: any) {
      notifyToast(e.message || 'Failed to save to Media Library', 'error');
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
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            Meta MMS-TTS & Web Speech
          </span>
          <span className="text-[11px] font-mono text-zinc-500">FREE / LOCAL / Multilingual Voices</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
          <Mic className="w-5 h-5 text-emerald-400" />
          AI Text-to-Speech & Voice Generator
        </h2>
        <p className="text-zinc-400 text-xs">
          Generate realistic natural speech voiceovers at zero cost using local browser synthesis or Meta MMS-TTS with authentic English, Urdu, and Pashto pronunciations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Settings & Input (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400">Voice Synthesis Engine</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setProviderId('local');
                  setIsDialogueMode(false);
                }}
                className={`p-3 rounded-lg border text-left transition ${
                  providerId === 'local' && !isDialogueMode
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Local Browser</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    FREE / 0 COST
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">Zero latency, system voices, offline capable</p>
              </button>

              <button
                onClick={() => {
                  setProviderId('huggingface');
                  setIsDialogueMode(false);
                }}
                className={`p-3 rounded-lg border text-left transition ${
                  providerId === 'huggingface' && !isDialogueMode
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Meta MMS-TTS</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                    FREE TIER (HF)
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">Authentic Urdu, Pashto, English & global accents</p>
              </button>

              <button
                onClick={() => {
                  setProviderId('gemini');
                  setIsDialogueMode(true);
                }}
                className={`p-3 rounded-lg border text-left transition ${
                  isDialogueMode
                    ? 'bg-amber-500/15 border-amber-500/50 text-white'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Dual Dialogue</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    OPTIONAL PAID
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">Multi-speaker podcast conversation screenplay</p>
              </button>
            </div>
          </div>

          {/* Language Selector */}
          {!isDialogueMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#121520] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-hidden"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {providerId === 'local' && localVoices.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400">System Voice</label>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="w-full bg-[#121520] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-hidden"
                  >
                    {localVoices.slice(0, 15).map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Text input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400">
              {isDialogueMode ? 'Podcast Screenplay Script' : 'Speech Text'}
            </label>
            <textarea
              value={isDialogueMode ? script : text}
              onChange={(e) => (isDialogueMode ? setScript(e.target.value) : setText(e.target.value))}
              rows={5}
              placeholder="Enter voiceover script..."
              className="w-full bg-[#121520] border border-zinc-700/80 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500 font-medium"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isSynthesizing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-emerald-950/40"
          >
            {isSynthesizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
            <span>{isSynthesizing ? 'Synthesizing Voice...' : 'Generate Voice Audio'}</span>
          </button>
        </div>

        {/* Right: Audio Player & Action Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
              <Mic className="w-8 h-8" />
            </div>

            {audioUrl ? (
              <div className="w-full space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Synthesized Audio Clip</h4>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    Duration: ~{durationSec.toFixed(1)}s • Engine: {providerId.toUpperCase()}
                  </p>
                </div>

                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className="mx-auto flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition shadow-md"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? 'Pause Playback' : 'Listen to Voice'}</span>
                </button>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-zinc-800">
                  <a
                    href={audioUrl}
                    download="voiceover.wav"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download WAV</span>
                  </a>

                  <button
                    onClick={handleSaveToMediaPool}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Media Library</span>
                  </button>

                  <button
                    onClick={handleAddToTimeline}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Timeline</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-300">No Audio Generated Yet</p>
                <p className="text-[11px] text-zinc-500 max-w-xs">
                  Configure text, select engine (Local or Hugging Face MMS), and click Generate Voice Audio.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

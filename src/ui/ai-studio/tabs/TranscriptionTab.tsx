/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileAudio,
  Upload,
  Mic,
  Square as StopSquare,
  Play,
  Pause,
  Plus,
  Download,
  Copy,
  Check,
  Sparkles,
  FileText,
  RefreshCw,
  Clock,
  Layers,
  Edit2,
  Trash2,
  Zap,
} from 'lucide-react';
import { AiJob, AudioTranscriptionRequest, SubtitleCueItem } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { downloadSubtitleFile } from '../../../core/utils/subtitleParser';
import { AIRouter } from '../../../lib/ai/router';
import { AIProviderId, TranscriptCue } from '../../../lib/ai/types';

interface TranscriptionTabProps {
  onStartJob: (type: 'audio_to_transcript', input: AudioTranscriptionRequest) => Promise<AiJob>;
  activeJob: AiJob | null;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  elapsedSeconds?: number;
}

export const TranscriptionTab: React.FC<TranscriptionTabProps> = () => {
  const { project, applyAIResultToTimeline } = useEditor();

  const [providerId, setProviderId] = useState<AIProviderId>('local');
  const [language, setLanguage] = useState('en');
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [cues, setCues] = useState<SubtitleCueItem[]>([]);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setAudioBase64(evt.target.result);
        notifyToast(`Loaded audio file: ${file.name}`, 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setAudioBase64(reader.result);
            setAudioFileName('Microphone_Recording.webm');
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingMic(true);
      notifyToast('Microphone recording started...', 'info');
    } catch (e: any) {
      notifyToast(e.message || 'Microphone access denied', 'error');
    }
  };

  const handleStopMic = () => {
    if (mediaRecorderRef.current && isRecordingMic) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecordingMic(false);
      notifyToast('Microphone recording captured!', 'success');
    }
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);

    try {
      const router = AIRouter.getInstance();
      const res = await router.transcribeSpeech({
        audioBase64: audioBase64 || undefined,
        language,
        providerId,
      });

      if (res.cues && res.cues.length > 0) {
        setCues(res.cues);
        notifyToast(
          `Transcription complete (${res.cues.length} cues) using ${
            res.provider === 'local' ? 'Local Web Speech' : 'Hugging Face Whisper'
          }!`,
          'success'
        );
      } else {
        notifyToast('No speech detected in audio source.', 'warning');
      }
    } catch (err: any) {
      notifyToast(err.message || 'Transcription failed', 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Convert cues to SRT format
  const exportSRT = () => {
    if (cues.length === 0) return;
    const formatTime = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const millis = ms % 1000;
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
    };

    let srt = '';
    cues.forEach((cue, idx) => {
      srt += `${idx + 1}\n`;
      srt += `${formatTime(cue.startMs)} --> ${formatTime(cue.endMs)}\n`;
      srt += `${cue.text}\n\n`;
    });

    downloadSubtitleFile(srt, `${project.metadata?.name || 'project'}_captions.srt`);
    notifyToast('Downloaded .SRT subtitle file!', 'success');
  };

  // Convert cues to VTT format
  const exportVTT = () => {
    if (cues.length === 0) return;
    const formatTime = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      const millis = ms % 1000;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
    };

    let vtt = 'WEBVTT\n\n';
    cues.forEach((cue, idx) => {
      vtt += `${idx + 1}\n`;
      vtt += `${formatTime(cue.startMs)} --> ${formatTime(cue.endMs)}\n`;
      vtt += `${cue.text}\n\n`;
    });

    downloadSubtitleFile(vtt, `${project.metadata?.name || 'project'}_captions.vtt`);
    notifyToast('Downloaded .VTT subtitle file!', 'success');
  };

  const copyPlainText = () => {
    const text = cues.map((c) => c.text).join(' ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    notifyToast('Transcript text copied to clipboard!', 'success');
  };

  const handleApplyToTimeline = async () => {
    if (cues.length === 0) return;
    try {
      await applyAIResultToTimeline({
        title: 'AI Subtitles',
        type: 'captions',
        captions: cues,
      });
      notifyToast(`Generated ${cues.length} synchronized subtitle clips on timeline!`, 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to place subtitles on timeline', 'error');
    }
  };

  const updateCueText = (index: number, newText: string) => {
    const updated = [...cues];
    updated[index].text = newText;
    setCues(updated);
  };

  const deleteCue = (index: number) => {
    setCues(cues.filter((_, idx) => idx !== index));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            Whisper & Web Speech
          </span>
          <span className="text-[11px] font-mono text-zinc-500">FREE / LOCAL / Zero Cost</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-emerald-400" />
          AI Speech-to-Text & Subtitles
        </h2>
        <p className="text-zinc-400 text-xs">
          Automatic speech transcription with word-level timestamps. Operates locally in your browser at zero cost or via free Hugging Face Whisper inference.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input and Engine Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Engine Selector */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold text-zinc-200 block">1. Transcription Engine</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProviderId('local')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  providerId === 'local'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                    : 'bg-[#0c0e14] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Local Web Speech</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">100% Free, runs in browser</p>
              </button>

              <button
                type="button"
                onClick={() => setProviderId('huggingface')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  providerId === 'huggingface'
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                    : 'bg-[#0c0e14] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-cyan-300">
                  <FileAudio className="w-3.5 h-3.5" />
                  <span>Whisper v3 Turbo</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Hugging Face Free Tier</p>
              </button>
            </div>
          </div>

          {/* Audio Ingestion: File or Microphone */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-200 block">2. Audio Input</span>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*,video/*"
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-3 rounded-xl bg-[#0c0e14] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Upload Audio/Video</span>
              </button>

              {!isRecordingMic ? (
                <button
                  type="button"
                  onClick={handleStartMic}
                  className="py-3 px-3 rounded-xl bg-[#0c0e14] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span>Record Microphone</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopMic}
                  className="py-3 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition animate-pulse"
                >
                  <StopSquare className="w-4 h-4 text-rose-400" />
                  <span>Stop Recording</span>
                </button>
              )}
            </div>

            {audioFileName && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                <span className="truncate max-w-[220px] font-mono text-[11px]">{audioFileName}</span>
                <span className="text-[10px] text-emerald-400 font-bold">Ready</span>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-2">
            <label className="text-[11px] text-zinc-400 block font-medium">Source Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-[#0c0e14] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-500 font-semibold"
            >
              <option value="en">English (US/UK)</option>
              <option value="ur">Urdu (اردو)</option>
              <option value="ps">Pashto (پښتو)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
              <option value="ar">Arabic (العربية)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="auto">Auto-Detect</option>
            </select>
          </div>

          {/* Transcribe Button */}
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            {isTranscribing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Transcribing Audio...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Transcribe Speech (Zero Cost)</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Interactive Subtitle Editor & Timeline Bridge (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 flex flex-col justify-between min-h-[460px]">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Synchronized Transcript Cues</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {cues.length > 0
                      ? `${cues.length} timestamped cues extracted`
                      : 'No cues yet. Upload audio or record mic to begin.'}
                  </p>
                </div>

                {cues.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportSRT}
                      className="px-2.5 py-1 rounded bg-[#0c0e14] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition flex items-center gap-1"
                      title="Download SubRip .SRT file"
                    >
                      <Download className="w-3 h-3" />
                      <span>.SRT</span>
                    </button>
                    <button
                      onClick={exportVTT}
                      className="px-2.5 py-1 rounded bg-[#0c0e14] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition flex items-center gap-1"
                      title="Download WebVTT .VTT file"
                    >
                      <Download className="w-3 h-3" />
                      <span>.VTT</span>
                    </button>
                    <button
                      onClick={copyPlainText}
                      className="px-2.5 py-1 rounded bg-[#0c0e14] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Cue list */}
              {cues.length > 0 ? (
                <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
                  {cues.map((cue, index) => {
                    const startSec = (cue.startMs / 1000).toFixed(2);
                    const endSec = (cue.endMs / 1000).toFixed(2);
                    return (
                      <div
                        key={cue.id || index}
                        className="p-2.5 rounded-lg bg-[#0c0e14] border border-zinc-800/80 hover:border-zinc-700 transition flex items-start gap-2.5 text-xs group"
                      >
                        <span className="font-mono text-[10px] text-zinc-500 w-5 text-right shrink-0 mt-1">
                          {index + 1}
                        </span>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                            <span>
                              {startSec}s → {endSec}s
                            </span>
                            <span className="text-zinc-500 text-[9px]">
                              {((cue.endMs - cue.startMs) / 1000).toFixed(1)}s dur
                            </span>
                          </div>
                          <input
                            type="text"
                            value={cue.text}
                            onChange={(e) => updateCueText(index, e.target.value)}
                            className="w-full bg-transparent border-none text-zinc-200 text-xs focus:outline-hidden focus:bg-zinc-900/60 rounded px-1 -mx-1 font-medium"
                          />
                        </div>

                        <button
                          onClick={() => deleteCue(index)}
                          className="text-zinc-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition"
                          title="Delete cue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-300">Ready to Transcribe</h4>
                    <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                      Upload video/audio or record with your microphone. The AI will extract words with millisecond timecodes.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom: Timeline Bridge */}
            {cues.length > 0 && (
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Ready to edit on timeline</span>
                <button
                  onClick={handleApplyToTimeline}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Captions to Timeline Track</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

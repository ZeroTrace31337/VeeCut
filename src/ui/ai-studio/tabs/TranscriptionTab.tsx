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
} from 'lucide-react';
import { AiJob, AudioTranscriptionRequest, SubtitleCueItem } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { JobProgressCard } from '../components/JobProgressCard';
import { downloadSubtitleFile } from '../../../core/utils/subtitleParser';
import { useAiStudioCapabilities } from '../../../domain/ai/studio/useAiStudioCapabilities';
import { ProviderStatusBanner } from '../components/ProviderStatusBanner';

interface TranscriptionTabProps {
  onStartJob: (type: 'audio_to_transcript', input: AudioTranscriptionRequest) => Promise<AiJob>;
  activeJob: AiJob | null;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  elapsedSeconds?: number;
}

export const TranscriptionTab: React.FC<TranscriptionTabProps> = ({
  onStartJob,
  activeJob,
  onCancelJob,
  onRetryJob,
  elapsedSeconds = 0,
}) => {
  const { project, applyAIResultToTimeline } = useEditor();
  const { isConfigured, getModel } = useAiStudioCapabilities();
  const modelInfo = getModel('audio_to_transcript');

  const [language, setLanguage] = useState('en');
  const [style, setStyle] = useState('Karaoke Subtitles');
  const [contextHint, setContextHint] = useState('');
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [cues, setCues] = useState<SubtitleCueItem[]>([]);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const isCurrentJobActive = activeJob?.type === 'audio_to_transcript' && (activeJob.status === 'queued' || activeJob.status === 'processing');
  const latestOutput = activeJob?.type === 'audio_to_transcript' && activeJob.status === 'completed' ? activeJob.output : null;

  // Sync latest output cues if job finishes
  React.useEffect(() => {
    if (latestOutput?.captions && Array.isArray(latestOutput.captions)) {
      setCues(latestOutput.captions);
    }
  }, [latestOutput]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setAudioBase64(evt.target.result);
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
    if (!audioBase64) {
      notifyToast('Please upload an audio/video file or record audio with the microphone first to transcribe.', 'warning');
      return;
    }

    try {
      await onStartJob('audio_to_transcript', {
        audioData: audioBase64,
        language,
        style,
        contextHint: contextHint || (audioFileName ? `File: ${audioFileName}` : undefined),
      });
      notifyToast('Gemini 3.5 Transcribe job dispatched!', 'info');
    } catch (err: any) {
      notifyToast(err.message || 'Failed to dispatch transcription job', 'error');
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

    downloadSubtitleFile(srt, `${project.metadata.name || 'project'}_captions.srt`);
    notifyToast('Downloaded .SRT subtitle file!', 'success');
  };

  // Convert cues to VTT format
  const exportVTT = () => {
    if (cues.length === 0) return;
    const formatTime = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const millis = ms % 1000;
      const hrs = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
    };

    let vtt = 'WEBVTT\n\n';
    cues.forEach((cue, idx) => {
      vtt += `${idx + 1}\n`;
      vtt += `${formatTime(cue.startMs)} --> ${formatTime(cue.endMs)}\n`;
      vtt += `${cue.text}\n\n`;
    });

    downloadSubtitleFile(vtt, `${project.metadata.name || 'project'}_captions.vtt`);
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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              Speech Intelligence
            </span>
            <span className="text-[11px] font-mono text-zinc-500">gemini-3.5-transcribe</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">Audio → Transcript & Subtitles</h2>
          <p className="text-zinc-400 text-xs">
            Transcribe spoken video and audio clips into editable subtitle cues, with one-click placement on the VeeCut timeline.
          </p>
        </div>
      </div>

      {/* Model Capability & Provider Status */}
      <ProviderStatusBanner
        model={modelInfo}
        isConfigured={isConfigured}
        featureTitle="AI Speech Transcription"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Audio Source & Transcription Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Audio Input Box */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <label className="text-xs font-bold text-zinc-200 block">1. Audio Source</label>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-3 rounded-xl bg-[#0c0e14] hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Upload Audio/Video</span>
              </button>

              {!isRecordingMic ? (
                <button
                  type="button"
                  onClick={handleStartMic}
                  className="py-3 px-3 rounded-xl bg-[#0c0e14] hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition"
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
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-850 border border-zinc-800 text-xs text-zinc-300">
                <span className="truncate max-w-[220px] font-mono text-[11px]">{audioFileName}</span>
                <span className="text-[10px] text-emerald-400 font-bold">Ready</span>
              </div>
            )}
          </div>

          {/* Language & Context */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-200 block">2. Language & Style</span>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Source Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#0c0e14] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="en">English (US/UK)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
                <option value="ja">Japanese (日本語)</option>
                <option value="zh">Chinese (中文)</option>
                <option value="pt">Portuguese (Português)</option>
                <option value="auto">Auto-Detect Language</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Context / Dialogue Hint (Optional)</label>
              <input
                type="text"
                value={contextHint}
                onChange={(e) => setContextHint(e.target.value)}
                placeholder="e.g. Technical terminology, speaker names..."
                className="w-full bg-[#0c0e14] border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Transcribe Button */}
          <button
            onClick={handleTranscribe}
            disabled={!isConfigured || isCurrentJobActive}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs tracking-wider uppercase transition active:scale-98 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
          >
            {!isConfigured ? (
              <span>AI Audio Transcription is not configured</span>
            ) : isCurrentJobActive ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Transcribing Audio...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Transcribe with Gemini 3.5</span>
              </>
            )}
          </button>

          {/* Job Progress */}
          {activeJob && activeJob.type === 'audio_to_transcript' && (
            <JobProgressCard
              job={activeJob}
              elapsedSeconds={elapsedSeconds}
              onCancel={onCancelJob}
              onRetry={onRetryJob}
            />
          )}
        </div>

        {/* Right Column: Interactive Transcript Editor & Timeline Export (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-200">Interactive Transcript Cues</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-850 text-zinc-300">
                  {cues.length} Cue{cues.length !== 1 ? 's' : ''}
                </span>
              </div>

              {cues.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={copyPlainText}
                    className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition flex items-center gap-1"
                    title="Copy full transcript text"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={exportSRT}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono transition"
                    title="Export .SRT"
                  >
                    .SRT
                  </button>

                  <button
                    onClick={exportVTT}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono transition"
                    title="Export .VTT"
                  >
                    .VTT
                  </button>
                </div>
              )}
            </div>

            {/* Cues List */}
            {cues.length > 0 ? (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {cues.map((cue, idx) => {
                  const startSec = (cue.startMs / 1000).toFixed(2);
                  const endSec = (cue.endMs / 1000).toFixed(2);

                  return (
                    <div
                      key={cue.id || idx}
                      className="p-2.5 rounded-lg bg-[#0c0e14] border border-zinc-800 hover:border-zinc-700 space-y-1.5 group transition"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span className="text-emerald-400 font-bold">#{idx + 1}</span>
                        <span>{startSec}s → {endSec}s</span>
                      </div>

                      <input
                        type="text"
                        value={cue.text}
                        onChange={(e) => updateCueText(idx, e.target.value)}
                        className="w-full bg-transparent text-xs text-zinc-200 focus:text-white focus:outline-none border-b border-transparent focus:border-emerald-500 py-0.5"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-600 space-y-2 bg-[#0c0e14]">
                <FileText className="w-8 h-8 mx-auto" />
                <span className="text-xs font-semibold block text-zinc-400">No transcript generated yet</span>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Upload audio or record your voice, then click Transcribe to generate synced subtitle cues.
                </p>
              </div>
            )}

            {/* Timeline Placement Button */}
            {cues.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80">
                <button
                  onClick={handleApplyToTimeline}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Generate Subtitle Track on Timeline ({cues.length} Cues)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

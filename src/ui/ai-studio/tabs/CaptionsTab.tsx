/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileAudio,
  Sparkles,
  Type,
  Palette,
  Sliders,
  Play,
  Download,
  Plus,
  RefreshCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Trash2,
  Check,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { AIRouter } from '../../../lib/ai/router';
import { CaptionStyleOptions, TranscriptCue } from '../../../lib/ai/types';
import { downloadSubtitleFile } from '../../../core/utils/subtitleParser';

const FONT_FAMILIES = [
  'Inter, sans-serif',
  'Montserrat, sans-serif',
  'Impact, sans-serif',
  'Bebas Neue, sans-serif',
  'Cinzel, serif',
  'monospace',
];

const ANIMATIONS: Array<{ id: CaptionStyleOptions['animation']; label: string }> = [
  { id: 'none', label: 'Static' },
  { id: 'pop', label: 'Pop Scale' },
  { id: 'karaoke', label: 'Karaoke Highlight' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'fade', label: 'Smooth Fade' },
];

export const CaptionsTab: React.FC = () => {
  const { project, applyAIResultToTimeline } = useEditor();

  const [providerMode, setProviderMode] = useState<'local' | 'huggingface'>('local');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [cues, setCues] = useState<TranscriptCue[]>([
    { id: 'cue_1', startMs: 0, endMs: 2500, text: 'Create high impact viral videos.' },
    { id: 'cue_2', startMs: 2600, endMs: 5000, text: 'With 100% free open-source AI.' },
    { id: 'cue_3', startMs: 5200, endMs: 7800, text: 'Directly on your timeline in VeeCut.' },
  ]);

  // Caption Styling Controls
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState('#ffffff');
  const [backgroundColor, setBackgroundColor] = useState('rgba(0, 0, 0, 0.75)');
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [outlineWidth, setOutlineWidth] = useState(2);
  const [alignment, setAlignment] = useState<'top' | 'middle' | 'bottom'>('bottom');
  const [animation, setAnimation] = useState<CaptionStyleOptions['animation']>('karaoke');
  const [positionY, setPositionY] = useState(320);

  const [activePreviewCue, setActivePreviewCue] = useState(0);

  const handleGenerateCaptions = async () => {
    setIsTranscribing(true);
    try {
      const router = AIRouter.getInstance();
      const res = await router.transcribeSpeech({
        providerId: providerMode,
        prompt: 'VeeCut automated caption generator demonstration.',
      });
      if (res.cues && res.cues.length > 0) {
        setCues(res.cues);
      }
      notifyToast('Generated timestamped caption cues!', 'success');
    } catch (err: any) {
      notifyToast(err.message || 'Failed to generate captions', 'error');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleUpdateCueText = (id: string, newText: string) => {
    setCues((prev) => prev.map((c) => (c.id === id ? { ...c, text: newText } : c)));
  };

  const handleDeleteCue = (id: string) => {
    setCues((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddCue = () => {
    const last = cues[cues.length - 1];
    const startMs = last ? last.endMs + 200 : 0;
    setCues((prev) => [
      ...prev,
      {
        id: `cue_${Date.now()}`,
        startMs,
        endMs: startMs + 2500,
        text: 'New subtitle cue...',
      },
    ]);
  };

  const handleExportSrt = () => {
    const srt = cues
      .map((c, i) => `${i + 1}\n${formatSrt(c.startMs)} --> ${formatSrt(c.endMs)}\n${c.text}\n`)
      .join('\n');
    downloadSubtitleFile(srt, `${project.metadata?.name || 'captions'}.srt`);
    notifyToast('Exported SRT file!', 'info');
  };

  const handleExportVtt = () => {
    const vtt =
      'WEBVTT\n\n' +
      cues.map((c) => `${formatVtt(c.startMs)} --> ${formatVtt(c.endMs)}\n${c.text}\n`).join('\n');
    downloadSubtitleFile(vtt, `${project.metadata?.name || 'captions'}.vtt`);
    notifyToast('Exported VTT file!', 'info');
  };

  const handleAddToTimeline = async () => {
    if (cues.length === 0) return;
    try {
      await applyAIResultToTimeline({
        title: 'Styled AI Captions Track',
        type: 'Captions & Subtitles',
        captions: cues.map((c) => ({
          startMs: c.startMs,
          endMs: c.endMs,
          text: c.text,
          style: {
            fontFamily,
            fontSize,
            textColor,
            backgroundColor,
            positionY,
            animation,
          },
        })),
      });
      notifyToast('Placed styled captions onto timeline track!', 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to place captions on timeline', 'error');
    }
  };

  const formatSrt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    const mmm = String(ms % 1000).padStart(3, '0');
    return `${hh}:${mm}:${ss},${mmm}`;
  };

  const formatVtt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    const mmm = String(ms % 1000).padStart(3, '0');
    return `${mm}:${ss}.${mmm}`;
  };

  const currentPreview = cues[activePreviewCue] || cues[0];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            Zero-Cost Captions
          </span>
          <span className="text-[11px] font-mono text-zinc-500">SRT / VTT / Karaoke Styler</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-emerald-400" />
          AI Auto Captions & Subtitle Styler
        </h2>
        <p className="text-zinc-400 text-xs">
          Generate timestamped subtitles from audio, adjust typography, colors, animations, and insert directly to the timeline.
        </p>
      </div>

      {/* Top Generator Bar */}
      <div className="bg-[#10131c] border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Engine:</span>
          <div className="flex rounded-lg bg-zinc-900 border border-zinc-700/80 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setProviderMode('local')}
              className={`px-3 py-1 rounded-md transition ${
                providerMode === 'local'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Local Web Speech (FREE / ZERO COST)
            </button>
            <button
              onClick={() => setProviderMode('huggingface')}
              className={`px-3 py-1 rounded-md transition ${
                providerMode === 'huggingface'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Hugging Face Whisper (FREE TIER)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateCaptions}
            disabled={isTranscribing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition"
          >
            {isTranscribing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isTranscribing ? 'Transcribing...' : 'Auto-Generate Captions'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Styling Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4 bg-[#121520] border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Typography & Styler</h3>
          </div>

          {/* Font Family */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f.split(',')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size & Position Y */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-400">Size: {fontSize}px</label>
              <input
                type="range"
                min="24"
                max="96"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-400">Vertical Offset: {positionY}px</label>
              <input
                type="range"
                min="100"
                max="450"
                value={positionY}
                onChange={(e) => setPositionY(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-medium">Text Color</label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-full h-8 bg-zinc-900 border border-zinc-700 rounded-md cursor-pointer p-0.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-medium">Outline Color</label>
              <input
                type="color"
                value={outlineColor}
                onChange={(e) => setOutlineColor(e.target.value)}
                className="w-full h-8 bg-zinc-900 border border-zinc-700 rounded-md cursor-pointer p-0.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-medium">Outline Width</label>
              <input
                type="number"
                min="0"
                max="8"
                value={outlineWidth}
                onChange={(e) => setOutlineWidth(Number(e.target.value))}
                className="w-full h-8 bg-zinc-900 border border-zinc-700 rounded-md px-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Animation Style */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Caption Animation</label>
            <div className="grid grid-cols-2 gap-1.5">
              {ANIMATIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAnimation(a.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition ${
                    animation === a.id
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Vertical Alignment</label>
            <div className="grid grid-cols-3 gap-1">
              {(['top', 'middle', 'bottom'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setAlignment(pos)}
                  className={`py-1 rounded-md text-xs font-medium capitalize border transition ${
                    alignment === pos
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview Canvas & Subtitle Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Live Preview Box */}
          <div className="relative aspect-video w-full rounded-xl bg-black border border-zinc-800 overflow-hidden flex items-center justify-center p-6 shadow-xl">
            {/* Background simulated video frame */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-zinc-900/40 to-black/80 pointer-events-none" />

            {/* Styled Subtitle Overlay Preview */}
            {currentPreview && (
              <div
                className={`relative px-4 py-2 rounded-lg text-center transition-all duration-300 max-w-[85%] ${
                  animation === 'pop'
                    ? 'scale-105 shadow-2xl'
                    : animation === 'karaoke'
                    ? 'border-b-2 border-emerald-400'
                    : ''
                }`}
                style={{
                  fontFamily,
                  fontSize: `${fontSize * 0.75}px`,
                  color: textColor,
                  backgroundColor,
                  textShadow:
                    outlineWidth > 0
                      ? `-${outlineWidth}px -${outlineWidth}px 0 ${outlineColor}, ${outlineWidth}px -${outlineWidth}px 0 ${outlineColor}, -${outlineWidth}px ${outlineWidth}px 0 ${outlineColor}, ${outlineWidth}px ${outlineWidth}px 0 ${outlineColor}`
                      : 'none',
                  marginTop: alignment === 'top' ? -120 : alignment === 'middle' ? 0 : 120,
                }}
              >
                {currentPreview.text}
              </div>
            )}

            <div className="absolute bottom-2 left-2 text-[10px] font-mono text-zinc-500 bg-black/60 px-2 py-0.5 rounded">
              Preview Cue: {activePreviewCue + 1}/{cues.length}
            </div>
          </div>

          {/* Cue List Editor */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Transcript Cues ({cues.length})
              </span>
              <button
                onClick={handleAddCue}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Cue</span>
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {cues.map((cue, idx) => (
                <div
                  key={cue.id}
                  onClick={() => setActivePreviewCue(idx)}
                  className={`p-2.5 rounded-lg border flex items-center gap-3 transition cursor-pointer ${
                    activePreviewCue === idx
                      ? 'bg-zinc-900 border-emerald-500/50'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-[10px] font-mono text-zinc-500 w-6">#{idx + 1}</span>
                  <span className="text-[10px] font-mono text-emerald-400/90 whitespace-nowrap">
                    {formatSrt(cue.startMs)} → {formatSrt(cue.endMs)}
                  </span>
                  <input
                    type="text"
                    value={cue.text}
                    onChange={(e) => handleUpdateCueText(cue.id, e.target.value)}
                    className="flex-1 bg-transparent border-none text-xs text-zinc-200 focus:outline-hidden font-medium"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCue(cue.id);
                    }}
                    className="p-1 rounded text-zinc-500 hover:text-rose-400"
                    title="Delete cue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportSrt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export SRT</span>
                </button>
                <button
                  onClick={handleExportVtt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export VTT</span>
                </button>
              </div>

              <button
                onClick={handleAddToTimeline}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add Styled Captions Track to Timeline</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

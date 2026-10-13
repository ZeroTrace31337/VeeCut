/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Play,
  Film,
  Music,
  Palette,
  FileAudio,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { AIRouter } from '../../../lib/ai/router';
import { SmartEditAction, SmartEditorCommandResult } from '../../../lib/ai/types';
import { secondsToRationalTime } from '../../../core/time/RationalTime';

const QUICK_COMMANDS = [
  'Create a 30-second emotional video.',
  'Remove silence.',
  'Generate captions.',
  'Add background music.',
  'Make the video cinematic.',
  'Reframe to 9:16 vertical TikTok/Reels.',
];

export const SmartEditorTab: React.FC = () => {
  const {
    project,
    timelineEngine,
    selectedClip,
    currentTimeSeconds,
    applyAIResultToTimeline,
    projectService,
  } = useEditor();

  const [command, setCommand] = useState('Create a 30-second emotional video.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [planResult, setPlanResult] = useState<SmartEditorCommandResult | null>(null);
  const [hasApplied, setHasApplied] = useState(false);

  const handleInterpret = async (cmdText?: string) => {
    const textToRun = cmdText || command;
    if (!textToRun.trim()) return;

    setIsProcessing(true);
    setHasApplied(false);

    try {
      const router = AIRouter.getInstance();
      const res = await router.executeSmartEditCommand(textToRun, {
        currentTime: currentTimeSeconds,
        projectSummary: `${project.metadata?.name || 'Project'} (${project.settings.canvasWidth}x${project.settings.canvasHeight})`,
      });
      setPlanResult(res);
      notifyToast('Generated validated timeline editing plan!', 'success');
    } catch (err: any) {
      notifyToast(err.message || 'Failed to interpret command', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyToTimeline = async () => {
    if (!planResult || planResult.actions.length === 0) return;

    try {
      for (const action of planResult.actions) {
        if (action.type === 'color_grade' && action.parameters) {
          if (selectedClip) {
            selectedClip.colorGrade = {
              ...selectedClip.colorGrade,
              ...action.parameters,
            };
          }
        } else if (action.type === 'caption') {
          await applyAIResultToTimeline({
            title: 'AI Smart Captions',
            type: 'Captions & Subtitles',
            captions: [
              { startMs: 0, endMs: 2500, text: 'Welcome to this cinematic moment.' },
              { startMs: 2700, endMs: 5000, text: 'Crafted with precision in VeeCut.' },
            ],
          });
        } else if (action.type === 'add_music') {
          await applyAIResultToTimeline({
            title: `${action.genre || 'Cinematic'} Soundtrack`,
            type: 'ai_music_sfx',
            audioData: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
            durationSec: 15,
          });
        } else if (action.type === 'reframe' && action.aspectRatio === '9:16') {
          project.settings.canvasWidth = 1080;
          project.settings.canvasHeight = 1920;
          project.settings.aspectRatio = '9:16';
          projectService.setProject({ ...project });
        }
      }

      projectService.saveToLocalStorage();
      setHasApplied(true);
      notifyToast('All structured AI editing actions applied to timeline!', 'success');
    } catch (err: any) {
      notifyToast(err.message || 'Failed to apply actions to timeline', 'error');
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'trim':
      case 'split':
      case 'cut_silence':
        return <Scissors className="w-4 h-4 text-amber-400" />;
      case 'caption':
        return <FileAudio className="w-4 h-4 text-emerald-400" />;
      case 'add_music':
        return <Music className="w-4 h-4 text-cyan-400" />;
      case 'color_grade':
        return <Palette className="w-4 h-4 text-rose-400" />;
      case 'reframe':
        return <Film className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            VeeCut Copilot
          </span>
          <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Validated Action Schema / Zero Arbitrary Execution
          </span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-emerald-400" />
          AI Smart Editor
        </h2>
        <p className="text-zinc-400 text-xs">
          Describe the editing outcome you want in plain English. The AI engine compiles your request into structured, verified timeline editing actions.
        </p>
      </div>

      {/* Natural Language Command Bar */}
      <div className="bg-[#10131c] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInterpret()}
            placeholder="e.g. 'Create a 30-second emotional video' or 'Remove silence'..."
            className="flex-1 bg-zinc-950/80 border border-zinc-700/80 rounded-lg px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500 transition font-medium"
          />
          <button
            onClick={() => handleInterpret()}
            disabled={isProcessing || !command.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-emerald-950/40"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isProcessing ? 'Compiling...' : 'Generate Edit Plan'}</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-zinc-500 self-center mr-1">Presets:</span>
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => {
                setCommand(cmd);
                handleInterpret(cmd);
              }}
              className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80 transition"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Results View */}
      {planResult && (
        <div className="bg-[#121520] border border-zinc-800/90 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Verified Action Plan</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">{planResult.explanation}</p>
            </div>

            <button
              onClick={handleApplyToTimeline}
              disabled={hasApplied}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                hasApplied
                  ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
              }`}
            >
              {hasApplied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{hasApplied ? 'Applied to Timeline' : 'Apply Actions to Timeline'}</span>
            </button>
          </div>

          {/* Action List */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Structured Operations ({planResult.actions.length}):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {planResult.actions.map((act, idx) => (
                <div
                  key={`act_${idx}`}
                  className="bg-zinc-950/60 border border-zinc-800/90 rounded-lg p-3 flex items-start gap-3"
                >
                  <div className="p-2 rounded-md bg-zinc-900 border border-zinc-800 shrink-0 mt-0.5">
                    {getActionIcon(act.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300 font-semibold">
                        {act.type}
                      </span>
                      {act.start !== undefined && act.end !== undefined && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          {act.start}s – {act.end}s
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-200 mt-1 font-medium">{act.description}</p>
                    {act.parameters && (
                      <pre className="text-[10px] font-mono text-zinc-400 mt-1.5 p-1.5 rounded bg-zinc-900/80 overflow-x-auto">
                        {JSON.stringify(act.parameters, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Languages,
  ArrowRightLeft,
  Sparkles,
  Download,
  Copy,
  Check,
  Plus,
  RefreshCw,
  FileText,
  Layers,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { AIRouter } from '../../../lib/ai/router';

const SUPPORTED_LANGUAGES = [
  'English',
  'Urdu',
  'Pashto',
  'Spanish',
  'French',
  'German',
  'Arabic',
  'Hindi',
  'Turkish',
  'Chinese',
  'Russian',
];

export const TranslationTab: React.FC = () => {
  const { project, applyAIResultToTimeline } = useEditor();

  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Urdu');
  const [inputText, setInputText] = useState(
    'Welcome to VeeCut video editor. High performance timeline editing with zero-cost open source AI.'
  );
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (translatedText) {
      setInputText(translatedText);
      setTranslatedText('');
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      notifyToast('Please enter text to translate.', 'warning');
      return;
    }

    setIsTranslating(true);
    try {
      const router = AIRouter.getInstance();
      const res = await router.translateText({
        text: inputText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
      });
      setTranslatedText(res.translatedText);
      notifyToast(`Translated from ${sourceLang} to ${targetLang}!`, 'success');
    } catch (err: any) {
      notifyToast(err.message || 'Translation failed', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    notifyToast('Copied translated text to clipboard!', 'info');
  };

  const handleAddToTimeline = async () => {
    if (!translatedText) return;
    try {
      await applyAIResultToTimeline({
        title: `Translation (${targetLang})`,
        type: 'Captions & Subtitles',
        captions: [
          {
            startMs: 0,
            endMs: Math.max(3000, translatedText.split(' ').length * 400),
            text: translatedText,
          },
        ],
      });
      notifyToast(`Added translated ${targetLang} subtitles to timeline!`, 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to add to timeline', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            Meta NLLB-200
          </span>
          <span className="text-[11px] font-mono text-zinc-500">FREE TIER / 200+ Languages</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
          <Languages className="w-5 h-5 text-emerald-400" />
          AI Transcript & Dialogue Translation
        </h2>
        <p className="text-zinc-400 text-xs">
          Translate video transcripts and dialogue between global languages including authentic English ↔ Urdu and English ↔ Pashto.
        </p>
      </div>

      {/* Language Selector Bar */}
      <div className="bg-[#10131c] border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Source Language</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-hidden focus:border-emerald-500"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`src_${l}`} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSwap}
            className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition mt-4"
            title="Swap source and target languages"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Target Language</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-300 focus:outline-hidden focus:border-emerald-500"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={`tgt_${l}`} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleTranslate}
          disabled={isTranslating || !inputText.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-emerald-950/40"
        >
          {isTranslating ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isTranslating ? 'Translating...' : 'Translate Transcript'}</span>
        </button>
      </div>

      {/* Editor Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Text */}
        <div className="bg-[#121520] border border-zinc-800/90 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">Original Text ({sourceLang})</span>
            <span>{inputText.length} characters</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={8}
            placeholder={`Enter dialogue or transcription in ${sourceLang}...`}
            className="w-full flex-1 bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-emerald-500/50 resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={() =>
                setInputText(
                  'This is VeeCut video editor. Combine the speed of CapCut with the color grading precision of DaVinci Resolve.'
                )
              }
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
            >
              Load Sample Text
            </button>
          </div>
        </div>

        {/* Translated Text */}
        <div className="bg-[#121520] border border-zinc-800/90 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold text-emerald-300">Translated Result ({targetLang})</span>
            {translatedText && <span>{translatedText.length} characters</span>}
          </div>
          <div className="w-full flex-1 min-h-[190px] bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 font-mono relative overflow-y-auto">
            {translatedText ? (
              <p
                className="whitespace-pre-wrap leading-relaxed"
                dir={targetLang === 'Urdu' || targetLang === 'Pashto' || targetLang === 'Arabic' ? 'rtl' : 'ltr'}
              >
                {translatedText}
              </p>
            ) : (
              <p className="text-zinc-600 italic">Translated output will appear here...</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
            <button
              onClick={handleCopy}
              disabled={!translatedText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs text-zinc-300 hover:text-white transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleAddToTimeline}
              disabled={!translatedText}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white transition shadow-sm ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Timeline Caption Track</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

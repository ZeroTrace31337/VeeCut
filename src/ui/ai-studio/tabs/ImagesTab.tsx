/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Wand2,
  Upload,
  Plus,
  Download,
  Clapperboard,
  Sparkles,
  Layers,
  RefreshCw,
  Compass,
  Sliders,
  Check,
} from 'lucide-react';
import { AiJob, ImageGenRequest, ImageEditRequest } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { JobProgressCard } from '../components/JobProgressCard';
import { useAiStudioCapabilities } from '../../../domain/ai/studio/useAiStudioCapabilities';
import { ProviderStatusBanner } from '../components/ProviderStatusBanner';

interface ImagesTabProps {
  onStartJob: (type: 'image_generation' | 'image_editing', input: any) => Promise<AiJob>;
  activeJob: AiJob | null;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  elapsedSeconds?: number;
  onAnimateWithVeo: (imageData: string) => void;
}

const IMAGE_STYLES = [
  'Cinematic',
  'Photorealistic',
  'Anime & Manga',
  'Cyberpunk Neon',
  '3D Render Octane',
  'Vintage 35mm Film',
  'Oil Painting',
  'Minimalist Vector',
];

const SUGGESTIONS = [
  'Cinematic film still, photorealistic dramatic sunset over jagged alpine peaks with volumetric mist, anamorphic lens flare',
  'Futuristic cybernetic city intersection at night with neon holographic billboards and flying vehicles, rain reflections',
  'Macro shot of morning dew droplets on a vibrant emerald monstera leaf, soft morning bokeh lighting',
];

export const ImagesTab: React.FC<ImagesTabProps> = ({
  onStartJob,
  activeJob,
  onCancelJob,
  onRetryJob,
  elapsedSeconds = 0,
  onAnimateWithVeo,
}) => {
  const { project, applyAIResultToTimeline, saveAIResultToMediaPool } = useEditor();
  const { isConfigured, getModel } = useAiStudioCapabilities();
  const modelInfo = getModel(mode === 'generate' ? 'image_generation' : 'image_editing');

  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [prompt, setPrompt] = useState(
    'Cinematic film still, photorealistic dramatic sunset over jagged alpine peaks with volumetric mist, anamorphic lens flare'
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3'>('16:9');
  const [style, setStyle] = useState('Cinematic');

  // Edit Mode state
  const [baseImage, setBaseImage] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState('Add volumetric neon fog and soft anamorphic lens flare');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCurrentJobActive =
    (activeJob?.type === 'image_generation' || activeJob?.type === 'image_editing') &&
    (activeJob.status === 'queued' || activeJob.status === 'processing');
  const latestOutput =
    (activeJob?.type === 'image_generation' || activeJob?.type === 'image_editing') &&
    activeJob.status === 'completed'
      ? activeJob.output
      : null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setBaseImage(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (mode === 'generate') {
      if (!prompt.trim()) return;
      try {
        await onStartJob('image_generation', {
          prompt,
          aspectRatio,
          style,
        });
        notifyToast('Generating image with Gemini 3.1 Flash Image...', 'info');
      } catch (err: any) {
        notifyToast(err.message || 'Failed to generate image', 'error');
      }
    } else {
      if (!baseImage) {
        notifyToast('Please upload or select a base image to edit.', 'warning');
        return;
      }
      try {
        await onStartJob('image_editing', {
          imageData: baseImage,
          editPrompt,
          mode: 'neural_edit',
        });
        notifyToast('Editing image with Gemini neural editor...', 'info');
      } catch (err: any) {
        notifyToast(err.message || 'Failed to edit image', 'error');
      }
    }
  };

  const handleAddToTimeline = async () => {
    if (!latestOutput?.imageUrl) return;
    try {
      await applyAIResultToTimeline({
        title: latestOutput.title || 'AI Image Asset',
        type: 'ai_image_gen',
        imageUrl: latestOutput.imageUrl,
        durationSec: 4,
      });
      notifyToast('Image placed on timeline track!', 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to place image on timeline', 'error');
    }
  };

  const handleSaveToMediaPool = async () => {
    if (!latestOutput?.imageUrl) return;
    try {
      const asset = await saveAIResultToMediaPool({
        title: latestOutput.title || 'AI Image Asset',
        type: 'ai_image_gen',
        imageUrl: latestOutput.imageUrl,
        durationSec: 4,
      });
      if (asset) {
        notifyToast(`Saved "${asset.name}" to Media Pool!`, 'success');
      }
    } catch (e: any) {
      notifyToast(e.message || 'Failed to save to Media Pool', 'error');
    }
  };

  const handleAnimateBridge = () => {
    if (latestOutput?.imageUrl) {
      onAnimateWithVeo(latestOutput.imageUrl);
      notifyToast('Sent image to Veo Image-to-Video Studio!', 'info');
    }
  };

  const imageAssets = project?.mediaPool?.filter((a) => a.type === 'image') || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
              Gemini 3.1 Flash Image
            </span>
            <span className="text-[11px] font-mono text-zinc-500">Raster Synthesis & Inpainting</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">AI Image Generation & Editing</h2>
          <p className="text-zinc-400 text-xs">
            Generate high-resolution background plates, visual assets, or modify existing images with natural language instructions.
          </p>
        </div>
      </div>

      {/* Model Capability & Provider Status */}
      <ProviderStatusBanner
        model={modelInfo}
        isConfigured={isConfigured}
        featureTitle={mode === 'generate' ? 'AI Image Generation' : 'AI Image Editing'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Generator Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-[#121520] p-1.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setMode('generate')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'generate'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Text to Image</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                mode === 'edit'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Wand2 className="w-4 h-4 text-amber-400" />
              <span>Image-to-Image Editing</span>
            </button>
          </div>

          {mode === 'generate' ? (
            <>
              {/* Text to Image Prompt */}
              <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200">Creative Image Prompt</label>
                  <button
                    type="button"
                    onClick={() => {
                      const random = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
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
                  placeholder="Describe your scene in detail: lighting, perspective, subject, atmosphere..."
                  className="w-full bg-[#0c0e14] border border-zinc-800 focus:border-amber-500 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Aspect Ratio & Style */}
              <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-zinc-200 block">Aspect Ratio & Style</span>

                <div className="grid grid-cols-4 gap-2">
                  {(['16:9', '9:16', '1:1', '4:3'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setAspectRatio(r)}
                      className={`py-2 rounded-lg text-xs font-semibold border text-center transition ${
                        aspectRatio === r
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-[#0c0e14] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Rendering Aesthetic</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-[#0c0e14] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    {IMAGE_STYLES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Image to Image Editing Controls */}
              <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200">1. Base Image to Edit</label>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {baseImage ? (
                  <div className="relative aspect-video max-h-52 bg-black rounded-lg overflow-hidden border border-zinc-700 group">
                    <img src={baseImage} alt="Base" className="w-full h-full object-cover" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition"
                    >
                      Replace Image
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 rounded-xl p-8 text-center cursor-pointer bg-[#0c0e14] transition"
                  >
                    <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <span className="text-xs font-semibold text-zinc-300 block">Click to upload base image</span>
                    <span className="text-[10px] text-zinc-500">PNG, JPG, WEBP</span>
                  </div>
                )}

                {/* Media Pool Picker */}
                {imageAssets.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                    <span className="text-[10px] text-zinc-400 font-medium">Or choose from Media Pool:</span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {imageAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => setBaseImage(asset.uri)}
                          className="w-14 h-10 rounded bg-zinc-900 border border-zinc-800 hover:border-amber-400 overflow-hidden shrink-0 transition"
                          title={asset.name}
                        >
                          <img src={asset.thumbnailUrl || asset.uri} alt={asset.name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-zinc-200 block">2. Edit Instructions</label>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Add glowing neon volumetric mist, remove background object, change daytime to dramatic night..."
                  className="w-full bg-[#0c0e14] border border-zinc-800 focus:border-amber-500 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </>
          )}

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={!isConfigured || isCurrentJobActive || (mode === 'generate' ? !prompt.trim() : !baseImage || !editPrompt.trim())}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs tracking-wider uppercase transition active:scale-98 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
          >
            {!isConfigured ? (
              <span>AI Image Generation is not configured</span>
            ) : isCurrentJobActive ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{mode === 'generate' ? 'Synthesizing Image...' : 'Applying Edits...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black" />
                <span>{mode === 'generate' ? 'Generate Image' : 'Apply AI Image Edit'}</span>
              </>
            )}
          </button>

          {/* Job Progress */}
          {activeJob && (activeJob.type === 'image_generation' || activeJob.type === 'image_editing') && (
            <JobProgressCard
              job={activeJob}
              elapsedSeconds={elapsedSeconds}
              onCancel={onCancelJob}
              onRetry={onRetryJob}
            />
          )}
        </div>

        {/* Right Column: Output Image Preview & Bridges (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">Image Output Preview</span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                {aspectRatio}
              </span>
            </div>

            {/* Image Canvas Box */}
            <div
              className={`w-full bg-black rounded-xl overflow-hidden border border-zinc-800 relative flex items-center justify-center ${
                aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[280px] mx-auto' : 'aspect-video'
              }`}
            >
              {latestOutput?.imageUrl ? (
                <img
                  src={latestOutput.imageUrl}
                  alt="Generated or edited"
                  className="w-full h-full object-cover"
                />
              ) : isCurrentJobActive ? (
                <div className="text-center p-6 space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                  <span className="text-xs font-semibold text-zinc-200 block">
                    Generating High-Resolution Image
                  </span>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                    {activeJob?.stage || 'Optimizing details...'}
                  </p>
                </div>
              ) : (
                <div className="text-center p-8 space-y-2 text-zinc-600">
                  <ImageIcon className="w-8 h-8 mx-auto" />
                  <span className="text-xs font-medium block">No image output yet</span>
                  <span className="text-[10px] text-zinc-500">Enter prompt and click Generate</span>
                </div>
              )}
            </div>

            {/* Seamless Cross-Tool Bridges & Timeline Placement */}
            {latestOutput?.imageUrl && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-300 block">VeeCut Studio Actions</span>

                {/* 1-Click Bridge: Animate image with Veo 3 */}
                <button
                  onClick={handleAnimateBridge}
                  className="w-full py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <Clapperboard className="w-4 h-4 stroke-[2.5]" />
                  <span>Animate with Veo (Image → Video)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAddToTimeline}
                    className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-zinc-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Timeline</span>
                  </button>

                  <button
                    onClick={handleSaveToMediaPool}
                    className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-zinc-700"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Save to Media Pool</span>
                  </button>
                </div>

                <a
                  href={latestOutput.imageUrl}
                  download="ai-generated-image.png"
                  className="w-full py-2 rounded-lg bg-[#0c0e14] hover:bg-zinc-850 text-zinc-300 text-xs font-medium transition flex items-center justify-center gap-1.5 border border-zinc-800 block text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download High-Res PNG</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

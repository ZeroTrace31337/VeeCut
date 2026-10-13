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
  Sliders,
  Check,
  Scissors,
  Zap,
  ArrowRight,
  Eye,
  XCircle,
} from 'lucide-react';
import { AiJob } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { AIRouter } from '../../../lib/ai/router';
import { AIProviderId, GeneratedImageItem } from '../../../lib/ai/types';

interface ImagesTabProps {
  onStartJob: (type: 'image_generation' | 'image_editing', input: any) => Promise<AiJob>;
  activeJob: AiJob | null;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  elapsedSeconds?: number;
  onAnimateWithVeo: (imageData: string) => void;
}

type ImageSubTool = 'generate' | 'bg_removal' | 'enhance' | 'edit';

const MODELS = [
  {
    id: 'black-forest-labs/FLUX.1-schnell',
    name: 'FLUX.1 Schnell (Hugging Face)',
    badge: 'FREE TIER',
    provider: 'huggingface' as AIProviderId,
  },
  {
    id: 'stabilityai/sd-turbo',
    name: 'SD-Turbo (Hugging Face)',
    badge: 'FREE TIER',
    provider: 'huggingface' as AIProviderId,
  },
  {
    id: 'runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion v1.5 (Hugging Face)',
    badge: 'FREE TIER',
    provider: 'huggingface' as AIProviderId,
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Gemini Flash Image (Google)',
    badge: 'OPTIONAL PAID',
    provider: 'gemini' as AIProviderId,
  },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Vertical' },
  { id: '1:1', label: '1:1 Square' },
  { id: '4:3', label: '4:3 Standard' },
  { id: '3:4', label: '3:4 Portrait' },
];

const RESOLUTIONS = ['512x512', '768x768', '1024x1024'];

const SAMPLE_PROMPTS = [
  'Cinematic film still, dramatic golden hour sunset over jagged alpine peaks with volumetric mist, anamorphic lens flare',
  'Cyberpunk neon rain-slicked boulevard with holographic signs and vintage sports car, photorealistic 8k',
  'Studio portrait photography of a cinematic character in dramatic chiaroscuro lighting, sharp focus',
];

export const ImagesTab: React.FC<ImagesTabProps> = ({
  onAnimateWithVeo,
}) => {
  const { applyAIResultToTimeline, saveAIResultToMediaPool } = useEditor();

  const [activeSubTool, setActiveSubTool] = useState<ImageSubTool>('generate');

  // Generator State
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [negativePrompt, setNegativePrompt] = useState('blurry, distorted, low quality, artifacts');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3' | '3:4'>('16:9');
  const [resolution, setResolution] = useState<'512x512' | '768x768' | '1024x1024'>('1024x1024');
  const [numImages, setNumImages] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  // Background Removal State
  const [bgInputImage, setBgInputImage] = useState<string>('');
  const [bgMode, setBgMode] = useState<'transparent' | 'greenscreen' | 'blur'>('transparent');
  const [feather, setFeather] = useState(2);
  const [bgResultImage, setBgResultImage] = useState<string>('');
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  // Enhancement State
  const [enhInputImage, setEnhInputImage] = useState<string>('');
  const [enhType, setEnhType] = useState<'super_resolution' | 'sharpen' | 'denoise'>('super_resolution');
  const [scaleFactor, setScaleFactor] = useState<2 | 4>(2);
  const [enhResultImage, setEnhResultImage] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [beforeAfterSlider, setBeforeAfterSlider] = useState(50);

  const fileInputBgRef = useRef<HTMLInputElement>(null);
  const fileInputEnhRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // 1. Generate Image Handler
  // -------------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    const modelObj = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

    try {
      const router = AIRouter.getInstance();
      const result = await router.generateImage({
        prompt,
        negativePrompt,
        modelId: selectedModel,
        providerId: modelObj.provider,
        aspectRatio,
        resolution,
        numImages,
      });

      if (result.images && result.images.length > 0) {
        setGeneratedImages(result.images);
        setSelectedImageIdx(0);
        notifyToast(`Generated ${result.images.length} image(s) using ${modelObj.name}!`, 'success');
      }
    } catch (err: any) {
      if (err.message?.includes('503') || err.message?.includes('loading')) {
        notifyToast('Model is loading onto serverless GPU. Please retry in 20 seconds.', 'warning');
      } else if (err.message?.includes('429')) {
        notifyToast('Free inference limit reached. Try a local model or another option.', 'warning');
      } else {
        notifyToast(err.message || 'Image generation failed', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------------------------------------------------------
  // 2. Background Removal Handler
  // -------------------------------------------------------------------------
  const handleRemoveBackground = async () => {
    if (!bgInputImage) {
      notifyToast('Please upload an image first.', 'warning');
      return;
    }

    setIsRemovingBg(true);
    try {
      const router = AIRouter.getInstance();
      const res = await router.removeBackground({
        imageData: bgInputImage,
        mode: bgMode,
        feather,
        providerId: 'local', // zero-cost local execution
      });
      setBgResultImage(res.processedImageUrl);
      notifyToast('Background removed at zero cost locally!', 'success');
    } catch (err: any) {
      notifyToast(err.message || 'Background removal failed', 'error');
    } finally {
      setIsRemovingBg(false);
    }
  };

  // -------------------------------------------------------------------------
  // 3. Image Enhancement Handler
  // -------------------------------------------------------------------------
  const handleEnhance = async () => {
    if (!enhInputImage) {
      notifyToast('Please upload an image first.', 'warning');
      return;
    }

    setIsEnhancing(true);
    try {
      const router = AIRouter.getInstance();
      const res = await router.enhanceImage({
        imageData: enhInputImage,
        type: enhType,
        scaleFactor,
        providerId: 'local',
      });
      setEnhResultImage(res.enhancedImageUrl);
      notifyToast(`Enhanced image with ${scaleFactor}x super-resolution!`, 'success');
    } catch (err: any) {
      notifyToast(err.message || 'Enhancement failed', 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  // -------------------------------------------------------------------------
  // Timeline and Media Library Actions
  // -------------------------------------------------------------------------
  const currentImage = generatedImages[selectedImageIdx];

  const handleAddToTimeline = async (imageUrl?: string, title?: string) => {
    const url = imageUrl || currentImage?.url;
    if (!url) return;

    try {
      await applyAIResultToTimeline({
        title: title || `AI Image (${aspectRatio})`,
        type: 'ai_image_gen',
        imageUrl: url,
        durationSec: 4,
      });
      notifyToast('Placed image on timeline track!', 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to place on timeline', 'error');
    }
  };

  const handleSaveToMediaPool = async (imageUrl?: string, title?: string) => {
    const url = imageUrl || currentImage?.url;
    if (!url) return;

    try {
      const asset = await saveAIResultToMediaPool({
        title: title || `AI Image (${aspectRatio})`,
        type: 'ai_image_gen',
        imageUrl: url,
        durationSec: 4,
      });
      if (asset) {
        notifyToast(`Saved "${asset.name}" to Media Library!`, 'success');
      }
    } catch (e: any) {
      notifyToast(e.message || 'Failed to save to Media Library', 'error');
    }
  };

  const handleDownload = (imageUrl?: string, filename = 'ai-image.png') => {
    const url = imageUrl || currentImage?.url;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    notifyToast('Downloaded image!', 'info');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'enh') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (target === 'bg') {
        setBgInputImage(result);
        setBgResultImage('');
      } else {
        setEnhInputImage(result);
        setEnhResultImage('');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            FLUX.1 Schnell & Open-Source AI
          </span>
          <span className="text-[11px] font-mono text-zinc-500">FREE TIER / Zero-Cost Local Tools</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-emerald-400" />
          AI Image Generator, Enhancer & Background Remover
        </h2>
        <p className="text-zinc-400 text-xs">
          Generate cinematic still frames with open weights diffusion models, cut out backgrounds with edge alpha matting, and upscale up to 4K resolution.
        </p>
      </div>

      {/* Subtool Tabs */}
      <div className="flex border-b border-zinc-800 gap-1 bg-[#10131c] p-1 rounded-xl">
        <button
          onClick={() => setActiveSubTool('generate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTool === 'generate'
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Image Generator</span>
        </button>

        <button
          onClick={() => setActiveSubTool('bg_removal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTool === 'bg_removal'
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Background Remover</span>
        </button>

        <button
          onClick={() => setActiveSubTool('enhance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTool === 'enhance'
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Image Enhancement & Super-Res</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. IMAGE GENERATOR VIEW */}
      {/* ========================================================================= */}
      {activeSubTool === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Generation Parameters (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Model Selector with Truthful Badges */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
                <span>Inference Model</span>
                <span className="text-[10px] text-zinc-500 font-mono">Open Weights / Transparent Cost</span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#121520] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-hidden focus:border-emerald-500"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} [{m.badge}]
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-400">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Describe your scene in detail..."
                className="w-full bg-[#121520] border border-zinc-700/80 rounded-lg p-3 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500 font-medium"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {SAMPLE_PROMPTS.map((sp, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(sp)}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 truncate max-w-[220px]"
                  >
                    Preset {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Negative Prompt */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-zinc-400">Negative Prompt</label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="What to avoid..."
                className="w-full bg-[#121520] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* Aspect Ratio, Resolution & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full bg-[#121520] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  {ASPECT_RATIOS.map((ar) => (
                    <option key={ar.id} value={ar.id}>
                      {ar.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full bg-[#121520] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  {RESOLUTIONS.map((res) => (
                    <option key={res} value={res}>
                      {res}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Quantity</label>
                <select
                  value={numImages}
                  onChange={(e) => setNumImages(Number(e.target.value))}
                  className="w-full bg-[#121520] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value={1}>1 Image</option>
                  <option value={2}>2 Images</option>
                  <option value={4}>4 Images</option>
                </select>
              </div>
            </div>

            {/* Buttons: Generate, Cancel, Regenerate */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-lg shadow-emerald-950/40"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isGenerating ? 'Synthesizing Image...' : 'Generate Images'}</span>
              </button>

              {isGenerating && (
                <button
                  onClick={() => setIsGenerating(false)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              )}

              {generatedImages.length > 0 && !isGenerating && (
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition border border-zinc-700/80"
                  title="Regenerate with same settings"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Regenerate</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Results Preview & Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[340px] relative overflow-hidden">
              {currentImage ? (
                <div className="w-full space-y-3">
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center border border-zinc-800">
                    <img
                      src={currentImage.url}
                      alt={currentImage.prompt}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Thumbnail Selector if multiple images */}
                  {generatedImages.length > 1 && (
                    <div className="flex gap-2 justify-center">
                      {generatedImages.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setSelectedImageIdx(idx)}
                          className={`w-12 h-12 rounded-md overflow-hidden border-2 transition ${
                            selectedImageIdx === idx ? 'border-emerald-500' : 'border-zinc-800 opacity-60'
                          }`}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => handleDownload(currentImage.url)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => handleSaveToMediaPool(currentImage.url)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 hover:text-white transition"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Add to Media Library</span>
                    </button>

                    <button
                      onClick={() => handleAddToTimeline(currentImage.url)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm ml-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Timeline</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-zinc-400">Generated images will appear here</p>
                  <p className="text-[11px] text-zinc-600 max-w-xs">
                    Choose an open-source model and click Generate Images to create visuals for your timeline.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BACKGROUND REMOVAL VIEW */}
      {/* ========================================================================= */}
      {activeSubTool === 'bg_removal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4 bg-[#121520] border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Input Image</h3>

            <input
              type="file"
              ref={fileInputBgRef}
              onChange={(e) => handleFileSelect(e, 'bg')}
              accept="image/*"
              className="hidden"
            />

            {bgInputImage ? (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-zinc-800">
                <img src={bgInputImage} alt="Input" className="w-full h-full object-contain" />
              </div>
            ) : (
              <button
                onClick={() => fileInputBgRef.current?.click()}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-zinc-700 hover:border-emerald-500 flex flex-col items-center justify-center p-4 text-center text-zinc-400 hover:text-white transition bg-zinc-950/40"
              >
                <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                <span className="text-xs font-semibold">Upload Image for Background Removal</span>
                <span className="text-[10px] text-zinc-500 mt-1">PNG, JPG, WebP supported</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Output Mode</label>
                <select
                  value={bgMode}
                  onChange={(e) => setBgMode(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="transparent">Transparent Alpha</option>
                  <option value="greenscreen">Green Screen</option>
                  <option value="blur">Depth Blur</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Feather: {feather}px</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={feather}
                  onChange={(e) => setFeather(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            <button
              onClick={handleRemoveBackground}
              disabled={isRemovingBg || !bgInputImage}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-md"
            >
              {isRemovingBg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
              <span>{isRemovingBg ? 'Processing Alpha Matting...' : 'Remove Background (Zero Cost)'}</span>
            </button>
          </div>

          {/* Right: Transparent Output */}
          <div className="lg:col-span-6 space-y-4 bg-[#121520] border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Transparent Result</h3>

            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center bg-[repeating-conic-gradient(#202020_0%_25%,#111111_0%_50%)] bg-[length:16px_16px]">
              {bgResultImage ? (
                <img src={bgResultImage} alt="Cutout" className="w-full h-full object-contain" />
              ) : (
                <p className="text-xs text-zinc-500 italic">Transparent output preview</p>
              )}
            </div>

            {bgResultImage && (
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => handleDownload(bgResultImage, 'cutout.png')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
                <button
                  onClick={() => handleSaveToMediaPool(bgResultImage, 'Transparent Cutout')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Media Library</span>
                </button>
                <button
                  onClick={() => handleAddToTimeline(bgResultImage, 'Transparent Cutout')}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Timeline</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. IMAGE ENHANCEMENT VIEW */}
      {/* ========================================================================= */}
      {activeSubTool === 'enhance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4 bg-[#121520] border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Enhancement Options</h3>

            <input
              type="file"
              ref={fileInputEnhRef}
              onChange={(e) => handleFileSelect(e, 'enh')}
              accept="image/*"
              className="hidden"
            />

            {!enhInputImage ? (
              <button
                onClick={() => fileInputEnhRef.current?.click()}
                className="w-full aspect-video rounded-lg border-2 border-dashed border-zinc-700 hover:border-emerald-500 flex flex-col items-center justify-center p-4 text-center text-zinc-400 hover:text-white transition bg-zinc-950/40"
              >
                <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                <span className="text-xs font-semibold">Upload Image to Upscale & Sharpen</span>
              </button>
            ) : (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-zinc-800">
                <img src={enhInputImage} alt="Source" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Enhance Type</label>
                <select
                  value={enhType}
                  onChange={(e) => setEnhType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="super_resolution">Super-Resolution</option>
                  <option value="sharpen">Unsharp Sharpening</option>
                  <option value="denoise">Denoise & Restore</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-zinc-400">Scale Factor</label>
                <select
                  value={scaleFactor}
                  onChange={(e) => setScaleFactor(Number(e.target.value) as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value={2}>2x Upscale</option>
                  <option value={4}>4x High Definition</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleEnhance}
              disabled={isEnhancing || !enhInputImage}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-md"
            >
              {isEnhancing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
              <span>{isEnhancing ? 'Synthesizing Sub-Pixels...' : `Upscale ${scaleFactor}x (Zero Cost)`}</span>
            </button>
          </div>

          {/* Right: Before/After Comparison */}
          <div className="lg:col-span-7 space-y-4 bg-[#121520] border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Before / After Preview</h3>
              {enhResultImage && (
                <span className="text-[11px] font-mono text-emerald-400">
                  Slide: {beforeAfterSlider}%
                </span>
              )}
            </div>

            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
              {enhResultImage ? (
                <>
                  {/* Enhanced (After) */}
                  <img src={enhResultImage} alt="After" className="w-full h-full object-contain" />

                  {/* Original (Before) clipped by slider */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${beforeAfterSlider}%` }}
                  >
                    <img
                      src={enhInputImage}
                      alt="Before"
                      className="w-full h-full object-contain"
                      style={{ width: '100%', maxWidth: 'none' }}
                    />
                  </div>

                  {/* Vertical divider line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 shadow-md pointer-events-none"
                    style={{ left: `${beforeAfterSlider}%` }}
                  />

                  {/* Labels */}
                  <span className="absolute top-2 left-2 text-[10px] font-mono font-bold bg-black/70 px-2 py-0.5 rounded text-zinc-300">
                    BEFORE
                  </span>
                  <span className="absolute top-2 right-2 text-[10px] font-mono font-bold bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded text-emerald-300">
                    AFTER ({scaleFactor}x)
                  </span>
                </>
              ) : (
                <p className="text-xs text-zinc-500 italic">Upload an image and click upscale to view comparison</p>
              )}
            </div>

            {enhResultImage && (
              <div className="space-y-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={beforeAfterSlider}
                  onChange={(e) => setBeforeAfterSlider(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => handleDownload(enhResultImage, 'enhanced.png')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => handleSaveToMediaPool(enhResultImage, `Enhanced Image (${scaleFactor}x)`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Media Library</span>
                  </button>
                  <button
                    onClick={() => handleAddToTimeline(enhResultImage, `Enhanced Image (${scaleFactor}x)`)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition ml-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Timeline</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

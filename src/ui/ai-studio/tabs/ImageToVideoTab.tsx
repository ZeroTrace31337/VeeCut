/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Clapperboard,
  Upload,
  Play,
  Pause,
  Plus,
  Download,
  Sparkles,
  Layers,
  Film,
  RefreshCw,
  Image as ImageIcon,
  Compass,
} from 'lucide-react';
import { AiJob, ImageToVideoRequest } from '../../../domain/ai/studio/AiStudioProvider';
import { useEditor } from '../../context/EditorContext';
import { notifyToast } from '../../toast/ToastContext';
import { JobProgressCard } from '../components/JobProgressCard';
import { useAiStudioCapabilities } from '../../../domain/ai/studio/useAiStudioCapabilities';
import { ProviderStatusBanner } from '../components/ProviderStatusBanner';

interface ImageToVideoTabProps {
  onStartJob: (type: 'image_to_video', input: ImageToVideoRequest) => Promise<AiJob>;
  activeJob: AiJob | null;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  elapsedSeconds?: number;
  initialImageData?: string;
}

const CAMERA_MOTIONS = [
  { id: 'Pan Right', label: 'Pan Right', desc: 'Smooth horizontal glide to the right' },
  { id: 'Pan Left', label: 'Pan Left', desc: 'Smooth horizontal glide to the left' },
  { id: 'Zoom In', label: 'Push In / Zoom', desc: 'Dramatic cinematic forward push-in' },
  { id: 'Zoom Out', label: 'Pull Out', desc: 'Wide reveal pull-back' },
  { id: 'Tilt Up', label: 'Tilt Up', desc: 'Vertical upward pedestal rise' },
  { id: 'Drone Orbit', label: 'Drone Orbit', desc: 'Circular 3D perspective orbit' },
];

export const ImageToVideoTab: React.FC<ImageToVideoTabProps> = ({
  onStartJob,
  activeJob,
  onCancelJob,
  onRetryJob,
  elapsedSeconds = 0,
  initialImageData,
}) => {
  const { project, applyAIResultToTimeline, saveAIResultToMediaPool } = useEditor();
  const { isConfigured, getModel } = useAiStudioCapabilities();
  const modelInfo = getModel('image_to_video');

  const [imageData, setImageData] = useState<string>(initialImageData || '');
  const [motionPrompt, setMotionPrompt] = useState(
    'Subtle atmospheric mist rolling across scene, natural cinematic lighting'
  );
  const [cameraMotion, setCameraMotion] = useState<'Pan Right' | 'Pan Left' | 'Zoom In' | 'Zoom Out' | 'Tilt Up' | 'Tilt Down' | 'Drone Orbit' | 'Static'>('Pan Right');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isCurrentJobActive = activeJob?.type === 'image_to_video' && (activeJob.status === 'queued' || activeJob.status === 'processing');
  const latestOutput = activeJob?.type === 'image_to_video' && activeJob.status === 'completed' ? activeJob.output : null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        setImageData(evt.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectMediaPoolAsset = (assetUri: string) => {
    setImageData(assetUri);
  };

  const handleGenerate = async () => {
    if (!imageData) {
      notifyToast('Please upload or select an image to animate.', 'warning');
      return;
    }

    try {
      await onStartJob('image_to_video', {
        imageData,
        motionPrompt,
        cameraMotion,
        aspectRatio,
        duration: 5,
        resolution: '720p',
      });
      notifyToast('Veo 3 image animation started!', 'info');
    } catch (err: any) {
      notifyToast(err.message || 'Failed to start image animation', 'error');
    }
  };

  const handleAddToTimeline = async () => {
    if (!latestOutput?.videoUrl) return;
    try {
      await applyAIResultToTimeline({
        title: latestOutput.title || `Veo Animate: ${cameraMotion}`,
        type: 'ai_video',
        videoUrl: latestOutput.videoUrl,
        durationSec: latestOutput.duration || 5,
      });
      notifyToast('Animated video added to timeline!', 'success');
    } catch (e: any) {
      notifyToast(e.message || 'Failed to add video to timeline', 'error');
    }
  };

  const handleSaveToMediaPool = async () => {
    if (!latestOutput?.videoUrl) return;
    try {
      const asset = await saveAIResultToMediaPool({
        title: latestOutput.title || `Veo Animate: ${cameraMotion}`,
        type: 'ai_video',
        videoUrl: latestOutput.videoUrl,
        durationSec: latestOutput.duration || 5,
      });
      if (asset) {
        notifyToast(`Saved "${asset.name}" to Media Pool!`, 'success');
      }
    } catch (e: any) {
      notifyToast(e.message || 'Failed to save to Media Pool', 'error');
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const imageAssets = project?.mediaPool?.filter((a) => a.type === 'image') || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              Veo 3 Motion
            </span>
            <span className="text-[11px] font-mono text-zinc-500">veo-3.1-fast-generate-preview</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">Image → Video Animation</h2>
          <p className="text-zinc-400 text-xs">
            Turn any photograph, still frame, or generated image into a moving cinematic camera sequence.
          </p>
        </div>
      </div>

      {/* Model Capability & Provider Status */}
      <ProviderStatusBanner
        model={modelInfo}
        isConfigured={isConfigured}
        featureTitle="AI Image-to-Video"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Image & Camera Motion */}
        <div className="lg:col-span-7 space-y-4">
          {/* Source Image Selection */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200">1. Source Image</label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New Image</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Selected Image or Upload Dropzone */}
            {imageData ? (
              <div className="relative aspect-video max-h-56 bg-black rounded-lg overflow-hidden border border-zinc-700 group">
                <img src={imageData} alt="Source to animate" className="w-full h-full object-cover" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl p-8 text-center cursor-pointer bg-[#0c0e14] transition"
              >
                <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <span className="text-xs font-semibold text-zinc-300 block">Click to upload photo</span>
                <span className="text-[11px] text-zinc-500">PNG, JPG, WEBP up to 20MB</span>
              </div>
            )}

            {/* Project Media Pool Images selector */}
            {imageAssets.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <span className="text-[10px] text-zinc-400 font-medium">Or select from Media Pool:</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {imageAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleSelectMediaPoolAsset(asset.uri)}
                      className="w-16 h-12 rounded bg-zinc-900 border border-zinc-800 hover:border-emerald-400 overflow-hidden shrink-0 transition"
                      title={asset.name}
                    >
                      <img src={asset.thumbnailUrl || asset.uri} alt={asset.name} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Camera Motion Options */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-200 block">2. Camera Motion</span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CAMERA_MOTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCameraMotion(m.id as any)}
                  className={`p-2.5 rounded-lg text-left border transition ${
                    cameraMotion === m.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-[#0c0e14] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-xs block">{m.label}</span>
                  <span className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Motion Prompt & Orientation */}
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-zinc-200 block">3. Motion Prompt & Aspect Ratio</span>

            <input
              type="text"
              value={motionPrompt}
              onChange={(e) => setMotionPrompt(e.target.value)}
              placeholder="e.g. Atmospheric lighting shifts, gentle hair blowing in the wind..."
              className="w-full bg-[#0c0e14] border border-zinc-800 focus:border-emerald-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition ${
                  aspectRatio === '16:9'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-[#0c0e14] border-zinc-800 text-zinc-400'
                }`}
              >
                <span>16:9 Landscape</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition ${
                  aspectRatio === '9:16'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-[#0c0e14] border-zinc-800 text-zinc-400'
                }`}
              >
                <span>9:16 Portrait</span>
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!isConfigured || isCurrentJobActive || !imageData}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs tracking-wider uppercase transition active:scale-98 flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
          >
            {!isConfigured ? (
              <span>AI Image-to-Video is not configured</span>
            ) : isCurrentJobActive ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Veo 3 Animating Image...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Animate with Veo 3</span>
              </>
            )}
          </button>

          {/* Job Progress */}
          {activeJob && activeJob.type === 'image_to_video' && (
            <JobProgressCard
              job={activeJob}
              elapsedSeconds={elapsedSeconds}
              onCancel={onCancelJob}
              onRetry={onRetryJob}
            />
          )}
        </div>

        {/* Right Column: Output Video Player */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#121520] border border-zinc-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">Animated Output Player</span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase">
                {aspectRatio}
              </span>
            </div>

            <div
              className={`w-full bg-black rounded-xl overflow-hidden border border-zinc-800 relative flex items-center justify-center ${
                aspectRatio === '9:16' ? 'aspect-[9/16] max-w-[280px] mx-auto' : 'aspect-video'
              }`}
            >
              {latestOutput?.videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={latestOutput.videoUrl}
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs flex items-center justify-center text-white transition active:scale-95 z-10"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                  </button>
                </>
              ) : isCurrentJobActive ? (
                <div className="text-center p-6 space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <span className="text-xs font-semibold text-zinc-200 block">
                    Rendering Moving Frames
                  </span>
                  <p className="text-[11px] text-zinc-400 max-w-xs">
                    {activeJob?.stage || 'Applying camera movement...'}
                  </p>
                </div>
              ) : (
                <div className="text-center p-6 space-y-2 text-zinc-600">
                  <Clapperboard className="w-8 h-8 mx-auto" />
                  <span className="text-xs font-medium block">No animated video yet</span>
                  <span className="text-[10px] text-zinc-500">Upload image and click Animate</span>
                </div>
              )}
            </div>

            {/* Insertion Actions */}
            {latestOutput?.videoUrl && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-300 block">VeeCut Asset Integration</span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAddToTimeline}
                    className="py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add to Timeline</span>
                  </button>

                  <button
                    onClick={handleSaveToMediaPool}
                    className="py-2.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition flex items-center justify-center gap-1.5 border border-zinc-700"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save to Media Pool</span>
                  </button>
                </div>

                <a
                  href={latestOutput.videoUrl}
                  download="veo-animated-shot.mp4"
                  className="w-full py-2 rounded-lg bg-[#0c0e14] hover:bg-zinc-850 text-zinc-300 text-xs font-medium transition flex items-center justify-center gap-1.5 border border-zinc-800 block text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4 File</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

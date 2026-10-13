/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AIProviderId = 'local' | 'huggingface' | 'gemini' | 'custom';

export type AIExecutionType = 'local' | 'cloud' | 'hybrid';

export type AICostTier = 'free_local' | 'free_tier' | 'paid';

export type AITaskType =
  | 'text-to-image'
  | 'text-to-video'
  | 'image-to-video'
  | 'speech-to-text'
  | 'text-to-speech'
  | 'background-removal'
  | 'auto-captions'
  | 'translation'
  | 'image-enhancement'
  | 'smart-editor'
  | 'music-generation'
  | 'sound-effects';

export interface AIModelMeta {
  id: string;
  name: string;
  provider: AIProviderId;
  task: AITaskType;
  execution: AIExecutionType;
  free: boolean;
  costTier: AICostTier;
  requiresGPU: boolean;
  license: string;
  capabilities: string[];
  description: string;
  downloadUrl?: string;
  supportedLanguages?: string[];
  maxDurationSec?: number;
  supportedResolutions?: string[];
  supportedAspectRatios?: string[];
}

export interface AIProviderStatus {
  id: AIProviderId;
  name: string;
  isAvailable: boolean;
  executionType: AIExecutionType;
  requiresApiKey: boolean;
  isConfigured: boolean;
  costTier: AICostTier;
  message: string;
}

// -------------------------------------------------------------
// AI Generation Parameters & Results
// -------------------------------------------------------------

// 1. Image Generation
export interface TextToImageParams {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution?: '512x512' | '768x768' | '1024x1024';
  numImages?: number;
  modelId?: string;
  providerId?: AIProviderId;
}

export interface GeneratedImageItem {
  id: string;
  url: string; // base64 or blob URL
  width: number;
  height: number;
  prompt: string;
  modelId: string;
  provider: AIProviderId;
  createdAt: number;
}

export interface TextToImageResult {
  images: GeneratedImageItem[];
  modelId: string;
  provider: AIProviderId;
  executionTimeMs: number;
}

// 2. Video Generation
export interface TextToVideoParams {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: number;
  resolution?: '720p' | '1080p';
  motionStrength?: number;
  modelId?: string;
  providerId?: AIProviderId;
}

export interface ImageToVideoParams {
  imageData: string; // base64 or blob
  prompt?: string;
  cameraMotion?: 'Pan Right' | 'Pan Left' | 'Zoom In' | 'Zoom Out' | 'Tilt Up' | 'Static';
  duration?: number;
  aspectRatio?: '16:9' | '9:16';
  modelId?: string;
  providerId?: AIProviderId;
}

export interface VideoGenResult {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  aspectRatio: string;
  resolution: string;
  prompt: string;
  provider: AIProviderId;
  modelId: string;
  executionTimeMs: number;
}

// 3. Speech to Text / Transcription
export interface SpeechToTextParams {
  audioBlob?: Blob;
  audioBase64?: string;
  language?: string;
  prompt?: string;
  modelId?: string;
  providerId?: AIProviderId;
}

export interface TranscriptCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
}

export interface SpeechToTextResult {
  text: string;
  detectedLanguage?: string;
  cues: TranscriptCue[];
  srt: string;
  vtt: string;
  provider: AIProviderId;
  modelId: string;
  durationSec?: number;
}

// 4. Text to Speech
export interface TextToSpeechParams {
  text: string;
  voiceId?: string;
  voiceName?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  modelId?: string;
  providerId?: AIProviderId;
}

export interface TextToSpeechResult {
  id: string;
  audioUrl: string;
  audioBase64?: string;
  text: string;
  voiceName: string;
  language: string;
  durationSec: number;
  provider: AIProviderId;
  modelId: string;
}

// 5. Background Removal
export interface BackgroundRemovalParams {
  imageData: string; // base64 or blob
  mode?: 'transparent' | 'blur' | 'greenscreen' | 'custom_color';
  feather?: number;
  modelId?: string;
  providerId?: AIProviderId;
}

export interface BackgroundRemovalResult {
  id: string;
  processedImageUrl: string;
  originalImageUrl: string;
  mode: string;
  provider: AIProviderId;
  modelId: string;
}

// 6. Auto Captions Styling & Track
export interface CaptionStyleOptions {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  outlineColor?: string;
  outlineWidth?: number;
  alignment: 'top' | 'middle' | 'bottom';
  animation: 'none' | 'pop' | 'typewriter' | 'fade' | 'karaoke';
  positionY?: number; // offset in px
}

// 7. Translation
export interface TranslationParams {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  modelId?: string;
  providerId?: AIProviderId;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: AIProviderId;
  modelId: string;
}

// 8. Image Enhancement
export interface ImageEnhancementParams {
  imageData: string;
  type: 'super_resolution' | 'denoise' | 'sharpen' | 'restoration';
  scaleFactor?: 2 | 4;
  intensity?: number;
  modelId?: string;
  providerId?: AIProviderId;
}

export interface ImageEnhancementResult {
  id: string;
  enhancedImageUrl: string;
  originalImageUrl: string;
  scaleFactor: number;
  type: string;
  provider: AIProviderId;
  modelId: string;
}

// 9. Smart Editor Validated Action Schema
export type SmartEditActionType =
  | 'trim'
  | 'split'
  | 'cut_silence'
  | 'caption'
  | 'add_music'
  | 'color_grade'
  | 'reframe'
  | 'transition'
  | 'add_text';

export interface SmartEditAction {
  type: SmartEditActionType;
  description: string;
  clipId?: string;
  start?: number; // seconds
  end?: number; // seconds
  atTime?: number; // seconds
  style?: string;
  genre?: string;
  mood?: string;
  aspectRatio?: string;
  transitionType?: string;
  text?: string;
  parameters?: Record<string, any>;
}

export interface SmartEditorCommandResult {
  command: string;
  explanation: string;
  actions: SmartEditAction[];
  estimatedResultDurationSec?: number;
  warnings?: string[];
  provider: AIProviderId;
  modelId: string;
}

// 10. AI Media Library Asset Metadata
export interface AIMediaAssetMeta {
  assetId: string;
  filename: string;
  type: 'video' | 'image' | 'audio' | 'captions';
  provider: AIProviderId;
  model: string;
  prompt?: string;
  creationTime: string;
  duration?: number;
  resolution?: string;
  metadata: Record<string, any>;
  source: 'ai_studio' | 'smart_editor' | 'local_model';
  status: 'completed' | 'processing' | 'failed';
}

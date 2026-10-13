/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIModelMeta } from './types';

export const AI_MODELS_CONFIG: AIModelMeta[] = [
  // =========================================================================
  // 1. TEXT-TO-IMAGE
  // =========================================================================
  {
    id: 'black-forest-labs/FLUX.1-schnell',
    name: 'FLUX.1 Schnell (Hugging Face)',
    provider: 'huggingface',
    task: 'text-to-image',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false, // Hosted serverless
    license: 'Apache 2.0 (Open Weights)',
    capabilities: ['1-step to 4-step ultra fast diffusion', '1024x1024 native resolution', 'Photorealistic aesthetics'],
    description: 'State-of-the-art open weights 12B parameter image generator running on Hugging Face free serverless inference.',
    supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    supportedResolutions: ['512x512', '768x768', '1024x1024'],
  },
  {
    id: 'stabilityai/sd-turbo',
    name: 'SD-Turbo (Hugging Face)',
    provider: 'huggingface',
    task: 'text-to-image',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false,
    license: 'Open Model License',
    capabilities: ['Real-time 1-step synthesis', 'Fast response time', 'Concept art stills'],
    description: 'Adversarial diffusion distillation model synthesized in a single step for rapid draft visualization.',
    supportedAspectRatios: ['1:1', '16:9', '9:16'],
    supportedResolutions: ['512x512', '768x768'],
  },
  {
    id: 'runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion v1.5 (Hugging Face)',
    provider: 'huggingface',
    task: 'text-to-image',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false,
    license: 'CreativeML OpenRAIL-M',
    capabilities: ['Classic stable diffusion', 'Versatile stylistic range', 'Open community checkpoints'],
    description: 'Widely benchmarked open-source text-to-image model accessible via free Hugging Face inference.',
    supportedAspectRatios: ['1:1', '16:9', '4:3'],
    supportedResolutions: ['512x512', '768x768'],
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Gemini Flash Image (Google)',
    provider: 'gemini',
    task: 'text-to-image',
    execution: 'cloud',
    free: false,
    costTier: 'paid',
    requiresGPU: false,
    license: 'Google Proprietary',
    capabilities: ['Cinematic stills', 'HDR lighting', 'Native aspect ratio control'],
    description: 'High-definition multimodal visual synthesis model. Optional paid Google AI Studio provider.',
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    supportedResolutions: ['1024x1024'],
  },

  // =========================================================================
  // 2. TEXT-TO-VIDEO & IMAGE-TO-VIDEO
  // =========================================================================
  {
    id: 'veo-3.1-generate-preview',
    name: 'Google Veo 3 Video (Optional Paid)',
    provider: 'gemini',
    task: 'text-to-video',
    execution: 'cloud',
    free: false,
    costTier: 'paid',
    requiresGPU: false,
    license: 'Google Proprietary',
    capabilities: ['Cinema-grade camera motion', '1080p resolution', 'Coherent physics'],
    description: 'Cinema-grade video generation from text prompts. Requires compatible GPU/local runtime or supported inference provider with billing.',
    maxDurationSec: 8,
    supportedAspectRatios: ['16:9', '9:16'],
    supportedResolutions: ['720p', '1080p'],
  },
  {
    id: 'veo-3.1-animate-preview',
    name: 'Google Veo 3 Motion Animator (Optional Paid)',
    provider: 'gemini',
    task: 'image-to-video',
    execution: 'cloud',
    free: false,
    costTier: 'paid',
    requiresGPU: false,
    license: 'Google Proprietary',
    capabilities: ['Image keyframing', 'Camera pan/tilt/zoom', 'Temporal coherence'],
    description: 'Animates still images into cinematic video clips. Requires compatible GPU/local runtime or supported inference provider.',
    maxDurationSec: 5,
    supportedAspectRatios: ['16:9', '9:16'],
    supportedResolutions: ['720p'],
  },
  {
    id: 'damo-vilab/modelscope-damo-text-to-video-synthesis',
    name: 'ModelScope Text-To-Video (Open Weights)',
    provider: 'huggingface',
    task: 'text-to-video',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: true,
    license: 'CC-BY-NC 4.0',
    capabilities: ['Open-weights video diffusion', 'Short motion clips'],
    description: 'Open-weights diffusion video generator. Note: Cloud inference availability depends on free space queue.',
    maxDurationSec: 4,
    supportedAspectRatios: ['1:1', '16:9'],
    supportedResolutions: ['512x512'],
  },

  // =========================================================================
  // 3. SPEECH-TO-TEXT & AUDIO TRANSCRIPTION
  // =========================================================================
  {
    id: 'local-web-speech-stt',
    name: 'Web Speech Transcriber (Local Zero-Cost)',
    provider: 'local',
    task: 'speech-to-text',
    execution: 'local',
    free: true,
    costTier: 'free_local',
    requiresGPU: false,
    license: 'W3C Web Standard',
    capabilities: ['Continuous acoustic recognition', 'Millisecond timestamps', 'Zero latency', 'Zero data leaves machine'],
    description: '100% free offline speech recognition using the client browser engine. Operates at zero financial or server cost.',
    supportedLanguages: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ur-PK', 'ar-SA', 'hi-IN', 'zh-CN', 'ja-JP'],
  },
  {
    id: 'openai/whisper-large-v3-turbo',
    name: 'OpenAI Whisper v3 Turbo (Hugging Face)',
    provider: 'huggingface',
    task: 'speech-to-text',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false,
    license: 'MIT (Open Weights)',
    capabilities: ['Multilingual speech recognition', 'Acoustic word alignment', 'Noise robustness', 'Punctuation'],
    description: 'The industry standard open-weights speech recognition model on Hugging Face free serverless endpoints.',
    supportedLanguages: ['auto', 'en', 'ur', 'ps', 'es', 'fr', 'de', 'ar', 'hi', 'zh', 'ru'],
  },
  {
    id: 'gemini-3.5-transcribe',
    name: 'Gemini 3.5 Transcribe (Google)',
    provider: 'gemini',
    task: 'speech-to-text',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false,
    license: 'Google Proprietary',
    capabilities: ['Direct audio ingestion', 'Karaoke millisecond cueing', 'Multi-speaker alignment'],
    description: 'Acoustic audio-to-text cue generator with automatic subtitle block construction.',
  },

  // =========================================================================
  // 4. TEXT-TO-SPEECH (TTS) & VOICE GENERATION
  // =========================================================================
  {
    id: 'local-web-speech-tts',
    name: 'Web Speech Synthesis (Local Zero-Cost)',
    provider: 'local',
    task: 'text-to-speech',
    execution: 'local',
    free: true,
    costTier: 'free_local',
    requiresGPU: false,
    license: 'W3C Web Standard',
    capabilities: ['Zero cost', 'No network latency', 'Natural voice inflection', 'Live audio rendering to WAV'],
    description: '100% free client-side voice synthesizer with direct AudioContext stream capture for timeline-ready audio clips.',
    supportedLanguages: ['English', 'Spanish', 'French', 'German', 'Urdu', 'Hindi', 'Arabic', 'Chinese'],
  },
  {
    id: 'facebook/mms-tts',
    name: 'Meta MMS-TTS (Hugging Face)',
    provider: 'huggingface',
    task: 'text-to-speech',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false,
    license: 'CC-BY-NC 4.0',
    capabilities: ['Over 1,000 languages', 'Urdu (urd)', 'Pashto (pus)', 'English (eng)', 'VITS acoustic fidelity'],
    description: 'Massively Multilingual Speech TTS models from Meta providing authentic pronunciations for Urdu, Pashto, English, etc.',
    supportedLanguages: ['eng', 'urd', 'pus', 'spa', 'fra', 'deu', 'ara', 'hin'],
  },
  {
    id: 'gemini-3.8-flash-tts',
    name: 'Gemini 3.8 Flash Voice (Google)',
    provider: 'gemini',
    task: 'text-to-speech',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false,
    license: 'Google Proprietary',
    capabilities: ['Multi-speaker dialogue', 'Screenplay character performance', 'Emotion modulation'],
    description: 'High-fidelity conversational voice synthesis for dramatic narration and podcast dialogue.',
  },

  // =========================================================================
  // 5. BACKGROUND REMOVAL & MATTING
  // =========================================================================
  {
    id: 'local-canvas-matting',
    name: 'Local Saliency & Alpha Matting (Local Zero-Cost)',
    provider: 'local',
    task: 'background-removal',
    execution: 'local',
    free: true,
    costTier: 'free_local',
    requiresGPU: false,
    license: 'Open Source (MIT)',
    capabilities: ['Runs completely in browser', 'Zero server load', 'Instant preview', 'Feather & chroma keying'],
    description: 'Client-side pixel analysis with luminosity/edge detection and alpha masking. Generates real transparent PNGs.',
  },
  {
    id: 'briaai/RMBG-1.4',
    name: 'BRIA RMBG-1.4 (Hugging Face)',
    provider: 'huggingface',
    task: 'background-removal',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false,
    license: 'Creative Commons Open',
    capabilities: ['High-accuracy human hair cutout', 'Complex subject isolation', 'Clean alpha channel'],
    description: 'Specialized open background removal model for e-commerce, portraits, and video compositing.',
  },

  // =========================================================================
  // 6. AUTO CAPTIONS & SUBTITLES
  // =========================================================================
  {
    id: 'local-auto-captions-builder',
    name: 'Local Auto-Captions Engine (Zero-Cost)',
    provider: 'local',
    task: 'auto-captions',
    execution: 'local',
    free: true,
    costTier: 'free_local',
    requiresGPU: false,
    license: 'MIT',
    capabilities: ['SRT & VTT export', 'Timeline caption track', 'Full font/color/motion styling', 'Karaoke cues'],
    description: 'Generates timeline-synchronized subtitle tracks with customizable typography, bounce animations, and positioning.',
  },

  // =========================================================================
  // 7. AI TRANSLATION
  // =========================================================================
  {
    id: 'facebook/nllb-200-distilled-600M',
    name: 'Meta NLLB-200 (Hugging Face)',
    provider: 'huggingface',
    task: 'translation',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false,
    license: 'CC-BY-NC 4.0',
    capabilities: ['200+ languages', 'English <-> Urdu', 'English <-> Pashto', 'Spanish, French, German, Arabic, Hindi'],
    description: 'No Language Left Behind translation model with explicit high-fidelity support for Urdu (urd_Arab), Pashto (pus_Arab), and global tongues.',
    supportedLanguages: ['English', 'Urdu', 'Pashto', 'Spanish', 'French', 'German', 'Arabic', 'Hindi', 'Turkish', 'Chinese'],
  },

  // =========================================================================
  // 8. IMAGE ENHANCEMENT & SUPER-RESOLUTION
  // =========================================================================
  {
    id: 'local-neural-enhancer',
    name: 'Local Neural Unsharp & Bicubic Super-Res (Zero-Cost)',
    provider: 'local',
    task: 'image-enhancement',
    execution: 'local',
    free: true,
    costTier: 'free_local',
    requiresGPU: false,
    license: 'MIT',
    capabilities: ['2x / 4x Super-Resolution', 'Unsharp mask high-frequency sharpening', 'Adaptive histogram equalization', 'Before/After slider'],
    description: '100% free client-side super-resolution filter restoring fine edges and texture without transmitting data.',
  },
  {
    id: 'caidas/swin2SR-classical-sr-x2-64',
    name: 'Swin2SR Super-Resolution (Hugging Face)',
    provider: 'huggingface',
    task: 'image-enhancement',
    execution: 'cloud',
    free: true,
    costTier: 'free_tier',
    requiresGPU: false,
    license: 'Apache 2.0',
    capabilities: ['Transformer-based super-resolution', 'Noise suppression', 'Fine detail synthesis'],
    description: 'Swin Transformer image restoration model upscaling stills and video frames.',
  },

  // =========================================================================
  // 9. SMART EDITOR
  // =========================================================================
  {
    id: 'veecut-smart-editor-engine',
    name: 'VeeCut Smart Editor Copilot',
    provider: 'local',
    task: 'smart-editor',
    execution: 'hybrid',
    free: true,
    costTier: 'free_local',
    requiresGPU: false,
    license: 'MIT',
    capabilities: ['Strict validated action schema', 'Zero arbitrary code execution', 'Timeline command translation', 'Cut silence & auto-color'],
    description: 'Interprets user creative intent and compiles it into verified timeline manipulation commands.',
  },
];

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModelCapabilityItem {
  id: string;
  name: string;
  provider: string;
  category: 'text_to_video' | 'image_to_video' | 'audio_to_transcript' | 'music_generation' | 'voice_conversation' | 'image_generation' | 'image_editing';
  modelId: string;
  fallbackModelId?: string;
  capabilities: string[];
  supportedResolutions?: string[];
  supportedAspectRatios?: string[];
  maxDurationSec?: number;
  supportedVoices?: string[];
  supportedFormats?: string[];
  isConfigured: boolean;
  requiresPaidKey: boolean;
  description: string;
}

export interface AiStudioCapabilityRegistry {
  provider: string;
  hasApiKey: boolean;
  environmentStatus: 'ready' | 'unconfigured';
  models: Record<string, ModelCapabilityItem>;
}

export function getAiStudioCapabilities(): AiStudioCapabilityRegistry {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

  return {
    provider: 'Google GenAI Platform',
    hasApiKey: hasKey,
    environmentStatus: hasKey ? 'ready' : 'unconfigured',
    models: {
      text_to_video: {
        id: 'text_to_video',
        name: 'Google Veo 3 Cinematic Video',
        provider: 'Google DeepMind',
        category: 'text_to_video',
        modelId: 'veo-3.1-generate-preview',
        fallbackModelId: 'veo-3.1-lite-generate-preview',
        capabilities: ['Text-to-Video', 'Cinematic Presets', '1080p Resolution', '16:9 & 9:16'],
        supportedResolutions: ['720p', '1080p'],
        supportedAspectRatios: ['16:9', '9:16'],
        maxDurationSec: 8,
        isConfigured: hasKey,
        requiresPaidKey: true,
        description: 'Generates high-definition cinema-grade video from text prompts with professional lighting and motion control.',
      },
      image_to_video: {
        id: 'image_to_video',
        name: 'Google Veo 3 Motion Animator',
        provider: 'Google DeepMind',
        category: 'image_to_video',
        modelId: 'veo-3.1-generate-preview',
        fallbackModelId: 'veo-3.1-lite-generate-preview',
        capabilities: ['Image-to-Video', 'Camera Motions (Pan, Zoom, Tilt, Orbit)', 'Keyframed Motion'],
        supportedResolutions: ['720p'],
        supportedAspectRatios: ['16:9', '9:16'],
        maxDurationSec: 5,
        isConfigured: hasKey,
        requiresPaidKey: true,
        description: 'Animates still photos and graphic renders into full-motion cinematic clips with physical camera control.',
      },
      audio_to_transcript: {
        id: 'audio_to_transcript',
        name: 'Google Gemini 3.5 Transcribe',
        provider: 'Google Cloud AI',
        category: 'audio_to_transcript',
        modelId: 'gemini-3.5-transcribe',
        capabilities: ['Audio Transcription', 'Timestamped Subtitle Cues', 'SRT / WebVTT Export', 'Multilingual'],
        supportedFormats: ['audio/wav', 'audio/mp3', 'audio/webm', 'audio/ogg', 'video/mp4'],
        isConfigured: hasKey,
        requiresPaidKey: false,
        description: 'High-fidelity acoustic speech-to-text with millisecond timestamps and automatic karaoke subtitle cue timing.',
      },
      music_generation: {
        id: 'music_generation',
        name: 'Google DeepMind Lyria',
        provider: 'Google DeepMind',
        category: 'music_generation',
        modelId: 'lyria-3-clip-preview',
        fallbackModelId: 'lyria-3-pro-preview',
        capabilities: ['Text-to-Music', '30s High-Fidelity Audio', 'BPM & Genre Direction', '24-bit Mastering'],
        supportedFormats: ['audio/wav'],
        maxDurationSec: 30,
        isConfigured: hasKey,
        requiresPaidKey: true,
        description: 'Synthesizes complete original instrumental soundtracks, trailer scores, and ambient audio from text prompts.',
      },
      voice_conversation: {
        id: 'voice_conversation',
        name: 'Google Gemini 3.8 Flash Voice',
        provider: 'Google Cloud AI',
        category: 'voice_conversation',
        modelId: 'gemini-3.8-flash-tts',
        fallbackModelId: 'gemini-3.8-flash-lite-tts',
        capabilities: ['Multi-Speaker Dialogue', 'Dual-Speaker Screenplay Editing', 'Emotion & Style Modulation', '24kHz Studio Audio'],
        supportedVoices: ['Puck', 'Kore', 'Fenrir', 'Zephyr', 'Charon'],
        isConfigured: hasKey,
        requiresPaidKey: false,
        description: 'Synthesizes multi-speaker podcast conversations and voiceovers with realistic acoustic tone and character delivery.',
      },
      image_generation: {
        id: 'image_generation',
        name: 'Google Gemini 3.1 Flash Image',
        provider: 'Google Cloud AI',
        category: 'image_generation',
        modelId: 'gemini-3.1-flash-lite-image',
        fallbackModelId: 'gemini-3.1-flash-image',
        capabilities: ['Text-to-Image', '1K/2K High-Res', 'Aspect Ratio Control (16:9, 9:16, 1:1, 4:3)'],
        supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
        isConfigured: hasKey,
        requiresPaidKey: true,
        description: 'Generates photorealistic cinematography stills, textures, concept art, and video backdrops.',
      },
      image_editing: {
        id: 'image_editing',
        name: 'Google Gemini 3.1 Image Editor',
        provider: 'Google Cloud AI',
        category: 'image_editing',
        modelId: 'gemini-3.1-flash-lite-image',
        capabilities: ['Neural Inpainting', 'Object Addition & Removal', 'Style Transfer', 'Background Replacement'],
        isConfigured: hasKey,
        requiresPaidKey: true,
        description: 'Performs pixel-level neural image manipulation, lighting alteration, and object replacement directly in the editor.',
      },
    },
  };
}

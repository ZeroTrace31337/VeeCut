/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIProvider } from './base';
import {
  AIProviderId,
  AIProviderStatus,
  TextToImageParams,
  TextToImageResult,
  TextToVideoParams,
  ImageToVideoParams,
  VideoGenResult,
  SpeechToTextParams,
  SpeechToTextResult,
  TextToSpeechParams,
  TextToSpeechResult,
} from '../types';
import { AIProviderError } from '../errors';

export class GeminiProvider extends AIProvider {
  public readonly id: AIProviderId = 'gemini';
  public readonly name = 'Google AI Studio (Veo, Lyria & Flash)';
  public readonly description =
    'Optional cloud provider for Google Veo 3 Video, Google DeepMind Lyria Music, and Gemini Flash.';

  public async getStatus(): Promise<AIProviderStatus> {
    try {
      const res = await fetch('/api/health');
      const data = await res.json().catch(() => ({}));
      return {
        id: 'gemini',
        name: this.name,
        isAvailable: !!data.hasApiKey,
        executionType: 'cloud',
        requiresApiKey: true,
        isConfigured: !!data.hasApiKey,
        costTier: 'paid',
        message: data.hasApiKey
          ? 'Google Gemini API key configured.'
          : 'GEMINI_API_KEY optional. Required only for Veo Video, Lyria Music, and paid models.',
      };
    } catch {
      return {
        id: 'gemini',
        name: this.name,
        isAvailable: false,
        executionType: 'cloud',
        requiresApiKey: true,
        isConfigured: false,
        costTier: 'paid',
        message: 'Could not connect to Gemini backend service.',
      };
    }
  }

  public async generateImage(params: TextToImageParams): Promise<TextToImageResult> {
    const startTime = performance.now();
    const res = await fetch('/api/ai/image-gen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || '16:9',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new AIProviderError(data.error || 'Gemini image generation failed', 'gemini', res.status);
    }

    return {
      images: [
        {
          id: `gem_img_${Date.now()}`,
          url: data.imageUrl,
          width: 1024,
          height: 1024,
          prompt: params.prompt,
          modelId: 'gemini-3.1-flash-lite-image',
          provider: 'gemini',
          createdAt: Date.now(),
        },
      ],
      modelId: 'gemini-3.1-flash-lite-image',
      provider: 'gemini',
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  public async generateVideo(params: TextToVideoParams): Promise<VideoGenResult> {
    const startTime = performance.now();
    const res = await fetch('/api/ai/video-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        aspectRatio: params.aspectRatio || '16:9',
        resolution: params.resolution || '720p',
        duration: params.duration || 5,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new AIProviderError(data.error || 'Veo video generation failed', 'gemini', res.status);
    }

    // Poll status
    let done = false;
    let pollCount = 0;
    let videoUri = '';

    while (!done && pollCount < 40) {
      await new Promise((r) => setTimeout(r, 4000));
      pollCount++;
      const pollRes = await fetch('/api/ai/video-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: data.operationName }),
      });
      const pollData = await pollRes.json();
      if (pollData.status === 'ready' && pollData.videoUri) {
        done = true;
        videoUri = pollData.videoUri;
      } else if (pollData.status === 'error') {
        throw new AIProviderError(pollData.error || 'Veo rendering failed', 'gemini');
      }
    }

    if (!done || !videoUri) {
      throw new AIProviderError('Veo video generation timed out', 'gemini');
    }

    const localUrl = `/api/ai/video-download?uri=${encodeURIComponent(videoUri)}`;

    return {
      id: `veo_vid_${Date.now()}`,
      videoUrl: localUrl,
      duration: params.duration || 5,
      aspectRatio: params.aspectRatio || '16:9',
      resolution: params.resolution || '720p',
      prompt: params.prompt,
      provider: 'gemini',
      modelId: 'veo-3.1-generate-preview',
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  public async animateImageToVideo(params: ImageToVideoParams): Promise<VideoGenResult> {
    const startTime = performance.now();
    const res = await fetch('/api/ai/image-to-video-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: params.imageData,
        motionPrompt: params.prompt || 'Cinematic camera push-in',
        cameraMotion: params.cameraMotion || 'Pan Right',
        duration: params.duration || 5,
        aspectRatio: params.aspectRatio || '16:9',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new AIProviderError(data.error || 'Veo image-to-video failed', 'gemini', res.status);
    }

    let done = false;
    let pollCount = 0;
    let videoUri = '';

    while (!done && pollCount < 40) {
      await new Promise((r) => setTimeout(r, 4000));
      pollCount++;
      const pollRes = await fetch('/api/ai/video-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: data.operationName }),
      });
      const pollData = await pollRes.json();
      if (pollData.status === 'ready' && pollData.videoUri) {
        done = true;
        videoUri = pollData.videoUri;
      } else if (pollData.status === 'error') {
        throw new AIProviderError(pollData.error || 'Veo image animation failed', 'gemini');
      }
    }

    if (!done || !videoUri) {
      throw new AIProviderError('Veo image-to-video timed out', 'gemini');
    }

    const localUrl = `/api/ai/video-download?uri=${encodeURIComponent(videoUri)}`;

    return {
      id: `veo_anim_${Date.now()}`,
      videoUrl: localUrl,
      duration: params.duration || 5,
      aspectRatio: params.aspectRatio || '16:9',
      resolution: '720p',
      prompt: params.prompt || 'Veo Image Animation',
      provider: 'gemini',
      modelId: 'veo-3.1-animate-preview',
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  public async transcribeSpeech(params: SpeechToTextParams): Promise<SpeechToTextResult> {
    const res = await fetch('/api/ai/auto-captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: params.language || 'English',
        audioData: params.audioBase64,
        audioPrompt: params.prompt,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new AIProviderError(data.error || 'Gemini transcription failed', 'gemini', res.status);
    }

    const cues = (data.captions || []).map((c: any, idx: number) => ({
      id: `cue_${idx + 1}`,
      startMs: c.startMs,
      endMs: c.endMs,
      text: c.text,
      confidence: 0.98,
    }));

    return {
      text: cues.map((c: any) => c.text).join(' '),
      detectedLanguage: data.language || 'English',
      cues,
      srt: data.srt || '',
      vtt: data.vtt || '',
      provider: 'gemini',
      modelId: 'gemini-3.5-transcribe',
    };
  }

  public async generateSpeechTTS(params: TextToSpeechParams): Promise<TextToSpeechResult> {
    const res = await fetch('/api/ai/voice-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.text,
        voice: params.voiceName || 'Puck',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new AIProviderError(data.error || 'Gemini voice TTS failed', 'gemini', res.status);
    }

    return {
      id: `gem_tts_${Date.now()}`,
      audioUrl: data.audioUrl,
      text: params.text,
      voiceName: params.voiceName || 'Puck',
      language: 'en-US',
      durationSec: data.durationSeconds || 5,
      provider: 'gemini',
      modelId: 'gemini-3.8-flash-tts',
    };
  }
}

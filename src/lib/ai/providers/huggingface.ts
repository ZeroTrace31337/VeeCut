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
  SpeechToTextParams,
  SpeechToTextResult,
  TextToSpeechParams,
  TextToSpeechResult,
  BackgroundRemovalParams,
  BackgroundRemovalResult,
  TranslationParams,
  TranslationResult,
  ImageEnhancementParams,
  ImageEnhancementResult,
} from '../types';
import {
  AIProviderError,
  ModelLoadingError,
  RateLimitExceededError,
  ModelUnavailableError,
} from '../errors';

export class HuggingFaceProvider extends AIProvider {
  public readonly id: AIProviderId = 'huggingface';
  public readonly name = 'Hugging Face Hub (Open-Source Free Inference)';
  public readonly description =
    'Connects to Hugging Face free serverless endpoints for FLUX, Whisper, MMS-TTS, and NLLB translation.';

  public async getStatus(): Promise<AIProviderStatus> {
    try {
      const res = await fetch('/api/ai/hf/status');
      if (!res.ok) throw new Error('Status check failed');
      const data = await res.json();
      return {
        id: 'huggingface',
        name: this.name,
        isAvailable: data.isConfigured || data.canUsePublicFreeTier,
        executionType: 'cloud',
        requiresApiKey: false, // Optional token for higher rate limits
        isConfigured: data.isConfigured,
        costTier: 'free_tier',
        message: data.isConfigured
          ? 'Hugging Face Token active (Free Serverless Inference)'
          : 'Hugging Face public free tier available. Configure HUGGINGFACE_TOKEN in .env for higher rate limits.',
      };
    } catch {
      return {
        id: 'huggingface',
        name: this.name,
        isAvailable: true,
        executionType: 'cloud',
        requiresApiKey: false,
        isConfigured: false,
        costTier: 'free_tier',
        message: 'Hugging Face server proxy ready.',
      };
    }
  }

  // -------------------------------------------------------------------------
  // 1. Text-to-Image (FLUX.1-schnell / SD-Turbo / SD v1.5)
  // -------------------------------------------------------------------------
  public async generateImage(params: TextToImageParams): Promise<TextToImageResult> {
    const model = params.modelId || 'black-forest-labs/FLUX.1-schnell';
    const startTime = performance.now();

    const data = await this.postJson<{ images: Array<{ url: string; width: number; height: number }> }>(
      '/api/ai/hf/text-to-image',
      {
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        model,
        aspectRatio: params.aspectRatio || '16:9',
        resolution: params.resolution || '1024x1024',
        numImages: params.numImages || 1,
      }
    );

    const images = (data.images || []).map((img, idx) => ({
      id: `hf_img_${Date.now()}_${idx}`,
      url: img.url,
      width: img.width || 1024,
      height: img.height || 1024,
      prompt: params.prompt,
      modelId: model,
      provider: 'huggingface' as AIProviderId,
      createdAt: Date.now(),
    }));

    return {
      images,
      modelId: model,
      provider: 'huggingface',
      executionTimeMs: Math.round(performance.now() - startTime),
    };
  }

  // -------------------------------------------------------------------------
  // 2. Speech-to-Text (Whisper Large v3 Turbo / Whisper Base)
  // -------------------------------------------------------------------------
  public async transcribeSpeech(params: SpeechToTextParams): Promise<SpeechToTextResult> {
    const model = params.modelId || 'openai/whisper-large-v3-turbo';

    let audioBase64 = params.audioBase64;
    if (!audioBase64 && params.audioBlob) {
      audioBase64 = await this.blobToBase64(params.audioBlob);
    }

    if (!audioBase64) {
      throw new Error('No audio data provided for Hugging Face transcription.');
    }

    const data = await this.postJson<{
      text: string;
      detectedLanguage?: string;
      cues?: Array<{ id: string; startMs: number; endMs: number; text: string }>;
      srt?: string;
      vtt?: string;
    }>('/api/ai/hf/speech-to-text', {
      audioBase64,
      language: params.language,
      model,
    });

    const cues = data.cues || [
      {
        id: 'cue_1',
        startMs: 0,
        endMs: 4000,
        text: data.text || 'Transcription complete',
      },
    ];

    return {
      text: data.text || '',
      detectedLanguage: data.detectedLanguage || params.language || 'en',
      cues,
      srt: data.srt || '',
      vtt: data.vtt || '',
      provider: 'huggingface',
      modelId: model,
      durationSec: cues.length > 0 ? cues[cues.length - 1].endMs / 1000 : 5,
    };
  }

  // -------------------------------------------------------------------------
  // 3. Text-to-Speech (MMS-TTS)
  // -------------------------------------------------------------------------
  public async generateSpeechTTS(params: TextToSpeechParams): Promise<TextToSpeechResult> {
    const model = params.modelId || 'facebook/mms-tts';
    const lang = params.language || 'eng';

    const data = await this.postJson<{
      audioUrl: string;
      durationSec: number;
      voiceName: string;
    }>('/api/ai/hf/text-to-speech', {
      text: params.text,
      language: lang,
      model,
      speed: params.speed,
      pitch: params.pitch,
    });

    return {
      id: `hf_tts_${Date.now()}`,
      audioUrl: data.audioUrl,
      text: params.text,
      voiceName: data.voiceName || `MMS-TTS (${lang})`,
      language: lang,
      durationSec: data.durationSec || 4,
      provider: 'huggingface',
      modelId: model,
    };
  }

  // -------------------------------------------------------------------------
  // 4. Background Removal (BRIA RMBG-1.4)
  // -------------------------------------------------------------------------
  public async removeBackground(params: BackgroundRemovalParams): Promise<BackgroundRemovalResult> {
    const model = params.modelId || 'briaai/RMBG-1.4';

    const data = await this.postJson<{
      processedImageUrl: string;
    }>('/api/ai/hf/background-removal', {
      imageData: params.imageData,
      mode: params.mode || 'transparent',
      feather: params.feather,
      model,
    });

    return {
      id: `hf_bg_${Date.now()}`,
      processedImageUrl: data.processedImageUrl,
      originalImageUrl: params.imageData,
      mode: params.mode || 'transparent',
      provider: 'huggingface',
      modelId: model,
    };
  }

  // -------------------------------------------------------------------------
  // 5. Translation (Meta NLLB-200)
  // -------------------------------------------------------------------------
  public async translateText(params: TranslationParams): Promise<TranslationResult> {
    const model = params.modelId || 'facebook/nllb-200-distilled-600M';

    const data = await this.postJson<{
      translatedText: string;
    }>('/api/ai/hf/translation', {
      text: params.text,
      sourceLanguage: params.sourceLanguage,
      targetLanguage: params.targetLanguage,
      model,
    });

    return {
      translatedText: data.translatedText,
      sourceLanguage: params.sourceLanguage,
      targetLanguage: params.targetLanguage,
      provider: 'huggingface',
      modelId: model,
    };
  }

  // -------------------------------------------------------------------------
  // 6. Image Enhancement (Swin2SR)
  // -------------------------------------------------------------------------
  public async enhanceImage(params: ImageEnhancementParams): Promise<ImageEnhancementResult> {
    const model = params.modelId || 'caidas/swin2SR-classical-sr-x2-64';

    const data = await this.postJson<{
      enhancedImageUrl: string;
    }>('/api/ai/hf/image-enhancement', {
      imageData: params.imageData,
      type: params.type,
      scaleFactor: params.scaleFactor || 2,
      model,
    });

    return {
      id: `hf_enh_${Date.now()}`,
      enhancedImageUrl: data.enhancedImageUrl,
      originalImageUrl: params.imageData,
      scaleFactor: params.scaleFactor || 2,
      type: params.type,
      provider: 'huggingface',
      modelId: model,
    };
  }

  // -------------------------------------------------------------------------
  // Helper: Post JSON with robust error classification
  // -------------------------------------------------------------------------
  private async postJson<T>(endpoint: string, body: any): Promise<T> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 503) {
        throw new ModelLoadingError(body.model || 'model', json.estimated_time || 20);
      }
      if (res.status === 429) {
        throw new RateLimitExceededError('Hugging Face', json.retry_after);
      }
      if (res.status === 404) {
        throw new ModelUnavailableError(body.model || 'model');
      }
      throw new AIProviderError(
        json.error || `Hugging Face request failed with HTTP ${res.status}`,
        'huggingface',
        res.status
      );
    }

    return json as T;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

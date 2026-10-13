/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIProvider } from './providers/base';
import { LocalModelProvider } from './providers/local';
import { HuggingFaceProvider } from './providers/huggingface';
import { GeminiProvider } from './providers/gemini';
import {
  AIProviderId,
  AITaskType,
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
  BackgroundRemovalParams,
  BackgroundRemovalResult,
  TranslationParams,
  TranslationResult,
  ImageEnhancementParams,
  ImageEnhancementResult,
  SmartEditorCommandResult,
} from './types';
import { ModelRegistry } from './registry';
import { AIProviderError } from './errors';

export class AIRouter {
  private static instance: AIRouter;
  private providers: Map<AIProviderId, AIProvider> = new Map();
  private modelRegistry: ModelRegistry;

  private constructor() {
    this.modelRegistry = ModelRegistry.getInstance();
    this.registerProvider(new LocalModelProvider());
    this.registerProvider(new HuggingFaceProvider());
    this.registerProvider(new GeminiProvider());
  }

  public static getInstance(): AIRouter {
    if (!AIRouter.instance) {
      AIRouter.instance = new AIRouter();
    }
    return AIRouter.instance;
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: AIProviderId): AIProvider | undefined {
    return this.providers.get(id);
  }

  public async getProviderStatuses(): Promise<AIProviderStatus[]> {
    const statuses: AIProviderStatus[] = [];
    for (const p of this.providers.values()) {
      try {
        const s = await p.getStatus();
        statuses.push(s);
      } catch (err: any) {
        statuses.push({
          id: p.id,
          name: p.name,
          isAvailable: false,
          executionType: 'cloud',
          requiresApiKey: true,
          isConfigured: false,
          costTier: 'paid',
          message: err.message || 'Status check failed',
        });
      }
    }
    return statuses;
  }

  /**
   * Resolves the target provider for a given task, respecting explicit choice
   * or defaulting to zero-cost priority (local -> huggingface free -> external).
   */
  public resolveProvider(task: AITaskType, preferredProviderId?: AIProviderId): AIProvider {
    if (preferredProviderId && this.providers.has(preferredProviderId)) {
      return this.providers.get(preferredProviderId)!;
    }

    // Default Zero-Cost Priority
    switch (task) {
      case 'speech-to-text':
      case 'text-to-speech':
      case 'background-removal':
      case 'image-enhancement':
      case 'auto-captions':
      case 'smart-editor':
        // Try local first
        return this.providers.get('local') || this.providers.get('huggingface')!;

      case 'text-to-image':
      case 'translation':
        // Hugging Face free tier first
        return this.providers.get('huggingface') || this.providers.get('local')!;

      case 'text-to-video':
      case 'image-to-video':
        // Veo is optional paid, ModelScope is Hugging Face open weights
        return this.providers.get('gemini') || this.providers.get('huggingface')!;

      default:
        return this.providers.get('local') || this.providers.get('huggingface')!;
    }
  }

  // -------------------------------------------------------------------------
  // Dispatched AI Handlers
  // -------------------------------------------------------------------------

  public async generateImage(params: TextToImageParams): Promise<TextToImageResult> {
    const provider = this.resolveProvider('text-to-image', params.providerId);
    if (!provider.generateImage) {
      throw new AIProviderError(`Provider ${provider.id} does not support text-to-image.`, provider.id);
    }
    return provider.generateImage(params);
  }

  public async generateVideo(params: TextToVideoParams): Promise<VideoGenResult> {
    const provider = this.resolveProvider('text-to-video', params.providerId);
    if (!provider.generateVideo) {
      throw new AIProviderError(
        'Requires compatible GPU/local runtime or supported inference provider.',
        provider.id
      );
    }
    return provider.generateVideo(params);
  }

  public async animateImageToVideo(params: ImageToVideoParams): Promise<VideoGenResult> {
    const provider = this.resolveProvider('image-to-video', params.providerId);
    if (!provider.animateImageToVideo) {
      throw new AIProviderError(
        'Requires compatible GPU/local runtime or supported inference provider.',
        provider.id
      );
    }
    return provider.animateImageToVideo(params);
  }

  public async transcribeSpeech(params: SpeechToTextParams): Promise<SpeechToTextResult> {
    const provider = this.resolveProvider('speech-to-text', params.providerId);
    if (!provider.transcribeSpeech) {
      throw new AIProviderError(`Provider ${provider.id} does not support speech-to-text.`, provider.id);
    }
    return provider.transcribeSpeech(params);
  }

  public async generateSpeechTTS(params: TextToSpeechParams): Promise<TextToSpeechResult> {
    const provider = this.resolveProvider('text-to-speech', params.providerId);
    if (!provider.generateSpeechTTS) {
      throw new AIProviderError(`Provider ${provider.id} does not support text-to-speech.`, provider.id);
    }
    return provider.generateSpeechTTS(params);
  }

  public async removeBackground(params: BackgroundRemovalParams): Promise<BackgroundRemovalResult> {
    const provider = this.resolveProvider('background-removal', params.providerId);
    if (!provider.removeBackground) {
      throw new AIProviderError(`Provider ${provider.id} does not support background removal.`, provider.id);
    }
    return provider.removeBackground(params);
  }

  public async translateText(params: TranslationParams): Promise<TranslationResult> {
    const provider = this.resolveProvider('translation', params.providerId);
    if (!provider.translateText) {
      throw new AIProviderError(`Provider ${provider.id} does not support translation.`, provider.id);
    }
    return provider.translateText(params);
  }

  public async enhanceImage(params: ImageEnhancementParams): Promise<ImageEnhancementResult> {
    const provider = this.resolveProvider('image-enhancement', params.providerId);
    if (!provider.enhanceImage) {
      throw new AIProviderError(`Provider ${provider.id} does not support image enhancement.`, provider.id);
    }
    return provider.enhanceImage(params);
  }

  public async executeSmartEditCommand(
    command: string,
    context?: any,
    providerId?: AIProviderId
  ): Promise<SmartEditorCommandResult> {
    const provider = this.resolveProvider('smart-editor', providerId);
    if (!provider.executeSmartEditCommand) {
      throw new AIProviderError(`Provider ${provider.id} does not support smart editor commands.`, provider.id);
    }
    return provider.executeSmartEditCommand(command, context);
  }
}

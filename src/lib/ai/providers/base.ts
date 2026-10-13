/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  BackgroundRemovalParams,
  BackgroundRemovalResult,
  TranslationParams,
  TranslationResult,
  ImageEnhancementParams,
  ImageEnhancementResult,
  SmartEditorCommandResult,
} from '../types';

export abstract class AIProvider {
  public abstract readonly id: AIProviderId;
  public abstract readonly name: string;
  public abstract readonly description: string;

  public abstract getStatus(): Promise<AIProviderStatus>;

  public async generateImage?(params: TextToImageParams): Promise<TextToImageResult>;
  public async generateVideo?(params: TextToVideoParams): Promise<VideoGenResult>;
  public async animateImageToVideo?(params: ImageToVideoParams): Promise<VideoGenResult>;
  public async transcribeSpeech?(params: SpeechToTextParams): Promise<SpeechToTextResult>;
  public async generateSpeechTTS?(params: TextToSpeechParams): Promise<TextToSpeechResult>;
  public async removeBackground?(params: BackgroundRemovalParams): Promise<BackgroundRemovalResult>;
  public async translateText?(params: TranslationParams): Promise<TranslationResult>;
  public async enhanceImage?(params: ImageEnhancementParams): Promise<ImageEnhancementResult>;
  public async executeSmartEditCommand?(command: string, context?: any): Promise<SmartEditorCommandResult>;
}

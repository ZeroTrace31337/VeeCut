/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemAiCapabilities {
  hasWebGpu: boolean;
  hasWebSpeechRecognition: boolean;
  hasWebSpeechSynthesis: boolean;
  hasAudioContext: boolean;
  hasOffscreenCanvas: boolean;
  hasWasm: boolean;
  availableVoices: SpeechSynthesisVoice[];
  localExecutionSupported: {
    speechToText: boolean;
    textToSpeech: boolean;
    backgroundRemoval: boolean;
    imageEnhancement: boolean;
    silenceDetection: boolean;
  };
}

let cachedCapabilities: SystemAiCapabilities | null = null;

export async function detectSystemCapabilities(): Promise<SystemAiCapabilities> {
  if (cachedCapabilities && cachedCapabilities.availableVoices.length > 0) {
    return cachedCapabilities;
  }

  const isBrowser = typeof window !== 'undefined';

  const hasWebSpeechRecognition = isBrowser && !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );

  const hasWebSpeechSynthesis = isBrowser && 'speechSynthesis' in window;

  const hasAudioContext = isBrowser && !!(
    window.AudioContext ||
    (window as any).webkitAudioContext
  );

  const hasOffscreenCanvas = isBrowser && typeof OffscreenCanvas !== 'undefined';

  const hasWasm = typeof WebAssembly !== 'undefined';

  let hasWebGpu = false;
  if (isBrowser && 'gpu' in navigator && (navigator as any).gpu) {
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      hasWebGpu = !!adapter;
    } catch {
      hasWebGpu = false;
    }
  }

  let availableVoices: SpeechSynthesisVoice[] = [];
  if (hasWebSpeechSynthesis) {
    availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length === 0) {
      // Sometimes voices load asynchronously
      await new Promise<void>((resolve) => {
        const onVoicesChanged = () => {
          availableVoices = window.speechSynthesis.getVoices();
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
          resolve();
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
        setTimeout(resolve, 350); // timeout fallback
      });
    }
  }

  cachedCapabilities = {
    hasWebGpu,
    hasWebSpeechRecognition,
    hasWebSpeechSynthesis,
    hasAudioContext,
    hasOffscreenCanvas,
    hasWasm,
    availableVoices,
    localExecutionSupported: {
      speechToText: hasWebSpeechRecognition,
      textToSpeech: hasWebSpeechSynthesis && hasAudioContext,
      backgroundRemoval: hasOffscreenCanvas || isBrowser,
      imageEnhancement: hasOffscreenCanvas || isBrowser,
      silenceDetection: hasAudioContext,
    },
  };

  return cachedCapabilities;
}

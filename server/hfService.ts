/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HfStatusResult {
  isConfigured: boolean;
  canUsePublicFreeTier: boolean;
  tokenType?: string;
  message: string;
}

export class HuggingFaceService {
  private static instance: HuggingFaceService;
  private readonly baseUrl = 'https://router.huggingface.co/hf-inference/models';
  private readonly legacyBaseUrl = 'https://api-inference.huggingface.co/models';

  private constructor() {}

  public static getInstance(): HuggingFaceService {
    if (!HuggingFaceService.instance) {
      HuggingFaceService.instance = new HuggingFaceService();
    }
    return HuggingFaceService.instance;
  }

  private getToken(): string | null {
    const token = process.env.HUGGINGFACE_TOKEN || process.env.HUGGINGFACE_API_KEY;
    if (token && token.trim() !== '' && token !== 'MY_HUGGINGFACE_TOKEN') {
      return token.trim();
    }
    return null;
  }

  public checkStatus(): HfStatusResult {
    const token = this.getToken();
    if (token) {
      return {
        isConfigured: true,
        canUsePublicFreeTier: true,
        tokenType: token.startsWith('hf_') ? 'Personal Access Token' : 'API Key',
        message: 'Hugging Face Token active. Free serverless inference enabled.',
      };
    }
    return {
      isConfigured: false,
      canUsePublicFreeTier: true,
      message:
        'HUGGINGFACE_TOKEN is not configured in .env. Public free inference endpoints can still be attempted or users can switch to 100% free Local AI mode.',
    };
  }

  private getHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'VeeCut-Studio/2.0',
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Helper to make request with fallback from new router URL to legacy URL
   */
  private async queryModel(modelId: string, body: any, isBinaryInput = false): Promise<Response> {
    const token = this.getToken();
    const primaryUrl = `${this.baseUrl}/${modelId}`;
    const fallbackUrl = `${this.legacyBaseUrl}/${modelId}`;

    const headers = this.getHeaders(isBinaryInput ? undefined : 'application/json');

    const reqOptions: RequestInit = {
      method: 'POST',
      headers,
      body: isBinaryInput ? body : JSON.stringify(body),
    };

    let response = await fetch(primaryUrl, reqOptions);
    if (!response.ok && response.status === 404) {
      // Try legacy inference endpoint
      response = await fetch(fallbackUrl, reqOptions);
    }

    return response;
  }

  // -------------------------------------------------------------------------
  // 1. Text to Image (FLUX.1-schnell / SD-Turbo / SD v1.5)
  // -------------------------------------------------------------------------
  public async generateImage(params: {
    prompt: string;
    negativePrompt?: string;
    model?: string;
    aspectRatio?: string;
    resolution?: string;
  }): Promise<{ images: Array<{ url: string; width: number; height: number }> }> {
    const model = params.model || 'black-forest-labs/FLUX.1-schnell';

    const payload: Record<string, any> = {
      inputs: params.prompt,
    };
    if (params.negativePrompt) {
      payload.parameters = { negative_prompt: params.negativePrompt };
    }

    const response = await this.queryModel(model, payload);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      if (response.status === 503) {
        throw new Error(
          JSON.stringify({
            status: 503,
            estimated_time: errJson.estimated_time || 20,
            error: `Model ${model} is loading onto free serverless GPU (~${Math.ceil(errJson.estimated_time || 20)}s). Please retry.`,
          })
        );
      }
      if (response.status === 429) {
        throw new Error(
          JSON.stringify({
            status: 429,
            error: 'Free inference allowance unavailable. Try a local model or configure HUGGINGFACE_TOKEN in .env.',
          })
        );
      }
      throw new Error(
        errJson.error || `Hugging Face generation failed with HTTP ${response.status}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64Data}`;

    return {
      images: [
        {
          url: dataUrl,
          width: 1024,
          height: 1024,
        },
      ],
    };
  }

  // -------------------------------------------------------------------------
  // 2. Speech to Text (OpenAI Whisper)
  // -------------------------------------------------------------------------
  public async transcribeSpeech(params: {
    audioBase64: string;
    language?: string;
    model?: string;
  }): Promise<{
    text: string;
    detectedLanguage?: string;
    cues: Array<{ id: string; startMs: number; endMs: number; text: string }>;
    srt: string;
    vtt: string;
  }> {
    const model = params.model || 'openai/whisper-large-v3-turbo';

    // Strip header prefix if present (e.g. data:audio/wav;base64,...)
    const cleanBase64 = params.audioBase64.replace(/^data:audio\/[a-z0-9]+;base64,/, '');
    const audioBuffer = Buffer.from(cleanBase64, 'base64');

    const headers = this.getHeaders('audio/wav');
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: 'POST',
      headers,
      body: audioBuffer,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      if (response.status === 503) {
        throw new Error(
          JSON.stringify({
            status: 503,
            estimated_time: errJson.estimated_time || 25,
            error: `Whisper model is loading (~${Math.ceil(errJson.estimated_time || 25)}s). Please retry.`,
          })
        );
      }
      throw new Error(errJson.error || `Whisper transcription failed with HTTP ${response.status}`);
    }

    const result = await response.json();
    const fullText = (result.text || '').trim();

    // Chunk text into timestamped subtitle cues (~4 to 7 words per cue)
    const words = fullText.split(/\s+/).filter(Boolean);
    const cues: Array<{ id: string; startMs: number; endMs: number; text: string }> = [];

    if (words.length > 0) {
      const wordsPerCue = 5;
      const totalWords = words.length;
      const estTotalMs = Math.max(3000, totalWords * 350); // ~350ms per word
      let curWordIdx = 0;
      let cueIndex = 1;

      while (curWordIdx < totalWords) {
        const chunk = words.slice(curWordIdx, curWordIdx + wordsPerCue).join(' ');
        const startMs = Math.round((curWordIdx / totalWords) * estTotalMs);
        const endMs = Math.round(
          Math.min(estTotalMs, ((curWordIdx + wordsPerCue) / totalWords) * estTotalMs)
        );

        cues.push({
          id: `cue_${cueIndex++}`,
          startMs,
          endMs: Math.max(startMs + 600, endMs),
          text: chunk,
        });

        curWordIdx += wordsPerCue;
      }
    } else {
      cues.push({
        id: 'cue_1',
        startMs: 0,
        endMs: 3000,
        text: fullText || 'No speech detected',
      });
    }

    // Format SRT
    const srt = cues
      .map((cue, idx) => {
        const sTime = this.formatSrtTime(cue.startMs);
        const eTime = this.formatSrtTime(cue.endMs);
        return `${idx + 1}\n${sTime} --> ${eTime}\n${cue.text}\n`;
      })
      .join('\n');

    // Format VTT
    const vtt =
      'WEBVTT\n\n' +
      cues
        .map((cue) => {
          const sTime = this.formatVttTime(cue.startMs);
          const eTime = this.formatVttTime(cue.endMs);
          return `${sTime} --> ${eTime}\n${cue.text}\n`;
        })
        .join('\n');

    return {
      text: fullText,
      detectedLanguage: params.language || 'en',
      cues,
      srt,
      vtt,
    };
  }

  // -------------------------------------------------------------------------
  // 3. Text to Speech (Meta MMS-TTS / VITS)
  // -------------------------------------------------------------------------
  public async generateSpeechTTS(params: {
    text: string;
    language?: string;
    model?: string;
    speed?: number;
    pitch?: number;
  }): Promise<{ audioUrl: string; durationSec: number; voiceName: string }> {
    // Select specific MMS model checkpoint based on language
    let model = params.model || 'facebook/mms-tts-eng';
    const lang = (params.language || 'eng').toLowerCase();
    if (lang === 'urd' || lang === 'urdu') {
      model = 'facebook/mms-tts-urd';
    } else if (lang === 'pus' || lang === 'pashto') {
      model = 'facebook/mms-tts-pus';
    } else if (lang === 'spa' || lang === 'spanish') {
      model = 'facebook/mms-tts-spa';
    } else if (lang === 'fra' || lang === 'french') {
      model = 'facebook/mms-tts-fra';
    } else if (lang === 'deu' || lang === 'german') {
      model = 'facebook/mms-tts-deu';
    } else if (lang === 'ara' || lang === 'arabic') {
      model = 'facebook/mms-tts-ara';
    } else if (lang === 'hin' || lang === 'hindi') {
      model = 'facebook/mms-tts-hin';
    }

    const response = await this.queryModel(model, { inputs: params.text });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      if (response.status === 503) {
        throw new Error(
          JSON.stringify({
            status: 503,
            estimated_time: errJson.estimated_time || 20,
            error: `TTS Model ${model} is loading (~${Math.ceil(errJson.estimated_time || 20)}s). Please retry.`,
          })
        );
      }
      throw new Error(errJson.error || `TTS synthesis failed with HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'audio/wav';
    const base64Data = buffer.toString('base64');
    const audioUrl = `data:${contentType};base64,${base64Data}`;

    const estDuration = Math.max(1.5, params.text.split(' ').length * 0.35);

    return {
      audioUrl,
      durationSec: estDuration,
      voiceName: `Meta MMS (${lang.toUpperCase()})`,
    };
  }

  // -------------------------------------------------------------------------
  // 4. Background Removal (BRIA RMBG-1.4)
  // -------------------------------------------------------------------------
  public async removeBackground(params: {
    imageData: string;
    mode?: string;
    feather?: number;
    model?: string;
  }): Promise<{ processedImageUrl: string }> {
    const model = params.model || 'briaai/RMBG-1.4';

    const cleanBase64 = params.imageData.replace(/^data:image\/[a-z0-9]+;base64,/, '');
    const imgBuffer = Buffer.from(cleanBase64, 'base64');

    const headers = this.getHeaders('image/jpeg');
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: 'POST',
      headers,
      body: imgBuffer,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.error || `Hugging Face RMBG background removal failed with HTTP ${response.status}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';
    const base64Data = buffer.toString('base64');

    return {
      processedImageUrl: `data:${contentType};base64,${base64Data}`,
    };
  }

  // -------------------------------------------------------------------------
  // 5. Translation (Meta NLLB-200)
  // -------------------------------------------------------------------------
  public async translate(params: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
    model?: string;
  }): Promise<{ translatedText: string }> {
    const model = params.model || 'facebook/nllb-200-distilled-600M';

    // Map common human language names to NLLB language codes
    const langCodeMap: Record<string, string> = {
      English: 'eng_Latn',
      Urdu: 'urd_Arab',
      Pashto: 'pus_Arab',
      Spanish: 'spa_Latn',
      French: 'fra_Latn',
      German: 'deu_Latn',
      Arabic: 'arb_Arab',
      Hindi: 'hin_Deva',
      Turkish: 'tur_Latn',
      Chinese: 'zho_Hans',
      Russian: 'rus_Cyrl',
    };

    const srcCode = langCodeMap[params.sourceLanguage] || 'eng_Latn';
    const tgtCode = langCodeMap[params.targetLanguage] || 'urd_Arab';

    const response = await this.queryModel(model, {
      inputs: params.text,
      parameters: {
        src_lang: srcCode,
        tgt_lang: tgtCode,
      },
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Translation failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    let translated = '';
    if (Array.isArray(data) && data[0]?.translation_text) {
      translated = data[0].translation_text;
    } else if (data.translation_text) {
      translated = data.translation_text;
    } else {
      translated = JSON.stringify(data);
    }

    return {
      translatedText: translated,
    };
  }

  // -------------------------------------------------------------------------
  // 6. Image Enhancement (Swin2SR Super Resolution)
  // -------------------------------------------------------------------------
  public async enhanceImage(params: {
    imageData: string;
    type?: string;
    scaleFactor?: number;
    model?: string;
  }): Promise<{ enhancedImageUrl: string }> {
    const model = params.model || 'caidas/swin2SR-classical-sr-x2-64';

    const cleanBase64 = params.imageData.replace(/^data:image\/[a-z0-9]+;base64,/, '');
    const imgBuffer = Buffer.from(cleanBase64, 'base64');

    const headers = this.getHeaders('image/jpeg');
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: 'POST',
      headers,
      body: imgBuffer,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.error || `Image enhancement failed with HTTP ${response.status}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';
    const base64Data = buffer.toString('base64');

    return {
      enhancedImageUrl: `data:${contentType};base64,${base64Data}`,
    };
  }

  private formatSrtTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSec % 60).toString().padStart(2, '0');
    const millis = (ms % 1000).toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${millis}`;
  }

  private formatVttTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const seconds = (totalSec % 60).toString().padStart(2, '0');
    const millis = (ms % 1000).toString().padStart(3, '0');
    return `${minutes}:${seconds}.${millis}`;
  }
}

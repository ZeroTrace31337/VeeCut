/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AiJobType =
  | 'text_to_video'
  | 'image_to_video'
  | 'audio_to_transcript'
  | 'music_generation'
  | 'voice_conversation'
  | 'image_generation'
  | 'image_editing';

export type AiJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface AiJob {
  id: string;
  projectId?: string;
  userId?: string;
  type: AiJobType;
  provider: string;
  status: AiJobStatus;
  progress: number;
  stage: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// 1. Text to Video Request & Result
export interface TextToVideoRequest {
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
  duration?: number;
  style?: string;
}

// 2. Image to Video Request & Result
export interface ImageToVideoRequest {
  imageData: string; // Base64 data URL
  motionPrompt?: string;
  cameraMotion?: 'Pan Right' | 'Pan Left' | 'Zoom In' | 'Zoom Out' | 'Tilt Up' | 'Tilt Down' | 'Drone Orbit' | 'Static';
  aspectRatio?: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
  duration?: number;
}

// 3. Audio Transcription Request & Result
export interface AudioTranscriptionRequest {
  audioData?: string; // Base64 audio data URL
  audioUrl?: string;
  language?: string;
  style?: string;
  contextHint?: string;
}

export interface SubtitleCueItem {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  highlightWord?: string;
}

// 4. Music Generation Request & Result
export interface MusicGenRequest {
  prompt: string;
  genre?: string;
  mood?: string;
  durationSeconds?: number;
  bpm?: number;
}

// 5. Voice Generation Request & Result
export interface VoiceConversationRequest {
  mode: 'single' | 'dialogue';
  text?: string;
  script?: string;
  speakerA?: string;
  speakerB?: string;
  voiceA?: string;
  voiceB?: string;
  emotion?: string;
}

// 6. Image Generation & Editing Request & Result
export interface ImageGenRequest {
  prompt: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  style?: string;
}

export interface ImageEditRequest {
  imageData: string; // Base64 data URL
  editPrompt: string;
  mode?: 'neural_edit' | 'inpaint' | 'background_change';
}

// Standard Provider Interfaces
export interface VideoGenerationProvider {
  generateVideo(params: TextToVideoRequest, projectId?: string): Promise<AiJob>;
}

export interface ImageAnimationProvider {
  animateImage(params: ImageToVideoRequest, projectId?: string): Promise<AiJob>;
}

export interface TranscriptionProvider {
  transcribeAudio(params: AudioTranscriptionRequest, projectId?: string): Promise<AiJob>;
}

export interface MusicGenerationProvider {
  generateMusic(params: MusicGenRequest, projectId?: string): Promise<AiJob>;
}

export interface VoiceGenerationProvider {
  generateVoice(params: VoiceConversationRequest, projectId?: string): Promise<AiJob>;
}

export interface ImageGenerationProvider {
  generateImage(params: ImageGenRequest, projectId?: string): Promise<AiJob>;
  editImage(params: ImageEditRequest, projectId?: string): Promise<AiJob>;
}

// Unified Full-Studio Provider Class
export class VeeCutAiStudioClient
  implements
    VideoGenerationProvider,
    ImageAnimationProvider,
    TranscriptionProvider,
    MusicGenerationProvider,
    VoiceGenerationProvider,
    ImageGenerationProvider {
  private static instance: VeeCutAiStudioClient | null = null;

  public static getInstance(): VeeCutAiStudioClient {
    if (!VeeCutAiStudioClient.instance) {
      VeeCutAiStudioClient.instance = new VeeCutAiStudioClient();
    }
    return VeeCutAiStudioClient.instance;
  }

  private async postJob(type: AiJobType, input: Record<string, any>, projectId?: string): Promise<AiJob> {
    const res = await fetch('/api/ai/jobs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, input, projectId: projectId || 'current' }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create AI job' }));
      throw new Error(err.error || `HTTP ${res.status} Error`);
    }

    const data = await res.json();
    return data.job;
  }

  public async getJobStatus(jobId: string): Promise<AiJob> {
    const res = await fetch(`/api/ai/jobs/${jobId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch status for job ${jobId}`);
    }
    const data = await res.json();
    return data.job;
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    const res = await fetch(`/api/ai/jobs/${jobId}/cancel`, { method: 'POST' });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.success;
  }

  public async listJobs(projectId?: string): Promise<AiJob[]> {
    const url = projectId ? `/api/ai/jobs?projectId=${encodeURIComponent(projectId)}` : '/api/ai/jobs';
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.jobs || [];
  }

  // 1. Text to Video (Veo 3: veo-3.1-fast-generate-preview)
  public async generateVideo(params: TextToVideoRequest, projectId?: string): Promise<AiJob> {
    return this.postJob('text_to_video', params, projectId);
  }

  // 2. Image to Video (Veo 3: veo-3.1-fast-generate-preview)
  public async animateImage(params: ImageToVideoRequest, projectId?: string): Promise<AiJob> {
    return this.postJob('image_to_video', params, projectId);
  }

  // 3. Audio Transcription (gemini-3.5-transcribe)
  public async transcribeAudio(params: AudioTranscriptionRequest, projectId?: string): Promise<AiJob> {
    return this.postJob('audio_to_transcript', params, projectId);
  }

  // 4. Music Generation
  public async generateMusic(params: MusicGenRequest, projectId?: string): Promise<AiJob> {
    return this.postJob('music_generation', params, projectId);
  }

  // 5. Voice Generation & Conversation
  public async generateVoice(params: VoiceConversationRequest, projectId?: string): Promise<AiJob> {
    return this.postJob('voice_conversation', params, projectId);
  }

  // 6. Image Generation & Editing
  public async generateImage(params: ImageGenRequest, projectId?: string): Promise<AiJob> {
    return this.postJob('image_generation', params, projectId);
  }

  public async editImage(params: ImageEditRequest, projectId?: string): Promise<AiJob> {
    return this.postJob('image_editing', params, projectId);
  }
}

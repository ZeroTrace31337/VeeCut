/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIServiceLayer } from './aiServices';

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

export class AiJobManager {
  private static instance: AiJobManager | null = null;
  private jobs: Map<string, AiJob> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  public static getInstance(): AiJobManager {
    if (!AiJobManager.instance) {
      AiJobManager.instance = new AiJobManager();
    }
    return AiJobManager.instance;
  }

  public createJob(
    type: AiJobType,
    input: Record<string, any>,
    projectId?: string,
    userId?: string
  ): AiJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = Date.now();

    const providerMap: Record<AiJobType, string> = {
      text_to_video: 'Google Veo 3 (veo-3.1-fast-generate-preview)',
      image_to_video: 'Google Veo 3 Animate (veo-3.1-fast-generate-preview)',
      audio_to_transcript: 'Google Gemini 3.5 Transcribe',
      music_generation: 'Google Lyria & Neural Audio Engine',
      voice_conversation: 'Google Gemini 3.8 Flash Voice',
      image_generation: 'Google Gemini 3.1 Flash Image',
      image_editing: 'Google Gemini 3.1 Flash Image Editor',
    };

    const initialStageMap: Record<AiJobType, string> = {
      text_to_video: 'Queued for Veo 3 video synthesis...',
      image_to_video: 'Preparing image frames for Veo 3 motion animation...',
      audio_to_transcript: 'Ingesting audio stream for transcription...',
      music_generation: 'Composing harmonic arrangement & stems...',
      voice_conversation: 'Synthesizing voice dialog acoustics...',
      image_generation: 'Generating high-resolution raster canvas...',
      image_editing: 'Applying neural inpainting & edit instructions...',
    };

    const job: AiJob = {
      id,
      projectId: projectId || 'default',
      userId: userId || 'user_local',
      type,
      provider: providerMap[type] || 'Google GenAI',
      status: 'queued',
      progress: 5,
      stage: initialStageMap[type] || 'Queued...',
      input,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(id, job);

    const controller = new AbortController();
    this.abortControllers.set(id, controller);

    // Dispatch async processing without blocking request
    setTimeout(() => {
      this.processJob(id, controller.signal).catch((err) => {
        console.error(`[AI Job System] Job ${id} unhandled failure:`, err);
        const j = this.jobs.get(id);
        if (j && j.status !== 'cancelled') {
          j.status = 'failed';
          j.error = err.message || 'Job processing failed';
          j.stage = 'Failed';
          j.updatedAt = Date.now();
        }
      });
    }, 50);

    return job;
  }

  public getJob(id: string): AiJob | null {
    return this.jobs.get(id) || null;
  }

  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return false;
    }

    job.status = 'cancelled';
    job.stage = 'Cancelled by user';
    job.updatedAt = Date.now();

    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(id);
    }

    return true;
  }

  public listJobs(projectId?: string, limit = 50): AiJob[] {
    const all = Array.from(this.jobs.values());
    const filtered = projectId ? all.filter((j) => j.projectId === projectId) : all;
    return filtered.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  private updateJobProgress(id: string, progress: number, stage: string) {
    const job = this.jobs.get(id);
    if (job && job.status !== 'cancelled') {
      job.status = 'processing';
      job.progress = Math.min(99, Math.max(job.progress, progress));
      job.stage = stage;
      job.updatedAt = Date.now();
    }
  }

  private completeJob(id: string, output: Record<string, any>) {
    const job = this.jobs.get(id);
    if (job && job.status !== 'cancelled') {
      job.status = 'completed';
      job.progress = 100;
      job.stage = 'Complete';
      job.output = output;
      job.updatedAt = Date.now();
    }
    this.abortControllers.delete(id);
  }

  private failJob(id: string, error: string) {
    const job = this.jobs.get(id);
    if (job && job.status !== 'cancelled') {
      job.status = 'failed';
      job.error = error;
      job.stage = 'Error encountered';
      job.updatedAt = Date.now();
    }
    this.abortControllers.delete(id);
  }

  private async processJob(id: string, signal: AbortSignal): Promise<void> {
    const job = this.jobs.get(id);
    if (!job || signal.aborted) return;

    const ai = AIServiceLayer.getInstance();

    try {
      this.updateJobProgress(id, 15, 'Contacting AI neural pipeline...');

      switch (job.type) {
        case 'text_to_video': {
          const { prompt, aspectRatio = '16:9', resolution = '720p', duration = 5, style = 'Cinematic' } = job.input;
          this.updateJobProgress(id, 25, 'Initiating Veo 3 fast video generation...');

          const enhancedPrompt = `${prompt}, ${style} style, professional cinematography, 4K crisp rendering`;
          const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';

          const startRes = await ai.startVideoGeneration({
            prompt: enhancedPrompt,
            aspectRatio: validAspect,
            resolution,
            duration,
          });

          this.updateJobProgress(id, 45, 'Veo 3 synthesis in progress (rendering frames)...');

          // Poll Veo operation
          let pollCount = 0;
          let done = false;
          let videoUri = '';

          while (!done && pollCount < 60) {
            if (signal.aborted) return;
            await new Promise((r) => setTimeout(r, 3500));
            pollCount++;

            const pct = Math.min(95, 45 + pollCount * 3);
            this.updateJobProgress(id, pct, `Veo 3 rendering: frame pass ${pollCount}...`);

            const pollRes = await ai.pollVideoStatus(startRes.operationName);
            if (pollRes.status === 'ready' && pollRes.videoUri) {
              done = true;
              videoUri = pollRes.videoUri;
            } else if (pollRes.status === 'error') {
              throw new Error(pollRes.error || 'Veo video rendering failed');
            }
          }

          if (!done || !videoUri) {
            throw new Error('Video generation timed out while waiting for Veo operation.');
          }

          const localVideoUrl = `/api/ai/video-download?uri=${encodeURIComponent(videoUri)}`;
          this.completeJob(id, {
            videoUrl: localVideoUrl,
            prompt,
            aspectRatio: validAspect,
            resolution,
            duration,
            style,
            title: `Veo: ${prompt.substring(0, 32)}...`,
          });
          break;
        }

        case 'image_to_video': {
          const { imageData, motionPrompt, cameraMotion = 'Pan Right', duration = 5, aspectRatio = '16:9', resolution = '720p' } = job.input;
          this.updateJobProgress(id, 25, 'Analyzing image composition & lighting...');

          const validAspect = aspectRatio === '9:16' ? '9:16' : '16:9';
          const startRes = await ai.startImageToVideoGeneration({
            imageData,
            motionPrompt: motionPrompt || 'Cinematic camera movement and organic motion',
            cameraMotion,
            duration,
            aspectRatio: validAspect,
            resolution,
          });

          this.updateJobProgress(id, 45, 'Veo 3 animating image frames...');

          let pollCount = 0;
          let done = false;
          let videoUri = '';

          while (!done && pollCount < 60) {
            if (signal.aborted) return;
            await new Promise((r) => setTimeout(r, 3500));
            pollCount++;

            const pct = Math.min(95, 45 + pollCount * 3);
            this.updateJobProgress(id, pct, `Veo 3 camera pass: ${cameraMotion} (${pollCount})...`);

            const pollRes = await ai.pollVideoStatus(startRes.operationName);
            if (pollRes.status === 'ready' && pollRes.videoUri) {
              done = true;
              videoUri = pollRes.videoUri;
            } else if (pollRes.status === 'error') {
              throw new Error(pollRes.error || 'Veo image animation failed');
            }
          }

          if (!done || !videoUri) {
            throw new Error('Image to video timed out while animating with Veo.');
          }

          const localVideoUrl = `/api/ai/video-download?uri=${encodeURIComponent(videoUri)}`;
          this.completeJob(id, {
            videoUrl: localVideoUrl,
            motionPrompt,
            cameraMotion,
            aspectRatio: validAspect,
            resolution,
            duration,
            title: `Veo Animate: ${cameraMotion}`,
          });
          break;
        }

        case 'audio_to_transcript': {
          const { audioData, language = 'en', style = 'Karaoke Subtitles' } = job.input;
          if (!audioData) {
            throw new Error("No audio recording provided. Real speech-to-text requires an uploaded audio file or recorded microphone voice input.");
          }

          this.updateJobProgress(id, 30, 'Analyzing acoustic features & word boundaries with Gemini 3.5 Transcribe...');

          const result = await ai.generateCaptions({
            language,
            style,
            audioPrompt: job.input.contextHint || 'Spoken dialogue in video track',
            audioData,
          });

          this.updateJobProgress(id, 80, 'Formatting timestamped subtitle cues...');

          this.completeJob(id, {
            captions: result.captions,
            cueCount: result.cueCount || result.captions?.length || 0,
            language: result.language || language,
            style: result.style || style,
            title: `Transcript (${result.captions?.length || 0} cues)`,
          });
          break;
        }

        case 'music_generation': {
          const { prompt, genre = 'Cinematic', mood = 'Epic', durationSeconds = 30, bpm = 128 } = job.input;
          this.updateJobProgress(id, 30, 'Generating harmonic progression & drum dynamics...');

          const musicResult = await ai.generateMusicTrack({
            prompt,
            genre,
            mood,
            durationSeconds,
            bpm,
          });

          this.updateJobProgress(id, 85, 'Mastering 24-bit audio stream & calculating waveform...');

          this.completeJob(id, {
            audioData: musicResult.audioData,
            audioUrl: musicResult.audioUrl,
            title: musicResult.title,
            genre: musicResult.genre,
            mood: musicResult.mood,
            durationSeconds: musicResult.durationSeconds,
            bpm: musicResult.bpm,
            waveformPeaks: musicResult.waveformPeaks,
          });
          break;
        }

        case 'voice_conversation': {
          const { mode = 'dialogue', text, script, speakerA = 'Alex', speakerB = 'Sam', voiceA = 'Puck', voiceB = 'Kore', emotion = 'Enthusiastic' } = job.input;
          this.updateJobProgress(id, 35, 'Synthesizing voice dialog & vocal characteristics...');

          const voiceResult = await ai.generateVoiceConversation({
            mode,
            text,
            script,
            speakerA,
            speakerB,
            voiceA,
            voiceB,
            emotion,
          });

          this.updateJobProgress(id, 90, 'Aligning speech waveforms & generating dialogue timing...');

          this.completeJob(id, {
            audioData: voiceResult.audioData,
            audioUrl: voiceResult.audioUrl,
            durationSec: voiceResult.durationSec,
            script: voiceResult.script,
            cues: voiceResult.cues,
            title: voiceResult.title,
          });
          break;
        }

        case 'image_generation': {
          const { prompt, aspectRatio = '16:9', style = 'Cinematic' } = job.input;
          this.updateJobProgress(id, 35, 'Synthesizing image with Gemini 3.1 Flash Image...');

          const imageResult = await ai.generateImage({
            prompt,
            aspectRatio,
            style,
          });

          this.updateJobProgress(id, 90, 'Optimizing color balance & dynamic range...');

          this.completeJob(id, {
            imageUrl: imageResult.imageUrl,
            prompt: imageResult.prompt,
            aspectRatio: imageResult.aspectRatio,
            style: imageResult.style,
            title: `AI Image: ${prompt.substring(0, 28)}...`,
          });
          break;
        }

        case 'image_editing': {
          const { imageData, editPrompt, mode = 'inpaint' } = job.input;
          this.updateJobProgress(id, 35, 'Applying image editing instructions with Gemini...');

          const editedResult = await ai.editImageWithAI({
            imageData,
            editPrompt,
            mode,
          });

          this.updateJobProgress(id, 90, 'Rendering edited raster output...');

          this.completeJob(id, {
            imageUrl: editedResult.imageUrl,
            editPrompt,
            mode,
            title: `Edited Image: ${editPrompt.substring(0, 24)}...`,
          });
          break;
        }

        default:
          throw new Error(`Unsupported job type: ${(job as any).type}`);
      }
    } catch (err: any) {
      if (signal.aborted) return;
      console.error(`[AI Job System] Job ${id} error:`, err);
      this.failJob(id, err.message || 'AI job execution failed');
    }
  }
}

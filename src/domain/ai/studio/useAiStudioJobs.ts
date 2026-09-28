/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AiJob,
  AiJobType,
  VeeCutAiStudioClient,
  TextToVideoRequest,
  ImageToVideoRequest,
  AudioTranscriptionRequest,
  MusicGenRequest,
  VoiceConversationRequest,
  ImageGenRequest,
  ImageEditRequest,
} from './AiStudioProvider';

export function useAiStudioJobs(projectId?: string) {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<Record<string, number>>({});
  const clientRef = useRef(VeeCutAiStudioClient.getInstance());
  const timerRef = useRef<any>(null);

  // Load recent jobs
  const refreshJobs = useCallback(async () => {
    try {
      const recent = await clientRef.current.listJobs(projectId);
      setJobs(recent);
    } catch {}
  }, [projectId]);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  // Polling loop for active jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some((j) => j.status === 'queued' || j.status === 'processing');

    if (!hasActiveJobs) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(async () => {
      // Increment elapsed seconds for active jobs
      setElapsedSeconds((prev) => {
        const next = { ...prev };
        for (const job of jobs) {
          if (job.status === 'queued' || job.status === 'processing') {
            next[job.id] = (next[job.id] || 0) + 1;
          }
        }
        return next;
      });

      // Poll each pending job
      const updatedJobs = await Promise.all(
        jobs.map(async (j) => {
          if (j.status === 'queued' || j.status === 'processing') {
            try {
              return await clientRef.current.getJobStatus(j.id);
            } catch {
              return j;
            }
          }
          return j;
        })
      );

      setJobs(updatedJobs);
    }, 2000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [jobs]);

  // Start any AI job
  const startJob = useCallback(
    async (type: AiJobType, input: Record<string, any>): Promise<AiJob> => {
      const client = clientRef.current;
      let newJob: AiJob;

      switch (type) {
        case 'text_to_video':
          newJob = await client.generateVideo(input as TextToVideoRequest, projectId);
          break;
        case 'image_to_video':
          newJob = await client.animateImage(input as ImageToVideoRequest, projectId);
          break;
        case 'audio_to_transcript':
          newJob = await client.transcribeAudio(input as AudioTranscriptionRequest, projectId);
          break;
        case 'music_generation':
          newJob = await client.generateMusic(input as MusicGenRequest, projectId);
          break;
        case 'voice_conversation':
          newJob = await client.generateVoice(input as VoiceConversationRequest, projectId);
          break;
        case 'image_generation':
          newJob = await client.generateImage(input as ImageGenRequest, projectId);
          break;
        case 'image_editing':
          newJob = await client.editImage(input as ImageEditRequest, projectId);
          break;
        default:
          throw new Error(`Unsupported job type: ${type}`);
      }

      setJobs((prev) => [newJob, ...prev]);
      setActiveJobId(newJob.id);
      setElapsedSeconds((prev) => ({ ...prev, [newJob.id]: 0 }));
      return newJob;
    },
    [projectId]
  );

  const cancelJob = useCallback(async (jobId: string) => {
    await clientRef.current.cancelJob(jobId);
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status: 'cancelled', stage: 'Cancelled by user' } : j))
    );
  }, []);

  const retryJob = useCallback(
    async (jobId: string) => {
      const existing = jobs.find((j) => j.id === jobId);
      if (!existing) return;
      await startJob(existing.type, existing.input);
    },
    [jobs, startJob]
  );

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs.find((j) => j.status === 'processing') || null;

  return {
    jobs,
    activeJob,
    activeJobId,
    setActiveJobId,
    startJob,
    cancelJob,
    retryJob,
    refreshJobs,
    elapsedSeconds,
  };
}

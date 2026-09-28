/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AiJobManager } from '../../../server/aiJobs';
import { TimelineEngine } from '../../engine/timeline/TimelineEngine';
import { createTrack } from '../../domain/timeline/Track';
import { createBaseClip } from '../../domain/timeline/Clip';
import { createRationalTime, secondsToRationalTime } from '../../core/time/RationalTime';
import { MediaRegistry } from '../../engine/media/MediaRegistry';
import { BrowserMediaProcessor } from '../../media-services/browser/BrowserMediaProcessor';
import { MediaAsset } from '../../domain/media/MediaAsset';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export async function runAiMediaStudioUnitTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: AI Job Creation & Querying
  try {
    const jobManager = AiJobManager.getInstance();
    const job = jobManager.createJob('text_to_video', {
      prompt: 'Drone shot over mountain lake at sunrise',
      aspectRatio: '16:9',
      resolution: '1080p',
      duration: 5,
    }, 'test_project');

    if (!job.id || (job.status !== 'queued' && job.status !== 'processing') || job.input.aspectRatio !== '16:9') {
      throw new Error('Job initialization mismatch');
    }

    const retrieved = jobManager.getJob(job.id);
    if (!retrieved || retrieved.id !== job.id) {
      throw new Error('Failed to retrieve job by ID');
    }

    results.push({ name: 'AI Studio: Job Creation, Query & State Tracking', passed: true });
  } catch (err: any) {
    results.push({ name: 'AI Studio: Job Creation, Query & State Tracking', passed: false, details: err.message });
  }

  // Test 2: AI Job Cancellation
  try {
    const jobManager = AiJobManager.getInstance();
    const job = jobManager.createJob('music_generation', { prompt: 'Epic trailer' }, 'test_project');
    const cancelResult = jobManager.cancelJob(job.id);
    const updated = jobManager.getJob(job.id);

    if (!cancelResult || updated?.status !== 'cancelled') {
      throw new Error('Failed to cancel active job');
    }

    results.push({ name: 'AI Studio: Job Cancellation & Lifecycle Management', passed: true });
  } catch (err: any) {
    results.push({ name: 'AI Studio: Job Cancellation & Lifecycle Management', passed: false, details: err.message });
  }

  // Test 3: First-Class Timeline Asset Integration
  try {
    const seq = {
      id: 'seq_test_ai',
      name: 'Sequence',
      timecodeStart: createRationalTime(0),
      frameRate: { numerator: 60, denominator: 1 },
      tracks: [
        createTrack('track_v1', 'V1', 'video'),
        createTrack('track_a1', 'A1', 'audio'),
      ],
    };

    const timelineEngine = new TimelineEngine(seq);
    const processor = new BrowserMediaProcessor();
    const mediaRegistry = new MediaRegistry(processor);

    const generatedVideoAsset: MediaAsset = {
      id: 'asset_veo_generated_123',
      name: 'Veo: Neon Metropolis Drone',
      uri: '/api/ai/video-download?uri=mock_uri',
      type: 'video',
      fileSize: 1024 * 1024 * 4,
      duration: secondsToRationalTime(5),
      videoMetadata: { width: 1920, height: 1080, fps: 60, codec: 'h264' },
      isOffline: false,
      importedAt: new Date().toISOString(),
    };

    mediaRegistry.registerAsset(generatedVideoAsset);
    if (!mediaRegistry.getAsset('asset_veo_generated_123')) {
      throw new Error('MediaRegistry failed to store AI asset');
    }

    const clip = createBaseClip(
      'clip_ai_veo_1',
      'video',
      generatedVideoAsset.name,
      'track_v1',
      { start: createRationalTime(0), duration: secondsToRationalTime(5) },
      { start: createRationalTime(0), duration: secondsToRationalTime(5) }
    );
    (clip as any).mediaAssetId = generatedVideoAsset.id;

    timelineEngine.addClip('track_v1', clip);
    const clipsOnTrack = timelineEngine.getClipsForTrack('track_v1');
    if (clipsOnTrack.length !== 1 || clipsOnTrack[0].name !== generatedVideoAsset.name) {
      throw new Error('Timeline failed to hold AI clip with fidelity');
    }

    results.push({ name: 'AI Studio: First-Class Media Asset & Non-Linear Timeline Integration', passed: true });
  } catch (err: any) {
    results.push({ name: 'AI Studio: First-Class Media Asset & Non-Linear Timeline Integration', passed: false, details: err.message });
  }

  return results;
}

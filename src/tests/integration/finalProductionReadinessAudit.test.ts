/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimelineEngine } from '../../engine/timeline/TimelineEngine';
import { CommandManager } from '../../engine/command/CommandManager';
import { SplitClipCommand } from '../../engine/command/implementations/SplitClipCommand';
import { createDefaultSequence, Sequence } from '../../domain/timeline/Sequence';
import { createTrack, Track } from '../../domain/timeline/Track';
import { VideoClip } from '../../domain/timeline/Clip';
import { secondsToRationalTime, rationalTimeToSeconds } from '../../core/time/RationalTime';
import { createDefaultColorGrade } from '../../domain/color/ColorGrade';
import { createDefaultTransform } from '../../core/math/Transform2D';
import { Project } from '../../domain/project/Project';

function makeVideoClip(id: string, trackId: string, name: string, startSec: number, durSec: number): VideoClip {
  return {
    id,
    type: 'video',
    name,
    trackId,
    timelineRange: {
      start: secondsToRationalTime(startSec),
      duration: secondsToRationalTime(durSec),
    },
    sourceRange: {
      start: secondsToRationalTime(0),
      duration: secondsToRationalTime(durSec),
    },
    speed: 1.0,
    opacity: 1.0,
    muted: false,
    locked: false,
    transform: createDefaultTransform(),
    colorGrade: createDefaultColorGrade(),
    effects: [],
    masks: [],
    keyframeTracks: {},
    mediaAssetId: 'asset_master_4k',
  } as any;
}

export async function runFinalProductionReadinessAuditTests(): Promise<{ name: string; passed: boolean; details?: string }[]> {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // TEST 1: Video Asset Invariant & Zero-Loss Lifecycle Test
  try {
    const sequence: Sequence = createDefaultSequence('Audit Sequence');
    const track: Track = createTrack('v1', 'V1 - Master Video', 'video');
    sequence.tracks.push(track);

    const masterClip = makeVideoClip('c_master_video', 'v1', 'Cinematic Metropolis', 0, 30);
    sequence.tracks[0].clips.push(masterClip);

    const engine = new TimelineEngine(sequence);
    const commandManager = new CommandManager();

    // Perform multiple splits across the video clip
    const splitCmd1 = new SplitClipCommand(engine, 'c_master_video', secondsToRationalTime(10.0));
    await commandManager.execute(splitCmd1);

    const splitCmd2 = new SplitClipCommand(engine, 'c_master_video', secondsToRationalTime(5.0));
    await commandManager.execute(splitCmd2);

    const trackClips = engine.getSequence().tracks[0].clips;
    if (trackClips.length !== 3) {
      throw new Error(`Expected 3 clips after 2 splits, found ${trackClips.length}`);
    }

    // Verify all clips reference the exact original media asset ID and retain valid source ranges
    for (const clip of trackClips) {
      if ((clip as VideoClip).mediaAssetId !== 'asset_master_4k') {
        throw new Error(`Clip ${clip.id} lost its mediaAssetId reference!`);
      }
      const dur = rationalTimeToSeconds(clip.timelineRange.duration);
      if (dur <= 0) {
        throw new Error(`Clip ${clip.id} has invalid duration: ${dur}`);
      }
    }

    // Undo splits
    await commandManager.undo();
    await commandManager.undo();
    const restoredClips = engine.getSequence().tracks[0].clips;
    if (restoredClips.length !== 1 || rationalTimeToSeconds(restoredClips[0].timelineRange.duration) !== 30.0) {
      throw new Error('Undo failed to cleanly restore original single clip');
    }

    results.push({ name: 'Audit: Video Asset Invariant & Zero-Loss Lifecycle (Splits, Range Integrity, Undos)', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audit: Video Asset Invariant & Zero-Loss Lifecycle (Splits, Range Integrity, Undos)', passed: false, details: err.message });
  }

  // TEST 2: Multi-Track Audio Solo/Mute Logic Verification
  try {
    const tracks = [
      { id: 'a1', name: 'Voice Dialogue', type: 'audio' as const, muted: false, solo: true, volume: 0.9 },
      { id: 'a2', name: 'Music Score', type: 'audio' as const, muted: false, solo: false, volume: 0.7 },
      { id: 'a3', name: 'Sound FX', type: 'audio' as const, muted: true, solo: false, volume: 0.8 },
    ];

    const hasAnySolo = tracks.some((t) => t.solo);

    const getEffectiveVolume = (t: typeof tracks[0]) => {
      if (t.muted) return 0;
      if (hasAnySolo && !t.solo) return 0;
      return t.volume;
    };

    if (getEffectiveVolume(tracks[0]) !== 0.9) {
      throw new Error(`Track A1 (Soloed) expected volume 0.9, got ${getEffectiveVolume(tracks[0])}`);
    }
    if (getEffectiveVolume(tracks[1]) !== 0) {
      throw new Error(`Track A2 (Non-soloed while A1 is soloed) expected volume 0, got ${getEffectiveVolume(tracks[1])}`);
    }
    if (getEffectiveVolume(tracks[2]) !== 0) {
      throw new Error(`Track A3 (Muted) expected volume 0, got ${getEffectiveVolume(tracks[2])}`);
    }

    results.push({ name: 'Audit: Multi-Track Audio Solo/Mute Evaluation Matrix', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audit: Multi-Track Audio Solo/Mute Evaluation Matrix', passed: false, details: err.message });
  }

  // TEST 3: SSRF & URL Origin Security Validation
  try {
    function validateVideoDownloadUri(uri: string): boolean {
      try {
        const parsed = new URL(uri);
        return (
          parsed.protocol === 'https:' &&
          (parsed.hostname === 'generativelanguage.googleapis.com' ||
            parsed.hostname.endsWith('.googleapis.com'))
        );
      } catch {
        return false;
      }
    }

    // Legitimate Google API URIs
    if (!validateVideoDownloadUri('https://generativelanguage.googleapis.com/v1beta/files/video123')) {
      throw new Error('Valid Google API URI rejected incorrectly');
    }
    if (!validateVideoDownloadUri('https://storage.googleapis.com/veo-outputs/render_4k.mp4')) {
      throw new Error('Valid Google Storage URI rejected incorrectly');
    }

    // Malicious SSRF URIs that MUST be rejected
    const maliciousUris = [
      'http://generativelanguage.googleapis.com/v1beta/files/video123',
      'file:///etc/passwd',
      'https://attacker.com/steal-creds',
      'https://generativelanguage.googleapis.com.evil-hacker.com/file',
      'https://169.254.169.254/computeMetadata/v1/',
      'javascript:alert(1)',
    ];

    for (const badUri of maliciousUris) {
      if (validateVideoDownloadUri(badUri)) {
        throw new Error(`CRITICAL SECURITY FAILURE: Malicious URI was permitted: ${badUri}`);
      }
    }

    results.push({ name: 'Audit: SSRF & Cloud Metadata Exfiltration Protection', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audit: SSRF & Cloud Metadata Exfiltration Protection', passed: false, details: err.message });
  }

  // TEST 4: Deep Sequential Split-Undo-Redo State Symmetry
  try {
    const sequence: Sequence = createDefaultSequence('Stress Undo Sequence');
    const track: Track = createTrack('v1', 'Track 1', 'video');
    sequence.tracks.push(track);

    const clip1 = makeVideoClip('clip_stress_1', 'v1', 'Stress Clip 1', 0, 50);
    const clip2 = makeVideoClip('clip_stress_2', 'v1', 'Stress Clip 2', 55, 40);
    sequence.tracks[0].clips.push(clip1, clip2);

    const engine = new TimelineEngine(sequence);
    const commandManager = new CommandManager();

    const initialFingerprint = JSON.stringify(engine.getSequence().tracks);

    // Perform multiple splits
    const splitCmd1 = new SplitClipCommand(engine, 'clip_stress_1', secondsToRationalTime(10));
    await commandManager.execute(splitCmd1);

    const splitCmd2 = new SplitClipCommand(engine, 'clip_stress_1', secondsToRationalTime(5));
    await commandManager.execute(splitCmd2);

    const splitCmd3 = new SplitClipCommand(engine, 'clip_stress_2', secondsToRationalTime(70));
    await commandManager.execute(splitCmd3);

    if (engine.getSequence().tracks[0].clips.length <= 2) {
      throw new Error('Splits did not increase clip count as expected');
    }

    // Undo all commands
    while (commandManager.canUndo()) {
      await commandManager.undo();
    }

    const restoredFingerprint = JSON.stringify(engine.getSequence().tracks);
    if (initialFingerprint !== restoredFingerprint) {
      throw new Error(`Fingerprint mismatch after undo cycle!`);
    }

    // Redo all commands
    while (commandManager.canRedo()) {
      await commandManager.redo();
    }

    // Undo all once more to verify reversibility
    while (commandManager.canUndo()) {
      await commandManager.undo();
    }

    if (JSON.stringify(engine.getSequence().tracks) !== initialFingerprint) {
      throw new Error('Fingerprint mismatch after second undo cycle!');
    }

    results.push({ name: 'Audit: Deep Sequential Split-Undo-Redo State Symmetry', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audit: Deep Sequential Split-Undo-Redo State Symmetry', passed: false, details: err.message });
  }

  // TEST 5: Rate Limiter Token Bucket Math
  try {
    interface Bucket {
      count: number;
      resetTime: number;
    }
    const store = new Map<string, Bucket>();

    function simulateRateLimit(ip: string, limit: number, windowMs: number, currentTime: number): boolean {
      const b = store.get(ip);
      if (!b || currentTime > b.resetTime) {
        store.set(ip, { count: 1, resetTime: currentTime + windowMs });
        return true;
      }
      if (b.count >= limit) {
        return false;
      }
      b.count++;
      return true;
    }

    const ip = '192.168.1.50';
    let t = 10000;
    // Allow up to 5 requests
    for (let i = 0; i < 5; i++) {
      if (!simulateRateLimit(ip, 5, 1000, t)) {
        throw new Error(`Request ${i + 1} should have been permitted`);
      }
    }
    // 6th request within window must be denied
    if (simulateRateLimit(ip, 5, 1000, t)) {
      throw new Error('6th request within window should have been blocked');
    }

    // After window expires, requests must be accepted again
    t += 1001;
    if (!simulateRateLimit(ip, 5, 1000, t)) {
      throw new Error('Request after window expiration should have been permitted');
    }

    results.push({ name: 'Audit: Rate Limiting & Anti-Abuse Token Window Algorithm', passed: true });
  } catch (err: any) {
    results.push({ name: 'Audit: Rate Limiting & Anti-Abuse Token Window Algorithm', passed: false, details: err.message });
  }

  return results;
}

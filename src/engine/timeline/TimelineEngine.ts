/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RationalTime,
  TimeRange,
  addRationalTime,
  subtractRationalTime,
  compareRationalTime,
  rationalTimeToSeconds,
  createRationalTime,
} from '../../core/time/RationalTime';
import { TimelineClip, VideoClip, AudioClip, createBaseClip } from '../../domain/timeline/Clip';
import { Track, createTrack } from '../../domain/timeline/Track';
import { Sequence } from '../../domain/timeline/Sequence';
import { LuminaError, ErrorCode, TimelineCollisionError } from '../../core/errors/AppErrors';
import { logger } from '../../core/logging/Logger';
import { deepClone } from '../../core/utils/clone';
import { TimelineIntervalIndex } from './TimelineIntervalIndex';

export class TimelineEngine {
  private sequence: Sequence;
  private listeners: Set<() => void> = new Set();

  constructor(sequence: Sequence) {
    this.sequence = sequence;
  }

  public setSequence(sequence: Sequence, notify: boolean = true): void {
    this.sequence = sequence;
    TimelineIntervalIndex.invalidate(this.sequence);
    this.recalculateSequenceDuration();
    if (notify) {
      this.notify();
    }
  }

  public getSequence(): Sequence {
    return this.sequence;
  }

  public getTrack(trackId: string): Track | undefined {
    return this.sequence.tracks.find((t) => t.id === trackId);
  }

  public getClipsForTrack(trackId: string): TimelineClip[] {
    const track = this.getTrack(trackId);
    return track ? [...track.clips] : [];
  }

  public findClip(clipId: string): { clip: TimelineClip; track: Track; index: number } | undefined {
    for (const track of this.sequence.tracks) {
      const index = track.clips.findIndex((c) => c.id === clipId);
      if (index !== -1) {
        return { clip: track.clips[index], track, index };
      }
    }
    return undefined;
  }

  /**
   * Checks whether placing a clip in the given time range on trackId collides with existing clips.
   */
  public hasCollision(
    trackId: string,
    range: TimeRange,
    excludeClipId?: string
  ): { hasCollision: boolean; collidingClip?: TimelineClip } {
    const track = this.getTrack(trackId);
    if (!track) return { hasCollision: false };

    const clipEnd = addRationalTime(range.start, range.duration);
    for (const existing of track.clips) {
      if (existing.id === excludeClipId) continue;
      const existEnd = addRationalTime(existing.timelineRange.start, existing.timelineRange.duration);
      if (
        compareRationalTime(range.start, existEnd) < 0 &&
        compareRationalTime(existing.timelineRange.start, clipEnd) < 0
      ) {
        return { hasCollision: true, collidingClip: existing };
      }
    }
    return { hasCollision: false };
  }

  /**
   * Finds an available track of the requested kind without collision for the given range.
   * Checks preferredTrackId first, then other matching tracks, and if none are available,
   * creates a new track.
   */
  public findAvailableTrack(
    kind: 'video' | 'audio',
    range: TimeRange,
    preferredTrackId?: string,
    createIfNoneAvailable: boolean = true
  ): { track: Track; isNew: boolean } {
    const matchingTracks = this.sequence.tracks.filter((t) => t.kind === kind && !t.locked);

    // 1. Check preferred track first if provided and matches kind
    if (preferredTrackId) {
      const pref = matchingTracks.find((t) => t.id === preferredTrackId);
      if (pref && !this.hasCollision(pref.id, range).hasCollision) {
        return { track: pref, isNew: false };
      }
    }

    // 2. Check other existing tracks of the same kind
    for (const tr of matchingTracks) {
      if (tr.id === preferredTrackId) continue;
      if (!this.hasCollision(tr.id, range).hasCollision) {
        return { track: tr, isNew: false };
      }
    }

    // 3. If none available and createIfNoneAvailable is true, create a new track
    if (createIfNoneAvailable) {
      const count = this.sequence.tracks.filter((t) => t.kind === kind).length + 1;
      const newTrackId = `track_${kind}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newTrackName = kind === 'video' ? `Video ${count}` : `Audio ${count}`;
      const newTrack = createTrack(newTrackId, newTrackName, kind);

      if (kind === 'video') {
        // Video tracks stack on top
        this.sequence.tracks.unshift(newTrack);
      } else {
        // Audio tracks append on bottom
        this.sequence.tracks.push(newTrack);
      }
      return { track: newTrack, isNew: true };
    }

    // Fallback
    const fallback = matchingTracks.find((t) => t.id === preferredTrackId) || matchingTracks[0] || this.sequence.tracks[0];
    return { track: fallback, isNew: false };
  }

  /**
   * Calculates the end time of the last clip on a track, or 0 if empty.
   */
  public getTrackEndTime(trackId: string): RationalTime {
    const track = this.getTrack(trackId);
    if (!track || track.clips.length === 0) return createRationalTime(0);
    let maxEnd = createRationalTime(0);
    for (const c of track.clips) {
      const end = addRationalTime(c.timelineRange.start, c.timelineRange.duration);
      if (compareRationalTime(end, maxEnd) > 0) {
        maxEnd = end;
      }
    }
    return maxEnd;
  }

  /**
   * Adds a clip to a track, checking for overlap collisions.
   */
  public addClip(trackId: string, clip: TimelineClip, insertIndex?: number): void {
    const track = this.getTrack(trackId);
    if (!track) {
      throw new LuminaError(ErrorCode.TIMELINE_COLLISION, `Track ${trackId} not found`, 'Track not found');
    }

    // Check collision with existing clips on same track
    const clipEnd = addRationalTime(clip.timelineRange.start, clip.timelineRange.duration);
    for (const existing of track.clips) {
      if (existing.id === clip.id) continue;
      const existEnd = addRationalTime(existing.timelineRange.start, existing.timelineRange.duration);
      if (
        compareRationalTime(clip.timelineRange.start, existEnd) < 0 &&
        compareRationalTime(existing.timelineRange.start, clipEnd) < 0
      ) {
        throw new TimelineCollisionError(trackId, `Clip overlaps with existing clip "${existing.name}"`);
      }
    }

    clip.trackId = trackId;
    if (insertIndex !== undefined && insertIndex >= 0) {
      track.clips.splice(insertIndex, 0, clip);
    } else {
      track.clips.push(clip);
    }

    // Maintain clips sorted by start time
    track.clips.sort((a, b) => compareRationalTime(a.timelineRange.start, b.timelineRange.start));

    this.recalculateSequenceDuration();
    this.notify();
    logger.info('TimelineEngine', `Added clip "${clip.name}" to track ${track.name}`, { clipId: clip.id });
  }

  /**
   * Removes a clip from the timeline.
   */
  public removeClip(clipId: string): { clip: TimelineClip; trackId: string; index: number } | undefined {
    const found = this.findClip(clipId);
    if (!found) return undefined;

    const { clip, track, index } = found;
    track.clips.splice(index, 1);

    this.recalculateSequenceDuration();
    this.notify();
    logger.info('TimelineEngine', `Removed clip "${clip.name}" from track ${track.name}`, { clipId });
    return { clip, trackId: track.id, index };
  }

  /**
   * Moves a clip to a new start time and optionally a new track.
   */
  public moveClip(clipId: string, newTrackId: string, newStartTime: RationalTime): void {
    const found = this.findClip(clipId);
    if (!found) {
      throw new LuminaError(ErrorCode.TIMELINE_COLLISION, `Clip ${clipId} not found`, 'Clip not found');
    }

    const { clip, track } = found;
    // Temporarily remove from current track
    const removed = this.removeClip(clipId);
    if (!removed) return;

    const originalTrackId = track.id;
    const originalStart = clip.timelineRange.start;

    try {
      clip.timelineRange = {
        start: newStartTime,
        duration: clip.timelineRange.duration,
      };
      this.addClip(newTrackId, clip);
    } catch (err) {
      // Revert if collision occurred
      clip.timelineRange = {
        start: originalStart,
        duration: clip.timelineRange.duration,
      };
      this.addClip(originalTrackId, clip);
      throw err;
    }
  }

  /**
   * Trims a clip's in/out points.
   */
  public trimClip(
    clipId: string,
    newTimelineStart: RationalTime,
    newDuration: RationalTime,
    newSourceIn: RationalTime
  ): void {
    const found = this.findClip(clipId);
    if (!found) {
      throw new LuminaError(ErrorCode.TIMELINE_COLLISION, `Clip ${clipId} not found`, 'Clip not found');
    }

    const { clip, track } = found;
    const originalTimelineRange = { ...clip.timelineRange };
    const originalSourceRange = { ...clip.sourceRange };

    // Validate duration is positive
    if (newDuration.value <= 0n) {
      throw new LuminaError(ErrorCode.INVALID_RANGE, 'Clip duration must be greater than zero', 'Duration is too short');
    }

    // Check overlap with neighbors on the same track
    const newEnd = addRationalTime(newTimelineStart, newDuration);
    for (const other of track.clips) {
      if (other.id === clipId) continue;
      const otherEnd = addRationalTime(other.timelineRange.start, other.timelineRange.duration);
      if (
        compareRationalTime(newTimelineStart, otherEnd) < 0 &&
        compareRationalTime(other.timelineRange.start, newEnd) < 0
      ) {
        throw new TimelineCollisionError(track.id, 'Trimming causes collision with adjacent clip');
      }
    }

    clip.timelineRange = { start: newTimelineStart, duration: newDuration };
    clip.sourceRange = { start: newSourceIn, duration: newDuration };

    track.clips.sort((a, b) => compareRationalTime(a.timelineRange.start, b.timelineRange.start));
    this.recalculateSequenceDuration();
    this.notify();
    logger.info('TimelineEngine', `Trimmed clip "${clip.name}"`, {
      clipId,
      newTimelineStart: rationalTimeToSeconds(newTimelineStart),
      newDuration: rationalTimeToSeconds(newDuration),
    });
  }

  /**
   * Splits a clip at a given timeline timestamp.
   */
  public splitClip(clipId: string, splitTimelineTime: RationalTime): { left: TimelineClip; right: TimelineClip } {
    const found = this.findClip(clipId);
    if (!found) {
      throw new LuminaError(ErrorCode.TIMELINE_COLLISION, `Clip ${clipId} not found`, 'Clip not found');
    }

    const { clip, track } = found;
    const clipStart = clip.timelineRange.start;
    const clipEnd = addRationalTime(clipStart, clip.timelineRange.duration);

    // Verify split point is strictly inside the clip
    if (
      compareRationalTime(splitTimelineTime, clipStart) <= 0 ||
      compareRationalTime(splitTimelineTime, clipEnd) >= 0
    ) {
      throw new LuminaError(
        ErrorCode.INVALID_RANGE,
        'Split point must be strictly inside the clip boundaries',
        'Playhead must be inside the selected clip to split it'
      );
    }

    const leftDuration = subtractRationalTime(splitTimelineTime, clipStart);
    const rightDuration = subtractRationalTime(clipEnd, splitTimelineTime);

    // Calculate source offsets
    const leftSourceRange: TimeRange = {
      start: clip.sourceRange.start,
      duration: leftDuration,
    };
    const rightSourceStart = addRationalTime(clip.sourceRange.start, leftDuration);
    const rightSourceRange: TimeRange = {
      start: rightSourceStart,
      duration: rightDuration,
    };

    // Modify existing clip to be left side
    clip.timelineRange = { start: clipStart, duration: leftDuration };
    clip.sourceRange = leftSourceRange;

    // Filter left clip keyframes
    if (clip.keyframeTracks) {
      const leftKeyframeTracks: Record<string, any> = {};
      for (const [prop, trackData] of Object.entries(clip.keyframeTracks)) {
        const filtered = (trackData.keyframes || []).filter(
          (k: any) => compareRationalTime(k.time, leftDuration) <= 0
        );
        if (filtered.length > 0) {
          leftKeyframeTracks[prop] = {
            ...trackData,
            keyframes: filtered,
          };
        }
      }
      clip.keyframeTracks = leftKeyframeTracks;
    }

    // Create new right side clip
    const rightClipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rightClip: TimelineClip = {
      ...deepClone(clip),
      id: rightClipId,
      name: `${clip.name} (Part 2)`,
      timelineRange: { start: splitTimelineTime, duration: rightDuration },
      sourceRange: rightSourceRange,
    };

    // Filter & offset right clip keyframes
    if (rightClip.keyframeTracks) {
      const rightKeyframeTracks: Record<string, any> = {};
      for (const [prop, trackData] of Object.entries(rightClip.keyframeTracks)) {
        const filteredAndOffset = (trackData.keyframes || [])
          .filter((k: any) => compareRationalTime(k.time, leftDuration) > 0)
          .map((k: any) => ({
            ...k,
            id: `kf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            time: subtractRationalTime(k.time, leftDuration),
          }));
        if (filteredAndOffset.length > 0) {
          rightKeyframeTracks[prop] = {
            ...trackData,
            keyframes: filteredAndOffset,
          };
        }
      }
      rightClip.keyframeTracks = rightKeyframeTracks;
    }

    this.addClip(track.id, rightClip);
    return { left: clip, right: rightClip };
  }

  /**
   * Finds all active clips at a specific timeline timestamp T.
   */
  public getClipsAtTime(time: RationalTime): { clip: TimelineClip; track: Track }[] {
    const results: { clip: TimelineClip; track: Track }[] = [];

    for (const track of this.sequence.tracks) {
      if (!track.visible && track.kind === 'video') continue;
      if (track.muted && track.kind === 'audio') continue;

      for (const clip of track.clips) {
        if (clip.muted) continue;
        const start = clip.timelineRange.start;
        const end = addRationalTime(start, clip.timelineRange.duration);
        if (compareRationalTime(time, start) >= 0 && compareRationalTime(time, end) < 0) {
          results.push({ clip, track });
        }
      }
    }

    return results;
  }

  /**
   * Snapping engine: finds nearest snap points within threshold.
   */
  public calculateSnap(
    targetTime: RationalTime,
    playheadTime: RationalTime,
    thresholdSeconds = 0.15,
    excludeClipId?: string
  ): { snappedTime: RationalTime; didSnap: boolean; snapTargetName?: string } {
    const targetSec = rationalTimeToSeconds(targetTime);
    let closestDiff = thresholdSeconds;
    let bestSnap = targetTime;
    let didSnap = false;
    let snapTargetName: string | undefined;

    // Snap to 0 (timeline start)
    if (Math.abs(targetSec) < closestDiff) {
      closestDiff = Math.abs(targetSec);
      bestSnap = createRationalTime(0);
      didSnap = true;
      snapTargetName = 'Timeline Start';
    }

    // Snap to Playhead
    const playheadSec = rationalTimeToSeconds(playheadTime);
    if (Math.abs(targetSec - playheadSec) < closestDiff) {
      closestDiff = Math.abs(targetSec - playheadSec);
      bestSnap = playheadTime;
      didSnap = true;
      snapTargetName = 'Playhead';
    }

    // Snap to existing clip boundaries
    for (const track of this.sequence.tracks) {
      for (const clip of track.clips) {
        if (clip.id === excludeClipId) continue;

        const startSec = rationalTimeToSeconds(clip.timelineRange.start);
        const endSec = rationalTimeToSeconds(addRationalTime(clip.timelineRange.start, clip.timelineRange.duration));

        if (Math.abs(targetSec - startSec) < closestDiff) {
          closestDiff = Math.abs(targetSec - startSec);
          bestSnap = clip.timelineRange.start;
          didSnap = true;
          snapTargetName = `${clip.name} (In)`;
        }

        if (Math.abs(targetSec - endSec) < closestDiff) {
          closestDiff = Math.abs(targetSec - endSec);
          bestSnap = addRationalTime(clip.timelineRange.start, clip.timelineRange.duration);
          didSnap = true;
          snapTargetName = `${clip.name} (Out)`;
        }
      }
    }

    // Snap to Sequence Markers
    for (const marker of (this.sequence.markers || [])) {
      const markerSec = rationalTimeToSeconds(marker.time);
      if (Math.abs(targetSec - markerSec) < closestDiff) {
        closestDiff = Math.abs(targetSec - markerSec);
        bestSnap = marker.time;
        didSnap = true;
        snapTargetName = `Marker: ${marker.name}`;
      }
    }

    return { snappedTime: bestSnap, didSnap, snapTargetName };
  }

  public recalculateSequenceDuration(): void {
    let maxEnd = createRationalTime(0);
    for (const track of this.sequence.tracks) {
      for (const clip of track.clips) {
        const clipEnd = addRationalTime(clip.timelineRange.start, clip.timelineRange.duration);
        if (compareRationalTime(clipEnd, maxEnd) > 0) {
          maxEnd = clipEnd;
        }
      }
    }
    this.sequence.duration = maxEnd;
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    TimelineIntervalIndex.invalidate(this.sequence);
    this.listeners.forEach((l) => l());
  }
}

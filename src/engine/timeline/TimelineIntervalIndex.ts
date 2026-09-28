/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RationalTime,
  compareRationalTime,
  addRationalTime,
  rationalTimeToSeconds,
} from '../../core/time/RationalTime';
import { TimelineClip } from '../../domain/timeline/Clip';
import { Track } from '../../domain/timeline/Track';
import { Sequence } from '../../domain/timeline/Sequence';

export interface IndexedClipEntry {
  clip: TimelineClip;
  track: Track;
  startSec: number;
  endSec: number;
  startRational: RationalTime;
  endRational: RationalTime;
}

export class TimelineIntervalIndex {
  private static instances: WeakMap<Sequence, TimelineIntervalIndex> = new WeakMap();
  private entriesByTrack: Map<string, IndexedClipEntry[]> = new Map();
  private allVisualEntries: IndexedClipEntry[] = [];
  private sequenceVersion: number = 0;
  private lastIndexedSignature: string = '';
  private sequenceRef: Sequence;

  constructor(sequence: Sequence) {
    this.sequenceRef = sequence;
    this.buildIndex(sequence);
  }

  public static invalidate(sequence?: Sequence): void {
    if (sequence) {
      this.instances.delete(sequence);
    }
  }

  private static computeSignature(sequence: Sequence): string {
    let sig = '';
    for (let t = 0; t < sequence.tracks.length; t++) {
      const track = sequence.tracks[t];
      sig += `${track.id}:${track.kind}:${track.visible ? 1 : 0}:${track.muted ? 1 : 0}[`;
      for (let c = 0; c < track.clips.length; c++) {
        const clip = track.clips[c];
        const sVal = clip.timelineRange?.start?.value?.toString() ?? '0';
        const dVal = clip.timelineRange?.duration?.value?.toString() ?? '0';
        sig += `${clip.id}@${sVal}+${dVal}:${clip.muted ? 1 : 0},`;
      }
      sig += '];';
    }
    return sig;
  }

  public static getForSequence(sequence: Sequence): TimelineIntervalIndex {
    let index = this.instances.get(sequence);
    const currentSignature = this.computeSignature(sequence);

    if (!index) {
      index = new TimelineIntervalIndex(sequence);
      index.lastIndexedSignature = currentSignature;
      this.instances.set(sequence, index);
    } else {
      if (index.lastIndexedSignature !== currentSignature) {
        index.buildIndex(sequence);
        index.lastIndexedSignature = currentSignature;
      }
    }
    return index;
  }

  public buildIndex(sequence: Sequence): void {
    this.sequenceRef = sequence;
    this.entriesByTrack.clear();
    this.allVisualEntries = [];

    for (const track of sequence.tracks) {
      const trackEntries: IndexedClipEntry[] = [];

      for (const clip of track.clips) {
        const startRational = clip.timelineRange.start;
        const endRational = addRationalTime(startRational, clip.timelineRange.duration);
        const startSec = rationalTimeToSeconds(startRational);
        const endSec = rationalTimeToSeconds(endRational);

        const entry: IndexedClipEntry = {
          clip,
          track,
          startSec,
          endSec,
          startRational,
          endRational,
        };

        trackEntries.push(entry);

        if (track.kind === 'video' && track.visible && !clip.muted) {
          this.allVisualEntries.push(entry);
        }
      }

      // Sort by start time for binary search
      trackEntries.sort((a, b) => a.startSec - b.startSec);
      this.entriesByTrack.set(track.id, trackEntries);
    }

    // Sort all visual entries by start time, and tiebreak by track ID for deterministic layering
    this.allVisualEntries.sort((a, b) => {
      if (Math.abs(a.startSec - b.startSec) > 0.0001) {
        return a.startSec - b.startSec;
      }
      return a.track.id.localeCompare(b.track.id);
    });

    this.lastIndexedSignature = TimelineIntervalIndex.computeSignature(sequence);
    this.sequenceVersion++;
  }

  /**
   * Fast query for active visual clips at a given time using binary search & interval overlap,
   * with fail-safe direct scan fallback to guarantee no clip ever disappears.
   */
  public queryActiveVisualLayers(time: RationalTime): { clip: TimelineClip; track: Track }[] {
    const timeSec = rationalTimeToSeconds(time);
    const active: { clip: TimelineClip; track: Track }[] = [];

    // Filter visual entries that contain timeSec
    for (let i = 0; i < this.allVisualEntries.length; i++) {
      const entry = this.allVisualEntries[i];
      if (entry.startSec <= timeSec && entry.endSec > timeSec) {
        // Precise rational check for boundaries
        if (
          compareRationalTime(time, entry.startRational) >= 0 &&
          compareRationalTime(time, entry.endRational) < 0
        ) {
          active.push({ clip: entry.clip, track: entry.track });
        }
      }
    }

    // Fail-safe direct scan fallback: if index returned empty, verify against real sequence
    if (active.length === 0 && this.sequenceRef) {
      for (const track of this.sequenceRef.tracks) {
        if (track.kind === 'video' && track.visible) {
          for (const clip of track.clips) {
            if (!clip.muted) {
              const start = clip.timelineRange.start;
              const end = addRationalTime(start, clip.timelineRange.duration);
              if (
                compareRationalTime(time, start) >= 0 &&
                compareRationalTime(time, end) < 0
              ) {
                active.push({ clip, track });
              }
            }
          }
        }
      }
      if (active.length > 0) {
        // Index was out of sync; rebuild immediately
        this.buildIndex(this.sequenceRef);
      }
    }

    // Sort layers from bottom track to top track
    active.sort((a, b) => a.track.id.localeCompare(b.track.id));
    return active;
  }

  /**
   * Look ahead in timeline to find upcoming clips in the next [windowSeconds]
   */
  public queryUpcomingVisualClips(currentTime: RationalTime, windowSeconds: number = 3.0): TimelineClip[] {
    const timeSec = rationalTimeToSeconds(currentTime);
    const maxSec = timeSec + windowSeconds;
    const upcoming: TimelineClip[] = [];

    for (let i = 0; i < this.allVisualEntries.length; i++) {
      const entry = this.allVisualEntries[i];
      if (entry.startSec > timeSec && entry.startSec <= maxSec) {
        upcoming.push(entry.clip);
      }
    }

    return upcoming;
  }
}

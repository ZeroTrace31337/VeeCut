/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICommand } from '../Command';
import { TimelineEngine } from '../../timeline/TimelineEngine';
import { TimelineClip } from '../../../domain/timeline/Clip';

export class AddClipCommand implements ICommand {
  public readonly id = `cmd_add_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  public readonly name = 'Add Clip';
  public readonly description: string;
  public readonly timestamp = Date.now();

  public actualTrackId: string;
  private createdTrackId?: string;

  constructor(
    private timelineEngine: TimelineEngine,
    private trackId: string,
    private clip: TimelineClip,
    private insertIndex?: number,
    private autoResolveCollision: boolean = true
  ) {
    this.actualTrackId = trackId;
    this.description = `Add clip "${clip.name}" to track`;
  }

  public execute(): void {
    const track = this.timelineEngine.getTrack(this.actualTrackId);
    if (this.autoResolveCollision && track) {
      const collision = this.timelineEngine.hasCollision(
        this.actualTrackId,
        this.clip.timelineRange,
        this.clip.id
      );

      if (collision.hasCollision) {
        const resolution = this.timelineEngine.findAvailableTrack(
          track.kind,
          this.clip.timelineRange,
          this.actualTrackId,
          true
        );
        this.actualTrackId = resolution.track.id;
        this.clip.trackId = resolution.track.id;
        if (resolution.isNew) {
          this.createdTrackId = resolution.track.id;
        }
      }
    }

    this.timelineEngine.addClip(this.actualTrackId, this.clip, this.insertIndex);
  }

  public undo(): void {
    this.timelineEngine.removeClip(this.clip.id);
    if (this.createdTrackId) {
      const sequence = this.timelineEngine.getSequence();
      const track = sequence.tracks.find((t) => t.id === this.createdTrackId);
      if (track && track.clips.length === 0) {
        const idx = sequence.tracks.indexOf(track);
        if (idx !== -1) {
          sequence.tracks.splice(idx, 1);
          this.timelineEngine.recalculateSequenceDuration();
          this.timelineEngine.notify();
        }
      }
    }
  }
}

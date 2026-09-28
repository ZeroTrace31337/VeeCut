/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Film, RefreshCw, X, AlertCircle, CheckCircle2, Clock, HardDrive, Layers, Server } from 'lucide-react';
import { VideoPlaybackManager } from '../../rendering/playback/VideoPlaybackManager';
import { TimelineIntervalIndex } from '../../engine/timeline/TimelineIntervalIndex';
import { useEditor } from '../context/EditorContext';
import { rationalTimeToSeconds } from '../../core/time/RationalTime';

interface MediaDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const READY_STATE_MAP: Record<number, { label: string; color: string }> = {
  0: { label: '0: HAVE_NOTHING', color: 'text-rose-400 bg-rose-950/60 border-rose-800/60' },
  1: { label: '1: HAVE_METADATA', color: 'text-amber-400 bg-amber-950/60 border-amber-800/60' },
  2: { label: '2: HAVE_CURRENT_DATA', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
  3: { label: '3: HAVE_FUTURE_DATA', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60' },
  4: { label: '4: HAVE_ENOUGH_DATA', color: 'text-emerald-300 bg-emerald-900/60 border-emerald-700/60' },
};

const NETWORK_STATE_MAP: Record<number, { label: string }> = {
  0: { label: 'NETWORK_EMPTY' },
  1: { label: 'NETWORK_IDLE' },
  2: { label: 'NETWORK_LOADING' },
  3: { label: 'NETWORK_NO_SOURCE' },
};

export const MediaDebugPanel: React.FC<MediaDebugPanelProps> = ({ isOpen, onClose }) => {
  const { timelineEngine, currentTime, mediaRegistry } = useEditor();
  const [poolInfo, setPoolInfo] = useState<any[]>([]);
  const [indexDebug, setIndexDebug] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const refreshData = () => {
    const manager = VideoPlaybackManager.getInstance();
    setPoolInfo(manager.getPoolDebugInfo());

    const seq = timelineEngine.getSequence();
    const idx = TimelineIntervalIndex.getForSequence(seq);
    setIndexDebug({
      cachedIntervalsCount: (idx as any).allVisualEntries?.length ?? 0,
      signature: (idx as any).lastIndexedSignature ?? 'None',
    });
    setLastUpdated(Date.now());
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshData();
    const timer = setInterval(refreshData, 800);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const sequence = timelineEngine.getSequence();
  const currentSec = rationalTimeToSeconds(currentTime);

  // Active clips in current sequence at playhead
  const allClips: any[] = [];
  for (const track of sequence.tracks) {
    for (const clip of track.clips) {
      const cStart = rationalTimeToSeconds(clip.timelineRange.start);
      const cDur = rationalTimeToSeconds(clip.timelineRange.duration);
      const isActive = currentSec >= cStart && currentSec < cStart + cDur;
      allClips.push({
        clip,
        trackId: track.id,
        trackName: track.name,
        isActive,
        cStart,
        cDur,
      });
    }
  }

  const handleReloadAsset = (assetId: string) => {
    VideoPlaybackManager.getInstance().forceReloadAsset(assetId);
    refreshData();
  };

  const handleInvalidateIndex = () => {
    TimelineIntervalIndex.invalidate(timelineEngine.getSequence());
    timelineEngine.notify();
    refreshData();
  };

  const handleReloadAll = () => {
    for (const item of poolInfo) {
      VideoPlaybackManager.getInstance().forceReloadAsset(item.assetId);
    }
    TimelineIntervalIndex.invalidate(timelineEngine.getSequence());
    timelineEngine.notify();
    refreshData();
  };

  return (
    <div
      id="media-debug-panel"
      className="absolute top-12 right-4 z-50 w-[520px] max-h-[85vh] bg-zinc-950/95 border border-zinc-700/80 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col text-zinc-200 select-none overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/60">
        <div className="flex items-center gap-2 font-sans font-semibold text-zinc-100">
          <Film className="w-4 h-4 text-cyan-400" />
          <span>Media & Video Decoder Inspector</span>
          <span className="px-1.5 py-0.5 text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/60 rounded">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            title="Refresh diagnostics"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-850 bg-zinc-900/30 text-[11px] font-sans">
        <button
          onClick={handleInvalidateIndex}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 transition-colors"
        >
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>Rebuild Index Cache</span>
        </button>

        <button
          onClick={handleReloadAll}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-md text-zinc-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-amber-400" />
          <span>Reload All Decoders</span>
        </button>

        <div className="ml-auto text-[10px] text-zinc-500">
          {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Section 1: Video Playback Manager Pool */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-sans font-semibold text-zinc-300">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>HTMLVideoElement Pool ({poolInfo.length} active)</span>
            </div>
            <span className="text-[10px] text-zinc-500">Cap: 32 elements</span>
          </div>

          {poolInfo.length === 0 ? (
            <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl text-zinc-500 text-center">
              No active video elements allocated yet.
            </div>
          ) : (
            <div className="space-y-2">
              {poolInfo.map((elem) => {
                const ready = READY_STATE_MAP[elem.readyState] || {
                  label: `Ready ${elem.readyState}`,
                  color: 'text-zinc-400',
                };
                const network = NETWORK_STATE_MAP[elem.networkState]?.label || `Net ${elem.networkState}`;

                return (
                  <div
                    key={elem.assetId}
                    className="p-2.5 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate max-w-[320px]">
                        <span className="font-bold text-zinc-200 truncate">{elem.assetId}</span>
                        {elem.hasError && (
                          <span className="px-1 py-0.2 bg-rose-950 text-rose-400 border border-rose-800 rounded text-[9px]">
                            ERROR
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleReloadAsset(elem.assetId)}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded transition-colors"
                      >
                        Reload
                      </button>
                    </div>

                    <div className="text-[10px] text-zinc-500 truncate" title={elem.uri}>
                      URI: {elem.uri.substring(0, 50)}...
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      <span className={`px-1.5 py-0.5 border rounded ${ready.color}`}>
                        {ready.label}
                      </span>
                      <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                        {network}
                      </span>
                      <span className="text-zinc-400">
                        {elem.videoWidth}x{elem.videoHeight}
                      </span>
                      <span className="text-zinc-400">
                        t: {elem.currentTime.toFixed(2)}s / {elem.duration.toFixed(2)}s
                      </span>
                      <span className={elem.paused ? 'text-zinc-500' : 'text-emerald-400 font-semibold'}>
                        {elem.paused ? 'Paused' : 'Playing'}
                      </span>
                      {elem.seeking && (
                        <span className="text-amber-400 animate-pulse">Seeking</span>
                      )}
                    </div>

                    {elem.errorMessage && (
                      <div className="text-rose-400 text-[10px] bg-rose-950/40 p-1.5 rounded border border-rose-900/50">
                        {elem.errorMessage}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Timeline Clips & Active State */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 font-sans font-semibold text-zinc-300">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Timeline Clips ({allClips.length} total)</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {allClips.map(({ clip, trackName, isActive, cStart, cDur }) => (
              <div
                key={clip.id}
                className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                  isActive
                    ? 'bg-cyan-950/30 border-cyan-700/60 text-cyan-200'
                    : 'bg-zinc-900/40 border-zinc-800/50 text-zinc-400'
                }`}
              >
                <div className="truncate max-w-[280px]">
                  <span className="font-semibold text-zinc-200">{clip.name}</span>
                  <span className="ml-2 text-[10px] text-zinc-500">[{trackName}]</span>
                  <div className="text-[10px] text-zinc-500 truncate">
                    Asset: {clip.mediaAssetId || 'None'}
                  </div>
                </div>

                <div className="text-right text-[10px]">
                  <div>{cStart.toFixed(2)}s - {(cStart + cDur).toFixed(2)}s</div>
                  {isActive ? (
                    <span className="text-emerald-400 font-bold">ACTIVE (ON SCREEN)</span>
                  ) : (
                    <span className="text-zinc-600">Inactive</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

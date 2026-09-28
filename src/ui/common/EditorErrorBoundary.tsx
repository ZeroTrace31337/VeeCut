/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Film } from 'lucide-react';
import { TimelineIntervalIndex } from '../../engine/timeline/TimelineIntervalIndex';
import { VideoPlaybackManager } from '../../rendering/playback/VideoPlaybackManager';

interface Props {
  children: ReactNode;
  componentName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[EditorErrorBoundary] Caught in ${this.props.componentName || 'Editor'}:`, error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRecover = () => {
    try {
      TimelineIntervalIndex.invalidate();
    } catch (e) {
      console.warn('[EditorErrorBoundary] Error during index invalidation:', e);
    }

    if (this.props.onReset) {
      this.props.onReset();
    }

    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHardReloadMedia = () => {
    try {
      TimelineIntervalIndex.invalidate();
      const pool = VideoPlaybackManager.getInstance().getPoolDebugInfo();
      for (const item of pool) {
        VideoPlaybackManager.getInstance().forceReloadAsset(item.assetId);
      }
    } catch (e) {
      console.warn('[EditorErrorBoundary] Error reloading media pool:', e);
    }

    this.handleRecover();
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center p-6 bg-zinc-950/95 border border-rose-900/60 rounded-xl text-zinc-200 select-none">
          <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-rose-950/80 border border-rose-600/50 text-rose-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>

          <h3 className="text-sm font-semibold text-zinc-100 mb-1">
            {this.props.componentName || 'Editor Component'} Encountered an Issue
          </h3>

          <p className="text-xs text-zinc-400 max-w-md text-center mb-4 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred. Your video project state has been preserved.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleRecover}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg text-xs font-medium shadow-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Recover Preview</span>
            </button>

            <button
              onClick={this.handleHardReloadMedia}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-850 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-700 transition-colors"
            >
              <Film className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset Media Decoders</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

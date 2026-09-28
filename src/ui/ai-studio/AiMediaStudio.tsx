/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AiMediaStudioHeader, AiStudioTab } from './components/AiMediaStudioHeader';
import { OverviewTab } from './tabs/OverviewTab';
import { TextToVideoTab } from './tabs/TextToVideoTab';
import { ImageToVideoTab } from './tabs/ImageToVideoTab';
import { TranscriptionTab } from './tabs/TranscriptionTab';
import { MusicTab } from './tabs/MusicTab';
import { VoiceTab } from './tabs/VoiceTab';
import { ImagesTab } from './tabs/ImagesTab';
import { useAiStudioJobs } from '../../domain/ai/studio/useAiStudioJobs';
import { useEditor } from '../context/EditorContext';

interface AiMediaStudioProps {
  onReturnToEditor?: () => void;
  defaultTab?: AiStudioTab;
}

export const AiMediaStudio: React.FC<AiMediaStudioProps> = ({
  onReturnToEditor,
  defaultTab,
}) => {
  const { setWorkspaceMode, project, aiStudioInitialTab } = useEditor();

  const [activeTab, setActiveTab] = useState<AiStudioTab>(
    (aiStudioInitialTab as AiStudioTab) || defaultTab || 'overview'
  );
  const [handoffImageData, setHandoffImageData] = useState<string>('');

  const {
    jobs,
    activeJob,
    startJob,
    cancelJob,
    retryJob,
    elapsedSeconds,
  } = useAiStudioJobs(project?.metadata?.id || 'current_project');

  // Sync if initial tab changes externally
  useEffect(() => {
    if (aiStudioInitialTab) {
      setActiveTab(aiStudioInitialTab as AiStudioTab);
    }
  }, [aiStudioInitialTab]);

  const activeRunningCount = jobs.filter((j) => j.status === 'queued' || j.status === 'processing').length;

  const handleReturn = () => {
    if (onReturnToEditor) {
      onReturnToEditor();
    } else {
      setWorkspaceMode('edit');
    }
  };

  const handleAnimateImageWithVeo = (imageData: string) => {
    setHandoffImageData(imageData);
    setActiveTab('image_to_video');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0c12] text-zinc-100 select-none overflow-hidden antialiased">
      {/* 1. Header with unified navigation & return button */}
      <AiMediaStudioHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeJobCount={activeRunningCount}
        onReturnToEditor={handleReturn}
      />

      {/* 2. Main Studio Workspace Active View */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {activeTab === 'overview' && (
          <OverviewTab
            onSelectTab={setActiveTab}
            recentJobs={jobs}
            onRetryJob={retryJob}
            onCancelJob={cancelJob}
            onStartQuickJob={startJob}
          />
        )}

        {activeTab === 'text_to_video' && (
          <TextToVideoTab
            onStartJob={startJob}
            activeJob={activeJob}
            onCancelJob={cancelJob}
            onRetryJob={retryJob}
            elapsedSeconds={activeJob ? elapsedSeconds[activeJob.id] || 0 : 0}
          />
        )}

        {activeTab === 'image_to_video' && (
          <ImageToVideoTab
            onStartJob={startJob}
            activeJob={activeJob}
            onCancelJob={cancelJob}
            onRetryJob={retryJob}
            elapsedSeconds={activeJob ? elapsedSeconds[activeJob.id] || 0 : 0}
            initialImageData={handoffImageData}
          />
        )}

        {activeTab === 'transcription' && (
          <TranscriptionTab
            onStartJob={startJob}
            activeJob={activeJob}
            onCancelJob={cancelJob}
            onRetryJob={retryJob}
            elapsedSeconds={activeJob ? elapsedSeconds[activeJob.id] || 0 : 0}
          />
        )}

        {activeTab === 'music' && (
          <MusicTab
            onStartJob={startJob}
            activeJob={activeJob}
            onCancelJob={cancelJob}
            onRetryJob={retryJob}
            elapsedSeconds={activeJob ? elapsedSeconds[activeJob.id] || 0 : 0}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceTab
            onStartJob={startJob}
            activeJob={activeJob}
            onCancelJob={cancelJob}
            onRetryJob={retryJob}
            elapsedSeconds={activeJob ? elapsedSeconds[activeJob.id] || 0 : 0}
          />
        )}

        {activeTab === 'images' && (
          <ImagesTab
            onStartJob={startJob}
            activeJob={activeJob}
            onCancelJob={cancelJob}
            onRetryJob={retryJob}
            elapsedSeconds={activeJob ? elapsedSeconds[activeJob.id] || 0 : 0}
            onAnimateWithVeo={handleAnimateImageWithVeo}
          />
        )}
      </main>
    </div>
  );
};

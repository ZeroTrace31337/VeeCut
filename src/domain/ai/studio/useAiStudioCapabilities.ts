/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export interface ModelCapabilityItem {
  id: string;
  name: string;
  provider: string;
  category: string;
  modelId: string;
  fallbackModelId?: string;
  capabilities: string[];
  supportedResolutions?: string[];
  supportedAspectRatios?: string[];
  maxDurationSec?: number;
  supportedVoices?: string[];
  supportedFormats?: string[];
  isConfigured: boolean;
  requiresPaidKey: boolean;
  description: string;
}

export interface AiStudioCapabilityRegistry {
  provider: string;
  hasApiKey: boolean;
  environmentStatus: 'ready' | 'unconfigured';
  models: Record<string, ModelCapabilityItem>;
}

export function useAiStudioCapabilities() {
  const [capabilities, setCapabilities] = useState<AiStudioCapabilityRegistry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCapabilities = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ai/capabilities');
      if (!res.ok) throw new Error(`HTTP ${res.status} retrieving capabilities`);
      const data: AiStudioCapabilityRegistry = await res.json();
      setCapabilities(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to query AI capabilities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCapabilities();
  }, []);

  return {
    capabilities,
    isLoading,
    error,
    refresh: fetchCapabilities,
    isConfigured: capabilities?.hasApiKey ?? true,
    getModel: (category: string): ModelCapabilityItem | undefined => capabilities?.models?.[category],
  };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIModelMeta, AITaskType, AIProviderId, AICostTier, AIExecutionType } from './types';
import { AI_MODELS_CONFIG } from './model-config';

export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, AIModelMeta> = new Map();

  private constructor() {
    for (const model of AI_MODELS_CONFIG) {
      this.models.set(model.id, model);
    }
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  public getModel(id: string): AIModelMeta | undefined {
    return this.models.get(id);
  }

  public getAllModels(): AIModelMeta[] {
    return Array.from(this.models.values());
  }

  public getModelsByTask(task: AITaskType): AIModelMeta[] {
    return this.getAllModels().filter((m) => m.task === task);
  }

  public getModelsByProvider(provider: AIProviderId): AIModelMeta[] {
    return this.getAllModels().filter((m) => m.provider === provider);
  }

  public getFreeModels(): AIModelMeta[] {
    return this.getAllModels().filter((m) => m.free === true);
  }

  public getLocalModels(): AIModelMeta[] {
    return this.getAllModels().filter((m) => m.execution === 'local');
  }

  public filterModels(filters: {
    task?: AITaskType;
    provider?: AIProviderId;
    costTier?: AICostTier;
    execution?: AIExecutionType;
    freeOnly?: boolean;
    searchQuery?: string;
  }): AIModelMeta[] {
    return this.getAllModels().filter((m) => {
      if (filters.task && m.task !== filters.task) return false;
      if (filters.provider && m.provider !== filters.provider) return false;
      if (filters.costTier && m.costTier !== filters.costTier) return false;
      if (filters.execution && m.execution !== filters.execution) return false;
      if (filters.freeOnly && !m.free) return false;
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const match =
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query) ||
          m.capabilities.some((c) => c.toLowerCase().includes(query));
        if (!match) return false;
      }
      return true;
    });
  }

  public registerCustomModel(model: AIModelMeta): void {
    this.models.set(model.id, model);
  }
}

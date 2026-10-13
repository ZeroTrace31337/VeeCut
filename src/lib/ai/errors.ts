/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AIProviderError extends Error {
  public readonly provider: string;
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;

  constructor(message: string, provider = 'ai_provider', statusCode?: number, isRetryable = false) {
    super(message);
    this.name = 'AIProviderError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

export class ModelLoadingError extends AIProviderError {
  public readonly estimatedTimeSec: number;

  constructor(modelId: string, estimatedTimeSec = 20, provider = 'huggingface') {
    super(
      `Model "${modelId}" is currently loading onto serverless GPU. Estimated ready time: ~${Math.ceil(estimatedTimeSec)}s. Please retry shortly.`,
      provider,
      503,
      true
    );
    this.name = 'ModelLoadingError';
    this.estimatedTimeSec = estimatedTimeSec;
  }
}

export class RateLimitExceededError extends AIProviderError {
  public readonly retryAfterSec?: number;

  constructor(provider = 'huggingface', retryAfterSec?: number) {
    super(
      `Free inference rate limit reached for ${provider}. Free inference allowance temporarily unavailable. Try a local model or configure another provider.`,
      provider,
      429,
      false
    );
    this.name = 'RateLimitExceededError';
    this.retryAfterSec = retryAfterSec;
  }
}

export class ModelUnavailableError extends AIProviderError {
  constructor(modelId: string, provider = 'huggingface') {
    super(
      `Model "${modelId}" is currently offline or not available on free serverless endpoints. Local model execution required.`,
      provider,
      404,
      false
    );
    this.name = 'ModelUnavailableError';
  }
}

export class HardwareRequirementError extends AIProviderError {
  constructor(featureName: string, requirement: string) {
    super(
      `${featureName} requires ${requirement}. Switch to cloud inference or configure external provider.`,
      'local',
      undefined,
      false
    );
    this.name = 'HardwareRequirementError';
  }
}

export class ActionValidationError extends Error {
  public readonly invalidActions: any[];

  constructor(message: string, invalidActions: any[] = []) {
    super(message);
    this.name = 'ActionValidationError';
    this.invalidActions = invalidActions;
  }
}

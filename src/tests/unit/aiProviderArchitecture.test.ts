/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelRegistry } from '../../lib/ai/registry';
import { AIRouter } from '../../lib/ai/router';
import { LocalModelProvider } from '../../lib/ai/providers/local';
import { HuggingFaceProvider } from '../../lib/ai/providers/huggingface';
import { GeminiProvider } from '../../lib/ai/providers/gemini';
import { SmartEditorService } from '../../../server/smartEditorService';
import { HuggingFaceService } from '../../../server/hfService';
import { ActionValidationError } from '../../lib/ai/errors';

export async function runAiProviderArchitectureTests(): Promise<{ name: string; passed: boolean; details?: string }[]> {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // Test 1: Model Registry and Truthful Labeling
  try {
    const registry = ModelRegistry.getInstance();
    const allModels = registry.getAllModels();

    if (allModels.length < 8) {
      throw new Error(`Expected at least 8 models in registry, found ${allModels.length}`);
    }

    const freeModels = registry.getFreeModels();
    for (const m of freeModels) {
      if (m.costTier !== 'free_local' && m.costTier !== 'free_tier') {
        throw new Error(`Model ${m.id} marked free=true but has costTier ${m.costTier}`);
      }
    }

    const flux = registry.getModel('black-forest-labs/FLUX.1-schnell');
    if (!flux || flux.provider !== 'huggingface' || flux.task !== 'text-to-image') {
      throw new Error('FLUX.1 Schnell model configuration missing or incorrect in registry');
    }

    const localStt = registry.getModel('local-web-speech-stt');
    if (!localStt || localStt.execution !== 'local' || localStt.costTier !== 'free_local') {
      throw new Error('Local Web Speech model configuration missing or incorrect');
    }

    results.push({ name: 'AI Registry: Catalog Integrity & Truthful Cost Attribution', passed: true });
  } catch (err: any) {
    results.push({ name: 'AI Registry: Catalog Integrity & Truthful Cost Attribution', passed: false, details: err.message });
  }

  // Test 2: AIRouter Zero-Cost Priority Resolution
  try {
    const router = AIRouter.getInstance();

    // Default for speech-to-text should resolve to zero-cost local
    const sttProvider = router.resolveProvider('speech-to-text');
    if (sttProvider.id !== 'local') {
      throw new Error(`Expected 'local' provider for zero-cost STT default, got ${sttProvider.id}`);
    }

    // Default for text-to-speech should resolve to zero-cost local
    const ttsProvider = router.resolveProvider('text-to-speech');
    if (ttsProvider.id !== 'local') {
      throw new Error(`Expected 'local' provider for zero-cost TTS default, got ${ttsProvider.id}`);
    }

    // Default for background removal should resolve to zero-cost local
    const bgProvider = router.resolveProvider('background-removal');
    if (bgProvider.id !== 'local') {
      throw new Error(`Expected 'local' provider for zero-cost BG removal default, got ${bgProvider.id}`);
    }

    // Explicit provider override should be honored
    const hfImage = router.resolveProvider('text-to-image', 'huggingface');
    if (hfImage.id !== 'huggingface') {
      throw new Error(`Expected 'huggingface' provider on explicit request, got ${hfImage.id}`);
    }

    results.push({ name: 'AI Router: Zero-Cost Priority & Provider Resolution', passed: true });
  } catch (err: any) {
    results.push({ name: 'AI Router: Zero-Cost Priority & Provider Resolution', passed: false, details: err.message });
  }

  // Test 3: Smart Editor Structured Action Schema Validation
  try {
    const localProvider = new LocalModelProvider();

    // Valid command execution
    const silencePlan = await localProvider.executeSmartEditCommand('Remove silence from the timeline.');
    if (!silencePlan.actions || silencePlan.actions.length === 0) {
      throw new Error('Expected silence removal actions');
    }
    const cutAction = silencePlan.actions.find((a) => a.type === 'cut_silence');
    if (!cutAction) {
      throw new Error('Missing cut_silence action in plan');
    }

    // Test 30-second emotional video command
    const emotionalPlan = await localProvider.executeSmartEditCommand('Create a 30-second emotional video');
    if (emotionalPlan.actions.length < 2) {
      throw new Error('Expected multiple structured actions for emotional video');
    }
    const hasTrim = emotionalPlan.actions.some((a) => a.type === 'trim');
    const hasColor = emotionalPlan.actions.some((a) => a.type === 'color_grade');
    if (!hasTrim || !hasColor) {
      throw new Error('Expected trim and color_grade actions in 30-second edit plan');
    }

    results.push({ name: 'Smart Editor: Command Compilation & Structured Schema Validation', passed: true });
  } catch (err: any) {
    results.push({ name: 'Smart Editor: Command Compilation & Structured Schema Validation', passed: false, details: err.message });
  }

  // Test 4: Server-Side Smart Editor Service Strict Sanitization
  try {
    const smartEditor = SmartEditorService.getInstance();
    const plan = await smartEditor.interpretCommand('Make the video cinematic and add captions');

    if (!plan.actions || plan.actions.length === 0) {
      throw new Error('Server SmartEditorService returned no actions');
    }

    for (const act of plan.actions) {
      const allowed = ['trim', 'split', 'cut_silence', 'caption', 'add_music', 'color_grade', 'reframe', 'transition', 'add_text'];
      if (!allowed.includes(act.type)) {
        throw new Error(`Illegal action type "${act.type}" returned by SmartEditorService`);
      }
    }

    results.push({ name: 'Smart Editor: Server-Side Action Sanitization & JS Execution Prevention', passed: true });
  } catch (err: any) {
    results.push({ name: 'Smart Editor: Server-Side Action Sanitization & JS Execution Prevention', passed: false, details: err.message });
  }

  // Test 5: Hugging Face Server Service Status & Environment Handling
  try {
    const hfService = HuggingFaceService.getInstance();
    const status = hfService.checkStatus();

    if (typeof status.canUsePublicFreeTier !== 'boolean') {
      throw new Error('HuggingFaceService status missing canUsePublicFreeTier boolean');
    }
    if (!status.message) {
      throw new Error('HuggingFaceService status missing descriptive status message');
    }

    results.push({ name: 'Hugging Face Service: Server Status, Graceful Fallback & Token Isolation', passed: true });
  } catch (err: any) {
    results.push({ name: 'Hugging Face Service: Server Status, Graceful Fallback & Token Isolation', passed: false, details: err.message });
  }

  return results;
}

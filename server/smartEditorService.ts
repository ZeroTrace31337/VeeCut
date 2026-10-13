/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

export interface SmartEditAction {
  type:
    | 'trim'
    | 'split'
    | 'cut_silence'
    | 'caption'
    | 'add_music'
    | 'color_grade'
    | 'reframe'
    | 'transition'
    | 'add_text';
  description: string;
  clipId?: string;
  start?: number;
  end?: number;
  atTime?: number;
  style?: string;
  genre?: string;
  mood?: string;
  aspectRatio?: string;
  transitionType?: string;
  text?: string;
  parameters?: Record<string, any>;
}

export interface SmartEditPlan {
  command: string;
  explanation: string;
  actions: SmartEditAction[];
  estimatedResultDurationSec?: number;
  warnings?: string[];
}

export class SmartEditorService {
  private static instance: SmartEditorService;

  private constructor() {}

  public static getInstance(): SmartEditorService {
    if (!SmartEditorService.instance) {
      SmartEditorService.instance = new SmartEditorService();
    }
    return SmartEditorService.instance;
  }

  public async interpretCommand(
    command: string,
    context?: { projectSummary?: string; currentTime?: number; clips?: any[] }
  ): Promise<SmartEditPlan> {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY') {
      try {
        return await this.interpretWithLLM(command, context);
      } catch (err) {
        console.warn('LLM interpretation failed, falling back to rule compiler:', err);
      }
    }

    return this.interpretWithRules(command, context);
  }

  private async interpretWithLLM(
    command: string,
    context?: any
  ): Promise<SmartEditPlan> {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const systemPrompt = `You are the VeeCut AI Video Editor Copilot. 
Your task is to analyze user video editing instructions and translate them into a STRICT JSON schema of video editing actions.
NEVER generate executable code, scripts, or arbitrary javascript. ONLY generate the JSON format described below.

Allowed action types:
1. "trim" (start: number, end: number, clipId?: string)
2. "split" (atTime: number, clipId?: string)
3. "cut_silence" (parameters: { thresholdDb: number, minDurationSec: number })
4. "caption" (style: "cinematic" | "karaoke" | "minimal" | "bold")
5. "add_music" (genre: string, mood: string)
6. "color_grade" (style?: string, parameters?: { temperature?: number, contrast?: number, saturation?: number, vignette?: number })
7. "reframe" (aspectRatio: "9:16" | "16:9" | "1:1")
8. "transition" (transitionType: "dissolve" | "wipe" | "glitch", atTime: number)
9. "add_text" (text: string, style?: string, atTime?: number)

Respond ONLY with valid JSON:
{
  "explanation": "Human readable summary of changes",
  "estimatedResultDurationSec": 30,
  "actions": [
    {
      "type": "trim",
      "description": "Trim clip intro",
      "start": 1.0,
      "end": 31.0
    }
  ]
}`;

    const userPrompt = `User Command: "${command}"
Context: Current time: ${context?.currentTime || 0}s. Project summary: ${context?.projectSummary || 'Standard 1080p timeline'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    const actions = this.validateAndFilterActions(parsed.actions || []);

    return {
      command,
      explanation: parsed.explanation || `Executed command: ${command}`,
      actions,
      estimatedResultDurationSec: parsed.estimatedResultDurationSec || 30,
    };
  }

  private interpretWithRules(command: string, _context?: any): SmartEditPlan {
    const lower = command.toLowerCase().trim();
    const actions: SmartEditAction[] = [];
    let explanation = '';

    if (lower.includes('silence') || lower.includes('pause')) {
      explanation = 'Scanned timeline audio track to strip speech pauses under -35dB threshold.';
      actions.push({
        type: 'cut_silence',
        description: 'Auto-detect silence threshold (-35dB) and trim pauses > 0.4s',
        parameters: { thresholdDb: -35, minDurationSec: 0.4 },
      });
    } else if (lower.includes('caption') || lower.includes('subtitle')) {
      explanation = 'Created synchronized speech captions track with styled typography.';
      actions.push({
        type: 'caption',
        description: 'Generate timestamped subtitles from audio track',
        style: lower.includes('karaoke') ? 'karaoke' : 'cinematic',
      });
    } else if (lower.includes('music') || lower.includes('soundtrack')) {
      explanation = 'Attached dynamic soundtrack with ducking beneath vocal dialogue.';
      actions.push({
        type: 'add_music',
        description: 'Add royalty-free background soundtrack',
        genre: lower.includes('epic') ? 'Cinematic Orchestral' : 'Ambient Lo-Fi',
        mood: 'Inspirational',
      });
    } else if (lower.includes('cinematic') || lower.includes('color') || lower.includes('grade')) {
      explanation = 'Applied warm Kodak 35mm Gold color grading with subtle vignette.';
      actions.push({
        type: 'color_grade',
        description: 'Cinematic 35mm Hollywood film LUT curve',
        style: 'Kodak 35mm Gold',
        parameters: { temperature: 14, contrast: 20, saturation: 10, vignette: 25 },
      });
    } else if (lower.includes('30-second') || lower.includes('emotional')) {
      explanation = 'Structured 30-second emotional sequence with pacing cuts and cinematic music.';
      actions.push(
        {
          type: 'trim',
          description: 'Trim sequence to 30s target duration',
          start: 0,
          end: 30,
        },
        {
          type: 'color_grade',
          description: 'Warm nostalgic color grade',
          style: 'Emotional Film',
          parameters: { temperature: 16, contrast: 12, saturation: 8, vignette: 22 },
        },
        {
          type: 'add_music',
          description: 'Emotional piano & strings soundtrack',
          genre: 'Cinematic Piano',
          mood: 'Heartfelt',
        }
      );
    } else if (lower.includes('reframe') || lower.includes('9:16') || lower.includes('vertical')) {
      explanation = 'Re-framed sequence to 9:16 vertical TikTok/Reels aspect ratio with subject tracking.';
      actions.push({
        type: 'reframe',
        description: 'Convert sequence to 9:16 vertical orientation',
        aspectRatio: '9:16',
      });
    } else {
      explanation = `Analyzed: "${command}". Formulated timeline editing pipeline.`;
      actions.push(
        {
          type: 'trim',
          description: 'Optimize clip pacing and eliminate idle intro frames',
          start: 0.5,
          end: 15.0,
        },
        {
          type: 'color_grade',
          description: 'Subtle contrast and vibrancy boost',
          parameters: { contrast: 10, saturation: 8 },
        }
      );
    }

    const validated = this.validateAndFilterActions(actions);

    return {
      command,
      explanation,
      actions: validated,
      estimatedResultDurationSec: 30,
    };
  }

  private validateAndFilterActions(rawActions: any[]): SmartEditAction[] {
    const validTypes = new Set([
      'trim',
      'split',
      'cut_silence',
      'caption',
      'add_music',
      'color_grade',
      'reframe',
      'transition',
      'add_text',
    ]);

    const sanitized: SmartEditAction[] = [];

    for (const item of rawActions) {
      if (!item || typeof item !== 'object') continue;
      if (!validTypes.has(item.type)) continue;

      const act: SmartEditAction = {
        type: item.type,
        description: String(item.description || `${item.type} action`),
      };

      if (typeof item.start === 'number' && !isNaN(item.start)) act.start = Math.max(0, item.start);
      if (typeof item.end === 'number' && !isNaN(item.end)) act.end = Math.max(0, item.end);
      if (typeof item.atTime === 'number' && !isNaN(item.atTime)) act.atTime = Math.max(0, item.atTime);
      if (typeof item.style === 'string') act.style = item.style;
      if (typeof item.genre === 'string') act.genre = item.genre;
      if (typeof item.mood === 'string') act.mood = item.mood;
      if (typeof item.aspectRatio === 'string') act.aspectRatio = item.aspectRatio;
      if (typeof item.transitionType === 'string') act.transitionType = item.transitionType;
      if (typeof item.text === 'string') act.text = item.text;
      if (item.parameters && typeof item.parameters === 'object') act.parameters = item.parameters;

      sanitized.push(act);
    }

    return sanitized;
  }
}

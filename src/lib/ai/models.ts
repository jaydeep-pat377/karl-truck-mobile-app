/**
 * AI model registry (mobile) — mirrors the web app's `src/lib/ai/models.ts`.
 * The `id` values must match what the web `/api/ai/dashboard-chat` route's
 * `getModel(modelId)` accepts.
 */

export interface AiModel {
  id: string;
  label: string;
  provider: 'google' | 'anthropic' | 'microsoft' | 'openai';
  tagline: string;
  tier: 'fast' | 'balanced' | 'powerful';
  inputPricePer1M: number;
  outputPricePer1M: number;
  /** Optional override for the dot color (otherwise derived from tier). */
  color?: string;
}

export const MODELS: AiModel[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'google',
    tagline: 'Fastest',
    tier: 'fast',
    inputPricePer1M: 0.3,
    outputPricePer1M: 2.5,
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    tagline: 'Balanced',
    tier: 'balanced',
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
  {
    id: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    provider: 'anthropic',
    tagline: 'Most powerful',
    tier: 'powerful',
    inputPricePer1M: 15.0,
    outputPricePer1M: 75.0,
  },
  {
    // NOTE: confirm this `id` matches what the backend's model router accepts.
    id: 'copilot',
    label: 'Copilot',
    provider: 'microsoft',
    tagline: 'Microsoft Copilot',
    tier: 'balanced',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    color: '#0078D4',
  },
];

// Default to Claude Sonnet: the mobile backend ships with an Anthropic key,
// while Gemini/Copilot require keys the backend operator adds later.
export const DEFAULT_MODEL_ID = 'claude-sonnet-4-6';

export const getModelDef = (modelId?: string): AiModel =>
  MODELS.find((m) => m.id === modelId) ?? MODELS[0];

export const TIER_COLOR: Record<AiModel['tier'], string> = {
  fast: '#22C55E',
  balanced: '#2f7ed8',
  powerful: '#8B5CF6',
};

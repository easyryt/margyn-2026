export const AI_PROVIDERS = ["gemini", "openai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];
export type AiQualityTier = "economy" | "quality";
export type CoverRenderMode = "template" | "full-ai";
export type QualityOption = { id: AiQualityTier; label: string; imageModel: string; settingsLabel: string };
export type ProviderOption = {
  id: AiProvider;
  label: string;
  available: boolean;
  imageModel: string;
  contentModel: string;
  settingsLabel: string;
  defaultQualityTier?: AiQualityTier;
  qualityOptions?: QualityOption[];
};

export function isAiProvider(value: unknown): value is AiProvider {
  return value === "gemini" || value === "openai";
}

export function initialProvider(options: ProviderOption[], saved: unknown): AiProvider {
  // Keep the user's explicit choice even if its key is temporarily unavailable.
  // Generation remains disabled until that provider is configured again.
  if (isAiProvider(saved)) return saved;
  return options.find((option) => option.available)?.id ?? "gemini";
}

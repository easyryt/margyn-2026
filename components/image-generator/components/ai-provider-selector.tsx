"use client";

import { useEffect, useId, useState } from "react";
import {
  initialProvider,
  isAiProvider,
  type AiProvider,
  type AiQualityTier,
  type ProviderOption,
} from "@/lib/image-generator/ai-provider-options";

const PREFERENCE_KEY = "margyn-image.ai-provider";

export function useAiProvider() {
  const [provider, setProvider] = useState<AiProvider>("gemini");
  // Restore provider defaults, not a previously selected premium setting.
  const [qualityTier, selectQualityTier] = useState<AiQualityTier>("economy");
  const [options, setOptions] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/tools/image-generator/providers", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            "Provider settings could not be loaded. Reload to try again.",
          );
        const payload = (await response.json()) as {
          providers: ProviderOption[];
        };
        if (
          !Array.isArray(payload.providers) ||
          payload.providers.length !== 2 ||
          !payload.providers.every((option) => isAiProvider(option.id))
        ) {
          throw new Error("Invalid provider settings. Reload to try again.");
        }
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(PREFERENCE_KEY);
        } catch {
          /* Storage can be disabled. */
        }
        if (controller.signal.aborted) return;
        setOptions(payload.providers);
        const initial = initialProvider(payload.providers, saved);
        setProvider(initial);
        selectQualityTier(
          payload.providers.find((option) => option.id === initial)
            ?.defaultQualityTier ??
            (initial === "openai" ? "quality" : "economy"),
        );
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Provider settings could not be loaded.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const selectProvider = (next: AiProvider) => {
    setProvider(next);
    selectQualityTier(
      options.find((option) => option.id === next)?.defaultQualityTier ??
        (next === "openai" ? "quality" : "economy"),
    );
    try {
      localStorage.setItem(PREFERENCE_KEY, next);
    } catch {
      /* Selection still works without persistence. */
    }
  };
  return {
    provider,
    selectProvider,
    qualityTier,
    selectQualityTier,
    options,
    loading,
    error,
    ready:
      !loading &&
      !error &&
      options.some((option) => option.id === provider && option.available),
  };
}

export default function AiProviderSelector({
  selection,
  disabled = false,
  backgroundVariants = true,
}: {
  selection: ReturnType<typeof useAiProvider>;
  disabled?: boolean;
  backgroundVariants?: boolean;
}) {
  const id = useId();
  const selected = selection.options.find(
    (option) => option.id === selection.provider,
  );
  const profile = selected?.qualityOptions?.find(
    (option) => option.id === selection.qualityTier,
  );
  return (
    <fieldset
      className="ai-provider-selector"
      disabled={disabled || selection.loading}
      aria-describedby={`${id}-help`}
    >
      <legend>
        AI provider <span>Choose cost or quality</span>
      </legend>
      {selection.loading ? (
        <p role="status">Loading providers…</p>
      ) : (
        <div className="ai-provider-options">
          {selection.options.map((option) => (
            <label
              key={option.id}
              className={selection.provider === option.id ? "is-selected" : ""}
            >
              <input
                type="radio"
                name={`${id}-provider`}
                value={option.id}
                checked={selection.provider === option.id}
                onChange={() => selection.selectProvider(option.id)}
                disabled={!option.available}
              />
              <span>
                <strong>{option.label}</strong>
                <small>
                  {option.available ? "Configured" : "Not configured"}
                </small>
              </span>
            </label>
          ))}
        </div>
      )}
      {selected?.available && selected.qualityOptions && (
        <div className="ai-quality-picker">
          <span id={`${id}-quality-label`}>Image model / quality</span>
          <div
            className="ai-provider-options"
            role="radiogroup"
            aria-labelledby={`${id}-quality-label`}
          >
            {selected.qualityOptions.map((option) => (
              <label
                key={option.id}
                className={
                  selection.qualityTier === option.id ? "is-selected" : ""
                }
              >
                <input
                  type="radio"
                  name={`${id}-quality`}
                  value={option.id}
                  checked={selection.qualityTier === option.id}
                  onChange={() => selection.selectQualityTier(option.id)}
                />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.imageModel}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <p id={`${id}-help`} className="ai-provider-help">
        {selection.error ||
          (selected?.available
            ? (profile?.imageModel ?? selected.imageModel)
            : selected
              ? `${selected.label} is not configured yet. Choose another provider or contact the administrator.`
              : "AI generation is not configured yet. Local backgrounds and enhancement are still available.")}
      </p>
      {selected?.available && (
        <details className="workspace-details">
          <summary>Model & cost details</summary>
          <p>
            {profile?.settingsLabel ?? selected.settingsLabel}. Analysis:{" "}
            {selected.contentModel}. Settings apply to the next generation or
            retry.
          </p>
          <p>
            {backgroundVariants && "Backgrounds are composed locally. "}Each
            selected view and review uses credits. Flare may cost more than
            Mini. Model access depends on your account. No automatic
            model/provider fallback. Pixel-perfect results are not guaranteed.
          </p>
        </details>
      )}
      {selection.qualityTier === "quality" && (
        <p className="ai-cost-warning" role="status">
          {selection.provider === "openai"
            ? "Flare · low quality"
            : "Pro · higher cost"}
          . Generation and retries use API credits.
        </p>
      )}
    </fieldset>
  );
}

"use client";

import {
  Check,
  Database,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  PHONE_MODELS,
} from "@/components/listing-tool/original/lib/models";

export type SavedDesign = {
  id: string;
  designName: string;
  designCode: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: "ai" | "legacy" | "manual";
  usageCount: number;
  sampleTitle: string;
  sampleModel: string;
  category: string;
  theme: string;
  productType: string;
};

type DesignListResponse = {
  success?: boolean;
  designs?: SavedDesign[];
  message?: string;
};

type Props = {
  selectedDesignId: string;
  selectedModel: string;
  refreshKey: number;
  onSelect: (design: SavedDesign) => void;
  onDesignsLoaded: (designs: SavedDesign[]) => void;
};

const API_BASE_URL = "/api/tools/listing-tool";

function escapeRegexLiteral(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

export function buildModelTitle(
  design: SavedDesign,
  selectedModel: string,
) {
  const targetModel = selectedModel.trim();
  const sourceTitle = String(
    design.sampleTitle || "",
  ).trim();
  const sourceModel = String(
    design.sampleModel || "",
  ).trim();

  if (!targetModel) {
    return sourceTitle;
  }

  let title = sourceTitle;

  if (title) {
    const sourceModels = Array.from(
      new Set([
        sourceModel,
        ...PHONE_MODELS,
      ]),
    )
      .filter(Boolean)
      .sort(
        (left, right) =>
          right.length - left.length,
      );

    for (const model of sourceModels) {
      title = title.replace(
        new RegExp(
          escapeRegexLiteral(model),
          "gi",
        ),
        targetModel,
      );
    }
  }

  if (
    title &&
    !title
      .toLowerCase()
      .includes(targetModel.toLowerCase())
  ) {
    title = `${targetModel} ${title}`;
  }

  if (!title) {
    title = `${targetModel} ${design.designName} Designer Mobile Cover`;
  }

  return title
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export default function DesignLibraryPicker({
  selectedDesignId,
  selectedModel,
  refreshKey,
  onSelect,
  onDesignsLoaded,
}: Props) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDesigns = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/designs?limit=250`,
        {
          cache: "no-store",
        },
      );

      const result =
        (await response.json().catch(() => null)) as
          | DesignListResponse
          | null;

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Unable to load saved designs.",
        );
      }

      const nextDesigns = Array.isArray(result?.designs)
        ? result.designs
        : [];

      setDesigns(nextDesigns);
      onDesignsLoaded(nextDesigns);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load saved designs.",
      );
    } finally {
      setLoading(false);
    }
  }, [onDesignsLoaded]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadDesigns();
    });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [loadDesigns, refreshKey]);

  const filteredDesigns = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return designs;
    }

    return designs.filter((design) =>
      [
        design.designName,
        design.designCode,
      ].some((value) =>
        String(value).toLowerCase().includes(query),
      ),
    );
  }, [designs, search]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
            <Database size={18} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-950">
              Reuse a saved design
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select an artwork to reuse its Design Name and Design Code. Category, Theme and Product Type are filled automatically, while the title updates for {selectedModel || "the selected model"} with a new Design Number.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadDesigns()}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="p-5 sm:p-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by Design Name or Design Code..."
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </label>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading design library...
          </div>
        ) : filteredDesigns.length ? (
          <div className="mt-4 grid max-h-[430px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDesigns.map((design) => {
              const selected = selectedDesignId === design.id;
              const imageUrl = design.thumbnailUrl || design.imageUrl;
              const generatedTitle =
                buildModelTitle(
                  design,
                  selectedModel,
                );

              return (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => onSelect(design)}
                  className={`group flex min-w-0 gap-3 rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white bg-contain bg-center bg-no-repeat"
                    style={
                      imageUrl
                        ? {
                            backgroundImage: `url(${JSON.stringify(imageUrl)})`,
                          }
                        : undefined
                    }
                  >
                    {!imageUrl ? (
                      <ImageIcon className="h-5 w-5 text-slate-300" />
                    ) : null}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-xs font-bold leading-5 text-slate-900">
                        {design.designName}
                      </span>
                      {selected ? (
                        <span className="rounded-full bg-blue-600 p-1 text-white">
                          <Check size={11} />
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[10px] font-semibold text-slate-500">
                      {design.designCode}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-slate-500">
                      {generatedTitle}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                        Used {design.usageCount}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                        Auto title
                      </span>
                      {design.theme ? (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 font-bold text-violet-700">
                          {design.theme}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
            <Database className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-xs font-bold text-slate-600">
              No matching saved design
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Use the AI assistant below to create and store a new one.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

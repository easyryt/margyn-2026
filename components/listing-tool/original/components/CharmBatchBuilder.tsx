"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Layers3,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "@/components/listing-tool/navigation";

import type { Product } from "@/components/listing-tool/original/components/ProductForm/ProductCard";
import { exportExcel } from "@/components/listing-tool/original/lib/excel";
import { charmVariantNumber, groupCharmsByFamily, isParentCharm } from "@/components/listing-tool/original/lib/charm-order";
import { PHONE_MODELS } from "@/components/listing-tool/original/lib/models";

const API_BASE_URL = "/api/tools/listing-tool";

type Charm = Product & {
  image?: string;
  createdAt?: string;
  sourceKind?: "parent" | "variant";
  sourceVariantNumber?: number;
};

type CharmFamily = {
  key: string;
  parent?: Charm;
  variants: Charm[];
  items: Charm[];
  designName: string;
  designNumber: string;
};

type ModelOption = {
  name: string;
  count: number;
};

type BatchItem = Charm & {
  batchKey: string;
  batchModel: string;
};

type ModelsResponse = {
  success: boolean;
  models: ModelOption[];
};

type CharmsResponse = {
  success: boolean;
  count: number;
  charms: Charm[];
};

async function apiRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    signal,
  });
  const data = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && data.message
        ? data.message
        : "Unable to load charm data.";
    throw new Error(message);
  }

  return data as T;
}

function batchKey(charmId: string, model: string) {
  return `${model.trim().toLocaleLowerCase()}::${charmId}`;
}

function getImage(charm: Charm) {
  return (
    charm.image ||
    charm.image1 ||
    charm.image2 ||
    charm.image3 ||
    charm.image4 ||
    ""
  );
}

function formatCurrency(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(number)
    : "₹0";
}

function groupCharmFamilies(charms: Charm[]) {
  return groupCharmsByFamily(charms).map(([key, sortedItems]): CharmFamily => {
    const parent = sortedItems.find(isParentCharm);
    const variants = parent
      ? sortedItems.filter((charm) => charm.id !== parent.id)
      : sortedItems;
    const items = parent ? [parent, ...variants] : variants;
    const representative = parent ?? items[0];

    return {
      key,
      parent,
      variants,
      items,
      designName: representative?.designName?.trim() || "Unnamed charm design",
      designNumber: representative?.designNumber?.trim() || "—",
    };
  });
}

function matchesCharmSearch(charm: Charm, query: string) {
  return [
    charm.productName,
    charm.designName,
    charm.designCode,
    charm.designNumber,
    charm.sku,
    charm.styleId,
    charm.groupId,
    charm.version,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase()
    .includes(query);
}

export default function CharmBatchBuilder() {
  const router = useRouter();
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [charms, setCharms] = useState<Charm[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedFamilyKeys, setExpandedFamilyKeys] = useState<Set<string>>(
    new Set(),
  );
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [search, setSearch] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);
  const [charmsLoading, setCharmsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    try {
      setModelsLoading(true);
      setError(null);
      const result = await apiRequest<ModelsResponse>("/charms/models");
      const options = (result.models ?? [])
        .filter((item) => item.name?.trim())
        .sort((first, second) => first.name.localeCompare(second.name));
      setModelOptions(options);
    } catch (loadError) {
      setModelOptions(PHONE_MODELS.map((name) => ({ name, count: 0 })));
      setError(
        loadError instanceof Error
          ? `${loadError.message} Restart or redeploy the backend to enable the charm model directory.`
          : "Unable to load charm models.",
      );
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadModels(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadModels]);

  useEffect(() => {
    if (!selectedModel) return;

    const controller = new AbortController();

    const loadCharms = async () => {
      try {
        setCharmsLoading(true);
        setError(null);
        const result = await apiRequest<CharmsResponse>(
          `/charms?model=${encodeURIComponent(selectedModel)}`,
          controller.signal,
        );
        const nextCharms = result.charms ?? [];
        const nextCharmIds = new Set(nextCharms.map((charm) => charm.id));
        setCharms(nextCharms);
        setSelectedIds(
          (current) =>
            new Set([...current].filter((id) => nextCharmIds.has(id))),
        );
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setCharms([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load charms for this model.",
        );
      } finally {
        if (!controller.signal.aborted) setCharmsLoading(false);
      }
    };

    void loadCharms();
    return () => controller.abort();
  }, [refreshKey, selectedModel]);

  const chooseModel = (model: string) => {
    setSelectedModel(model);
    setSelectedIds(new Set());
    setExpandedFamilyKeys(new Set());
    setSearch("");
    if (!model) setCharms([]);
  };

  const batchKeys = useMemo(
    () => new Set(batch.map((item) => item.batchKey)),
    [batch],
  );

  const charmFamilies = useMemo(() => groupCharmFamilies(charms), [charms]);

  const visibleFamilies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return charmFamilies;

    return charmFamilies.filter((family) =>
      family.items.some((charm) => matchesCharmSearch(charm, query)),
    );
  }, [charmFamilies, search]);

  const visibleCharms = useMemo(
    () => visibleFamilies.flatMap((family) => family.items),
    [visibleFamilies],
  );

  const selectableVisibleCharms = useMemo(
    () =>
      visibleCharms.filter(
        (charm) => !batchKeys.has(batchKey(charm.id, selectedModel)),
      ),
    [batchKeys, selectedModel, visibleCharms],
  );

  const allVisibleSelected =
    selectableVisibleCharms.length > 0 &&
    selectableVisibleCharms.every((charm) => selectedIds.has(charm.id));

  const groupedBatch = useMemo(() => {
    const groups = new Map<string, BatchItem[]>();
    for (const item of batch) {
      groups.set(item.batchModel, [...(groups.get(item.batchModel) ?? []), item]);
    }
    return [...groups.entries()].map(([model, items]): [string, BatchItem[]] => [
      model,
      groupCharmsByFamily(items).flatMap(([, family]) => family),
    ]);
  }, [batch]);

  const toggleCharm = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFamilySelection = (family: CharmFamily) => {
    const selectableItems = family.items.filter(
      (charm) => !batchKeys.has(batchKey(charm.id, selectedModel)),
    );
    const allSelected =
      selectableItems.length > 0 &&
      selectableItems.every((charm) => selectedIds.has(charm.id));

    setSelectedIds((current) => {
      const next = new Set(current);
      selectableItems.forEach((charm) => {
        if (allSelected) next.delete(charm.id);
        else next.add(charm.id);
      });
      return next;
    });
  };

  const selectParentOnly = (family: CharmFamily) => {
    if (!family.parent) return;

    setSelectedIds((current) => {
      const next = new Set(current);
      family.items.forEach((charm) => next.delete(charm.id));

      if (!batchKeys.has(batchKey(family.parent!.id, selectedModel))) {
        next.add(family.parent!.id);
      }
      return next;
    });
  };

  const toggleFamilyExpanded = (familyKey: string) => {
    setExpandedFamilyKeys((current) => {
      const next = new Set(current);
      if (next.has(familyKey)) next.delete(familyKey);
      else next.add(familyKey);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        selectableVisibleCharms.forEach((charm) => next.delete(charm.id));
      } else {
        selectableVisibleCharms.forEach((charm) => next.add(charm.id));
      }
      return next;
    });
  };

  const addSelectedToBatch = () => {
    if (!selectedModel || !selectedIds.size) return;

    const selectedCharms = charmFamilies
      .flatMap((family) => family.items)
      .filter((charm) => selectedIds.has(charm.id));
    const additions: BatchItem[] = selectedCharms
      .filter(
        (charm) => !batchKeys.has(batchKey(charm.id, selectedModel)),
      )
      .map((charm) => ({
        ...charm,
        batchKey: batchKey(charm.id, selectedModel),
        batchModel: selectedModel,
        models: [{ model: selectedModel }],
      }));

    setBatch((current) => {
      const existing = new Set(current.map((item) => item.batchKey));
      return [
        ...current,
        ...additions.filter((item) => !existing.has(item.batchKey)),
      ];
    });

    setSelectedIds(new Set());
    setNotice(
      `${additions.length} charm${
        additions.length === 1 ? "" : "s"
      } added for ${selectedModel}. Choose another model to continue building the batch.`,
    );
  };

  const removeBatchItem = (key: string) => {
    setBatch((current) => current.filter((item) => item.batchKey !== key));
  };

  const removeModelGroup = (model: string) => {
    setBatch((current) => current.filter((item) => item.batchModel !== model));
  };

  const clearBatch = () => {
    if (!batch.length || !window.confirm("Clear every charm from this batch?")) return;
    setBatch([]);
    setNotice("Charm batch cleared.");
  };

  const exportBatch = async () => {
    if (!batch.length) return;

    try {
      setExporting(true);
      setError(null);
      const products: Product[] = groupedBatch.flatMap(([, items]) => items).map(
        ({ batchKey: key, batchModel: model, ...charm }) => ({
          ...charm,
          id: key,
          models: [{ model }],
        }),
      );

      await exportExcel(products, {
        preserveProductSku: true,
        fileName: `meesho-charm-batch-${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
      setNotice(
        `${batch.length} charm${batch.length === 1 ? "" : "s"} exported across ${groupedBatch.length} model${groupedBatch.length === 1 ? "" : "s"}.`,
      );
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Unable to export the charm batch.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className={secondaryButtonClass}
              >
                <ArrowLeft size={16} />
                Dashboard
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Layers3 size={21} className="text-fuchsia-600" />
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Charm Batch Builder
                  </h1>
                  <span className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">
                    Multi-model export
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a model, add selected charms, repeat for other models, then export one workbook.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/products")}
                className={secondaryButtonClass}
              >
                <Smartphone size={16} />
                Open Catalog
              </button>
              <button
                type="button"
                onClick={() => void exportBatch()}
                disabled={!batch.length || exporting}
                className={primaryButtonClass}
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Export Batch ({batch.length})
              </button>
            </div>
          </div>
        </header>

        {error && <Notice tone="error" message={error} onClose={() => setError(null)} />}
        {notice && <Notice tone="success" message={notice} onClose={() => setNotice(null)} />}

        <section className="my-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Charm models" value={modelOptions.length} helper="Available to choose" icon={<Smartphone size={18} />} />
          <Stat
            label="Current results"
            value={charms.length}
            helper={
              selectedModel
                ? `${charmFamilies.length} charm famil${charmFamilies.length === 1 ? "y" : "ies"}`
                : "Choose a model"
            }
            icon={<Sparkles size={18} />}
          />
          <Stat label="Selected now" value={selectedIds.size} helper="Ready to add" icon={<Check size={18} />} />
          <Stat label="Batch total" value={batch.length} helper={`${groupedBatch.length} model group${groupedBatch.length === 1 ? "" : "s"}`} icon={<PackageCheck size={18} />} />
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeading step="Step 1" title="Choose a phone model" text="Only models with stored charms appear in this list." />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <select
                  value={selectedModel}
                  onChange={(event) => chooseModel(event.target.value)}
                  disabled={modelsLoading}
                  aria-label="Choose phone model"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">{modelsLoading ? "Loading charm models..." : "Select a phone model"}</option>
                  {modelOptions.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}{option.count ? ` (${option.count})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => selectedModel ? setRefreshKey((value) => value + 1) : void loadModels()}
                  disabled={modelsLoading || charmsLoading}
                  className={secondaryButtonClass}
                >
                  <RefreshCw size={15} className={modelsLoading || charmsLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <SectionHeading
                    step="Step 2"
                    title={selectedModel ? `Select charms for ${selectedModel}` : "Select charms"}
                    text="Each V1 parent contains its V2+ variants. Select a parent, a whole family, or only the variants you need."
                  />
                  <div className="relative w-full lg:w-80">
                    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      disabled={!selectedModel}
                      placeholder="Search title, SKU or design..."
                      className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-9 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                    {search && (
                      <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {selectedModel && !charmsLoading && charms.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
                    <button type="button" onClick={toggleAllVisible} disabled={!selectableVisibleCharms.length} className={secondaryButtonClass}>
                      <Check size={15} />
                      {allVisibleSelected ? "Clear result selection" : `Select all results (${selectableVisibleCharms.length})`}
                    </button>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {visibleFamilies.length} famil{visibleFamilies.length === 1 ? "y" : "ies"} · {visibleCharms.length} listing{visibleCharms.length === 1 ? "" : "s"}
                    </p>
                    <button type="button" onClick={addSelectedToBatch} disabled={!selectedIds.size} className={addButtonClass}>
                      <Layers3 size={15} />
                      Add selected to batch ({selectedIds.size})
                    </button>
                  </div>
                )}
              </div>

              {charmsLoading ? (
                <LoadingState />
              ) : !selectedModel ? (
                <EmptyState icon={<Smartphone size={26} />} title="Choose a phone model" text="The stored charms related to that model will appear here." />
              ) : !visibleCharms.length ? (
                <EmptyState icon={<Sparkles size={26} />} title={search ? "No matching charms" : `No stored charms for ${selectedModel}`} text={search ? "Try another title, SKU or design search." : "Create and store charms for this model, then refresh this page."} />
              ) : (
                <div className="space-y-3 bg-slate-50/70 p-3 sm:p-5">
                  {visibleFamilies.map((family) => (
                    <CharmFamilyCard
                      key={family.key}
                      family={family}
                      model={selectedModel}
                      selectedIds={selectedIds}
                      batchKeys={batchKeys}
                      expanded={expandedFamilyKeys.has(family.key)}
                      forceExpanded={Boolean(search.trim())}
                      onToggleExpanded={() => toggleFamilyExpanded(family.key)}
                      onToggleCharm={toggleCharm}
                      onToggleFamily={() => toggleFamilySelection(family)}
                      onSelectParentOnly={() => selectParentOnly(family)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-5">
            <div className="border-b border-slate-200 bg-slate-950 p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-300">Step 3</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Review batch</h2>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold">{batch.length} charms</span>
              </div>
              <p className="mt-1 text-xs text-slate-300">Your batch stays here while you choose more models.</p>
            </div>

            {batch.length ? (
              <>
                <div className="max-h-[58vh] space-y-4 overflow-y-auto p-4">
                  {groupedBatch.map(([model, items]) => (
                    <section key={model} className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-800">{model}</p>
                          <p className="text-[10px] text-slate-500">{items.length} selected</p>
                        </div>
                        <button type="button" onClick={() => removeModelGroup(model)} className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50" aria-label={`Remove all ${model} charms`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <div key={item.batchKey} className="flex items-start gap-2 px-3 py-3">
                            <CharmThumbnail charm={item} small />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs font-semibold leading-4 text-slate-800">{item.productName}</p>
                              <p className="mt-1 truncate font-mono text-[9px] text-slate-400">{item.sku}</p>
                            </div>
                            <button type="button" onClick={() => removeBatchItem(item.batchKey)} className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${item.productName} from batch`}>
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                <div className="space-y-2 border-t border-slate-200 p-4">
                  <button type="button" onClick={() => void exportBatch()} disabled={exporting} className={`${primaryButtonClass} w-full`}>
                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    Export {batch.length} charms
                  </button>
                  <button type="button" onClick={clearBatch} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-xs font-bold text-red-600 transition hover:bg-red-50">
                    <Trash2 size={14} />
                    Clear batch
                  </button>
                </div>
              </>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
                <div className="rounded-2xl bg-fuchsia-50 p-4 text-fuchsia-500"><Layers3 size={28} /></div>
                <h3 className="mt-4 font-bold text-slate-900">Batch is empty</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">Choose a model, select its charms and add them here. Then repeat with another model.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function CharmFamilyCard({
  family,
  model,
  selectedIds,
  batchKeys,
  expanded,
  forceExpanded,
  onToggleExpanded,
  onToggleCharm,
  onToggleFamily,
  onSelectParentOnly,
}: {
  family: CharmFamily;
  model: string;
  selectedIds: Set<string>;
  batchKeys: Set<string>;
  expanded: boolean;
  forceExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleCharm: (id: string) => void;
  onToggleFamily: () => void;
  onSelectParentOnly: () => void;
}) {
  const availableItems = family.items.filter(
    (charm) => !batchKeys.has(batchKey(charm.id, model)),
  );
  const selectedCount = availableItems.filter((charm) =>
    selectedIds.has(charm.id),
  ).length;
  const addedCount = family.items.length - availableItems.length;
  const allFamilySelected =
    availableItems.length > 0 && selectedCount === availableItems.length;
  const parentAdded = family.parent
    ? batchKeys.has(batchKey(family.parent.id, model))
    : false;
  const variantsVisible = forceExpanded || expanded;
  const variantsId = `charm-family-variants-${family.key.replace(
    /[^a-z0-9_-]/gi,
    "-",
  )}`;
  const headingId = `${variantsId}-heading`;

  return (
    <article
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-fuchsia-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-fuchsia-700">
                Charm family
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Design #{family.designNumber}
              </span>
            </div>
            <h3 id={headingId} className="mt-2 text-base font-bold text-slate-900">
              {family.designName}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {family.parent ? "1 parent" : "Parent missing"} · {family.variants.length} variant{family.variants.length === 1 ? "" : "s"} · {family.items.length} listing{family.items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {selectedCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                {selectedCount} selected
              </span>
            )}
            {addedCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                <Check size={11} />
                {addedCount} added
              </span>
            )}
          </div>
        </div>

        {family.parent ? (
          <div className="mt-4">
            <CharmSelectionRow
              charm={family.parent}
              kind="parent"
              selected={selectedIds.has(family.parent.id)}
              added={parentAdded}
              onToggle={() => onToggleCharm(family.parent!.id)}
            />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-800">
            No V1 parent was found for this design. You can still open and select its variants.
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onSelectParentOnly}
            disabled={!family.parent || parentAdded}
            className={secondaryButtonClass}
          >
            <Check size={14} />
            Select parent only
          </button>
          <button
            type="button"
            onClick={onToggleFamily}
            disabled={!availableItems.length}
            className={allFamilySelected ? secondaryButtonClass : addButtonClass}
          >
            <Layers3 size={14} />
            {allFamilySelected
              ? "Clear family selection"
              : addedCount
                ? `Select remaining (${availableItems.length})`
                : `Select all (${family.items.length})`}
          </button>
          <button
            type="button"
            onClick={onToggleExpanded}
            disabled={!family.variants.length || forceExpanded}
            aria-expanded={variantsVisible}
            aria-controls={variantsId}
            className={`${secondaryButtonClass} sm:ml-auto`}
          >
            {variantsVisible ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            {forceExpanded
              ? "Variants shown for search"
              : variantsVisible
                ? "Hide variants"
                : `Show variants (${family.variants.length})`}
          </button>
        </div>
      </div>

      {variantsVisible && family.variants.length > 0 && (
        <div
          id={variantsId}
          className="border-t border-slate-200 bg-slate-50/80 px-3 py-4 sm:px-5"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Variants ({family.variants.length})
            </p>
            <p className="text-[10px] text-slate-400">
              Select any variant separately
            </p>
          </div>
          <div className="space-y-2 border-l-2 border-fuchsia-200 pl-3 sm:pl-4">
            {family.variants.map((variant) => {
              const added = batchKeys.has(batchKey(variant.id, model));
              return (
                <CharmSelectionRow
                  key={variant.id}
                  charm={variant}
                  kind="variant"
                  selected={selectedIds.has(variant.id)}
                  added={added}
                  onToggle={() => onToggleCharm(variant.id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

function CharmSelectionRow({
  charm,
  kind,
  selected,
  added,
  onToggle,
}: {
  charm: Charm;
  kind: "parent" | "variant";
  selected: boolean;
  added: boolean;
  onToggle: () => void;
}) {
  const versionNumber = charmVariantNumber(charm);
  const versionLabel = versionNumber ? `V${versionNumber}` : charm.version || "Version —";
  const roleLabel =
    kind === "parent"
      ? `Parent · ${versionLabel}`
      : versionNumber === 1
        ? `Additional parent · ${versionLabel}`
        : `Variant · ${versionLabel}`;

  return (
    <div
      className={`rounded-xl border p-3 transition sm:p-4 ${
        added
          ? "border-emerald-200 bg-emerald-50/70"
          : selected
            ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
            : kind === "parent"
              ? "border-fuchsia-200 bg-fuchsia-50/40 hover:border-fuchsia-300"
              : "border-slate-200 bg-white hover:border-blue-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={added}
          onChange={onToggle}
          aria-label={`Select ${roleLabel}: ${charm.productName}`}
          className="mt-4 h-4 w-4 shrink-0 accent-blue-600 disabled:opacity-40"
        />
        <CharmThumbnail charm={charm} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                kind === "parent"
                  ? "bg-fuchsia-100 text-fuchsia-700"
                  : "bg-violet-100 text-violet-700"
              }`}
            >
              {roleLabel}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {charm.groupId || "No group"}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-900">
            {charm.productName}
          </p>
          <p className="mt-1 break-all font-mono text-[10px] leading-4 text-slate-500">
            {charm.sku || charm.styleId || "No SKU"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-slate-900">
            {formatCurrency(charm.price)}
          </p>
          <span
            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${
              added
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {added && <Check size={10} />}
            {added ? "Added" : "Available"}
          </span>
        </div>
      </div>
    </div>
  );
}

function CharmThumbnail({ charm, small = false }: { charm: Charm; small?: boolean }) {
  const image = getImage(charm);
  const size = small ? "h-10 w-10" : "h-12 w-12";

  return image ? (
    <div
      role="img"
      aria-label={`${charm.productName} image`}
      style={{ backgroundImage: `url(${JSON.stringify(image)})` }}
      className={`${size} shrink-0 rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center`}
    />
  ) : (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-300`}>
      <ImageIcon size={small ? 15 : 18} />
    </div>
  );
}

function SectionHeading({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{step}</p>
      <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}

function Stat({ label, value, helper, icon }: { label: string; value: number; helper: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 truncate text-[10px] text-slate-400">{helper}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">{icon}</div>
      </div>
    </div>
  );
}

function Notice({ tone, message, onClose }: { tone: "error" | "success"; message: string; onClose: () => void }) {
  const classes = tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return (
    <div className={`mt-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${classes}`}>
      <p>{message}</p>
      <button type="button" onClick={onClose} aria-label="Close message" className="rounded-lg p-1 hover:bg-black/5"><X size={14} /></button>
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
      <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">{icon}</div>
      <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{text}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-8 text-sm font-semibold text-slate-500">
      <Loader2 size={25} className="animate-spin text-blue-600" />
      Loading stored charms...
    </div>
  );
}

const secondaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
const primaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";
const addButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40";

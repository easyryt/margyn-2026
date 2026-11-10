"use client";

import {
  ArrowRight,
  BarChart3,
  Box,
  Boxes,
  CircleDollarSign,
  FileSpreadsheet,
  Layers3,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/components/listing-tool/navigation";

import ProductImport from "@/components/listing-tool/original/components/ProductImport";

const API_BASE_URL = "/api/tools/listing-tool";

type PriceStats = {
  minimum: number;
  average: number;
  maximum: number;
  averageMrp: number;
  averageDiscount: number;
};

type DashboardStats = {
  totalProducts: number;
  totalVariants: number;
  totalRecords: number;
  totalInventory: number;
  inventoryValue: number;
  lowStock: number;
  outOfStock: number;
  healthyStock: number;
  stockHealthPercentage: number;
  averageInventory: number;
  productsWithVariants: number;
  productsWithoutVariants: number;
  variantCoveragePercentage: number;
  averageVariantsPerProduct: number;
  totalCharms: number;
  charmProducts: number;
  productsWithoutCharms: number;
  charmCoveragePercentage: number;
  averageCharmsPerProduct: number;
  modelCount: number;
  categoryCount: number;
  brandCount: number;
  newProducts7Days: number;
  newProducts30Days: number;
  newCharms30Days: number;
  price: PriceStats;
};

type DistributionItem = {
  name: string;
  count: number;
  stock: number;
  value: number;
};

type ModelItem = {
  name: string;
  records: number;
  parents: number;
  variants: number;
  inventory: number;
  value: number;
  charms: number;
};

type RecentProduct = {
  id?: string;
  _id?: string;
  productName?: string;
  title?: string;
  designName?: string;
  designNumber?: string | number;
  price?: number;
  inventory?: number;
  image?: string;
  image1?: string;
  charmCount?: number;
};

type DashboardResponse = {
  success?: boolean;
  stats?: Partial<Omit<DashboardStats, "price">> & {
    price?: Partial<PriceStats>;
  };
  categories?: DistributionItem[];
  brands?: DistributionItem[];
  topModels?: ModelItem[];
  recentProducts?: RecentProduct[];
};

type ApiErrorResponse = {
  message?: string;
};

const DEFAULT_STATS: DashboardStats = {
  totalProducts: 0,
  totalVariants: 0,
  totalRecords: 0,
  totalInventory: 0,
  inventoryValue: 0,
  lowStock: 0,
  outOfStock: 0,
  healthyStock: 0,
  stockHealthPercentage: 0,
  averageInventory: 0,
  productsWithVariants: 0,
  productsWithoutVariants: 0,
  variantCoveragePercentage: 0,
  averageVariantsPerProduct: 0,
  totalCharms: 0,
  charmProducts: 0,
  productsWithoutCharms: 0,
  charmCoveragePercentage: 0,
  averageCharmsPerProduct: 0,
  modelCount: 0,
  categoryCount: 0,
  brandCount: 0,
  newProducts7Days: 0,
  newProducts30Days: 0,
  newCharms30Days: 0,
  price: {
    minimum: 0,
    average: 0,
    maximum: 0,
    averageMrp: 0,
    averageDiscount: 0,
  },
};

async function apiRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | T
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    throw new Error(
      data &&
        typeof data === "object" &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : "Unable to load dashboard data.",
    );
  }

  return data as T;
}

function normalizeStats(stats?: DashboardResponse["stats"]): DashboardStats {
  return {
    ...DEFAULT_STATS,
    ...stats,
    price: {
      ...DEFAULT_STATS.price,
      ...stats?.price,
    },
  };
}

function formatNumber(value?: number | null, maximumFractionDigits = 0) {
  return Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits,
  });
}

function formatCurrency(value?: number | null) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function clampPercentage(value?: number | null) {
  return Math.min(100, Math.max(0, Number(value ?? 0)));
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClassName,
  iconBackground,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Package;
  iconClassName: string;
  iconBackground: string;
}) {
  return (
    <section className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className={`absolute right-5 top-5 rounded-xl p-3 ${iconBackground}`}>
        <Icon className={`h-5 w-5 ${iconClassName}`} />
      </div>
      <div className="min-w-0">
        <p className="pr-14 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <p className="mt-3 truncate text-xl font-bold tracking-tight text-slate-950 2xl:text-2xl">
          {value}
        </p>
        <p className="mt-1 pr-1 text-sm text-slate-500">{detail}</p>
      </div>
    </section>
  );
}

function CoverageCard({
  label,
  value,
  detail,
  barClassName,
}: {
  label: string;
  value: number;
  detail: string;
  barClassName: string;
}) {
  const percentage = clampPercentage(value);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xl font-bold text-slate-950">
          {formatNumber(percentage, 1)}%
        </p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barClassName}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${className}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {helper ? <p className="mt-0.5 text-xs text-slate-400">{helper}</p> : null}
      </div>
      <p className="shrink-0 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function DistributionList({
  items,
  emptyMessage,
}: {
  items: DistributionItem[];
  emptyMessage: string;
}) {
  if (!items.length) {
    return <p className="px-6 py-10 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  const maximumCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="divide-y divide-slate-100 px-5 sm:px-6">
      {items.slice(0, 6).map((item) => (
        <div key={item.name} className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {item.name || "Unassigned"}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {formatNumber(item.count)} records
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-700"
                  style={{ width: `${(item.count / maximumCount) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span>{formatNumber(item.stock)} units</span>
                <span>{formatCurrency(item.value)} value</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function ProductsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [categories, setCategories] = useState<DistributionItem[]>([]);
  const [brands, setBrands] = useState<DistributionItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    const dashboard = await apiRequest<DashboardResponse>("/products/dashboard");
    setStats(normalizeStats(dashboard.stats));
    setCategories(dashboard.categories ?? []);
    setBrands(dashboard.brands ?? []);
    setModels(dashboard.topModels ?? []);
    setRecentProducts(dashboard.recentProducts ?? []);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void (async () => {
        try {
          setError("");
          await loadDashboard();
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load dashboard data.",
          );
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loadDashboard]);

  const refresh = async () => {
    try {
      setRefreshing(true);
      setError("");
      await loadDashboard();
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh dashboard data.",
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const healthyWidth = stats.totalRecords
    ? (stats.healthyStock / stats.totalRecords) * 100
    : 0;
  const lowStockWidth = stats.totalRecords
    ? (stats.lowStock / stats.totalRecords) * 100
    : 0;
  const outOfStockWidth = stats.totalRecords
    ? (stats.outOfStock / stats.totalRecords) * 100
    : 0;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header className="rounded-2xl border border-slate-200/80 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-slate-950 p-3 text-white">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                    Listing Tool
                  </h1>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    Live data
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
                  Product, model, inventory, pricing, variant, and charm performance in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  document
                    .querySelector("#product-import")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Import Excel
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push("/create-product")}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                New product
              </button>
              <button
                type="button"
                onClick={() => router.push("/charms/batch")}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-4 text-sm font-semibold text-fuchsia-700 transition hover:border-fuchsia-300 hover:bg-fuchsia-100"
              >
                <Layers3 className="h-4 w-4" />
                Charm batch
              </button>
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open catalog
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Analytics could not be updated</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
            <button type="button" onClick={() => void refresh()} className="font-bold">
              Retry
            </button>
          </div>
        ) : null}

        <div className="mt-5">
          <ProductImport onImported={loadDashboard} />
        </div>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Parent products"
            value={formatNumber(stats.totalProducts)}
            detail={`${formatNumber(stats.newProducts7Days)} added in 7 days`}
            icon={ShoppingBag}
            iconClassName="text-blue-700"
            iconBackground="bg-blue-50"
          />
          <StatCard
            label="Variants"
            value={formatNumber(stats.totalVariants)}
            detail={`${formatNumber(stats.averageVariantsPerProduct, 1)} average per product`}
            icon={Layers3}
            iconClassName="text-violet-700"
            iconBackground="bg-violet-50"
          />
          <StatCard
            label="Total records"
            value={formatNumber(stats.totalRecords)}
            detail="Products and variants"
            icon={Boxes}
            iconClassName="text-slate-700"
            iconBackground="bg-slate-100"
          />
          <StatCard
            label="Inventory units"
            value={formatNumber(stats.totalInventory)}
            detail={`${formatNumber(stats.averageInventory, 1)} average per record`}
            icon={Package}
            iconClassName="text-amber-700"
            iconBackground="bg-amber-50"
          />
          <StatCard
            label="Inventory value"
            value={formatCurrency(stats.inventoryValue)}
            detail="Based on current prices"
            icon={CircleDollarSign}
            iconClassName="text-emerald-700"
            iconBackground="bg-emerald-50"
          />
          <StatCard
            label="Stored charms"
            value={formatNumber(stats.totalCharms)}
            detail={`${formatNumber(stats.newCharms30Days)} added in 30 days`}
            icon={Sparkles}
            iconClassName="text-fuchsia-700"
            iconBackground="bg-fuchsia-50"
          />
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CoverageCard
            label="Stock health"
            value={stats.stockHealthPercentage}
            detail={`${formatNumber(stats.healthyStock)} healthy records out of ${formatNumber(stats.totalRecords)}`}
            barClassName="bg-emerald-500"
          />
          <CoverageCard
            label="Variant coverage"
            value={stats.variantCoveragePercentage}
            detail={`${formatNumber(stats.productsWithVariants)} products have at least one variant`}
            barClassName="bg-violet-500"
          />
          <CoverageCard
            label="Charm coverage"
            value={stats.charmCoveragePercentage}
            detail={`${formatNumber(stats.charmProducts)} catalog records have charm products`}
            barClassName="bg-fuchsia-500"
          />
          <div className="rounded-2xl border border-slate-200/80 bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Smartphone className="h-4 w-4" />
              Catalog breadth
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.modelCount)}</p>
                <p className="mt-1 text-xs text-slate-400">Models</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.categoryCount)}</p>
                <p className="mt-1 text-xs text-slate-400">Categories</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.brandCount)}</p>
                <p className="mt-1 text-xs text-slate-400">Brands</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-3">
          <Panel title="Stock health" description="Availability across every catalog record">
            <div className="px-5 py-5 sm:px-6">
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="bg-emerald-500" style={{ width: `${healthyWidth}%` }} />
                <div className="bg-amber-400" style={{ width: `${lowStockWidth}%` }} />
                <div className="bg-rose-500" style={{ width: `${outOfStockWidth}%` }} />
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                <MetricRow label="Healthy stock" value={formatNumber(stats.healthyStock)} helper="More than 5 units" />
                <MetricRow label="Low stock" value={formatNumber(stats.lowStock)} helper="Between 1 and 5 units" />
                <MetricRow label="Out of stock" value={formatNumber(stats.outOfStock)} helper="No available inventory" />
              </div>
            </div>
          </Panel>

          <Panel title="Pricing intelligence" description="Current selling price and MRP overview">
            <div className="divide-y divide-slate-100 px-5 py-2 sm:px-6">
              <MetricRow label="Average selling price" value={formatCurrency(stats.price.average)} />
              <MetricRow label="Average MRP" value={formatCurrency(stats.price.averageMrp)} />
              <MetricRow label="Average discount" value={`${formatNumber(stats.price.averageDiscount, 1)}%`} />
              <div className="grid grid-cols-2 gap-4 py-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Lowest price</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">{formatCurrency(stats.price.minimum)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">Highest price</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">{formatCurrency(stats.price.maximum)}</p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Charm analytics" description="Separate charm records linked to catalog designs">
            <div className="divide-y divide-slate-100 px-5 py-2 sm:px-6">
              <MetricRow label="Total charm products" value={formatNumber(stats.totalCharms)} />
              <MetricRow label="Products with charms" value={formatNumber(stats.charmProducts)} />
              <MetricRow label="Products without charms" value={formatNumber(stats.productsWithoutCharms)} />
              <MetricRow label="Average charms per covered product" value={formatNumber(stats.averageCharmsPerProduct, 1)} />
              <MetricRow label="New charms in 30 days" value={formatNumber(stats.newCharms30Days)} />
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.8fr)]">
          <Panel
            title="Performance by model"
            description="Compare parent products, variants, stock, value, and charm coverage"
            action={
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="hidden items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800 sm:inline-flex"
              >
                All models <ArrowRight className="h-4 w-4" />
              </button>
            }
          >
            {models.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      <th className="px-6 py-3">Model</th>
                      <th className="px-4 py-3 text-right">Parents</th>
                      <th className="px-4 py-3 text-right">Variants</th>
                      <th className="px-4 py-3 text-right">Inventory</th>
                      <th className="px-4 py-3 text-right">Value</th>
                      <th className="px-4 py-3 text-right">Charms</th>
                      <th className="w-12 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {models.map((model) => (
                      <tr
                        key={model.name}
                        onClick={() => router.push(`/products/model/${encodeURIComponent(model.name)}`)}
                        className="cursor-pointer transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                              <Smartphone className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{model.name}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{formatNumber(model.records)} records</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-700">{formatNumber(model.parents)}</td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-700">{formatNumber(model.variants)}</td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-700">{formatNumber(model.inventory)}</td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-700">{formatCurrency(model.value)}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 text-xs font-bold ${model.charms ? "bg-fuchsia-50 text-fuchsia-700" : "bg-slate-100 text-slate-500"}`}>
                            {formatNumber(model.charms)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right"><ArrowRight className="ml-auto h-4 w-4 text-slate-400" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-12 text-center text-sm text-slate-500">No model analytics are available yet.</p>
            )}
          </Panel>

          <Panel title="Recent activity" description="Catalog changes during the last 30 days">
            <div className="grid grid-cols-2 gap-3 p-5 sm:p-6 xl:grid-cols-1">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New in 7 days</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(stats.newProducts7Days)}</p>
                <p className="mt-1 text-xs text-slate-500">Parent products</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New in 30 days</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{formatNumber(stats.newProducts30Days)}</p>
                <p className="mt-1 text-xs text-slate-500">Parent products</p>
              </div>
              <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600">New charms</p>
                <p className="mt-2 text-2xl font-bold text-fuchsia-950">{formatNumber(stats.newCharms30Days)}</p>
                <p className="mt-1 text-xs text-fuchsia-700">During the last 30 days</p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Products without variants</p>
                <p className="mt-2 text-2xl font-bold text-violet-950">{formatNumber(stats.productsWithoutVariants)}</p>
                <p className="mt-1 text-xs text-violet-700">May need attention</p>
              </div>
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-2">
          <Panel title="Category distribution" description="Catalog size, available units, and inventory value">
            <DistributionList items={categories} emptyMessage="No category data is available." />
          </Panel>
          <Panel title="Brand distribution" description="Compare the strongest brands in your catalog">
            <DistributionList items={brands} emptyMessage="No brand data is available." />
          </Panel>
        </section>

        <Panel
          title="Recently added products"
          description="The latest parent products in your catalog"
          className="mt-5"
          action={
            <button type="button" onClick={() => router.push("/products")} className="text-sm font-bold text-blue-700 hover:text-blue-800">
              Manage all
            </button>
          }
        >
          {recentProducts.length ? (
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {recentProducts.map((product, index) => {
                const imageUrl = product.image || product.image1;
                const name = product.productName || product.title || product.designName || "Untitled product";
                return (
                  <div key={product.id || product._id || `${name}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div
                      className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 bg-slate-50 bg-contain bg-center bg-no-repeat"
                      style={imageUrl ? { backgroundImage: `url(${JSON.stringify(imageUrl)})` } : undefined}
                    >
                      {!imageUrl ? <Box className="m-auto mt-4 h-5 w-5 text-slate-300" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        Design {product.designNumber || "—"} · {formatNumber(product.inventory)} units
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-slate-700">{formatCurrency(product.price)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${product.charmCount ? "bg-fuchsia-50 text-fuchsia-700" : "bg-slate-100 text-slate-500"}`}>
                          {formatNumber(product.charmCount)} charms
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Package className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No recent products</p>
              <p className="mt-1 text-xs text-slate-500">Newly created products will appear here.</p>
            </div>
          )}
        </Panel>

        <footer className="mt-5 flex flex-col gap-3 rounded-2xl bg-slate-950 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2.5"><Box className="h-5 w-5" /></div>
            <div>
              <p className="font-bold">Ready to manage your catalog?</p>
              <p className="mt-0.5 text-sm text-slate-400">Choose a phone model, then manage its products, variants, and charms.</p>
            </div>
          </div>
          <button type="button" onClick={() => router.push("/products")} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 hover:bg-slate-100">
            Browse models <ArrowRight className="h-4 w-4" />
          </button>
        </footer>
      </div>
    </main>
  );
}

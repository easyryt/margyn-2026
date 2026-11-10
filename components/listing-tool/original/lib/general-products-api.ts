import type { GeneralProductBatchItem } from "./general-product-batch";

const API_BASE = "/api/tools/listing-tool";
const READ_RETRY_DELAYS = [750, 1500, 3000];
const REQUEST_TIMEOUT_MS = 8000;

export class GeneralProductConnectionError extends Error {
  constructor() {
    // Do not include URL credentials or query parameters in a user-facing error.
    let endpoint = API_BASE.split("?")[0];
    try { const url = new URL(API_BASE); endpoint = `${url.origin}${url.pathname}`; } catch { /* Relative API paths are supported. */ }
    super(`Unable to reach the database API (${endpoint}). The backend may still be starting or restarting. Wait for “API running on port …”, then retry. Your unsaved batch has not been cleared.`);
    this.name = "GeneralProductConnectionError";
  }
}

function waitForReadRetry(delay: number, signal?: AbortSignal | null) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return; }
    const onAbort = () => { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); reject(signal?.reason); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, delay);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function fetchGeneralProducts(path: string, options: RequestInit) {
  // Reads can safely retry through a watch-mode restart. Never replay saves/deletes.
  const readOnly = (options.method || "GET").toUpperCase() === "GET";
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  for (let attempt = 0; ; attempt += 1) {
    if (options.signal?.aborted) throw options.signal.reason;
    const controller = new AbortController();
    const onAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const timer = readOnly ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
    let response: Response | undefined;
    try {
      response = await fetch(`${API_BASE}/general-products${path}`, { ...options, cache: "no-store", headers, signal: controller.signal });
    } catch (error) {
      if (options.signal?.aborted) throw options.signal.reason || error;
      if (!readOnly || attempt >= READ_RETRY_DELAYS.length) throw new GeneralProductConnectionError();
    } finally {
      if (timer !== null) clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
    }
    if (response && (response.status !== 503 || !readOnly || attempt >= READ_RETRY_DELAYS.length)) return response;
    if (response?.body) await response.body.cancel().catch(() => {});
    await waitForReadRetry(READ_RETRY_DELAYS[attempt], options.signal);
  }
}

export type SavedGeneralProduct = GeneralProductBatchItem & {
  databaseId: string;
  databaseRevision: number;
  createdAt: string;
  updatedAt: string;
};

export type GeneralProductAnalytics = {
  stats: {
    totalProducts: number; totalVariants: number; totalListings: number; totalInventory: number;
    inventoryValue: number; averagePrice: number; minimumPrice: number; maximumPrice: number;
    lowStock: number; outOfStock: number; productsWithVariants: number;
    newProducts7Days: number; newProducts30Days: number;
  };
  categories: Array<{ name: string; listings: number; inventory: number; value: number }>;
  packSizes: Array<{ name: string; listings: number; inventory: number; value: number }>;
};

export type GeneralProductSaveResult = {
  saved: SavedGeneralProduct[];
  errors: Array<{ clientId: string; sku: string; message: string; status: number }>;
  counts: { created: number; updated: number; unchanged: number };
};

export async function generalProductsRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetchGeneralProducts(path, options);
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data !== "object") {
    if (response.status === 404 && (!data || typeof data !== "object" || !("message" in data) || String(data.message).startsWith("Route not found"))) {
      throw new Error("The general-product API is unavailable. Restart or deploy the updated listing-tool-backend.");
    }
    throw new Error(data && typeof data === "object" && "message" in data && typeof data.message === "string"
      ? data.message : "Unable to access saved general products.");
  }
  return data as T;
}

export function saveGeneralProductBatch(products: GeneralProductBatchItem[]) {
  return generalProductsRequest<GeneralProductSaveResult>("/batch", {
    method: "POST", body: JSON.stringify({ products }),
  });
}

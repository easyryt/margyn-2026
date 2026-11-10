"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  Filter,
  Image as ImageIcon,
  Layers3,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "@/components/listing-tool/navigation";

import { exportExcel } from "@/components/listing-tool/original/lib/excel";
import {
  parseCharmWorkbookRows,
  readCharmWorkbookCellText,
} from "@/components/listing-tool/original/lib/charm-import";
import type { Product as ProductFormProduct } from "./ProductCard";
import ProductEditorModal from "./ProductEditorModal";
import SavedVariantImagesUpload from "@/components/listing-tool/original/components/SavedVariantImagesUpload";
import { savedVariantImageRows, withSavedVariantMainImage } from "@/components/listing-tool/original/lib/saved-variant-images";

const API_BASE_URL = "/api/tools/listing-tool";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type Product = ProductFormProduct & {
  variants?: Product[];
  charmCount?: number;
  relatedCharmCount?: number;
  createdAt?: string;
  updatedAt?: string;
  image?: string;
  stockStatus?:
    | "in-stock"
    | "low-stock"
    | "out-of-stock";
};

type ProductsResponse = {
  success?: boolean;
  products: Product[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

type ProductDetailResponse = {
  success: boolean;
  product: Product;
  parent: Product | null;
  variants: Product[];
  variantCount: number;
  totalInventory: number;
};

type Charm = Product & {
  sourceProductId?: string;
  sourceKind?: "parent" | "variant";
  sourceVariantNumber?: number;
};

type CharmsResponse = {
  success: boolean;
  charms: Charm[];
};

type StockMode = "set" | "add" | "remove";
type CharmFilter = "all" | "with" | "without";

type ModelAnalytics = {
  model: string;
  parents: number;
  variants: number;
  records: number;
  inventory: number;
  value: number;
  lowStock: number;
  charmProducts: number;
  charms: number;
  categories: string[];
};

type SavedProductsProps = {
  initialModel?: string;
};

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      cache: "no-store",
    },
  );

  const data = (await response
    .json()
    .catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      data &&
        typeof data === "object" &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : "Request failed.",
    );
  }

  return data as T;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getImage(product: Product) {
  return (
    product.image ||
    product.image1 ||
    product.image2 ||
    product.image3 ||
    product.image4 ||
    ""
  );
}

function formatCurrency(value: number) {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN",
  )}`;
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString(
    "en-IN",
  );
}

function getStockStatus(
  stock: number,
) {
  if (stock <= 0) {
    return "out-of-stock" as const;
  }

  if (stock <= 20) {
    return "low-stock" as const;
  }

  return "in-stock" as const;
}

function getAllProducts(
  parents: Product[],
) {
  return parents.flatMap(
    (parent) => [
      parent,
      ...(parent.variants ?? []),
    ],
  );
}

function positiveVersion(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0
    ? number
    : undefined;
}

function productVersion(product: Product) {
  if (!product.parentId) return 1;
  return (
    positiveVersion(product.variantNumber) ??
    positiveVersion(product.version) ??
    positiveVersion(product.sku?.match(/\.V(\d+)$/i)?.[1])
  );
}

function charmVersion(charm: Charm) {
  if (charm.sourceKind === "parent") return 1;
  return (
    positiveVersion(charm.sourceVariantNumber) ??
    positiveVersion(charm.version) ??
    positiveVersion(charm.sku?.match(/\.V(\d+)$/i)?.[1])
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

export default function SavedProducts({ initialModel = "" }: SavedProductsProps) {
  const router = useRouter();

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    modelSearch,
    setModelSearch,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState("all");

  const [
    stockFilter,
    setStockFilter,
  ] = useState("all");

  const [
    charmFilter,
    setCharmFilter,
  ] = useState<CharmFilter>("all");

  const [
    sortBy,
    setSortBy,
  ] = useState("newest");

  const [
    expandedProducts,
    setExpandedProducts,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState<Product | null>(
    null,
  );

  const [
    detail,
    setDetail,
  ] =
    useState<ProductDetailResponse | null>(
      null,
    );

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    stockModal,
    setStockModal,
  ] = useState<{
    product: Product;
    mode: StockMode;
  } | null>(null);

  const [
    stockValue,
    setStockValue,
  ] = useState("");

  const [
    imageModal,
    setImageModal,
  ] = useState<Product | null>(
    null,
  );

  const [
    imageValues,
    setImageValues,
  ] = useState({
    image1: "",
    image2: "",
    image3: "",
    image4: "",
  });

  const [
    editor,
    setEditor,
  ] = useState<{
    product: Product;
    family: Product[];
  } | null>(null);

  const [
    notice,
    setNotice,
  ] = useState<string | null>(null);

  const [isExporting, setIsExporting] =
    useState(false);

  const [
    selectedExportIds,
    setSelectedExportIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const charmImportInputRef =
    useRef<HTMLInputElement>(null);

  const [
    charmImportFile,
    setCharmImportFile,
  ] = useState<File | null>(null);

  const [
    isImportingCharms,
    setIsImportingCharms,
  ] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* LOAD PRODUCTS                                                            */
  /* ------------------------------------------------------------------------ */

  const loadProducts = useCallback(async (
    silent = false,
  ) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      const modelQuery = initialModel
        ? `&model=${encodeURIComponent(initialModel)}`
        : "";

      const endpoint = (page: number) =>
        `/products?kind=parent&limit=500&page=${page}&sort=newest${modelQuery}`;

      const response =
        await apiRequest<ProductsResponse>(
          endpoint(1),
        );

      const parents = [
        ...(response.products ?? []),
      ];

      const totalPages =
        response.pagination?.totalPages ?? 1;

      const applyCatalog = () => {
        setProducts([...parents]);

        setSelectedExportIds(
          new Set(
            parents.flatMap((parent) => [
              parent.id,
              ...(parent.variants ?? []).map(
                (variant) => variant.id,
              ),
            ]),
          ),
        );

        setExpandedProducts(
          new Set(
            parents.map((product) => product.id),
          ),
        );
      };

      // Render the newest page immediately. Remaining legacy pages load in
      // the background, so the catalog stays responsive even before a backend
      // with exact model filtering has been deployed.
      if (!silent) {
        applyCatalog();
        setIsLoading(false);
      }

      // The API caps each request at 500 parents. Load every page so older
      // products remain available in model catalogs and in the editor.
      for (let page = 2; page <= totalPages; page += 4) {
        const pageNumbers = Array.from(
          { length: Math.min(4, totalPages - page + 1) },
          (_, index) => page + index,
        );
        const pageResponses = await Promise.all(
          pageNumbers.map((pageNumber) =>
            apiRequest<ProductsResponse>(
              endpoint(pageNumber),
            ),
          ),
        );

        for (const pageResponse of pageResponses) {
          parents.push(...(pageResponse.products ?? []));
        }
      }

      applyCatalog();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load saved products.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [initialModel]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadProducts();
    });

    const handleProductsImported = () => {
      void loadProducts(true);
    };

    window.addEventListener(
      "products-imported",
      handleProductsImported,
    );

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(
        "products-imported",
        handleProductsImported,
      );
    };
  }, [loadProducts]);

  const modelAnalytics = useMemo<ModelAnalytics[]>(() => {
    const models = [
      ...new Set(
        getAllProducts(products).flatMap((product) => getModelNames(product)),
      ),
    ].sort((first, second) =>
      first.localeCompare(second, undefined, { numeric: true, sensitivity: "base" }),
    );

    return models.map((model) => {
      const parents = productsForModel(products, model);
      const records = getAllProducts(parents);
      const variants = records.filter((product) => Boolean(product.parentId)).length;
      const inventory = records.reduce(
        (total, product) => total + Number(product.inventory || 0),
        0,
      );
      const value = records.reduce(
        (total, product) =>
          total + Number(product.inventory || 0) * Number(product.price || 0),
        0,
      );
      const lowStock = records.filter(
        (product) => Number(product.inventory || 0) <= 20,
      ).length;
      const charmProducts = records.filter(
        (product) => getCharmCount(product) > 0,
      ).length;
      const charms = records.reduce(
        (total, product) => total + getCharmCount(product),
        0,
      );
      const categories = [
        ...new Set(records.map((product) => product.category).filter(Boolean)),
      ];

      return {
        model,
        parents: parents.length,
        variants,
        records: records.length,
        inventory,
        value,
        lowStock,
        charmProducts,
        charms,
        categories,
      };
    });
  }, [products]);

  const visibleModels = useMemo(() => {
    const query = modelSearch.trim().toLowerCase();
    if (!query) return modelAnalytics;

    return modelAnalytics.filter((item) =>
      [item.model, ...item.categories].join(" ").toLowerCase().includes(query),
    );
  }, [modelAnalytics, modelSearch]);

  const catalogProducts = useMemo(
    () => (initialModel ? productsForModel(products, initialModel) : products),
    [initialModel, products],
  );

  const selectedModelAnalytics = useMemo(
    () =>
      modelAnalytics.find(
        (item) => item.model.toLowerCase() === initialModel.toLowerCase(),
      ) ?? null,
    [initialModel, modelAnalytics],
  );

  /* ------------------------------------------------------------------------ */
  /* FILTER VALUES                                                            */
  /* ------------------------------------------------------------------------ */

  const categories = useMemo(() => {
    return [
      ...new Set(
        catalogProducts
          .map(
            (product) =>
              product.category,
          )
          .filter(Boolean),
      ),
    ].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [catalogProducts]);

  /* ------------------------------------------------------------------------ */
  /* FILTERED PRODUCTS                                                        */
  /* ------------------------------------------------------------------------ */

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const result =
        catalogProducts.filter(
          (product) => {
            const variantText =
              (
                product.variants ??
                []
              )
                .map((variant) =>
                  [
                    variant.productName,
                    variant.designName,
                    variant.designCode,
                    variant.color,
                    variant.groupId,
                    variant.models?.[0]
                      ?.model,
                  ].join(" "),
                )
                .join(" ");

            const searchable = [
              product.productName,
              product.brand,
              product.category,
              product.designName,
              product.designCode,
              product.designNumber,
              product.groupId,
              product.color,
              product.models?.[0]
                ?.model,
              variantText,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            const matchesSearch =
              !query ||
              searchable.includes(
                query,
              );

            const matchesCategory =
              category === "all" ||
              product.category ===
                category;

            const allStock = [
              product,
              ...(product.variants ??
                []),
            ];

            const hasStockMatch =
              stockFilter ===
                "all" ||
              allStock.some(
                (item) => {
                  const stock =
                    Number(
                      item.inventory,
                    );

                  if (
                    stockFilter ===
                    "in-stock"
                  ) {
                    return (
                      stock > 20
                    );
                  }

                  if (
                    stockFilter ===
                    "low-stock"
                  ) {
                    return (
                      stock > 0 &&
                      stock <= 20
                    );
                  }

                  if (
                    stockFilter ===
                    "out-of-stock"
                  ) {
                    return (
                      stock <= 0
                    );
                  }

                  return true;
                },
              );

            const relatedCharmCount =
              getRelatedCharmCount(product);

            const hasCharmMatch =
              charmFilter === "all" ||
              (charmFilter === "with" && relatedCharmCount > 0) ||
              (charmFilter === "without" && relatedCharmCount === 0);

            return (
              matchesSearch &&
              matchesCategory &&
              hasStockMatch &&
              hasCharmMatch
            );
          },
        );

      result.sort(
        (a, b) => {
          if (
            sortBy ===
            "name"
          ) {
            return a.productName.localeCompare(
              b.productName,
            );
          }

          if (
            sortBy ===
            "price-low"
          ) {
            return (
              Number(
                a.price,
              ) -
              Number(b.price)
            );
          }

          if (
            sortBy ===
            "price-high"
          ) {
            return (
              Number(
                b.price,
              ) -
              Number(a.price)
            );
          }

          if (
            sortBy ===
            "stock-high"
          ) {
            return (
              Number(
                b.inventory,
              ) -
              Number(a.inventory)
            );
          }

          return (
            new Date(
              b.createdAt ??
                0,
            ).getTime() -
            new Date(
              a.createdAt ??
                0,
            ).getTime()
          );
        },
      );

      return result;
    }, [
      catalogProducts,
      search,
      category,
      stockFilter,
      charmFilter,
      sortBy,
    ]);

  /* ------------------------------------------------------------------------ */
  /* STATS                                                                     */
  /* ------------------------------------------------------------------------ */

  const stats = useMemo(() => {
    const all =
      getAllProducts(
        catalogProducts,
      );

    const totalStock =
      all.reduce(
        (sum, product) =>
          sum +
          Number(
            product.inventory ||
              0,
          ),
        0,
      );

    const totalValue =
      all.reduce(
        (sum, product) =>
          sum +
          Number(
            product.inventory ||
              0,
          ) *
            Number(
              product.price ||
                0,
            ),
        0,
      );

    const lowStock =
      all.filter((product) => {
        const stock =
          Number(
            product.inventory ||
              0,
          );

        return (
          stock > 0 &&
          stock <= 20
        );
      }).length;

    const outOfStock =
      all.filter(
        (product) =>
          Number(
            product.inventory ||
              0,
          ) <= 0,
      ).length;

    const variants =
      all.filter(
        (product) =>
          Boolean(
            product.parentId,
          ),
      ).length;

    const charmProducts =
      all.filter(
        (product) =>
          getCharmCount(product) > 0,
      ).length;

    const totalCharms =
      all.reduce(
        (total, product) =>
          total +
          getCharmCount(product),
        0,
      );

    return {
      parents:
        catalogProducts.length,

      variants,

      records:
        all.length,

      totalStock,

      totalValue,

      lowStock,

      outOfStock,

      charmProducts,

      totalCharms,
    };
  }, [catalogProducts]);

  /* ------------------------------------------------------------------------ */
  /* EXPAND / COLLAPSE                                                         */
  /* ------------------------------------------------------------------------ */

  const toggleProduct = (
    productId: string,
  ) => {
    setExpandedProducts(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(
            productId,
          )
        ) {
          next.delete(
            productId,
          );
        } else {
          next.add(
            productId,
          );
        }

        return next;
      },
    );
  };

  const expandAll = () => {
    setExpandedProducts(
      new Set(
        catalogProducts.map(
          (product) =>
            product.id,
        ),
      ),
    );
  };

  const collapseAll = () => {
    setExpandedProducts(
      new Set(),
    );
  };

  /* ------------------------------------------------------------------------ */
  /* DETAIL                                                                    */
  /* ------------------------------------------------------------------------ */

  const openEditor = (
    product: Product,
  ) => {
    const parent = product.parentId
      ? products.find(
          (item) =>
            item.id === product.parentId ||
            item.variants?.some(
              (variant) => variant.id === product.id,
            ),
        )
      : products.find(
          (item) => item.id === product.id,
        );

    const family = parent
      ? [parent, ...(parent.variants ?? [])]
      : [product];

    setNotice(null);
    setEditor({ product, family });
  };

  const productSaved = async (
    product: Product,
    keepOpen = false,
  ) => {
    if (!keepOpen) setEditor(null);
    setSelectedProduct(null);
    setDetail(null);
    await loadProducts(true);
    setNotice(
      `${product.parentId ? "Variant" : "Product"} updated successfully.`,
    );
  };

  const openProduct = async (
    product: Product,
  ) => {
    try {
      setSelectedProduct(
        product,
      );

      setDetail(null);
      setDetailLoading(true);

      const data =
        await apiRequest<ProductDetailResponse>(
          `/products/${product.id}`,
        );

      setDetail(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load product details.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedProduct(null);
    setDetail(null);
  };

  const openCharms = (
    product: Product,
  ) => {
    router.push(
      `/charms/${encodeURIComponent(product.designNumber)}?productId=${encodeURIComponent(product.id)}`,
    );
  };

  /* ------------------------------------------------------------------------ */
  /* IMPORT CHARMS                                                             */
  /* ------------------------------------------------------------------------ */

  const chooseCharmImportFile = (
    file: File | undefined,
  ) => {
    setNotice(null);

    if (!file) {
      setCharmImportFile(null);
      return;
    }

    if (!/\.xlsx$/i.test(file.name)) {
      setCharmImportFile(null);
      setError("Choose a Meesho .xlsx workbook.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setCharmImportFile(null);
      setError("The charm workbook must be 15 MB or smaller.");
      return;
    }

    setError(null);
    setCharmImportFile(file);
  };

  const importCharmWorkbook = async () => {
    if (
      !charmImportFile ||
      !initialModel ||
      isImportingCharms
    ) {
      return;
    }

    try {
      setIsImportingCharms(true);
      setError(null);
      setNotice(null);

      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(
        await charmImportFile.arrayBuffer(),
      );

      const importItems = parseCharmWorkbookRows(
        workbook.worksheets.map((worksheet) => {
          const rows: unknown[][] = [];

          worksheet.eachRow(
            { includeEmpty: true },
            (row, rowNumber) => {
              const values: unknown[] = [];
              row.eachCell(
                { includeEmpty: true },
                (cell, columnNumber) => {
                  values[columnNumber - 1] =
                    readCharmWorkbookCellText(cell);
                },
              );
              rows[rowNumber - 1] = values;
            },
          );

          return {
            name: worksheet.name,
            rows,
          };
        }),
      );

      const designNumbers = [
        ...new Set(
          importItems.map((item) => item.designNumber),
        ),
      ];

      const resolvedParents = await Promise.all(
        designNumbers.map(async (designNumber) => {
          const params = new URLSearchParams({
            kind: "parent",
            limit: "100",
            page: "1",
            sort: "newest",
            search: designNumber,
            model: initialModel,
          });
          const lookup = await apiRequest<ProductsResponse>(
            `/products?${params.toString()}`,
          );
          const matches = new Map<string, Product>();

          for (const parent of [
            ...catalogProducts,
            ...(lookup.products ?? []),
          ]) {
            if (
              !parent.parentId &&
              String(parent.designNumber ?? "").trim() === designNumber
            ) {
              matches.set(parent.id, parent);
            }
          }

          return {
            designNumber,
            parents: [...matches.values()],
          };
        }),
      );

      const parentErrors = resolvedParents.flatMap(
        ({ designNumber, parents }) => {
          if (!parents.length) {
            return [
              `No parent product with design number ${designNumber} was found in ${initialModel}.`,
            ];
          }
          if (parents.length > 1) {
            return [
              `Design number ${designNumber} matches more than one parent product in ${initialModel}.`,
            ];
          }
          return [];
        },
      );

      if (parentErrors.length) {
        throw new Error(parentErrors.join(" "));
      }

      type ImportContext = {
        root: Product;
        sourcesByVersion: Map<number, Product>;
        charms: Charm[];
      };

      const contextEntries = await Promise.all(
        resolvedParents.map(async ({ designNumber, parents }) => {
          const parent = parents[0];
          const [detailResult, charmsResult] = await Promise.all([
            apiRequest<ProductDetailResponse>(
              `/products/${encodeURIComponent(parent.id)}`,
            ),
            apiRequest<CharmsResponse>(
              `/products/${encodeURIComponent(parent.id)}/charms`,
            ),
          ]);
          const root = detailResult.parent ?? detailResult.product;
          const sourcesByVersion = new Map<number, Product>();

          for (const source of [
            root,
            ...(detailResult.variants ?? []),
          ]) {
            const version = productVersion(source);
            if (version !== undefined) {
              if (sourcesByVersion.has(version)) {
                throw new Error(
                  `Parent design ${designNumber} has more than one V${version} source.`,
                );
              }
              sourcesByVersion.set(version, source);
            }
          }

          return [
            designNumber,
            {
              root,
              sourcesByVersion,
              charms: charmsResult.charms ?? [],
            },
          ] as const;
        }),
      );
      const contexts = new Map<string, ImportContext>(
        contextEntries,
      );

      const missingSources = importItems.flatMap((item) =>
        contexts.get(item.designNumber)?.sourcesByVersion.has(item.version)
          ? []
          : [`design ${item.designNumber} V${item.version}`],
      );

      if (missingSources.length) {
        throw new Error(
          `Charm import stopped before saving. No matching product source was found for ${missingSources
            .slice(0, 5)
            .join(", ")}${missingSources.length > 5 ? ` and ${missingSources.length - 5} more` : ""}.`,
        );
      }

      let created = 0;
      let updated = 0;
      const failures: string[] = [];

      for (let start = 0; start < importItems.length; start += 8) {
        const batch = importItems.slice(start, start + 8);
        const results = await Promise.allSettled(
          batch.map(async (item) => {
            const context = contexts.get(item.designNumber);
            const source = context?.sourcesByVersion.get(item.version);

            if (!context || !source) {
              throw new Error("The validated source is no longer available.");
            }

            const existing =
              context.charms.find(
                (charm) => charm.sourceProductId === source.id,
              ) ??
              context.charms.find(
                (charm) => charmVersion(charm) === item.version,
              );

            try {
              if (existing) {
                await apiRequest(
                  `/products/${encodeURIComponent(context.root.id)}/charms/${encodeURIComponent(existing.id)}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify(item.data),
                  },
                );
                return "updated" as const;
              }

              await apiRequest(
                `/products/${encodeURIComponent(source.id)}/with-charm`,
                {
                  method: "POST",
                  body: JSON.stringify(item.data),
                },
              );
              return "created" as const;
            } catch (writeError) {
              const message =
                writeError instanceof Error
                  ? writeError.message
                  : "Unable to save charm.";
              throw new Error(
                `${item.sheet} row ${item.rowNumber} (design ${item.designNumber} V${item.version}): ${message}`,
              );
            }
          }),
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            if (result.value === "updated") updated += 1;
            else created += 1;
          } else {
            failures.push(
              result.reason instanceof Error
                ? result.reason.message
                : "A charm row could not be imported.",
            );
          }
        }
      }

      if (created + updated > 0) {
        await loadProducts(true);
        setNotice(
          `${created} charm${created === 1 ? "" : "s"} created and ${updated} updated across ${designNumbers.length} parent design${designNumbers.length === 1 ? "" : "s"}.`,
        );
      }

      if (failures.length) {
        setError(
          `${failures.length} charm row${failures.length === 1 ? "" : "s"} failed. ${failures
            .slice(0, 2)
            .join(" ")}${failures.length > 2 ? ` ${failures.length - 2} more error(s).` : ""}`,
        );
      } else {
        setCharmImportFile(null);
        if (charmImportInputRef.current) {
          charmImportInputRef.current.value = "";
        }
      }
    } catch (importError) {
      console.error(importError);
      setError(
        importError instanceof Error
          ? importError.message
          : "Unable to import the charm workbook.",
      );
    } finally {
      setIsImportingCharms(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* DELETE                                                                    */
  /* ------------------------------------------------------------------------ */

  const deleteProduct = async (
    product: Product,
  ) => {
    const variants =
      product.variants ?? [];

    const message =
      variants.length > 0
        ? `Delete "${product.productName}" and all ${variants.length} variants?`
        : `Delete "${product.productName}"?`;

    if (
      !window.confirm(
        `${message}\n\nThis action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setDeletingId(
        product.id,
      );

      setError(null);

      await apiRequest(
        `/products/${product.id}`,
        {
          method: "DELETE",
        },
      );

      setProducts(
        (current) =>
          current
            .filter(
              (item) => item.id !== product.id,
            )
            .map((item) => ({
              ...item,
              variants: (item.variants ?? []).filter(
                (variant) => variant.id !== product.id,
              ),
            })),
      );

      setSelectedExportIds(
        (current) => {
          const next =
            new Set(current);

          next.delete(
            product.id,
          );

          for (
            const variant of product.variants ?? []
          ) {
            next.delete(
              variant.id,
            );
          }

          return next;
        },
      );

      if (
        selectedProduct?.id ===
        product.id
      ) {
        closeDetail();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete product.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* STOCK                                                                     */
  /* ------------------------------------------------------------------------ */

  const openStockModal = (
    product: Product,
    mode: StockMode,
  ) => {
    setStockModal({
      product,
      mode,
    });

    setStockValue(
      mode === "set"
        ? String(
            product.inventory ??
              0,
          )
        : "",
    );
  };

  const closeStockModal =
    () => {
      setStockModal(null);
      setStockValue("");
    };

  const saveStock = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!stockModal) {
      return;
    }

    const amount =
      Number(stockValue);

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount < 0
    ) {
      setError(
        "Enter a valid stock value.",
      );
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);

      let endpoint = "";
      let body:
        | {
            inventory: number;
          }
        | {
            quantity: number;
          };

      if (
        stockModal.mode ===
        "set"
      ) {
        endpoint = `/products/${stockModal.product.id}/stock`;

        body = {
          inventory: amount,
        };
      } else if (
        stockModal.mode ===
        "add"
      ) {
        if (amount <= 0) {
          throw new Error(
            "Quantity must be greater than 0.",
          );
        }

        endpoint = `/products/${stockModal.product.id}/stock/add`;

        body = {
          quantity: amount,
        };
      } else {
        if (amount <= 0) {
          throw new Error(
            "Quantity must be greater than 0.",
          );
        }

        endpoint = `/products/${stockModal.product.id}/stock/remove`;

        body = {
          quantity: amount,
        };
      }

      await apiRequest(
        endpoint,
        {
          method: "PATCH",
          body: JSON.stringify(
            body,
          ),
        },
      );

      closeStockModal();

      await loadProducts(
        true,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update stock.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* IMAGES                                                                    */
  /* ------------------------------------------------------------------------ */

  const openImageModal = (
    product: Product,
  ) => {
    setImageModal(product);

    setImageValues({
      image1:
        product.image1 ||
        "",
      image2:
        product.image2 ||
        "",
      image3:
        product.image3 ||
        "",
      image4:
        product.image4 ||
        "",
    });
  };

  const closeImageModal =
    () => {
      setImageModal(null);
    };

  const saveImages = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    if (!imageModal) {
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);

      await apiRequest(
        `/products/${imageModal.id}/images`,
        {
          method: "PATCH",
          body: JSON.stringify(
            imageValues,
          ),
        },
      );

      closeImageModal();

      await loadProducts(
        true,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update images.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* EXPORT                                                                     */
  /* ------------------------------------------------------------------------ */

  const allFilteredExportProducts =
    useMemo(() => {
      return filteredProducts.flatMap(
        (parent) => [
          parent,
          ...(parent.variants ?? []),
        ],
      );
    }, [filteredProducts]);

  const selectedExportProducts =
    useMemo(() => {
      return allFilteredExportProducts.filter(
        (product) =>
          selectedExportIds.has(
            product.id,
          ),
      );
    }, [
      allFilteredExportProducts,
      selectedExportIds,
    ]);

  const toggleExportSelection = (
    productId: string,
  ) => {
    setSelectedExportIds(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(productId)
        ) {
          next.delete(productId);
        } else {
          next.add(productId);
        }

        return next;
      },
    );
  };

  const selectAllFilteredForExport = () => {
    setSelectedExportIds(
      (current) => {
        const next =
          new Set(current);

        for (
          const product of allFilteredExportProducts
        ) {
          next.add(product.id);
        }

        return next;
      },
    );
  };

  const clearFilteredExportSelection = () => {
    setSelectedExportIds(
      (current) => {
        const next =
          new Set(current);

        for (
          const product of allFilteredExportProducts
        ) {
          next.delete(product.id);
        }

        return next;
      },
    );
  };

  const toggleParentExportSelection = (
    parent: Product,
  ) => {
    const ids = [
      parent.id,
      ...(parent.variants ?? []).map(
        (variant) =>
          variant.id,
      ),
    ];

    setSelectedExportIds(
      (current) => {
        const next =
          new Set(current);

        const everySelected =
          ids.every((id) =>
            next.has(id),
          );

        if (everySelected) {
          ids.forEach((id) =>
            next.delete(id),
          );
        } else {
          ids.forEach((id) =>
            next.add(id),
          );
        }

        return next;
      },
    );
  };

  const handleExport = async () => {
    if (
      selectedExportProducts.length ===
      0
    ) {
      setError(
        "Please select at least one product or variant to export.",
      );
      return;
    }

    try {
      setIsExporting(true);
      setError(null);

      await exportExcel(
        selectedExportProducts,
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to export products.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* BACK                                                                       */
  /* ------------------------------------------------------------------------ */

  const handleBack = () => {
    if (initialModel) {
      router.push("/products");
      return;
    }

    router.back();
  };

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                   */
  /* ------------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-24 rounded-2xl bg-white" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-white" />
          ))}
        </div>
        <div className="h-32 rounded-2xl bg-white" />
        <div className="h-96 rounded-2xl bg-white" />
      </div>
    );
  }

  if (!initialModel) {
    return (
      <ModelAnalyticsHome
        models={visibleModels}
        totalModels={modelAnalytics.length}
        stats={stats}
        search={modelSearch}
        refreshing={isRefreshing}
        error={error}
        onSearch={setModelSearch}
        onBack={() => router.push("/")}
        onRefresh={() => void loadProducts(true)}
        onCreate={() => router.push("/create-product")}
        onSelect={(model) =>
          router.push(`/products/model/${encodeURIComponent(model)}`)
        }
        onClearError={() => setError(null)}
      />
    );
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                         */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <div className="space-y-6">
        {/* HEADER */}
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={
                  handleBack
                }
                className="mt-0.5 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft
                  size={17}
                />
                <span className="hidden sm:inline">
                  All Models
                </span>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <Smartphone
                    size={18}
                    className="text-blue-600"
                  />

                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {initialModel} Catalog
                  </h1>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    {selectedModelAnalytics?.records ?? 0} records
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    {selectedModelAnalytics?.charms ?? 0} charms
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Manage products, variants, stock, images and charms for {initialModel}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className={secondaryButtonClass}
              >
                <BarChart3 size={16} />
                Back to Dashboard
              </button>

              <button
                type="button"
                onClick={() =>
                  void loadProducts(
                    true,
                  )
                }
                disabled={
                  isRefreshing
                }
                className={secondaryButtonClass}
              >
                <RefreshCw
                  size={16}
                  className={
                    isRefreshing
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={
                  isExporting ||
                  selectedExportProducts.length ===
                    0
                }
                className={secondaryButtonClass}
              >
                {isExporting ? (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Download size={16} />
                )}
                {isExporting
                  ? "Exporting..."
                  : `Export Excel (${selectedExportProducts.length})`}
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/create-product",
                  )
                }
                className={primaryButtonClass}
              >
                <Plus size={17} />
                Create Product
              </button>
            </div>
          </div>
        </header>

        <section
          aria-label={`Import charms for ${initialModel}`}
          className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Sparkles size={19} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900">
                  Import charm workbook
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Upload a Meesho XLSX. Each SKU design number is matched to its
                  parent in {initialModel}, and V1, V2, V3… are linked to the
                  corresponding product versions.
                </p>
                <p className="mt-1 text-xs font-medium text-blue-700">
                  Only separate charm records are created or updated. Parent
                  products and variants stay unchanged.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label
                className={`${secondaryButtonClass} max-w-full cursor-pointer ${isImportingCharms ? "pointer-events-none opacity-50" : ""}`}
              >
                <Upload size={16} />
                <span className="max-w-56 truncate">
                  {charmImportFile
                    ? charmImportFile.name
                    : "Choose charm XLSX"}
                </span>
                <input
                  ref={charmImportInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  disabled={isImportingCharms}
                  onChange={(event) =>
                    chooseCharmImportFile(event.target.files?.[0])
                  }
                />
              </label>

              <button
                type="button"
                onClick={() => void importCharmWorkbook()}
                disabled={!charmImportFile || isImportingCharms}
                aria-busy={isImportingCharms}
                className={primaryButtonClass}
              >
                {isImportingCharms ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {isImportingCharms ? "Importing..." : "Import Charms"}
              </button>
            </div>
          </div>
        </section>

        {notice && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 rounded-md p-1 hover:bg-emerald-100"
              aria-label="Close success message"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="shrink-0 rounded-md p-1 hover:bg-red-100"
            >
              <X
                size={15}
              />
            </button>
          </div>
        )}

        {/* STATS */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MiniStat
            label="Products"
            value={stats.parents}
            helper="Parent listings"
            icon={<Package size={18} />}
          />

          <MiniStat
            label="Variants"
            value={stats.variants}
            helper="Linked listings"
            icon={<Layers3 size={18} />}
          />

          <MiniStat
            label="Total Records"
            value={stats.records}
            helper="Catalog entries"
            icon={<Boxes size={18} />}
          />

          <MiniStat
            label="Inventory"
            value={formatNumber(stats.totalStock)}
            helper={`${formatCurrency(stats.totalValue)} · ${stats.lowStock + stats.outOfStock} stock alerts`}
            icon={<CircleDollarSign size={18} />}
          />

          <MiniStat
            label="Charm Products"
            value={stats.charmProducts}
            helper={`${Math.max(stats.records - stats.charmProducts, 0)} without charms`}
            icon={<Sparkles size={18} />}
          />

          <MiniStat
            label="Stored Charms"
            value={stats.totalCharms}
            helper="Separate charm records"
            icon={<Sparkles size={18} />}
          />
        </section>

        {/* TOOLBAR */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            {/* SEARCH */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Search product, design, code, model, group..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch(
                      "",
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X
                    size={15}
                  />
                </button>
              )}
            </div>

            {/* FILTERS */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={
                  category
                }
                onChange={(event) =>
                  setCategory(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-blue-500"
              >
                <option value="all">
                  All Categories
                </option>

                {categories.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>

              <select
                value={
                  stockFilter
                }
                onChange={(event) =>
                  setStockFilter(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-blue-500"
              >
                <option value="all">
                  All Stock
                </option>

                <option value="in-stock">
                  In Stock
                </option>

                <option value="low-stock">
                  Low Stock
                </option>

                <option value="out-of-stock">
                  Out of Stock
                </option>
              </select>

              <select
                value={
                  sortBy
                }
                onChange={(event) =>
                  setSortBy(
                    event.target
                      .value,
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-blue-500"
              >
                <option value="newest">
                  Newest
                </option>

                <option value="name">
                  Name
                </option>

                <option value="price-low">
                  Price Low
                </option>

                <option value="price-high">
                  Price High
                </option>

                <option value="stock-high">
                  Stock High
                </option>
              </select>

              <select
                value={charmFilter}
                onChange={(event) =>
                  setCharmFilter(event.target.value as CharmFilter)
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 outline-none focus:border-blue-500"
                aria-label="Filter by charm status"
              >
                <option value="all">All Charm Status</option>
                <option value="with">With Charms</option>
                <option value="without">Without Charms</option>
              </select>

              <button
                type="button"
                onClick={
                  expandAll
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ChevronDown
                  size={15}
                />
                Expand
              </button>

              <button
                type="button"
                onClick={
                  collapseAll
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <ChevronRight
                  size={15}
                />
                Collapse
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory(
                    "all",
                  );
                  setStockFilter(
                    "all",
                  );
                  setCharmFilter("all");
                  setSortBy(
                    "newest",
                  );
                }}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Filter
                  size={15}
                />
                Clear
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3">
            <div>
              <p className="text-xs font-bold text-blue-800">
                Export selection
              </p>
              <p className="mt-0.5 text-[11px] text-blue-700">
                {selectedExportProducts.length} selected record
                {selectedExportProducts.length === 1 ? "" : "s"} · includes
                parents and variants
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  selectAllFilteredForExport
                }
                disabled={
                  allFilteredExportProducts.length === 0
                }
                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={
                  clearFilteredExportSelection
                }
                disabled={
                  selectedExportProducts.length === 0
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={
                  isExporting ||
                  selectedExportProducts.length === 0
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isExporting ? (
                  <RefreshCw
                    size={13}
                    className="animate-spin"
                  />
                ) : (
                  <Download size={13} />
                )}
                {isExporting
                  ? "Exporting..."
                  : "Export Selected"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Showing{" "}
              <strong className="text-slate-600">
                {filteredProducts.length}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-600">
                {catalogProducts.length}
              </strong>{" "}
              products
            </span>

            <span>
              Inventory value:{" "}
              <strong className="text-slate-700">
                {formatCurrency(
                  stats.totalValue,
                )}
              </strong>
            </span>
          </div>
        </section>

        {/* EMPTY */}
        {filteredProducts.length ===
          0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search
                size={24}
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              No products found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Try a different
              search term or
              clear the filters.
            </p>
          </div>
        )}

        {/* LIST */}
        {filteredProducts.length >
          0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-bold text-slate-900">Catalog records</h2>
                <p className="mt-1 text-xs text-slate-500">Select a product name to view complete listing details.</p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                {filteredProducts.length} parent {filteredProducts.length === 1 ? "product" : "products"}
              </span>
            </div>
            {/* HEADER */}
            <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[38px_minmax(300px,1.8fr)_150px_110px_110px_110px_150px] md:items-center md:gap-3">
              <div />

              <div>
                Product
              </div>

              <div>
                Design
              </div>

              <div>
                Price
              </div>

              <div>
                MRP
              </div>

              <div>
                Stock
              </div>

              <div className="text-right">
                Actions
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredProducts.map(
                (
                  product,
                ) => {
                  const variants =
                    product.variants ??
                    [];

                  const expanded =
                    expandedProducts.has(
                      product.id,
                    );

                  const rootStock =
                    Number(
                      product.inventory ||
                        0,
                    );

                  return (
                    <div
                      key={
                        product.id
                      }
                    >
                      {/* PRODUCT */}
                      <div className="px-3 py-4 md:px-4">
                        <div className="grid gap-3 md:grid-cols-[38px_minmax(300px,1.8fr)_150px_110px_110px_110px_150px] md:items-center md:gap-3">
                          {/* EXPAND */}
                          <div>
                            {variants.length >
                            0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  toggleProduct(
                                    product.id,
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                              >
                                {expanded ? (
                                  <ChevronDown
                                    size={
                                      16
                                    }
                                  />
                                ) : (
                                  <ChevronRight
                                    size={
                                      16
                                    }
                                  />
                                )}
                              </button>
                            ) : (
                              <div className="h-8 w-8" />
                            )}
                          </div>

                          {/* PRODUCT */}
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                              {getImage(
                                product,
                              ) ? (
                                <img
                                  src={getImage(
                                    product,
                                  )}
                                  alt={
                                    product.productName
                                  }
                                  className="h-full w-full object-cover"
                                  onError={(
                                    event,
                                  ) => {
                                    event.currentTarget.style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-slate-300">
                                  <Package
                                    size={
                                      20
                                    }
                                  />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void openProduct(
                                      product,
                                    )
                                  }
                                  className="max-w-[430px] truncate text-left text-sm font-bold text-slate-900 hover:text-blue-600"
                                >
                                  {
                                    product.productName
                                  }
                                </button>

                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                  V1
                                </span>

                                {variants.length >
                                  0 && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {
                                      variants.length
                                    }{" "}
                                    variant
                                    {variants.length !==
                                    1
                                      ? "s"
                                      : ""}
                                  </span>
                                )}

                                <CharmBadge
                                  count={getRelatedCharmCount(product)}
                                  related={variants.length > 0}
                                />
                              </div>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                <span>
                                  {product.brand ||
                                    "No brand"}
                                </span>

                                <span>
                                  {product.category ||
                                    "No category"}
                                </span>

                                <span>
                                  {product.models?.[0]
                                    ?.model ||
                                    "No model"}
                                </span>
                              </div>

                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {product.groupId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSearch(
                                        product.groupId,
                                      )
                                    }
                                    className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                                  >
                                    {
                                      product.groupId
                                    }
                                  </button>
                                )}

                                {product.designCode && (
                                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    {
                                      product.designCode
                                    }
                                  </span>
                                )}

                                <StockBadge
                                  stock={
                                    rootStock
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {/* DESIGN */}
                          <div className="hidden min-w-0 md:block">
                            <p className="truncate text-xs font-semibold text-slate-700">
                              {product.designName ||
                                "—"}
                            </p>

                            <p className="mt-1 truncate text-[10px] text-slate-400">
                              {product.designNumber ||
                                "No number"}
                            </p>
                          </div>

                          {/* PRICE */}
                          <div className="hidden md:block">
                            <p className="text-sm font-bold text-slate-900">
                              {formatCurrency(
                                product.price,
                              )}
                            </p>
                          </div>

                          {/* MRP */}
                          <div className="hidden md:block">
                            <p className="text-xs text-slate-400 line-through">
                              {formatCurrency(
                                product.mrp,
                              )}
                            </p>
                          </div>

                          {/* STOCK */}
                          <div className="hidden md:block">
                            <StockBadge
                              stock={
                                rootStock
                              }
                            />
                          </div>

                          {/* ACTIONS */}
                          <div className="flex items-center justify-end gap-1.5">
                            <label
                              title="Select parent and all variants for export"
                              className="mr-1 flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 text-[10px] font-bold text-blue-700"
                            >
                              <input
                                type="checkbox"
                                checked={[
                                  product.id,
                                  ...(product.variants ?? []).map(
                                    (variant) => variant.id,
                                  ),
                                ].every((id) =>
                                  selectedExportIds.has(id),
                                )}
                                onChange={() =>
                                  toggleParentExportSelection(product)
                                }
                                className="h-4 w-4 accent-blue-600"
                              />
                              Export
                            </label>
                            <IconButton
                              title="View product"
                              onClick={() =>
                                void openProduct(
                                  product,
                                )
                              }
                            >
                              <Eye
                                size={
                                  15
                                }
                              />
                            </IconButton>

                            <IconButton
                              title="Edit product"
                              onClick={() =>
                                openEditor(product)
                              }
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Pencil size={15} />
                            </IconButton>

                            <IconButton
                              title={`Manage charms for design ${product.designNumber}`}
                              onClick={() =>
                                openCharms(
                                  product,
                                )
                              }
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Sparkles
                                size={15}
                              />
                            </IconButton>

                            <IconButton
                              title="Add stock"
                              onClick={() =>
                                openStockModal(
                                  product,
                                  "add",
                                )
                              }
                              className="text-emerald-600 hover:bg-emerald-50"
                            >
                              <Plus
                                size={
                                  15
                                }
                              />
                            </IconButton>

                            <IconButton
                              title="Edit images"
                              onClick={() =>
                                openImageModal(
                                  product,
                                )
                              }
                            >
                              <ImageIcon
                                size={
                                  15
                                }
                              />
                            </IconButton>

                            <IconButton
                              title="Delete"
                              danger
                              disabled={
                                deletingId ===
                                product.id
                              }
                              onClick={() =>
                                void deleteProduct(
                                  product,
                                )
                              }
                            >
                              {deletingId ===
                              product.id ? (
                                <RefreshCw
                                  size={
                                    15
                                  }
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={
                                    15
                                  }
                                />
                              )}
                            </IconButton>
                          </div>
                        </div>

                        {/* MOBILE */}
                        <div className="mt-3 grid grid-cols-3 gap-2 md:hidden">
                          <MobileInfo
                            label="Price"
                            value={formatCurrency(
                              product.price,
                            )}
                          />

                          <MobileInfo
                            label="MRP"
                            value={formatCurrency(
                              product.mrp,
                            )}
                          />

                          <MobileInfo
                            label="Stock"
                            value={formatNumber(
                              product.inventory,
                            )}
                          />
                        </div>
                      </div>

                      {savedVariantImageRows(variants, "product").length > 0 && (
                        <details className="mx-4 mb-4 rounded-xl border border-violet-200 px-4">
                          <summary className="cursor-pointer py-3 text-xs font-bold text-violet-800">
                            Bulk variant main images · Design {product.designNumber}
                          </summary>
                          <SavedVariantImagesUpload
                            productId={product.id}
                            variants={savedVariantImageRows(variants, "product")}
                            disabled={isRefreshing || deletingId === product.id}
                            onSave={async (rowId, payload) => {
                              if (!variants.some(row => row.id === rowId)) throw new Error("This variant is no longer in this product.");
                              const result = await apiRequest<{ product: Product }>(
                                `/products/${encodeURIComponent(rowId)}/images`,
                                { method: "PATCH", body: JSON.stringify(payload) },
                              );
                              if (result.product?.id !== rowId || result.product.image1 !== payload.image1) throw new Error("The database did not confirm this variant's main image. Retry saving its link.");
                              setProducts(current => current.map(parent => parent.id === product.id ? {
                                ...parent,
                                variants: parent.variants?.map(row => row.id === rowId ? withSavedVariantMainImage(row, result.product.image1) : row),
                              } : parent));
                            }}
                          />
                        </details>
                      )}

                      {/* VARIANTS */}
                      {expanded &&
                        variants.length >
                          0 && (
                          <div className="border-t border-slate-100 bg-slate-50">
                            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Variants
                            </div>

                            <div className="divide-y divide-slate-200">
                              {variants.map(
                                (
                                  variant,
                                ) => (
                                  <div
                                    key={
                                      variant.id
                                    }
                                    className="px-4 py-3 md:pl-14"
                                  >
                                    <div className="grid gap-3 md:grid-cols-[55px_minmax(280px,1.8fr)_140px_100px_100px_120px] md:items-center md:gap-3">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          aria-label={`Select V${
                                            variant.variantNumber ||
                                            variant.version ||
                                            "2"
                                          } for export`}
                                          checked={selectedExportIds.has(
                                            variant.id,
                                          )}
                                          onChange={() =>
                                            toggleExportSelection(
                                              variant.id,
                                            )
                                          }
                                          className="h-4 w-4 accent-blue-600"
                                        />

                                        <span className="inline-flex rounded-md bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                                          V
                                          {variant.variantNumber ||
                                            variant.version ||
                                            "2"}
                                        </span>
                                      </div>

                                      <div className="flex min-w-0 items-center gap-3">
                                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                                          {getImage(
                                            variant,
                                          ) ? (
                                            <img
                                              src={getImage(
                                                variant,
                                              )}
                                              alt={
                                                variant.productName
                                              }
                                              className="h-full w-full object-cover"
                                              onError={(
                                                event,
                                              ) => {
                                                event.currentTarget.style.display =
                                                  "none";
                                              }}
                                            />
                                          ) : (
                                            <div className="flex h-full items-center justify-center text-slate-300">
                                              <Package
                                                size={
                                                  16
                                                }
                                              />
                                            </div>
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void openProduct(
                                                variant,
                                              )
                                            }
                                            className="block max-w-full truncate text-left text-xs font-bold text-slate-800 hover:text-blue-600"
                                          >
                                            {
                                              variant.productName
                                            }
                                          </button>

                                          <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-400">
                                            <span>
                                              {variant.color ||
                                                "No color"}
                                            </span>

                                            <span>
                                              {variant.size ||
                                                "Free Size"}
                                            </span>

                                            {variant.designCode && (
                                              <span>
                                                {
                                                  variant.designCode
                                                }
                                              </span>
                                            )}

                                            <CharmBadge
                                              count={getCharmCount(variant)}
                                              compact
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="hidden md:block">
                                        <p className="truncate text-xs font-semibold text-slate-700">
                                          {variant.designName ||
                                            "—"}
                                        </p>

                                        <p className="mt-1 truncate text-[10px] text-slate-400">
                                          {variant.designNumber ||
                                            ""}
                                        </p>
                                      </div>

                                      <div className="hidden md:block text-xs font-bold text-slate-900">
                                        {formatCurrency(
                                          variant.price,
                                        )}
                                      </div>

                                      <div className="hidden md:block text-xs text-slate-400 line-through">
                                        {formatCurrency(
                                          variant.mrp,
                                        )}
                                      </div>

                                      <div className="flex items-center justify-between gap-2">
                                        <StockBadge
                                          stock={
                                            variant.inventory
                                          }
                                        />

                                        <div className="flex gap-1">
                                          <IconButton
                                            title="Add stock"
                                            onClick={() =>
                                              openStockModal(
                                                variant,
                                                "add",
                                              )
                                            }
                                            className="text-emerald-600 hover:bg-emerald-50"
                                          >
                                            <Plus
                                              size={
                                                13
                                              }
                                            />
                                          </IconButton>

                                          <IconButton
                                            title="View"
                                            onClick={() =>
                                              void openProduct(
                                                variant,
                                              )
                                            }
                                          >
                                            <Eye
                                              size={
                                                13
                                              }
                                              />
                                          </IconButton>

                                          <IconButton
                                            title="Edit variant"
                                            onClick={() =>
                                              openEditor(variant)
                                            }
                                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                          >
                                            <Pencil size={13} />
                                          </IconButton>

                                          <IconButton
                                            title={`Manage charms for design ${variant.designNumber}`}
                                            onClick={() =>
                                              openCharms(
                                                variant,
                                              )
                                            }
                                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                          >
                                            <Sparkles
                                              size={13}
                                            />
                                          </IconButton>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-3 gap-2 md:hidden">
                                      <MobileInfo
                                        label="Price"
                                        value={formatCurrency(
                                          variant.price,
                                        )}
                                      />

                                      <MobileInfo
                                        label="MRP"
                                        value={formatCurrency(
                                          variant.mrp,
                                        )}
                                      />

                                      <MobileInfo
                                        label="Stock"
                                        value={formatNumber(
                                          variant.inventory,
                                        )}
                                      />
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                },
              )}
            </div>
          </section>
        )}
      </div>

      {editor && (
        <ProductEditorModal
          product={editor.product}
          family={editor.family}
          onClose={() => setEditor(null)}
          onSaved={productSaved}
        />
      )}

      {/* DETAIL DRAWER */}
      {selectedProduct && (
        <ProductDrawer
          product={
            detail?.product ??
            selectedProduct
          }
          variants={
            detail?.variants ??
            selectedProduct.variants ??
            []
          }
          totalInventory={
            detail?.totalInventory ??
            selectedProduct.inventory
          }
          loading={
            detailLoading
          }
          onClose={
            closeDetail
          }
          onStock={(
            mode,
          ) =>
            openStockModal(
              detail?.product ??
                selectedProduct,
              mode,
            )
          }
          onDelete={() =>
            void deleteProduct(
              detail?.product ??
                selectedProduct,
            )
          }
          onImages={() =>
            openImageModal(
              detail?.product ??
                selectedProduct,
            )
          }
          onEdit={openEditor}
          onCharms={() =>
            openCharms(
              detail?.product ??
                selectedProduct,
            )
          }
        />
      )}

      {/* STOCK MODAL */}
      {stockModal && (
        <Modal
          title={
            stockModal.mode ===
            "set"
              ? "Set Stock"
              : stockModal.mode ===
                  "add"
                ? "Add Stock"
                : "Remove Stock"
          }
          onClose={
            closeStockModal
          }
        >
          <form
            onSubmit={
              saveStock
            }
            className="space-y-5"
          >
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                {
                  stockModal.product
                    .productName
                }
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Current stock:{" "}
                <strong>
                  {formatNumber(
                    stockModal.product
                      .inventory,
                  )}
                </strong>
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                {stockModal.mode ===
                "set"
                  ? "New stock"
                  : "Quantity"}
              </label>

              <input
                autoFocus
                type="number"
                min="0"
                value={
                  stockValue
                }
                onChange={(event) =>
                  setStockValue(
                    event.target
                      .value,
                  )
                }
                className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={
                  closeStockModal
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  isRefreshing
                }
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* IMAGE MODAL */}
      {imageModal && (
        <Modal
          title="Product Images"
          onClose={
            closeImageModal
          }
        >
          <form
            onSubmit={
              saveImages
            }
            className="space-y-5"
          >
            {(
              [
                [
                  "image1",
                  "Image 1",
                ],
                [
                  "image2",
                  "Image 2",
                ],
                [
                  "image3",
                  "Image 3",
                ],
                [
                  "image4",
                  "Image 4",
                ],
              ] as const
            ).map(
              ([
                field,
                label,
              ]) => (
                <div
                  key={
                    field
                  }
                >
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {
                      label
                    }
                  </label>

                  <input
                    type="url"
                    value={
                      imageValues[
                        field
                      ]
                    }
                    onChange={(
                      event,
                    ) =>
                      setImageValues(
                        (
                          current,
                        ) => ({
                          ...current,
                          [field]:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    placeholder="https://..."
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              ),
            )}

            <div className="grid grid-cols-4 gap-2">
              {Object.entries(
                imageValues,
              ).map(
                ([
                  key,
                  image,
                ]) => (
                  <div
                    key={
                      key
                    }
                    className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={key}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageIcon
                          size={
                            20
                          }
                        />
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={
                  closeImageModal
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  isRefreshing
                }
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Save Images
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* DRAWER                                                                     */
/* -------------------------------------------------------------------------- */

function ProductDrawer({
  product,
  variants,
  totalInventory,
  loading,
  onClose,
  onStock,
  onDelete,
  onImages,
  onEdit,
  onCharms,
}: {
  product: Product;
  variants: Product[];
  totalInventory: number;
  loading: boolean;
  onClose: () => void;
  onStock: (
    mode: StockMode,
  ) => void;
  onDelete: () => void;
  onImages: () => void;
  onEdit: (product: Product) => void;
  onCharms: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-[#f6f8fb] shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-600">
              Product Details
            </p>

            <h2 className="truncate text-lg font-bold text-slate-900">
              {product.productName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X
              size={17}
            />
          </button>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-32 rounded-2xl bg-slate-200" />
              <div className="h-5 w-2/3 rounded bg-slate-200" />
              <div className="h-20 rounded-xl bg-slate-100" />
              <div className="h-20 rounded-xl bg-slate-100" />
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {/* IMAGES */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                product.image1,
                product.image2,
                product.image3,
                product.image4,
              ].map(
                (
                  image,
                  index,
                ) => (
                  <div
                    key={
                      index
                    }
                    className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={`Image ${
                          index +
                          1
                        }`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageIcon
                          size={
                            20
                          }
                        />
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* ACTIONS */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="rounded-xl border border-blue-200 bg-blue-600 px-3 py-3 text-xs font-bold text-white transition hover:bg-blue-700"
              >
                <Pencil size={15} className="mx-auto mb-1" />
                Edit
              </button>

              <button
                type="button"
                onClick={() =>
                  onStock(
                    "add",
                  )
                }
                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
              >
                <Plus
                  size={15}
                  className="mx-auto mb-1"
                />
                Add Stock
              </button>

              <button
                type="button"
                onClick={onImages}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ImageIcon
                  size={15}
                  className="mx-auto mb-1"
                />
                Images
              </button>

              <button
                type="button"
                onClick={onCharms}
                className="rounded-xl border border-blue-200 bg-white px-3 py-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
              >
                <Sparkles
                  size={15}
                  className="mx-auto mb-1"
                />
                Charms
              </button>

              <button
                type="button"
                onClick={
                  onDelete
                }
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-bold text-red-600 transition hover:bg-red-100"
              >
                <Trash2
                  size={15}
                  className="mx-auto mb-1"
                />
                Delete
              </button>
            </div>

            {/* BASIC */}
            <DetailSection title="Basic Information">
              <div className="grid grid-cols-2 gap-3">
                <DetailItem
                  label="Brand"
                  value={
                    product.brand
                  }
                />

                <DetailItem
                  label="Category"
                  value={
                    product.category
                  }
                />

                <DetailItem
                  label="Type"
                  value={
                    product.type
                  }
                />

                <DetailItem
                  label="Material"
                  value={
                    product.material
                  }
                />

                <DetailItem
                  label="Color"
                  value={
                    product.color
                  }
                />

                <DetailItem
                  label="Theme"
                  value={
                    product.theme
                  }
                />
              </div>
            </DetailSection>

            {/* DESIGN */}
            <DetailSection title="Design">
              <div className="grid grid-cols-2 gap-3">
                <DetailItem
                  label="Design Name"
                  value={
                    product.designName
                  }
                />

                <DetailItem
                  label="Design Code"
                  value={
                    product.designCode
                  }
                />

                <DetailItem
                  label="Design Number"
                  value={
                    product.designNumber
                  }
                />

                <DetailItem
                  label="Group"
                  value={
                    product.groupId
                  }
                />

                <DetailItem
                  label="Print Type"
                  value={
                    product.printType
                  }
                />

                <DetailItem
                  label="Finish"
                  value={
                    product.finish
                  }
                />
              </div>
            </DetailSection>

            {/* PRICE */}
            <DetailSection title="Pricing & Stock">
              <div className="grid grid-cols-2 gap-3">
                <DetailItem
                  label="Price"
                  value={formatCurrency(
                    product.price,
                  )}
                />

                <DetailItem
                  label="MRP"
                  value={formatCurrency(
                    product.mrp,
                  )}
                />

                <DetailItem
                  label="GST"
                  value={`${product.gst || 0}%`}
                />

                <DetailItem
                  label="Current Stock"
                  value={formatNumber(
                    product.inventory,
                  )}
                />

                <DetailItem
                  label="Total Group Stock"
                  value={formatNumber(
                    totalInventory,
                  )}
                />

                <DetailItem
                  label="Status"
                  value={getStockLabel(
                    product.inventory,
                  )}
                />
              </div>
            </DetailSection>

            {/* MODELS */}
            <DetailSection title="Phone Models">
              <div className="space-y-2">
                {product.models?.map(
                  (
                    model,
                    index,
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <p className="text-sm font-semibold">
                        {
                          model.model
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>
            </DetailSection>

            {/* VARIANTS */}
            <DetailSection
              title={`Variants (${variants.length})`}
            >
              <div className="space-y-2">
                {variants.map(
                  (
                    variant,
                  ) => (
                    <div
                      key={
                        variant.id
                      }
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <ProductThumbnail
                        product={
                          variant
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {
                            variant.productName
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          V
                          {variant.variantNumber ||
                            variant.version ||
                            "2"}{" "}
                          ·{" "}
                          {
                            variant.designCode
                          }
                        </p>
                      </div>

                      <StockBadge
                        stock={
                          variant.inventory
                        }
                      />

                      <IconButton
                        title={`Edit variant V${variant.variantNumber ?? variant.version ?? ""}`}
                        onClick={() => onEdit(variant)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={13} />
                      </IconButton>
                    </div>
                  ),
                )}

                {!variants.length && (
                  <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                    No variants.
                  </p>
                )}
              </div>
            </DetailSection>

            {/* DESCRIPTION */}
            <DetailSection title="Description">
              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {product.description ||
                  "No description available."}
              </div>
            </DetailSection>
          </div>
        )}
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTS                                                                 */
/* -------------------------------------------------------------------------- */

function ModelAnalyticsHome({
  models,
  totalModels,
  stats,
  search,
  refreshing,
  error,
  onSearch,
  onBack,
  onRefresh,
  onCreate,
  onSelect,
  onClearError,
}: {
  models: ModelAnalytics[];
  totalModels: number;
  stats: {
    parents: number;
    variants: number;
    records: number;
    totalStock: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
    charmProducts: number;
    totalCharms: number;
  };
  search: string;
  refreshing: boolean;
  error: string | null;
  onSearch: (value: string) => void;
  onBack: () => void;
  onRefresh: () => void;
  onCreate: () => void;
  onSelect: (model: string) => void;
  onClearError: () => void;
}) {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button type="button" onClick={onBack} className="mt-0.5 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <ArrowLeft size={17} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <BarChart3 size={20} className="text-blue-600" />
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Model Analytics</h1>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  Choose a model
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Select a phone model first to open its products, variants and inventory workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onRefresh} disabled={refreshing} className={secondaryButtonClass}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button type="button" onClick={onCreate} className={primaryButtonClass}>
              <Plus size={17} />
              Create Product
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" onClick={onClearError} className="shrink-0 rounded-md p-1 hover:bg-red-100" aria-label="Close error">
            <X size={15} />
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MiniStat label="Phone models" value={totalModels} helper="Available catalogs" icon={<Smartphone size={18} />} />
        <MiniStat label="Parent products" value={stats.parents} helper="Across all models" icon={<Package size={18} />} />
        <MiniStat label="Variants" value={stats.variants} helper={`${formatNumber(stats.records)} total records`} icon={<Layers3 size={18} />} />
        <MiniStat label="Inventory" value={formatNumber(stats.totalStock)} helper="Units across catalog" icon={<Boxes size={18} />} />
        <MiniStat label="Catalog value" value={formatCurrency(stats.totalValue)} helper={`${stats.lowStock + stats.outOfStock} stock alerts`} icon={<CircleDollarSign size={18} />} alert={stats.lowStock + stats.outOfStock > 0} />
        <MiniStat label="Stored charms" value={stats.totalCharms} helper={`${stats.charmProducts} products with charms`} icon={<Sparkles size={18} />} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Model directory</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Choose a phone model</h2>
            <p className="mt-1 text-xs text-slate-500">Every card contains live analytics calculated from its saved records.</p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search iPhone 11, iPhone 12..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            {search && (
              <button type="button" onClick={() => onSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Clear model search">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {models.length ? (
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {models.map((item) => (
              <ModelAnalyticsCard key={item.model} item={item} onClick={() => onSelect(item.model)} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <div className="rounded-2xl bg-slate-100 p-4 text-slate-400"><Smartphone size={28} /></div>
            <h3 className="mt-4 font-bold text-slate-900">{search ? "No matching models" : "No phone models found"}</h3>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              {search ? "Try another model name." : "Create products with a selected phone model and they will appear here automatically."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function getCharmCount(product: Product) {
  return Number(product.charmCount || 0);
}

function getRelatedCharmCount(product: Product) {
  if (product.relatedCharmCount !== undefined) {
    return Number(product.relatedCharmCount || 0);
  }

  return getCharmCount(product) +
    (product.variants ?? []).reduce(
      (total, variant) => total + getCharmCount(variant),
      0,
    );
}

function ModelAnalyticsCard({ item, onClick }: { item: ModelAnalytics; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Smartphone size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-blue-700">{item.model}</h3>
            <p className="mt-1 truncate text-[11px] text-slate-500">{item.categories.join(" · ") || "Uncategorized"}</p>
          </div>
        </div>
        {item.lowStock > 0 && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
            {item.lowStock} alerts
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ModelMetric label="Products" value={formatNumber(item.parents)} />
        <ModelMetric label="Variants" value={formatNumber(item.variants)} />
        <ModelMetric label="Inventory" value={formatNumber(item.inventory)} />
        <ModelMetric label="Charm products" value={formatNumber(item.charmProducts)} />
        <ModelMetric label="Stored charms" value={formatNumber(item.charms)} />
        <ModelMetric label="Value" value={formatCurrency(item.value)} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] font-medium text-slate-400">{item.charmProducts} of {item.records} have charms</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">
          View catalog <ArrowRight size={14} />
        </span>
      </div>
    </button>
  );
}

function ModelMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-800">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  helper,
  icon,
  alert = false,
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
        </div>
        <div className={`rounded-xl p-2.5 ${alert ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
          {icon}
        </div>
      </div>
      <p className={`mt-3 text-[11px] font-medium ${alert ? "text-red-500" : "text-slate-400"}`}>
        {helper}
      </p>
    </div>
  );
}

function getModelNames(product: Product) {
  return [
    ...new Set(
      (product.models ?? [])
        .map((item) => item.model?.trim())
        .filter((model): model is string => Boolean(model)),
    ),
  ];
}

function matchesModel(product: Product, model: string) {
  const target = model.trim().toLowerCase();
  return getModelNames(product).some(
    (item) => item.toLowerCase() === target,
  );
}

function productsForModel(parents: Product[], model: string) {
  return parents.flatMap((parent) => {
    const parentMatches = matchesModel(parent, model);
    const variants = (parent.variants ?? []).filter((variant) => {
      const variantModels = getModelNames(variant);
      return matchesModel(variant, model) || (parentMatches && variantModels.length === 0);
    });

    if (!parentMatches && variants.length === 0) {
      return [];
    }

    return [{ ...parent, variants }];
  });
}

function ProductThumbnail({
  product,
}: {
  product: Product;
}) {
  const image =
    getImage(product);

  return (
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      {image ? (
        <img
          src={image}
          alt={
            product.productName
          }
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-300">
          <Package
            size={16}
          />
        </div>
      )}
    </div>
  );
}

function StockBadge({
  stock,
}: {
  stock: number;
}) {
  const status =
    getStockStatus(stock);

  if (
    status ===
    "out-of-stock"
  ) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600">
        {formatNumber(
          stock,
        )}{" "}
        out
      </span>
    );
  }

  if (
    status ===
    "low-stock"
  ) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
        {formatNumber(
          stock,
        )}{" "}
        low
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
      {formatNumber(
        stock,
      )}{" "}
      in
    </span>
  );
}

function CharmBadge({
  count,
  related = false,
  compact = false,
}: {
  count: number;
  related?: boolean;
  compact?: boolean;
}) {
  if (count <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 font-bold text-slate-500 ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"}`}>
        <Sparkles size={compact ? 9 : 10} />
        No charms
      </span>
    );
  }

  return (
    <span
      title={related ? "Charm records for this parent and its variants" : "Charm records generated from this product"}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-blue-100 font-bold text-blue-700 ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"}`}
    >
      <Sparkles size={compact ? 9 : 10} />
      {formatNumber(count)} {count === 1 ? "charm" : "charms"}
    </span>
  );
}

function getStockLabel(
  stock: number,
) {
  if (stock <= 0) {
    return "Out of stock";
  }

  if (stock <= 20) {
    return "Low stock";
  }

  return "In stock";
}

function MobileInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  danger = false,
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-lg border bg-white transition disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-slate-200 text-slate-500 hover:bg-slate-50",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-slate-900">
        {title}
      </h3>

      {children}
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X
              size={17}
            />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

const secondaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

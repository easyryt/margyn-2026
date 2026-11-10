"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  Database,
  Download,
  Edit3,
  Image as ImageIcon,
  Layers3,
  Package,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Wand2,
  X,
  ZoomIn,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@/components/listing-tool/navigation";

import type { Product as ProductFormProduct } from "@/components/listing-tool/original/components/ProductForm/ProductCard";
import { exportExcel } from "@/components/listing-tool/original/lib/excel";
import ProductTitleNotice from "@/components/listing-tool/original/components/ProductTitleNotice";
import MeeshoImageUpload from "@/components/listing-tool/original/components/MeeshoImageUpload";
import MeeshoImageSetUpload from "@/components/listing-tool/original/components/MeeshoImageSetUpload";
import MeeshoVariantImagesUpload from "@/components/listing-tool/original/components/MeeshoVariantImagesUpload";
import SavedVariantImagesUpload from "@/components/listing-tool/original/components/SavedVariantImagesUpload";
import { savedVariantImageRows, withSavedVariantMainImage } from "@/components/listing-tool/original/lib/saved-variant-images";
import { generateSKU } from "@/components/listing-tool/original/lib/sku";
import { charmVariantNumber, sortCharmsByVersion } from "@/components/listing-tool/original/lib/charm-order";
import {
  DEFAULT_CHARM_WRONG_DEFECTIVE_RETURN_DISCOUNT,
  getCharmPrice,
  getCharmWrongDefectiveReturnDiscount,
  getVariantPrice,
  getWrongDefectiveReturnDiscount,
} from "@/components/listing-tool/original/lib/pricing";

const API_BASE_URL = "/api/tools/listing-tool";

type Product = ProductFormProduct & {
  createdAt?: string;
  updatedAt?: string;
  image?: string;
};

type Charm = Product & {
  sourceProductId?: string;
  sourceKind?: "parent" | "variant";
  sourceVariantNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  image?: string;
};

type CharmDraft = Charm & {
  sourceProductId: string;
  sourceKind: "parent" | "variant";
  draft: true;
};

type EditableRow = Charm | CharmDraft;
type WorkspaceTab = "drafts" | "stored";
type ImagePreviewState = { url: string; label: string };
type AiProvider = "gemini" | "openai";

type EditableField =
  | "productName"
  | "description"
  | "brand"
  | "category"
  | "material"
  | "color"
  | "theme"
  | "type"
  | "price"
  | "wrongDefectiveReturnsPrice"
  | "mrp"
  | "gst"
  | "hsn"
  | "weight"
  | "inventory"
  | "country"
  | "manufacturer"
  | "manufacturerAddress"
  | "manufacturerPincode"
  | "packer"
  | "packerAddress"
  | "packerPincode"
  | "importer"
  | "importerAddress"
  | "importerPincode"
  | "genericName"
  | "size"
  | "quantity"
  | "length"
  | "width"
  | "designName"
  | "designCode"
  | "designNumber"
  | "sku"
  | "styleId"
  | "printType"
  | "finish"
  | "version"
  | "groupId"
  | "image1"
  | "image2"
  | "image3"
  | "image4";

type ImageField = Extract<
  EditableField,
  "image1" | "image2" | "image3" | "image4"
>;

const IMAGE_FIELDS: ImageField[] = ["image1", "image2", "image3", "image4"];

function isImageField(field: EditableField): field is ImageField {
  return IMAGE_FIELDS.includes(field as ImageField);
}

type FieldSpec = {
  key: EditableField;
  label: string;
  number?: boolean;
  multiline?: boolean;
  locked?: boolean;
  placeholder?: string;
};

type FieldGroup = {
  title: string;
  description: string;
  fields: FieldSpec[];
};

type ProductDetailResponse = {
  success: boolean;
  product: Product;
  parent: Product | null;
  variants: Product[];
};

type ProductsResponse = {
  success: boolean;
  products: Product[];
};

type CharmsResponse = {
  success: boolean;
  charms: Charm[];
};

type CharmResponse = {
  success: boolean;
  message: string;
  charm: Charm;
};

type CreateProductResponse = {
  success: boolean;
  message: string;
  product: Product;
};

type AiVariantTitlesResponse = {
  titles?: unknown;
  error?: string;
};

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: "Basic information",
    description: "Customer-facing product details.",
    fields: [
      { key: "productName", label: "Product Name", multiline: true },
      { key: "description", label: "Description", multiline: true },
      { key: "brand", label: "Brand" },
      { key: "category", label: "Category" },
      { key: "material", label: "Material" },
      { key: "color", label: "Color" },
      { key: "theme", label: "Theme" },
      { key: "type", label: "Product Type" },
    ],
  },
  {
    title: "Pricing and inventory",
    description: "Commercial and stock values.",
    fields: [
      { key: "price", label: "Price", number: true },
      {
        key: "wrongDefectiveReturnsPrice",
        label: "Wrong/Defective Return Discount (₹)",
        number: true,
      },
      { key: "mrp", label: "MRP", number: true },
      { key: "gst", label: "GST", number: true },
      { key: "hsn", label: "HSN" },
      { key: "weight", label: "Weight", number: true },
      { key: "inventory", label: "Inventory", number: true },
    ],
  },
  {
    title: "Design and listing",
    description: "The Design Number stays locked to the parent design.",
    fields: [
      { key: "designName", label: "Design Name" },
      { key: "designCode", label: "Design Code" },
      { key: "designNumber", label: "Design Number", locked: true },
      { key: "sku", label: "SKU", multiline: true },
      { key: "styleId", label: "Style ID", locked: true },
      { key: "printType", label: "Print Type" },
      { key: "finish", label: "Finish" },
      { key: "version", label: "Version" },
      { key: "groupId", label: "Group ID" },
    ],
  },
  {
    title: "Package details",
    description: "Physical and catalogue attributes.",
    fields: [
      { key: "country", label: "Country" },
      { key: "genericName", label: "Generic Name" },
      { key: "size", label: "Size" },
      { key: "quantity", label: "Quantity", number: true },
      { key: "length", label: "Length", number: true },
      { key: "width", label: "Width", number: true },
    ],
  },
  {
    title: "Manufacturer",
    description: "Manufacturer, packer and importer information.",
    fields: [
      { key: "manufacturer", label: "Manufacturer" },
      { key: "manufacturerAddress", label: "Manufacturer Address", multiline: true },
      { key: "manufacturerPincode", label: "Manufacturer Pincode" },
      { key: "packer", label: "Packer" },
      { key: "packerAddress", label: "Packer Address", multiline: true },
      { key: "packerPincode", label: "Packer Pincode" },
      { key: "importer", label: "Importer" },
      { key: "importerAddress", label: "Importer Address", multiline: true },
      { key: "importerPincode", label: "Importer Pincode" },
    ],
  },
  {
    title: "Images",
    description: "Edit all four listing image URLs with instant previews.",
    fields: [
      { key: "image1", label: "Image 1 URL", multiline: true, placeholder: "https://..." },
      { key: "image2", label: "Image 2 URL", multiline: true, placeholder: "https://..." },
      { key: "image3", label: "Image 3 URL", multiline: true, placeholder: "https://..." },
      { key: "image4", label: "Image 4 URL", multiline: true, placeholder: "https://..." },
    ],
  },
];

const EDITABLE_FIELDS = FIELD_GROUPS.flatMap((group) =>
  group.fields.map((field) => field.key),
);

const TABLE_FIELDS = FIELD_GROUPS.flatMap((group) => group.fields);

const NUMBER_FIELDS = new Set(
  FIELD_GROUPS.flatMap((group) =>
    group.fields.filter((field) => field.number).map((field) => field.key),
  ),
);

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data && data.message
        ? data.message
        : "Request failed.";
    throw new ApiError(message, response.status);
  }

  return data as T;
}

function alreadyHasCharms(value: string) {
  return /\bwith\s+charms?\b/i.test(String(value || ""));
}

function charmTitle(value: string) {
  const title = String(value || "").trim();
  if (!title || alreadyHasCharms(title)) return title;
  const printIndex = title.toLowerCase().lastIndexOf(" print");
  return printIndex >= 0
    ? `${title.slice(0, printIndex)} With Charms${title.slice(printIndex)}`
    : `${title} With Charms`;
}

function charmDesignName(value: string) {
  const designName = String(value || "").trim();
  return !designName || alreadyHasCharms(designName)
    ? designName
    : `${designName} With Charms`;
}

function charmSku(value: string) {
  const sku = String(value || "").trim().toUpperCase();
  if (!sku) return sku;

  const charmMarker = /\bWITH[\s-]+(?:CHARMS?|CHRMS?)\b/i;
  if (charmMarker.test(sku)) {
    return sku.replace(charmMarker, "WITH CHARMS");
  }

  const versionMatch = sku.match(/-(\d+(?:\.\d+)*\.V\d+)$/i);
  return versionMatch?.index !== undefined
    ? `${sku.slice(0, versionMatch.index)}-WITH CHARMS${sku.slice(versionMatch.index)}`
    : `${sku}-WITH CHARMS`;
}

function createDraft(product: Product): CharmDraft {
  const sku = charmSku(product.sku);
  const sourceKind = product.parentId ? "variant" : "parent";
  const sourceVariantNumber = product.variantNumber;
  const versionNumber = charmVariantNumber({
    ...product,
    sourceKind,
    sourceVariantNumber,
  });

  return {
    ...product,
    id: `draft-${product.id}`,
    productName: charmTitle(product.productName),
    designName: charmDesignName(product.designName),
    sku,
    styleId: sku,
    price: getCharmPrice(versionNumber),
    wrongDefectiveReturnsPrice:
      DEFAULT_CHARM_WRONG_DEFECTIVE_RETURN_DISCOUNT,
    sourceProductId: product.id,
    sourceKind,
    sourceVariantNumber,
    draft: true,
  };
}

function sourceLabel(item: Product | EditableRow) {
  const savedKind = "sourceKind" in item ? item.sourceKind : undefined;
  const kind = savedKind ?? (item.parentId ? "variant" : "parent");
  return kind === "variant"
    ? `Variant V${charmVariantNumber(item) ?? "—"}`
    : "Parent V1";
}

function getImage(item: Product | EditableRow) {
  return item.image || item.image1 || item.image2 || item.image3 || item.image4 || "";
}

function cloneRow<T extends EditableRow>(row: T): T {
  return {
    ...row,
    models: (row.models ?? []).map((model) => ({ ...model })),
  };
}

function updateField<T extends EditableRow>(row: T, field: EditableField, value: string): T {
  if (field === "sku") {
    return {
      ...row,
      sku: value,
      styleId: value,
    } as T;
  }

  return {
    ...row,
    [field]: NUMBER_FIELDS.has(field)
      ? field === "wrongDefectiveReturnsPrice" && value === ""
        ? undefined
        : Number(value || 0)
      : value,
  } as T;
}

function rowPayload(row: EditableRow) {
  const payload: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) payload[field] = row[field];
  payload.wrongDefectiveReturnsPrice =
    getCharmWrongDefectiveReturnDiscount(
      row.wrongDefectiveReturnsPrice,
    );
  payload.styleId = row.sku;
  payload.models = row.models;
  return payload;
}

function highestGroupNumber(rows: Product[]) {
  return rows.reduce((highest, row) => {
    const match = row.groupId.match(/^Group\s+(\d+)$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
}

function createProductVariantPayload({
  parent,
  title,
  variantNumber,
  groupNumber,
}: {
  parent: Product;
  title: string;
  variantNumber: number;
  groupNumber: number;
}) {
  const {
    id,
    parentId: _parentId,
    variantNumber: _previousVariantNumber,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    image: _image,
    ...parentData
  } = parent;
  void _parentId;
  void _previousVariantNumber;
  void _createdAt;
  void _updatedAt;
  void _image;

  const sku = generateSKU({
    brand: parent.brand,
    category: parent.category,
    model: parent.models[0]?.model ?? "",
    color: parent.color,
    printType: parent.printType,
    finish: parent.finish,
    designCode: parent.designCode,
    designNumber: parent.designNumber,
    version: String(variantNumber),
  });

  return {
    ...parentData,
    parentId: id,
    variantNumber,
    variantType: "standard" as const,
    version: String(variantNumber),
    productName: title,
    description: parent.description
      ? `${parent.description}\n\nVariant V${variantNumber}.`
      : `Variant V${variantNumber}.`,
    price: getVariantPrice(parent.price, variantNumber),
    wrongDefectiveReturnsPrice: getWrongDefectiveReturnDiscount(
      parent.wrongDefectiveReturnsPrice,
    ),
    designNumber: parent.designNumber,
    sku,
    styleId: sku,
    groupId: `Group ${String(groupNumber).padStart(2, "0")}`,
    models: parent.models.map((model) => ({ ...model })),
  };
}

export default function CharmManager({
  designNumber,
  productId,
}: {
  designNumber: string;
  productId?: string;
}) {
  const router = useRouter();
  const [rootProduct, setRootProduct] = useState<Product | null>(null);
  const [sourceRows, setSources] = useState<Product[]>([]);
  const [draftRows, setDrafts] = useState<CharmDraft[]>([]);
  const [storedRows, setCharms] = useState<Charm[]>([]);
  const sources = useMemo(() => sortCharmsByVersion(sourceRows), [sourceRows]);
  const drafts = useMemo(() => sortCharmsByVersion(draftRows), [draftRows]);
  const charms = useMemo(() => sortCharmsByVersion(storedRows), [storedRows]);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("stored");
  const [sourceSearch, setSourceSearch] = useState("");
  const [rowSearch, setRowSearch] = useState("");
  const [showAllSources, setShowAllSources] = useState(false);
  const [editor, setEditor] = useState<{ mode: WorkspaceTab; row: EditableRow } | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(null);
  const [tableEdits, setTableEdits] = useState<Record<string, EditableRow>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [additionalVariantCount, setAdditionalVariantCount] = useState("10");
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [creatingAiVariants, setCreatingAiVariants] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError(null);

        let selectedId = productId;
        if (!selectedId) {
          const productsResult = await apiRequest<ProductsResponse>(
            `/products?kind=parent&limit=50&search=${encodeURIComponent(designNumber)}`,
          );
          selectedId = productsResult.products.find(
            (product) => String(product.designNumber) === String(designNumber),
          )?.id;
        }
        if (!selectedId) throw new Error(`No product found for design number ${designNumber}.`);

        const detail = await apiRequest<ProductDetailResponse>(
          `/products/${encodeURIComponent(selectedId)}`,
        );
        const root = detail.parent ?? detail.product;
        const sourceMap = new Map<string, Product>([[root.id, root]]);
        for (const variant of detail.variants ?? []) sourceMap.set(variant.id, variant);

        const charmsResult = await apiRequest<CharmsResponse>(
          `/products/${encodeURIComponent(root.id)}/charms`,
        );
        const loadedCharms = (charmsResult.charms ?? []).map((charm) => {
          const sku = charmSku(charm.sku);
          return {
            ...charm,
            sku,
            styleId: sku,
            wrongDefectiveReturnsPrice:
              getCharmWrongDefectiveReturnDiscount(
                charm.wrongDefectiveReturnsPrice,
              ),
          };
        });

        setRootProduct(root);
        setSources([...sourceMap.values()]);
        setCharms(loadedCharms);
        setTableEdits({});
        setEditor(null);
        setSelectedExportIds(new Set(loadedCharms.map((charm) => charm.id)));
      } catch (loadError) {
        if (loadError instanceof ApiError && loadError.status === 404) {
          setError("The charm API is not running yet. Restart or redeploy listing-backend, then refresh.");
        } else {
          setError(loadError instanceof Error ? loadError.message : "Unable to load charm data.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [designNumber, productId],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  useEffect(() => {
    const savedProvider = window.localStorage.getItem("listing-tool-ai-provider");

    if (savedProvider === "gemini" || savedProvider === "openai") {
      setAiProvider(savedProvider);
    }
  }, []);

  const changeAiProvider = (provider: AiProvider) => {
    setAiProvider(provider);
    window.localStorage.setItem("listing-tool-ai-provider", provider);
  };

  const variants = useMemo(
    () => sources.filter((source) => Boolean(source.parentId)),
    [sources],
  );

  const draftSourceIds = useMemo(
    () => new Set(drafts.map((draft) => draft.sourceProductId)),
    [drafts],
  );

  const storedSourceIds = useMemo(() => {
    const ids = new Set(
      charms.map((charm) => charm.sourceProductId).filter((id): id is string => Boolean(id)),
    );
    for (const source of sources) {
      if (charms.some((charm) => charmSku(charm.sku) === charmSku(source.sku))) ids.add(source.id);
    }
    return ids;
  }, [charms, sources]);

  const filteredSources = useMemo(() => {
    const query = sourceSearch.trim().toLowerCase();
    const result = !query
      ? sources
      : sources.filter((source) =>
          [source.productName, source.designName, source.sku, source.models?.[0]?.model]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        );
    return showAllSources ? result : result.slice(0, 6);
  }, [showAllSources, sourceSearch, sources]);

  const visibleRows = useMemo(() => {
    const rows: EditableRow[] = activeTab === "drafts" ? drafts : charms;
    const query = rowSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.productName, row.designName, row.sku, row.models?.[0]?.model, sourceLabel(row)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [activeTab, charms, drafts, rowSearch]);

  const selectedExportCharms = useMemo(
    () => charms.filter((charm) => selectedExportIds.has(charm.id)),
    [charms, selectedExportIds],
  );

  const allCharmsSelected =
    charms.length > 0 && charms.every((charm) => selectedExportIds.has(charm.id));

  const clearTableEdit = (id: string) => {
    setTableEdits((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const updateTableField = (
    row: EditableRow,
    field: EditableField,
    value: string,
  ) => {
    setTableEdits((current) => {
      const workingRow = cloneRow(current[row.id] ?? row);
      return {
        ...current,
        [row.id]: updateField(workingRow, field, value),
      };
    });
  };

  const updateTableModels = (row: EditableRow, value: string) => {
    const models = value
      .split(/\r?\n/)
      .map((model) => model.trim())
      .filter(Boolean)
      .map((model) => ({ model }));

    setTableEdits((current) => ({
      ...current,
      [row.id]: {
        ...cloneRow(current[row.id] ?? row),
        models,
      },
    }));
  };

  const applyTableDraft = (row: EditableRow) => {
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === row.id ? (cloneRow(row) as CharmDraft) : draft,
      ),
    );
    clearTableEdit(row.id);
    setMessage("Draft changes applied.");
  };

  const generateOne = (source: Product) => {
    if (draftSourceIds.has(source.id) || storedSourceIds.has(source.id)) return;
    setDrafts((current) => [...current, createDraft(source)]);
    setActiveTab("drafts");
    setMessage(`Editable charm draft generated from ${sourceLabel(source)}.`);
  };

  const generateAll = () => {
    const missing = sources.filter(
      (source) => !draftSourceIds.has(source.id) && !storedSourceIds.has(source.id),
    );
    if (!missing.length) {
      setMessage("Every source already has a draft or stored charm.");
      return;
    }
    setDrafts((current) => [...current, ...missing.map(createDraft)]);
    setActiveTab("drafts");
    setMessage(`${missing.length} charm draft${missing.length === 1 ? "" : "s"} generated.`);
  };

  const requestAiVariantTitles = async (
    count: number,
    usedTitles: string[],
  ) => {
    if (!rootProduct) {
      throw new Error("The parent product has not loaded yet.");
    }

    const model = rootProduct.models[0]?.model?.trim();
    if (!model) {
      throw new Error("The parent product must have a phone model before creating charm variants.");
    }

    const response = await fetch("/api/tools/listing-tool/ai/variant-titles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentTitle: rootProduct.productName,
        category: rootProduct.category,
        model,
        theme: rootProduct.theme,
        productType: rootProduct.type,
        count,
        provider: aiProvider,
        usedTitles,
        forCharm: true,
      }),
    });
    const result = (await response.json()) as AiVariantTitlesResponse;

    if (!response.ok || !Array.isArray(result.titles)) {
      throw new Error(result.error || "Unable to generate AI titles for charm variants.");
    }

    return result.titles
      .map((title) => String(title || "").trim())
      .filter(Boolean);
  };

  const createAiCharmVariants = async () => {
    const count = Number(additionalVariantCount);

    if (!Number.isInteger(count) || count < 1 || count > 50) {
      setError("Enter between 1 and 50 additional charm variants.");
      return;
    }

    if (!rootProduct) {
      setError("The parent product has not loaded yet.");
      return;
    }

    try {
      setCreatingAiVariants(true);
      setError(null);
      setMessage(null);

      const titles: string[] = [];
      const usedTitleMap = new Map(
        sources
          .map((source) => source.productName.trim())
          .filter(Boolean)
          .map((title) => [title.toLowerCase(), title]),
      );

      while (titles.length < count) {
        const batchCount = Math.min(10, count - titles.length);
        let batchTitles: string[] = [];

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const generatedTitles = await requestAiVariantTitles(
            batchCount,
            [...usedTitleMap.values()],
          );
          const uniqueTitles = generatedTitles.filter((title) => {
            const key = title.toLowerCase();
            if (usedTitleMap.has(key)) return false;
            usedTitleMap.set(key, title);
            return true;
          });

          if (uniqueTitles.length === batchCount) {
            batchTitles = uniqueTitles;
            break;
          }

          uniqueTitles.forEach((title) => usedTitleMap.delete(title.toLowerCase()));
        }

        if (batchTitles.length !== batchCount) {
          throw new Error("AI could not generate enough unique charm variant titles. Please try again.");
        }

        titles.push(...batchTitles);
      }

      const firstVariantNumber =
        Math.max(
          1,
          ...sources.map((source) => Number(source.variantNumber) || 1),
        ) + 1;
      let nextGroupNumber = highestGroupNumber(sources);
      let charmsCreated = 0;
      const failures: string[] = [];

      for (const [index, title] of titles.entries()) {
        const variantNumber = firstVariantNumber + index;
        nextGroupNumber += 1;

        try {
          const variantResult = await apiRequest<CreateProductResponse>(
            "/products",
            {
              method: "POST",
              body: JSON.stringify(
                createProductVariantPayload({
                  parent: rootProduct,
                  title,
                  variantNumber,
                  groupNumber: nextGroupNumber,
                }),
              ),
            },
          );

          await apiRequest<CharmResponse>(
            `/products/${encodeURIComponent(variantResult.product.id)}/with-charm`,
            { method: "POST", body: JSON.stringify({}) },
          );
          charmsCreated += 1;
        } catch (creationError) {
          failures.push(
            `V${variantNumber}: ${
              creationError instanceof Error
                ? creationError.message
                : "Unable to create this charm variant."
            }`,
          );
        }
      }

      await load(true);
      setActiveTab("stored");

      if (failures.length) {
        setError(
          `${charmsCreated} charm variant${charmsCreated === 1 ? "" : "s"} created; ${failures.length} failed. ${failures[0]}`,
        );
      } else {
        setMessage(
          `${charmsCreated} AI-named charm variant${charmsCreated === 1 ? "" : "s"} created and stored.`,
        );
      }
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Unable to create AI charm variants.",
      );
    } finally {
      setCreatingAiVariants(false);
    }
  };

  const storeDraftRequest = (draft: CharmDraft) =>
    apiRequest<CharmResponse>(
      `/products/${encodeURIComponent(draft.sourceProductId)}/with-charm`,
      { method: "POST", body: JSON.stringify(rowPayload(draft)) },
    );

  const storeDraft = async (draft: CharmDraft) => {
    try {
      setSavingIds((current) => new Set(current).add(draft.id));
      setError(null);
      const result = await storeDraftRequest(draft);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      setCharms((current) => [result.charm, ...current]);
      clearTableEdit(draft.id);
      setSelectedExportIds((current) => new Set(current).add(result.charm.id));
      setEditor(null);
      setMessage(`${sourceLabel(draft)} charm stored separately.`);
    } catch (storeError) {
      setError(storeError instanceof Error ? storeError.message : "Unable to store charm.");
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(draft.id);
        return next;
      });
    }
  };

  const storeAllDrafts = async () => {
    if (!drafts.length) return;
    try {
      setBulkSaving(true);
      setError(null);
      const snapshot = drafts.map(
        (draft) => (tableEdits[draft.id] ?? draft) as CharmDraft,
      );
      const results = await Promise.allSettled(snapshot.map(storeDraftRequest));
      const stored: Charm[] = [];
      const failedIds = new Set<string>();
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") stored.push(result.value.charm);
        else {
          failedIds.add(snapshot[index].id);
          errors.push(result.reason instanceof Error ? result.reason.message : "A charm failed.");
        }
      });

      setCharms((current) => [...stored, ...current]);
      setDrafts((current) => current.filter((draft) => failedIds.has(draft.id)));
      setTableEdits((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([id]) =>
              !snapshot.some((draft) => draft.id === id) || failedIds.has(id),
          ),
        ),
      );
      setSelectedExportIds((current) => {
        const next = new Set(current);
        stored.forEach((charm) => next.add(charm.id));
        return next;
      });

      if (errors.length) setError(`${stored.length} stored, ${errors.length} failed. ${errors[0]}`);
      else {
        setActiveTab("stored");
        setMessage(`${stored.length} charm${stored.length === 1 ? "" : "s"} stored.`);
      }
    } finally {
      setBulkSaving(false);
    }
  };

  const saveStoredCharm = async (charm: Charm) => {
    if (!rootProduct) return;
    try {
      setSavingIds((current) => new Set(current).add(charm.id));
      setError(null);
      const result = await apiRequest<CharmResponse>(
        `/products/${encodeURIComponent(rootProduct.id)}/charms/${encodeURIComponent(charm.id)}`,
        { method: "PATCH", body: JSON.stringify(rowPayload(charm)) },
      );
      setCharms((current) =>
        current.map((item) => (item.id === charm.id ? result.charm : item)),
      );
      clearTableEdit(charm.id);
      setEditor(null);
      setMessage("Charm changes saved. The source product was not changed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update charm.");
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(charm.id);
        return next;
      });
    }
  };

  const deleteCharm = async (charm: Charm) => {
    if (!rootProduct || !window.confirm(`Delete charm “${charm.productName}”?`)) return;
    try {
      setDeletingId(charm.id);
      await apiRequest(
        `/products/${encodeURIComponent(rootProduct.id)}/charms/${encodeURIComponent(charm.id)}`,
        { method: "DELETE" },
      );
      setCharms((current) => current.filter((item) => item.id !== charm.id));
      clearTableEdit(charm.id);
      setSelectedExportIds((current) => {
        const next = new Set(current);
        next.delete(charm.id);
        return next;
      });
      setMessage("Charm deleted. The source product was not changed.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete charm.");
    } finally {
      setDeletingId(null);
    }
  };

  const exportCharms = async (rows: Charm[]) => {
    if (!rows.length) {
      setError("Select at least one stored charm to export.");
      return;
    }
    try {
      setIsExporting(true);
      await exportExcel(rows, {
        preserveProductSku: true,
        fileName: `meesho-charms-design-${designNumber}.xlsx`,
      });
      setMessage(`${rows.length} charm${rows.length === 1 ? "" : "s"} exported.`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export charms.");
    } finally {
      setIsExporting(false);
    }
  };

  const updateEditorField = (field: EditableField, value: string) => {
    setEditor((current) =>
      current ? { ...current, row: updateField(current.row, field, value) } : current,
    );
  };

  const updateEditorModels = (value: string) => {
    const models = value
      .split(",")
      .map((model) => model.trim())
      .filter(Boolean)
      .map((model) => ({ model }));
    setEditor((current) =>
      current ? { ...current, row: { ...current.row, models } } : current,
    );
  };

  const applyImageToAll = (
    mode: WorkspaceTab,
    sourceRow: EditableRow,
    field: ImageField,
    value: string,
  ) => {
    const imageUrl = value.trim();
    if (!imageUrl) {
      setError(`Paste an ${FIELD_GROUPS.at(-1)?.fields.find((item) => item.key === field)?.label ?? "image URL"} before applying it.`);
      return;
    }

    const targetRows: EditableRow[] = mode === "drafts" ? drafts : charms;
    if (!targetRows.length) return;

    setTableEdits((current) => {
      const next = { ...current };

      for (const row of targetRows) {
        const baseRow =
          row.id === sourceRow.id
            ? sourceRow
            : current[row.id] ?? row;
        next[row.id] = updateField(cloneRow(baseRow), field, imageUrl);
      }

      return next;
    });

    setEditor((current) =>
      current && current.mode === mode && current.row.id === sourceRow.id
        ? { ...current, row: updateField(current.row, field, imageUrl) }
        : current,
    );
    setError(null);
    setMessage(
      `${FIELD_GROUPS.at(-1)?.fields.find((item) => item.key === field)?.label ?? "Image URL"} applied to all ${targetRows.length} ${mode === "drafts" ? "draft variants" : "stored variants"}. Review and save the changed rows.`,
    );
  };

  const applyDraftChanges = () => {
    if (!editor || editor.mode !== "drafts") return;
    setDrafts((current) =>
      current.map((draft) => (draft.id === editor.row.id ? (editor.row as CharmDraft) : draft)),
    );
    clearTableEdit(editor.row.id);
    setEditor(null);
    setMessage("Draft changes applied.");
  };

  if (loading) return <LoadingPage />;

  return (
    <main className="min-h-screen bg-[#f6f8fb]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="mt-0.5 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Back</span>
              </button>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Wand2 size={19} className="text-blue-600" />
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Charm Manager
                  </h1>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    Design {designNumber}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {rootProduct?.designName || "Create and manage charms from product data."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/charms/batch")}
                className={secondaryButtonClass}
              >
                <Layers3 size={15} />
                Charm Batch
              </button>
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={refreshing}
                className={secondaryButtonClass}
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={generateAll}
                disabled={!sources.length}
                className={primaryButtonClass}
              >
                <Wand2 size={16} />
                Generate All Missing
              </button>
            </div>
          </div>
        </header>

        {error && <Notice tone="error" message={error} onClose={() => setError(null)} />}
        {message && <Notice tone="success" message={message} onClose={() => setMessage(null)} />}
        <ProductTitleNotice titles={[...drafts, ...charms].map((charm) => charm.productName)} />

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Parent product" value={rootProduct ? "1" : "0"} helper="Original listing" icon={<Package size={20} />} />
          <Stat label="Product variants" value={String(variants.length)} helper="Available sources" icon={<Layers3 size={20} />} />
          <Stat label="Charm drafts" value={String(drafts.length)} helper="Ready for review" icon={<Wand2 size={20} />} />
          <Stat label="Stored charms" value={String(charms.length)} helper="Saved separately" icon={<Database size={20} />} />
        </section>

        <section className="mb-6 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                  <Wand2 size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Add AI charm variants</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    AI writes unique titles, then the app creates the next numbered variants and stores their charms automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[150px_160px_auto] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">How many more?</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={additionalVariantCount}
                  onChange={(event) => setAdditionalVariantCount(event.target.value)}
                  disabled={creatingAiVariants}
                  aria-label="Number of additional charm variants"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">AI provider</span>
                <select
                  value={aiProvider}
                  onChange={(event) => changeAiProvider(event.target.value as AiProvider)}
                  disabled={creatingAiVariants}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => void createAiCharmVariants()}
                disabled={creatingAiVariants || !rootProduct}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {creatingAiVariants ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {creatingAiVariants ? "Creating..." : "Generate & create"}
              </button>
            </div>
          </div>
          <p className="border-t border-violet-100 bg-violet-50/50 px-5 py-3 text-[11px] leading-5 text-violet-800">
            You can add up to 50 at once. A request for 30 is generated in three AI batches, avoiding duplicate titles.
          </p>
        </section>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              step="Step 1"
              title="Choose a source product"
              text="Create a charm from the parent product or any individual variant."
            />
            <SearchBox value={sourceSearch} onChange={setSourceSearch} placeholder="Search source options..." />
          </div>
          {filteredSources.length ? (
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredSources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  drafted={draftSourceIds.has(source.id)}
                  stored={storedSourceIds.has(source.id)}
                  onGenerate={() => generateOne(source)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search size={25} />}
              title="No source products found"
              text="Try a different product name, SKU, model or design search."
            />
          )}
          {sources.length > 6 && (
            <div className="border-t border-slate-100 p-3 text-center">
              <button
                type="button"
                onClick={() => setShowAllSources((current) => !current)}
                className="text-xs font-bold text-blue-600 transition hover:text-blue-800"
              >
                {showAllSources ? "Show fewer options" : `Show all ${sources.length} options`}
              </button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <SectionTitle
                step="Step 2"
                title="Review and manage charm data"
                text="Edit every field, save drafts separately and export stored charms."
              />
              <div className="flex flex-wrap items-center gap-2">
                <SearchBox value={rowSearch} onChange={setRowSearch} placeholder="Search rows..." />
                {activeTab === "drafts" && drafts.length > 0 && <button type="button" onClick={() => void storeAllDrafts()} disabled={bulkSaving} className={successButtonClass}>{bulkSaving ? <RefreshCw size={15} className="animate-spin" /> : <Database size={15} />}Store All Drafts</button>}
                {activeTab === "stored" && charms.length > 0 && <><button type="button" onClick={() => setSelectedExportIds(allCharmsSelected ? new Set() : new Set(charms.map((charm) => charm.id)))} className={secondaryButtonClass}>{allCharmsSelected ? "Clear Selection" : "Select All"}</button><button type="button" onClick={() => void exportCharms(selectedExportCharms)} disabled={isExporting || !selectedExportCharms.length} className={successButtonClass}>{isExporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}Export ({selectedExportCharms.length})</button></>}
              </div>
            </div>
            <div className="mt-5 inline-flex rounded-xl bg-slate-100 p-1">
              <TabButton active={activeTab === "drafts"} onClick={() => setActiveTab("drafts")} label="Drafts" count={drafts.length} />
              <TabButton active={activeTab === "stored"} onClick={() => setActiveTab("stored")} label="Stored Charms" count={charms.length} />
            </div>
          </div>

          {rootProduct && <div className="px-5">
            <div hidden={activeTab !== "stored"}>
              <SavedVariantImagesUpload
                key={`${rootProduct.id}:stored-charms`}
                productId={`${rootProduct.id}:stored-charms`}
                variants={savedVariantImageRows(charms.map(row => tableEdits[row.id] ?? row), "charm")}
                disabled={refreshing || bulkSaving || savingIds.size > 0 || !!deletingId}
                onSave={async (rowId, payload) => {
                  if (!charms.some(row => row.id === rowId)) throw new Error("This charm is no longer available.");
                  const result = await apiRequest<CharmResponse>(
                    `/products/${encodeURIComponent(rootProduct.id)}/charms/${encodeURIComponent(rowId)}`,
                    { method: "PATCH", body: JSON.stringify(payload) },
                  );
                  if (result.charm?.id !== rowId || result.charm.image1 !== payload.image1) throw new Error("The database did not confirm this charm's main image. Retry saving its link.");
                  setCharms(current => current.map(row => row.id === rowId ? withSavedVariantMainImage(row, result.charm.image1) : row));
                  setTableEdits(current => current[rowId] ? { ...current, [rowId]: withSavedVariantMainImage(current[rowId], result.charm.image1) } : current);
                }}
              />
            </div>
            <div hidden={activeTab !== "drafts"}>
              <MeeshoVariantImagesUpload
                key={`${rootProduct.id}:draft-charms`}
                productId={`${rootProduct.id}:draft-charms`}
                variants={savedVariantImageRows(drafts.map(row => tableEdits[row.id] ?? row), "charm")}
                disabled={refreshing || bulkSaving || savingIds.size > 0}
                saveHint="Review the updated draft rows below, then use Apply to Draft or Store in Database."
                onChange={(rowId, url) => {
                  const row = drafts.find(value => value.id === rowId);
                  if (row) setTableEdits(current => ({ ...current, [rowId]: withSavedVariantMainImage(cloneRow(current[rowId] ?? row), url) }));
                }}
              />
            </div>
          </div>}

          {visibleRows.length ? (
            <CharmTable
              rows={visibleRows}
              mode={activeTab}
              selectedIds={selectedExportIds}
              savingIds={savingIds}
              deletingId={deletingId}
              edits={tableEdits}
              applyImageSourceId={
                (activeTab === "drafts" ? drafts : charms)[0]?.id
              }
              onToggleSelect={(id) => setSelectedExportIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
              onFieldChange={updateTableField}
              onModelsChange={updateTableModels}
              onPreviewImage={(url, label) => setImagePreview({ url, label })}
              onApplyImageToAll={(row, field, value) =>
                applyImageToAll(activeTab, row, field, value)
              }
              onReset={clearTableEdit}
              onApplyDraft={applyTableDraft}
              onSaveStored={(row) => void saveStoredCharm(row as Charm)}
              onEdit={(row) => setEditor({ mode: activeTab, row: cloneRow(tableEdits[row.id] ?? row) })}
              onStore={(row) => void storeDraft(row as CharmDraft)}
              onDelete={(row) => {
                if (activeTab === "drafts") {
                  setDrafts((current) => current.filter((draft) => draft.id !== row.id));
                  clearTableEdit(row.id);
                } else {
                  void deleteCharm(row as Charm);
                }
              }}
            />
          ) : (
            <EmptyState
              icon={activeTab === "drafts" ? <Wand2 size={28} /> : <Database size={28} />}
              title={rowSearch ? "No matching rows" : activeTab === "drafts" ? "No charm drafts" : "No stored charms"}
              text={rowSearch ? "Try another search." : activeTab === "drafts" ? "Generate a charm from a source option above." : "Store a draft to see it here."}
            />
          )}
        </section>
      </div>

      {editor && (
        <EditDrawer
          editor={editor}
          saving={savingIds.has(editor.row.id)}
          showApplyImageToAll={
            editor.row.id ===
            (editor.mode === "drafts" ? drafts : charms)[0]?.id
          }
          onClose={() => setEditor(null)}
          onFieldChange={updateEditorField}
          onModelsChange={updateEditorModels}
          onPreviewImage={(url, label) => setImagePreview({ url, label })}
          onApplyImageToAll={(field, value) =>
            applyImageToAll(editor.mode, editor.row, field, value)
          }
          onApplyDraft={applyDraftChanges}
          onStoreDraft={() => void storeDraft(editor.row as CharmDraft)}
          onSaveStored={() => void saveStoredCharm(editor.row as Charm)}
        />
      )}

      {imagePreview && (
        <ImagePreviewModal
          preview={imagePreview}
          onClose={() => setImagePreview(null)}
        />
      )}
    </main>
  );
}

function SourceCard({ source, drafted, stored, onGenerate }: { source: Product; drafted: boolean; stored: boolean; onGenerate: () => void }) {
  const image = getImage(source);
  return (
    <article className="group flex gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-blue-200 hover:shadow-sm">
      <Thumbnail image={image} alt={source.productName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <SourceBadge item={source} />
          <span className="text-[10px] font-semibold text-slate-400">#{source.designNumber}</span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
          {source.productName}
        </h3>
        <p className="mt-1 truncate text-xs text-slate-500">
          {source.models?.map((model) => model.model).join(", ") || "No models"}
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={drafted || stored}
          className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          {stored ? <Check size={13} /> : <Wand2 size={13} />}
          {stored ? "Charm stored" : drafted ? "Draft ready" : "Generate charm"}
        </button>
      </div>
    </article>
  );
}

function CharmTable({
  rows,
  mode,
  selectedIds,
  savingIds,
  deletingId,
  edits,
  applyImageSourceId,
  onToggleSelect,
  onFieldChange,
  onModelsChange,
  onPreviewImage,
  onApplyImageToAll,
  onReset,
  onApplyDraft,
  onSaveStored,
  onEdit,
  onStore,
  onDelete,
}: {
  rows: EditableRow[];
  mode: WorkspaceTab;
  selectedIds: Set<string>;
  savingIds: Set<string>;
  deletingId: string | null;
  edits: Record<string, EditableRow>;
  applyImageSourceId?: string;
  onToggleSelect: (id: string) => void;
  onFieldChange: (row: EditableRow, field: EditableField, value: string) => void;
  onModelsChange: (row: EditableRow, value: string) => void;
  onPreviewImage: (url: string, label: string) => void;
  onApplyImageToAll: (
    row: EditableRow,
    field: ImageField,
    value: string,
  ) => void;
  onReset: (id: string) => void;
  onApplyDraft: (row: EditableRow) => void;
  onSaveStored: (row: EditableRow) => void;
  onEdit: (row: EditableRow) => void;
  onStore: (row: EditableRow) => void;
  onDelete: (row: EditableRow) => void;
}) {
  const productNameField = TABLE_FIELDS.find(
    (field) => field.key === "productName",
  ) as FieldSpec;
  const remainingFields = TABLE_FIELDS.filter(
    (field) => field.key !== "productName",
  );
  const sourceLeft = mode === "stored" ? "left-[52px]" : "left-0";
  const productLeft = mode === "stored" ? "left-[172px]" : "left-[120px]";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-blue-50/60 px-4 py-3">
        <p className="text-xs font-semibold text-slate-700">
          Edit directly in the table, then save each changed row. Scroll horizontally for every field.
        </p>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 shadow-sm">
          {rows.length} visible · {TABLE_FIELDS.length + 1} editable columns
        </span>
      </div>

      <div className="relative max-h-[72vh] overflow-auto">
        <table className="w-max min-w-full border-collapse text-left">
          <thead className="sticky top-0 z-50 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-[0_1px_0_#e2e8f0]">
            <tr>
              {mode === "stored" && (
                <TableHead className="sticky left-0 z-[70] w-[52px] min-w-[52px] bg-slate-100 text-center">
                  Export
                </TableHead>
              )}
              <TableHead className={`sticky ${sourceLeft} z-[70] w-[120px] min-w-[120px] bg-slate-100`}>
                Source
              </TableHead>
              <TableHead className={`sticky ${productLeft} z-[70] w-[300px] min-w-[300px] bg-slate-100 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.45)]`}>
                Product Name
              </TableHead>
              <TableHead className="w-[230px] min-w-[230px]">Models</TableHead>
              {remainingFields.map((field) => (
                <TableHead key={field.key} className={tableFieldWidth(field)}>
                  {field.label}
                  {field.locked && (
                    <span className="ml-1 text-[8px] font-semibold normal-case text-slate-400">
                      locked
                    </span>
                  )}
                </TableHead>
              ))}
              <TableHead className="sticky right-0 z-[70] w-[190px] min-w-[190px] bg-slate-100 text-right shadow-[-4px_0_8px_-6px_rgba(15,23,42,0.45)]">
                Actions
              </TableHead>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => {
              const workingRow = edits[row.id] ?? row;
              const dirty = Boolean(edits[row.id]);
              const saving = savingIds.has(row.id);
              const deleting = deletingId === row.id;

              return (
                <tr key={row.id} className="group bg-white align-top hover:bg-blue-50/20">
                  {mode === "stored" && (
                    <td className="sticky left-0 z-30 w-[52px] min-w-[52px] border-r border-slate-200 bg-white px-3 py-3 text-center group-hover:bg-[#fafdff]">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => onToggleSelect(row.id)}
                        aria-label={`Select ${workingRow.productName} for export`}
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </td>
                  )}

                  <td className={`sticky ${sourceLeft} z-30 w-[120px] min-w-[120px] border-r border-slate-200 bg-white px-3 py-3 group-hover:bg-[#fafdff]`}>
                    <SourceBadge item={workingRow} />
                    <div className="mt-2">
                      <StatusBadge mode={mode} />
                    </div>
                  </td>

                  <EditableTableCell
                    field={productNameField}
                    row={workingRow}
                    onChange={(value) => onFieldChange(row, productNameField.key, value)}
                    onPreviewImage={onPreviewImage}
                    onApplyImageToAll={(field, value) =>
                      onApplyImageToAll(row, field, value)
                    }
                    showApplyImageToAll={false}
                    className={`sticky ${productLeft} z-30 bg-white shadow-[4px_0_8px_-6px_rgba(15,23,42,0.45)] group-hover:bg-[#fafdff]`}
                  />

                  <td className="w-[230px] min-w-[230px] border-r border-slate-200 p-2">
                    <textarea
                      rows={3}
                      value={workingRow.models?.map((model) => model.model).join("\n") ?? ""}
                      onChange={(event) => onModelsChange(row, event.target.value)}
                      aria-label={`Models for ${workingRow.productName}`}
                      placeholder="One phone model per line"
                      className={tableTextareaClass}
                    />
                  </td>

                  {remainingFields.map((field) => (
                    <EditableTableCell
                      key={field.key}
                      field={field}
                      row={workingRow}
                      onChange={(value) => onFieldChange(row, field.key, value)}
                      onPreviewImage={onPreviewImage}
                      onApplyImageToAll={(imageField, value) =>
                        onApplyImageToAll(workingRow, imageField, value)
                      }
                      showApplyImageToAll={row.id === applyImageSourceId}
                    />
                  ))}

                  <td className="sticky right-0 z-30 w-[190px] min-w-[190px] border-l border-slate-200 bg-white p-3 group-hover:bg-[#fafdff]">
                    <div className="mb-2 flex items-center justify-end gap-1.5">
                      {dirty ? (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                          Unsaved
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                          Up to date
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <IconButton
                        title="Open comfortable full editor"
                        onClick={() => onEdit(workingRow)}
                        disabled={saving || deleting}
                      >
                        <Edit3 size={14} />
                      </IconButton>
                      <IconButton
                        title="Reset unsaved row changes"
                        onClick={() => onReset(row.id)}
                        disabled={!dirty || saving || deleting}
                      >
                        <RotateCcw size={14} />
                      </IconButton>
                      {mode === "drafts" ? (
                        <>
                          <IconButton
                            title="Apply row changes to draft"
                            onClick={() => onApplyDraft(workingRow)}
                            disabled={!dirty || saving || deleting}
                            success
                          >
                            <Save size={14} />
                          </IconButton>
                          <IconButton
                            title="Store charm in database"
                            onClick={() => onStore(workingRow)}
                            disabled={saving || deleting}
                            success
                          >
                            {saving ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Database size={14} />
                            )}
                          </IconButton>
                        </>
                      ) : (
                        <IconButton
                          title="Save row changes to database"
                          onClick={() => onSaveStored(workingRow)}
                          disabled={!dirty || saving || deleting}
                          success
                        >
                          {saving ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                        </IconButton>
                      )}
                      <IconButton
                        title={mode === "drafts" ? "Remove draft" : "Delete charm"}
                        onClick={() => onDelete(workingRow)}
                        disabled={saving || deleting}
                        danger
                      >
                        {deleting ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHead({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={`border-r border-slate-200 px-3 py-3 ${className}`}>
      {children}
    </th>
  );
}

function tableFieldWidth(field: FieldSpec) {
  if (field.number) return "w-[125px] min-w-[125px]";
  if (field.key === "description") return "w-[330px] min-w-[330px]";
  if (field.multiline || field.key.startsWith("image")) {
    return "w-[290px] min-w-[290px]";
  }
  if (field.key === "sku") return "w-[340px] min-w-[340px]";
  return "w-[180px] min-w-[180px]";
}

function EditableTableCell({
  field,
  row,
  onChange,
  onPreviewImage,
  onApplyImageToAll,
  showApplyImageToAll,
  className = "",
}: {
  field: FieldSpec;
  row: EditableRow;
  onChange: (value: string) => void;
  onPreviewImage: (url: string, label: string) => void;
  onApplyImageToAll: (field: ImageField, value: string) => void;
  showApplyImageToAll: boolean;
  className?: string;
}) {
  const value = String(row[field.key] ?? "");
  const imageField = isImageField(field.key) ? field.key : null;
  const isImage = imageField !== null;
  const useTextarea = Boolean(field.multiline);

  return (
    <td className={`border-r border-slate-200 p-2 ${tableFieldWidth(field)} ${className}`}>
      {isImage && value && (
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPreviewImage(value, field.label)}
            aria-label={`Open ${field.label} preview`}
            className="group/preview relative h-10 w-10 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:border-blue-400 hover:ring-2 hover:ring-blue-100"
          >
            <img src={value} alt="Charm preview" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover/preview:bg-slate-950/35 group-hover/preview:opacity-100">
              <ZoomIn size={14} />
            </span>
          </button>
          <span className="truncate text-[10px] font-semibold text-slate-400">
            Click to preview
          </span>
        </div>
      )}
      {useTextarea ? (
        <textarea
          rows={field.key === "description" ? 4 : 3}
          value={value}
          readOnly={field.locked}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${field.label} for ${row.productName}`}
          placeholder={field.placeholder}
          className={`${tableTextareaClass} ${field.locked ? tableLockedClass : ""}`}
        />
      ) : (
        <input
          type={field.number ? "number" : "text"}
          min={field.number ? 0 : undefined}
          step={field.number ? "any" : undefined}
          value={value}
          readOnly={field.locked}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${field.label} for ${row.productName}`}
          placeholder={field.placeholder}
          className={`${tableInputClass} ${field.locked ? tableLockedClass : ""}`}
        />
      )}
      {imageField && <MeeshoImageUpload target={{ rowId: row.id, field: imageField }} value={value} onChange={onChange} disabled={field.locked} />}
      {isImage && showApplyImageToAll && (
        <button
          type="button"
          onClick={() => onApplyImageToAll(imageField, value)}
          disabled={!value.trim()}
          className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 text-[10px] font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <Copy size={12} />
          Apply to all variants
        </button>
      )}
    </td>
  );
}

function EditDrawer({
  editor,
  saving,
  showApplyImageToAll,
  onClose,
  onFieldChange,
  onModelsChange,
  onPreviewImage,
  onApplyImageToAll,
  onApplyDraft,
  onStoreDraft,
  onSaveStored,
}: {
  editor: { mode: WorkspaceTab; row: EditableRow };
  saving: boolean;
  showApplyImageToAll: boolean;
  onClose: () => void;
  onFieldChange: (field: EditableField, value: string) => void;
  onModelsChange: (value: string) => void;
  onPreviewImage: (url: string, label: string) => void;
  onApplyImageToAll: (field: ImageField, value: string) => void;
  onApplyDraft: () => void;
  onStoreDraft: () => void;
  onSaveStored: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80]">
      <button type="button" onClick={onClose} aria-label="Close editor" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-[#f6f8fb] shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <SourceBadge item={editor.row} />
              <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${editor.mode === "drafts" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                {editor.mode === "drafts" ? "Draft" : "Stored"}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">Edit charm details</h2>
            <p className="mt-1 text-xs text-slate-500">Update listing information without changing the source product.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close editor" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
            <X size={17} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h3 className="text-sm font-bold text-slate-900">Phone models</h3>
              <p className="mt-1 text-[11px] text-slate-500">Separate multiple models with commas.</p>
            </div>
            <textarea rows={2} value={editor.row.models?.map((model) => model.model).join(", ") || ""} onChange={(event) => onModelsChange(event.target.value)} className={textareaClass} placeholder="iPhone 13, iPhone 14" />
          </section>
          {FIELD_GROUPS.map((group) => (
            <EditorGroup
              key={group.title}
              group={group}
              row={editor.row}
              onChange={onFieldChange}
              onPreviewImage={onPreviewImage}
              onApplyImageToAll={onApplyImageToAll}
              showApplyImageToAll={showApplyImageToAll}
            />
          ))}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white p-4 sm:px-6">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
          {editor.mode === "drafts" ? (
            <>
              <button type="button" onClick={onApplyDraft} className={secondaryButtonClass}>Apply to Draft</button>
              <button type="button" onClick={onStoreDraft} disabled={saving} className={successButtonClass}>
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Database size={15} />}
                Store in Database
              </button>
            </>
          ) : (
            <button type="button" onClick={onSaveStored} disabled={saving} className={primaryButtonClass}>
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Edit3 size={15} />}
              Save Changes
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function EditorGroup({
  group,
  row,
  onChange,
  onPreviewImage,
  onApplyImageToAll,
  showApplyImageToAll,
}: {
  group: FieldGroup;
  row: EditableRow;
  onChange: (field: EditableField, value: string) => void;
  onPreviewImage: (url: string, label: string) => void;
  onApplyImageToAll: (field: ImageField, value: string) => void;
  showApplyImageToAll: boolean;
}) {
  const isImages = group.title === "Images";
  const images = [row.image1, row.image2, row.image3, row.image4];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">{group.title}</h3>
        <p className="mt-1 text-[11px] text-slate-500">{group.description}</p>
      </div>
      {isImages && <MeeshoImageSetUpload rowId={row.id} values={row} onChange={onChange} />}
      {isImages && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          {images.map((image, index) => {
            const label = `Image ${index + 1} URL`;
            return image ? (
              <button
                key={label}
                type="button"
                onClick={() => onPreviewImage(image, label)}
                aria-label={`Open ${label} preview`}
                className="group/preview relative aspect-square cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-blue-400 hover:ring-2 hover:ring-blue-100"
              >
                <img
                  src={image}
                  alt={`${label} preview`}
                  className="h-full w-full object-cover transition group-hover/preview:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover/preview:bg-slate-950/35 group-hover/preview:opacity-100">
                  <ZoomIn size={20} />
                </span>
              </button>
            ) : (
              <div
                key={label}
                aria-label={`${label} is empty`}
                className="flex aspect-square items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300"
              >
                <ImageIcon size={18} />
              </div>
            );
          })}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {group.fields.map((field) => {
          const imageField = isImageField(field.key) ? field.key : null;
          const value = String(row[field.key] ?? "");

          return (
            <div
              key={field.key}
              className={field.multiline ? "sm:col-span-2" : ""}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="text-[11px] font-bold text-slate-600">
                  {field.label}
                </label>
                {imageField && showApplyImageToAll && (
                  <button
                    type="button"
                    onClick={() => onApplyImageToAll(imageField, value)}
                    disabled={!value.trim()}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <Copy size={11} />
                    Apply to all variants
                  </button>
                )}
              </div>
              {field.multiline ? (
                <textarea
                  rows={field.key === "description" ? 4 : 2}
                  value={value}
                  readOnly={field.locked}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  aria-label={field.label}
                  placeholder={field.placeholder}
                  className={`${textareaClass} ${field.locked ? lockedClass : ""}`}
                />
              ) : (
                <input
                  type={field.number ? "number" : "text"}
                  value={value}
                  readOnly={field.locked}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  aria-label={field.label}
                  placeholder={field.placeholder}
                  className={`${inputClass} ${field.locked ? lockedClass : ""}`}
                />
              )}
              {imageField && <MeeshoImageUpload target={{ rowId: row.id, field: imageField }} value={value} onChange={url => onChange(imageField, url)} disabled={field.locked} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ImagePreviewModal({
  preview,
  onClose,
}: {
  preview: ImagePreviewState;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="charm-image-preview-title"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
      />
      <section className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3 text-white sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ImageIcon size={17} className="shrink-0 text-blue-300" />
              <h2 id="charm-image-preview-title" className="truncate text-sm font-bold">
                {preview.label}
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Press Esc or click outside the image to close.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="rounded-xl border border-white/15 bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-black/30 p-3 sm:p-5">
          <img
            src={preview.url}
            alt={`${preview.label} full preview`}
            className="max-h-[75vh] max-w-full rounded-lg object-contain"
          />
        </div>
        <footer className="border-t border-white/10 px-4 py-3 sm:px-5">
          <p className="truncate text-xs text-slate-400" title={preview.url}>
            {preview.url}
          </p>
        </footer>
      </section>
    </div>
  );
}

function SourceBadge({ item }: { item: Product | EditableRow }) {
  const variant = sourceLabel(item).startsWith("Variant");
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${variant ? "bg-blue-50 text-blue-700" : "bg-slate-900 text-white"}`}>{sourceLabel(item)}</span>;
}

function StatusBadge({ mode }: { mode: WorkspaceTab }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${mode === "drafts" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{mode === "drafts" ? <Wand2 size={10} /> : <Check size={10} />}{mode === "drafts" ? "Draft" : "Stored"}</span>;
}

function Thumbnail({ image, alt, small = false }: { image: string; alt: string; small?: boolean }) {
  const size = small ? "h-11 w-11" : "h-20 w-20";
  return <div className={`${size} shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100`}>{image ? <img src={image} alt={alt} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><Package size={small ? 16 : 22} /></div>}</div>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-2.5 text-slate-400" size={15} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-3 focus:ring-blue-100" /></div>;
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}<span className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] ${active ? "bg-blue-50 text-blue-700" : "bg-slate-200 text-slate-500"}`}>{count}</span></button>;
}

function IconButton({ title, children, onClick, disabled = false, danger = false, success = false }: { title: string; children: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean; success?: boolean }) {
  const color = danger ? "border-red-200 text-red-600 hover:bg-red-50" : success ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-slate-200 text-slate-600 hover:bg-slate-50";
  return <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} className={`flex h-8 w-8 items-center justify-center rounded-lg border bg-white disabled:opacity-40 ${color}`}>{children}</button>;
}

function SectionTitle({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{step}</p>
      <h2 className="mt-1 font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}

function Stat({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">{icon}</div>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-400">{helper}</p>
    </div>
  );
}

function Notice({ tone, message, onClose }: { tone: "error" | "success"; message: string; onClose: () => void }) {
  const color = tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <div className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${color}`}><p>{message}</p><button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-black/5"><X size={14} /></button></div>;
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><div className="mb-4 rounded-2xl bg-slate-100 p-4 text-slate-400">{icon}</div><h3 className="font-bold text-slate-800">{title}</h3><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}

function LoadingPage() {
  return <main className="min-h-screen bg-[#f6f8fb] p-6"><div className="mx-auto max-w-[1400px] animate-pulse space-y-5"><div className="h-24 rounded-2xl bg-white" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 rounded-2xl bg-white" />)}</div><div className="h-80 rounded-2xl bg-white" /></div></main>;
}

const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100";
const textareaClass = "w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-5 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100";
const lockedClass = "cursor-not-allowed bg-slate-100 font-bold text-slate-500";
const tableInputClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-3 focus:ring-blue-100";
const tableTextareaClass = "w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs leading-4 text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-3 focus:ring-blue-100";
const tableLockedClass = "cursor-not-allowed bg-slate-100 font-bold text-slate-500";
const secondaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40";
const primaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40";
const successButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40";

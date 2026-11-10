"use client";

import Link from "@/components/listing-tool/link";
import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Database,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  exportGeneralProductExcel,
  type GeneralProductListing,
} from "@/components/listing-tool/original/lib/general-product-excel";
import {
  GENERAL_PRODUCT_CATEGORIES,
  generalProductCode,
  generalProductSkuCodesForListing,
  parseGeneralProductImageName,
  selectedProductTitle,
  selectionError,
  type GeneralProductSelections,
  type GeneralProductSkuCodes,
} from "@/components/listing-tool/original/lib/general-product-listing";
import {
  GENERAL_PRODUCT_DEFAULT_CODES, GENERAL_PRODUCT_PACK_PRESETS,
  GENERAL_PRODUCT_SHARED_DEFAULTS, generalProductPackDefaults,
} from "@/components/listing-tool/original/lib/general-product-defaults";
import {
  appendGeneralProductVariants, GENERAL_PRODUCT_VARIANT_LIMIT, withGeneralProductListingGroups, withGeneralProductSku,
  generalProductBatchRows, generalProductBatchError, generalProductExportCategoryError, nextGeneralProductGroup,
  nextGeneralProductVersion, type GeneralProductBatchItem, type GeneralProductVariant,
} from "@/components/listing-tool/original/lib/general-product-batch";
import GeneralProductPreviewTable, { type GeneralProductTableField } from "./GeneralProductPreviewTable";
import GeneralProductImages from "./GeneralProductImages";
import MeeshoImageUpload from "./MeeshoImageUpload";
import MeeshoVariantImagesUpload from "./MeeshoVariantImagesUpload";
import { withVariantMainImage } from "@/components/listing-tool/original/lib/meesho-variant-images";
import { invalidateMeeshoSelection } from "@/components/listing-tool/original/lib/meesho-upload-client";
import { generalProductImageSource } from "@/components/listing-tool/original/lib/general-product-review";
import { generateGeneralProductVariantTitles } from "@/components/listing-tool/original/lib/general-product-variant-generation";
import { generalProductsRequest, saveGeneralProductBatch, type SavedGeneralProduct } from "@/components/listing-tool/original/lib/general-products-api";
import { loadCategoryProducts, type GeneralProductCatalogResponse } from "@/components/listing-tool/original/lib/general-product-catalog";

type AiProvider = "gemini" | "openai";
type EditableField = Exclude<keyof GeneralProductListing, "id">;

type ScanResult = Pick<
  GeneralProductListing,
  | "productName"
  | "variation"
  | "category"
  | "genericName"
  | "productType"
  | "color"
  | "material"
  | "theme"
  | "description"
  | "quantity"
  | "weight"
> & {
  includedComponents: string;
  imageUrl: string;
  imageUploadMessage: string;
  skuCodes: GeneralProductSkuCodes;
};

type Variant = GeneralProductVariant;

const PROVIDER_KEY = "general-product-ai-provider";
const PROVIDER_EVENT = "general-product-ai-provider-change";
let providerFallback: AiProvider = "gemini";

function getProviderSnapshot(): AiProvider {
  try {
    const stored = window.localStorage.getItem(PROVIDER_KEY);
    return stored === "openai" || stored === "gemini" ? stored : providerFallback;
  } catch {
    return providerFallback;
  }
}

function subscribeToProvider(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PROVIDER_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PROVIDER_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PROVIDER_EVENT, onChange);
  };
}

function getServerProviderSnapshot(): AiProvider {
  return "gemini";
}

const EMPTY_DRAFT: Omit<GeneralProductListing, "id"> = {
  productName: "",
  category: "",
  variation: "Free Size",
  price: "",
  wrongDefectiveReturnsPrice: "",
  mrp: "",
  gst: "18",
  hsn: "",
  weight: "",
  inventory: "",
  country: "India",
  manufacturer: "",
  manufacturerAddress: "",
  manufacturerPincode: "",
  packer: "",
  packerAddress: "",
  packerPincode: "",
  importer: "Not Required",
  importerAddress: "Not Required",
  importerPincode: "Not Required",
  color: "Not specified",
  genericName: "",
  includedComponents: "Not specified",
  material: "Not specified",
  quantity: "1",
  length: "",
  width: "",
  theme: "Not specified",
  productType: "",
  image1: "",
  image2: "",
  image3: "",
  image4: "",
  styleId: "",
  sku: "",
  brand: "Mobiro",
  groupId: "",
  description: "",
};

const DEFAULT_DRAFT: Omit<GeneralProductListing, "id"> = {
  ...EMPTY_DRAFT, ...GENERAL_PRODUCT_SHARED_DEFAULTS, ...generalProductPackDefaults(),
};

function createDraft(): GeneralProductListing {
  return { id: crypto.randomUUID(), ...DEFAULT_DRAFT };
}

function toScanResult(value: unknown): ScanResult | null {
  if (!value || typeof value !== "object") return null;

  const result = value as Record<string, unknown>;
  const read = (key: string, fallback = "") =>
    typeof result[key] === "string" ? result[key] : fallback;

  return {
    productName: read("title"),
    variation: read("variation", "Free Size"),
    category: read("category"),
    genericName: read("genericName"),
    productType: read("productType"),
    color: read("color", "Not specified"),
    material: read("material", "Not specified"),
    theme: read("theme", "Not specified"),
    description: read("description"),
    quantity: read("netQuantity", "1"),
    weight: read("weightGrams"),
    includedComponents: read("includedComponents", "Not specified"),
    imageUrl: read("imageUrl"),
    imageUploadMessage: read("imageUploadMessage"),
    skuCodes: generalProductSkuCodesForListing({ productName: read("title"), category: read("category"),
      productType: read("productType"), color: read("color"),
      brandCode: result.skuCodes && typeof result.skuCodes === "object" && "brandCode" in result.skuCodes && typeof result.skuCodes.brandCode === "string" ? result.skuCodes.brandCode : "MBRO" }, result.skuCodes),
  };
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  readOnly = false,
  min,
  max,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "url";
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}{required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        min={min}
        max={max}
        disabled={disabled}
        className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}

function ChoiceField({
  label, value, options, onChange, disabled = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [custom, setCustom] = useState(false);
  const isCustom = custom || (!!value && !options.includes(value));

  return (
    <div>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          {label} <span className="text-rose-600">*</span>
        </span>
        <select
          value={isCustom ? "__custom__" : value}
          disabled={disabled}
          onChange={(event) => {
            const customSelection = event.target.value === "__custom__";
            setCustom(customSelection);
            onChange(customSelection ? "" : event.target.value);
          }}
          className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
        >
          <option value="">Choose {label.toLowerCase()}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
          <option value="__custom__">Other — enter your own</option>
        </select>
      </label>
      {isCustom ? (
        <label className="mt-2 block">
          <span className="sr-only">Custom {label.toLowerCase()}</span>
          <input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={`Enter ${label.toLowerCase()}`} maxLength={label === "Product type" ? 60 : 120} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
        </label>
      ) : null}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function GeneralProductBuilder({ savedProductId, initialStep = 4 }: { savedProductId?: string; initialStep?: 3 | 4 }) {
  const [draft, setDraft] = useState<GeneralProductListing>(createDraft);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [batch, setBatch] = useState<GeneralProductBatchItem[]>([]);
  const [activeStep, setActiveStep] = useState(1);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingParentVersion, setEditingParentVersion] = useState(1);
  const [preparedVariantTitles, setPreparedVariantTitles] = useState<string[]>([]);
  const [batchImageFiles, setBatchImageFiles] = useState<File[]>([]);
  const [batchProgress, setBatchProgress] = useState("");
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [skuCodes, setSkuCodes] = useState<GeneralProductSkuCodes>({ brandCode: GENERAL_PRODUCT_DEFAULT_CODES.brandCode, categoryCode: "", productCode: "", colorCode: "" });
  const [skuOverride, setSkuOverride] = useState<string | null>(null);
  const [productContext, setProductContext] = useState("");
  const provider = useSyncExternalStore(
    subscribeToProvider,
    getProviderSnapshot,
    getServerProviderSnapshot,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [variantCount, setVariantCount] = useState("1");
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [isCreatingVariants, setIsCreatingVariants] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingDatabase, setIsSavingDatabase] = useState(false);
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(!!savedProductId);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [variantProgress, setVariantProgress] = useState("");

  const selections: GeneralProductSelections = {
    category: draft.category,
    genericName: draft.genericName,
    productType: draft.productType,
    quantity: draft.quantity,
    productContext,
  };
  const missingSelection = selectionError(selections);
  const categoryOptions = GENERAL_PRODUCT_CATEGORIES.find((category) => category.name === draft.category);
  const busy = isScanning || isGeneratingVariants || isCreatingVariants || isExporting || isGeneratingBatch || isSavingDatabase || isLoadingDatabase;
  const availableVariants = Math.max(0, GENERAL_PRODUCT_VARIANT_LIMIT - variants.length);
  const maxNewVariants = Math.min(50, availableVariants);
  const isStoredProduct = !!batch.find((item) => item.draft.id === editingProductId)?.databaseId;
  const parentVersion = editingProductId ? editingParentVersion : nextGeneralProductVersion(batch, skuCodes, draft.quantity);
  const batchRows = useMemo(() => batch.flatMap(generalProductBatchRows), [batch]);

  useEffect(() => {
    if (!savedProductId) return;
    let cancelled = false;
    const controller = new AbortController();
    generalProductsRequest<{ product: SavedGeneralProduct }>(`/${encodeURIComponent(savedProductId)}`, { signal: controller.signal })
      .then(({ product }) => {
        if (cancelled) return;
        setError(""); setLoadFailed(false);
        const loaded = withGeneralProductListingGroups(product);
        setBatch([loaded]); setDraft({ ...loaded.draft }); setVariants(structuredClone(loaded.variants));
        setSkuCodes({ ...product.codes }); setProductContext(product.productContext);
        setSkuOverride(product.skuOverride ?? null);
        setEditingProductId(product.draft.id); setEditingParentVersion(product.parentVersion); setActiveStep(initialStep);
        setNotice(initialStep === 3 ? `Saved product loaded with ${product.variants.length} existing variants. Enter how many more you want, generate titles, create them, then save to database.` : "Saved product loaded from MongoDB. Edit its listing or add variants, then save the batch to update the database.");
      })
      .catch((loadError) => { if (!cancelled) { setLoadFailed(true); setError(loadError instanceof Error ? loadError.message : "Unable to load the saved product."); } })
      .finally(() => { if (!cancelled) setIsLoadingDatabase(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [savedProductId, initialStep, loadAttempt]);

  const hasLocalEdits = batch.length > 0 || !!imageFile || batchImageFiles.length > 0 || variants.length > 0
    || !!productContext.trim() || skuOverride !== null || skuCodes.brandCode !== GENERAL_PRODUCT_DEFAULT_CODES.brandCode
    || !!skuCodes.categoryCode || !!skuCodes.productCode || !!skuCodes.colorCode
    || Object.entries(DEFAULT_DRAFT).some(([field, value]) => draft[field as EditableField] !== value);
  const retrySavedProduct = () => {
    if (!savedProductId || hasLocalEdits) return;
    setError(""); setIsLoadingDatabase(true); setLoadAttempt((attempt) => attempt + 1);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setField = (field: EditableField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const chooseCategory = (value: string) => {
    const category = GENERAL_PRODUCT_CATEGORIES.find((item) => item.name === value);
    setDraft((current) => ({
      ...current,
      category: value,
      genericName: category?.genericNames[0] || "",
      productType: "",
    }));
    setSkuCodes((current) => ({
      ...current,
      categoryCode: category?.code || generalProductCode(value),
      productCode: "PROD",
    }));
    setPreparedVariantTitles([]);
  };

  const chooseProductType = (value: string) => {
    setField("productType", value);
    const productType = categoryOptions?.productTypes.find((item) => item.name === value);
    setSkuCodes((current) => ({
      ...current,
      productCode: productType?.code || generalProductCode(value, "PROD"),
    }));
    setPreparedVariantTitles([]);
  };

  const changeQuantity = (quantity: string) => {
    const count = Number(quantity);
    const updatePack = (title: string) =>
      Number.isInteger(count) && count >= 1 && count <= 9999
        ? title.replace(/\(Pack of \d+\)$/, `(Pack of ${count})`)
        : title;
    setDraft((current) => ({
      ...current, quantity,
      productName: quantity === current.quantity ? current.productName : "",
      description: quantity === current.quantity ? current.description : "",
      includedComponents: Number.isInteger(count) && count >= 1 && count <= 9999
        ? current.includedComponents.replace(/^\d+\s+/, `${count} `) : current.includedComponents,
    }));
    setVariants((current) => current.map((variant) => ({
      ...variant, productName: updatePack(variant.productName),
    })));
    setPreparedVariantTitles([]);
  };

  const applyPackPreset = (quantity: string) => {
    changeQuantity(quantity);
    setDraft((current) => ({ ...current, ...generalProductPackDefaults(quantity), productName: "", description: "" }));
    setVariants([]);
    setImageFile(null);
    setPreviewUrl("");
    setNotice(`${quantity}-piece defaults loaded from your workbook. Generate the title for this pack.`);
  };

  const listingRows = useMemo<GeneralProductListing[]>(() => {
    return generalProductBatchRows({
      draft: { ...draft, groupId: draft.groupId.trim() || nextGeneralProductGroup(batch) },
      codes: skuCodes, variants, parentVersion, productContext, skuOverride,
    });
  }, [draft, variants, skuCodes, parentVersion, batch, productContext, skuOverride]);

  const snapshot = (currentVariants = variants): GeneralProductBatchItem => ({
    ...batch.find((item) => item.draft.id === draft.id),
    draft: { ...draft, groupId: listingRows[0].groupId },
    codes: { ...skuCodes }, variants: structuredClone(currentVariants), parentVersion, productContext, skuOverride,
  });

  const addProductToBatch = (nextStep = 3) => {
    const item = snapshot();
    const nextBatch = [...batch.filter((entry) => entry.draft.id !== draft.id), item];
    const invalid = generalProductBatchError(nextBatch.flatMap(generalProductBatchRows));
    if (invalid) { setError(invalid); return; }
    setBatch((current) => editingProductId
      ? current.map((entry) => entry.draft.id === editingProductId ? item : entry)
      : [...current, item]);
    setEditingProductId(draft.id);
    setEditingParentVersion(parentVersion);
    setDraft((current) => ({ ...current, groupId: item.draft.groupId }));
    setActiveStep(nextStep);
    setError("");
    setNotice("Product added to the local batch. Add optional variants or continue to the table preview.");
  };

  const startAnotherProduct = () => {
    setDraft(createDraft()); setVariants([]); setSkuCodes({ brandCode: GENERAL_PRODUCT_DEFAULT_CODES.brandCode, categoryCode: "", productCode: "", colorCode: "" });
    setProductContext(""); setImageFile(null); setPreviewUrl(""); setPreparedVariantTitles([]);
    setSkuOverride(null);
    setEditingProductId(null); setEditingParentVersion(1); setVariantCount("1");
    setBatchImageFiles([]); setActiveStep(1); setError("");
    setNotice("New product ready. Spreadsheet defaults are prefilled; the title is blank for AI generation.");
  };

  const editBatchProduct = (id: string) => {
    const item = batch.find((entry) => entry.draft.id === id);
    if (!item) return;
    setDraft({ ...item.draft }); setVariants(structuredClone(item.variants)); setSkuCodes({ ...item.codes });
    setSkuOverride(item.skuOverride ?? null);
    setProductContext(item.productContext); setEditingProductId(id); setEditingParentVersion(item.parentVersion);
    setImageFile(null); setPreviewUrl(""); setPreparedVariantTitles([]); setActiveStep(2); setError(""); setNotice("");
  };

  const goToStep = (step: number) => {
    if (activeStep === 4 && editingProductId) editBatchProduct(editingProductId);
    if (step === 4 && activeStep < 4 && editingProductId) { addProductToBatch(4); return; }
    setActiveStep(step);
  };

  const updateBatchRow = (productId: string, rowId: string, field: GeneralProductTableField, value: string) => {
    setBatch((current) => current.map((item) => {
      if (item.draft.id !== productId) return item;
      if (field === "sku" || field === "styleId") return withGeneralProductSku(item, rowId, value);
      if (rowId === productId || field === "groupId") return { ...item, draft: { ...item.draft, [field]: value } };
      return { ...item, variants: item.variants.map((variant) => variant.id !== rowId ? variant
        : field === "productName" ? { ...variant, productName: value }
          : { ...variant, overrides: { ...variant.overrides, [field]: value } }) };
    }));
  };

  const removeBatchProduct = (id: string, rowId?: string) => {
    if (!rowId && !window.confirm("Remove this product and its variants from the local batch?")) return;
    setBatch((current) => rowId ? current.map((item) => item.draft.id === id
      ? { ...item, variants: item.variants.filter((variant) => variant.id !== rowId) } : item)
      : current.filter((item) => item.draft.id !== id));
    if (id === editingProductId) {
      if (rowId) setVariants((current) => current.filter((variant) => variant.id !== rowId));
      else startAnotherProduct();
    }
  };

  const changeProvider = (nextProvider: AiProvider) => {
    providerFallback = nextProvider;
    try {
      window.localStorage.setItem(PROVIDER_KEY, nextProvider);
    } catch {
      // Provider persistence is a convenience only.
    }
    window.dispatchEvent(new Event(PROVIDER_EVENT));
  };

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) {
      setError("Choose a PNG, JPG, JPEG, or WEBP image up to 10 MB.");
      return;
    }

    setError("");
    setNotice("");
    setImageFile(file);
    invalidateMeeshoSelection({ rowId: draft.id, field: "image1" });
    setPreviewUrl(URL.createObjectURL(file));
    setDraft((current) => ({ ...current, productName: "", description: "", image1: "" }));
    setVariants([]);
    setPreparedVariantTitles([]);
    const fileDetails = parseGeneralProductImageName(file.name);
    if (fileDetails) {
      setSkuCodes(fileDetails.codes);
      if (fileDetails.quantity !== draft.quantity && draft.productType === "Phone Charms Holder") {
        setDraft((current) => ({ ...current, ...generalProductPackDefaults(fileDetails.quantity) }));
      }
      changeQuantity(fileDetails.quantity);
      setNotice("Pack quantity and SKU codes filled from the image filename. Confirm your product selections, then generate the title.");
    }
  };

  const scanImage = async () => {
    if (missingSelection) {
      setError(missingSelection);
      return;
    }
    if (!imageFile && !draft.image1.trim()) {
      setError("Upload a product image before using AI detection.");
      return;
    }

    setIsScanning(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      if (imageFile) formData.append("image", imageFile);
      else formData.append("imageUrl", draft.image1.trim());
      formData.append("provider", provider);
      formData.append("category", draft.category);
      formData.append("genericName", draft.genericName);
      formData.append("productType", draft.productType);
      formData.append("quantity", draft.quantity);
      formData.append("productContext", productContext);
      formData.append("brandCode", skuCodes.brandCode || "MBRO");

      const response = await fetch("/api/tools/listing-tool/ai/general-product-copy", {
        method: "POST",
        body: formData,
      });
      const body: unknown = await response.json().catch(() => null);
      const result = toScanResult(body);

      if (!response.ok || !result) {
        const message =
          body && typeof body === "object" && "error" in body
            ? String(body.error)
            : "Unable to detect product details from this image.";
        throw new Error(message);
      }

      setDraft((current) => ({
        ...current,
        productName: result.productName || current.productName,
        color: result.color || current.color,
        material: result.material || current.material,
        theme: result.theme || current.theme,
        description: result.description || current.description,
        includedComponents: current.includedComponents === "Not specified" ? result.includedComponents : current.includedComponents,
        image1: current.image1.startsWith("https://upload.meeshosupplyassets.com/cataloging/") ? current.image1 : result.imageUrl || (imageFile ? "" : current.image1),
      }));
      if (!isStoredProduct) setSkuCodes(result.skuCodes);
      setNotice(
        result.imageUploadMessage ||
          (isStoredProduct ? "AI generated the title. Existing saved SKU codes are preserved."
            : "AI generated the title and matching SKU codes. Review the title, pack quantity and IDs before saving."),
      );
      setPreparedVariantTitles([]);
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Unable to analyze the product image.",
      );
    } finally {
      setIsScanning(false);
    }
  };

  const generateVariants = async () => {
    const requested = Number(variantCount);

    if (!Number.isInteger(requested) || requested < 1 || requested > maxNewVariants) {
      setError(maxNewVariants ? `Enter between 1 and ${maxNewVariants} additional variants.` : "This product already has 500 variants.");
      return;
    }

    if (missingSelection || !selectedProductTitle(draft.productName, selections)) {
      setError(missingSelection || "Generate a parent title matching your product type and pack quantity first.");
      return;
    }

    setIsGeneratingVariants(true);
    setError("");
    setNotice("");
    setVariantProgress(`Generating ${preparedVariantTitles.length} of ${requested} titles...`);

    try {
      const generatedTitles = await generateGeneralProductVariantTitles({
        input: {
          parentTitle: draft.productName,
          category: draft.category,
          genericName: draft.genericName,
          productType: draft.productType,
          color: draft.color,
          material: draft.material,
          quantity: draft.quantity,
          includedComponents: draft.includedComponents,
          productContext,
          provider,
        },
        requested,
        preparedTitles: preparedVariantTitles,
        usedTitles: variants.map((variant) => variant.productName),
        onProgress: (titles) => {
          setPreparedVariantTitles(titles);
          setVariantProgress(`Generating ${titles.length} of ${requested} titles...`);
        },
      });
      setNotice(`${generatedTitles.length} variant titles ready. Review them, then click Create variants.`);
    } catch (variantError) {
      setError(
        variantError instanceof Error
          ? variantError.message
          : "Unable to generate variant titles.",
      );
    } finally {
      setIsGeneratingVariants(false);
      setVariantProgress("");
    }
  };

  const createVariants = async () => {
    if (!preparedVariantTitles.length || preparedVariantTitles.some((title) => !selectedProductTitle(title, selections))) {
      setError("Each variant title must match the selected product type and pack quantity."); return;
    }
    setIsCreatingVariants(true); setError("");
    try {
      const occupiedProducts = isStoredProduct
        ? await loadCategoryProducts("", (path) => generalProductsRequest<GeneralProductCatalogResponse>(path)) : [];
      const item = appendGeneralProductVariants({ item: snapshot(), titles: preparedVariantTitles, batch,
        occupiedProducts, createId: () => crypto.randomUUID() });
      setVariants(item.variants); setDraft({ ...item.draft });
      setBatch((current) => current.map((entry) => entry.draft.id === draft.id ? item : entry));
      setPreparedVariantTitles([]);
      setNotice(`${item.variants.length - variants.length} additional variants created. Existing listings are preserved. ${isStoredProduct ? "Click Save variants to database to update this stored product." : "Review the batch before saving or exporting."}`);
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : "Unable to create additional variants. Your generated titles are still available.");
    } finally { setIsCreatingVariants(false); }
  };

  const generateImageBatch = async () => {
    if (missingSelection || !batchImageFiles.length) { setError(missingSelection || "Choose product images first."); return; }
    setIsGeneratingBatch(true); setError(""); setNotice("");
    const added: GeneralProductBatchItem[] = [];
    const failures: string[] = [];
    const failedFiles: File[] = [];
    try {
      for (const [index, file] of batchImageFiles.entries()) {
        setBatchProgress(`Generating title ${index + 1} of ${batchImageFiles.length}: ${file.name}`);
        try {
          const filename = parseGeneralProductImageName(file.name);
          const quantity = filename?.quantity || draft.quantity;
          const candidate = { ...draft, ...(quantity !== draft.quantity && draft.productType === "Phone Charms Holder" ? generalProductPackDefaults(quantity) : {}),
            id: crypto.randomUUID(), quantity, productName: "", description: "", image1: "", groupId: nextGeneralProductGroup([...batch, ...added]) };
          const formData = new FormData();
          formData.append("image", file); formData.append("provider", provider);
          for (const field of ["category", "genericName", "productType", "quantity"] as const) formData.append(field, candidate[field]);
          formData.append("productContext", productContext);
          formData.append("brandCode", filename?.codes.brandCode || skuCodes.brandCode || "MBRO");
          const response = await fetch("/api/tools/listing-tool/ai/general-product-copy", { method: "POST", body: formData });
          const body: unknown = await response.json().catch(() => null);
          const result = toScanResult(body);
          if (!response.ok || !result || !selectedProductTitle(result.productName, candidate)) throw new Error(body && typeof body === "object" && "error" in body ? String(body.error) : "Title generation failed.");
          if (!result.imageUrl) throw new Error("Image upload failed. Generate this product individually and provide a hosted image URL.");
          const codes = result.skuCodes;
          const item: GeneralProductBatchItem = { draft: { ...candidate, productName: result.productName, description: result.description,
            color: result.color, material: result.material, theme: result.theme, image1: result.imageUrl },
            codes, variants: [], parentVersion: nextGeneralProductVersion([...batch, ...added], codes, quantity), productContext };
          const invalid = generalProductBatchError(generalProductBatchRows(item));
          if (invalid) throw new Error(invalid);
          added.push(item);
        } catch (imageError) { failedFiles.push(file); failures.push(`${file.name}: ${imageError instanceof Error ? imageError.message : "Generation failed"}`); }
      }
      setBatch((current) => [...current, ...added]);
      setBatchImageFiles(failedFiles);
      if (added.length) setActiveStep(4);
      setNotice(`${added.length} products added to the batch. Each title was generated from its own image.`);
      if (failures.length) setError(failures.join("\n"));
    } finally { setIsGeneratingBatch(false); setBatchProgress(""); }
  };

  const updateVariant = (id: string, productName: string) => {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === id ? { ...variant, productName } : variant,
      ),
    );
  };

  const exportListings = async () => {
    const invalid = generalProductBatchError(batchRows) || generalProductExportCategoryError(batchRows);
    if (invalid) { setError(invalid); return; }

    setIsExporting(true);
    setError("");

    try {
      await exportGeneralProductExcel(
        batchRows,
        "general-product-listings.xlsx",
      );
      setNotice(
        `${batchRows.length} listing row${batchRows.length === 1 ? "" : "s"} exported in the marketplace template format.`,
      );
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Unable to export the listing file.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const saveBatchToDatabase = async () => {
    const products = activeStep < 4 && editingProductId
      ? batch.map((item) => item.draft.id === editingProductId ? snapshot() : item) : batch;
    const invalid = generalProductBatchError(products.flatMap(generalProductBatchRows));
    if (invalid) { setError(invalid); return; }
    setBatch(products); setIsSavingDatabase(true); setError(""); setNotice("");
    let savedCount = 0;
    const failures: string[] = [];
    try {
      for (let offset = 0; offset < products.length; offset += 100) {
        const result = await saveGeneralProductBatch(products.slice(offset, offset + 100));
        const saved = new Map(result.saved.map((item) => [item.draft.id, item]));
        savedCount += result.saved.length;
        setBatch((current) => current.map((item) => saved.get(item.draft.id) || item));
        for (const failure of result.errors) failures.push(`${failure.sku}: ${failure.message}`);
      }
      if (savedCount) setNotice(`${savedCount} parent product${savedCount === 1 ? "" : "s"} and their variants saved to MongoDB. Reopen them from Saved products & analytics on any browser.`);
      if (failures.length) setError(failures.join("\n"));
    } catch (saveError) {
      setError(`${saveError instanceof Error ? saveError.message : "Unable to save this batch."} ${savedCount ? `${savedCount} products were saved before this error.` : "No success confirmation received."} Retry is safe; duplicate saves are prevented.`);
    } finally { setIsSavingDatabase(false); }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={savedProductId ? `/general-products/${savedProductId}` : "/"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          {savedProductId ? "Back to saved product" : "Back to catalog"}
        </Link>

        <header className="mt-5 rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-400/15 px-3 py-1 text-xs font-bold text-violet-200">
                <Sparkles className="h-3.5 w-3.5" />
                General products
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Create a general product listing
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Choose what you are selling, upload its image, and generate a listing with matching titles and IDs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => activeStep === 4 ? void exportListings() : goToStep(4)}
              disabled={busy || !batchRows.length}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {activeStep === 4 ? "Export batch" : "Review batch"} ({batchRows.length} rows)
            </button>
          </div>
        </header>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-white p-4">
          <p className="text-sm text-slate-600">{isLoadingDatabase ? "Loading saved product from MongoDB..." : "Build your batch, then save it to MongoDB. Existing phone products stay separate."}</p>
          <Link href="/general-products" className="text-sm font-bold text-violet-700 hover:underline">Saved products & analytics →</Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ["1", "Choose product", "Category and pack defaults are ready."],
            ["2", "Product details", "Generate a title and add the parent."],
            ["3", "Create variants", "Generate titles, then create variants."],
            ["4", "Batch preview", "Edit, save to database, and export."],
          ].map(([number, title, detail]) => (
            <button type="button" disabled={busy || (number === "3" && !editingProductId)} onClick={() => goToStep(Number(number))} key={number} aria-current={activeStep === Number(number) ? "step" : undefined} className={`rounded-2xl border p-4 text-left shadow-sm disabled:opacity-50 ${activeStep === Number(number) ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"}`}>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{number}</span>
              <p className="mt-3 text-sm font-bold text-slate-950">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-5 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="whitespace-pre-line" role="alert">{error}</p>
              {loadFailed && <div className="mt-3">
                <button type="button" disabled={busy || hasLocalEdits} onClick={retrySavedProduct} className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50">Retry loading saved product</button>
                {hasLocalEdits && <p className="mt-2 text-xs">Your current draft or batch has edits, so reloading is blocked to protect them. Keep this page open; retry saving the batch once the backend is ready.</p>}
              </div>}
            </div>
          </div>
        ) : null}
        {notice ? (
          <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{notice}</p>
          </div>
        ) : null}

        {activeStep < 3 && <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-slate-700">
          <p>Defaults copied from your Beads & Charms workbook. Pack presets use the first listing for each quantity. Titles are generated by AI, not copied.</p>
          <p className="mt-1 text-xs text-slate-500">The source has “Mobiro” in the address and pincode fields. These values are preserved; review them before submitting a listing. For other products, also check the default prices, HSN, and image links.</p>
        </div>}

        <fieldset disabled={busy} className="min-w-0">
        {activeStep < 4 && <div className="mt-5 grid gap-5">
          <div className="space-y-5">
            {activeStep === 1 && <>
            <Section title="1. Choose your product" description="Tell AI what the product is. Your selections guide the title and remain unchanged during generation.">
              <div className="mb-5 flex flex-wrap gap-2" aria-label="Workbook pack presets">
                {GENERAL_PRODUCT_PACK_PRESETS.map((preset) => <button key={preset.quantity} type="button" onClick={() => applyPackPreset(preset.quantity)} className={`rounded-xl border px-4 py-2 text-sm font-bold ${draft.quantity === preset.quantity ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600"}`}>{preset.quantity} pieces · ₹{preset.price}</button>)}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ChoiceField label="Category" value={draft.category} options={GENERAL_PRODUCT_CATEGORIES.map((category) => category.name)} onChange={chooseCategory} disabled={busy} />
                <ChoiceField label="Generic name" value={draft.genericName} options={categoryOptions?.genericNames || []} onChange={(value) => setField("genericName", value)} disabled={busy || !draft.category} />
                <ChoiceField label="Product type" value={draft.productType} options={categoryOptions?.productTypes.map((type) => type.name) || []} onChange={chooseProductType} disabled={busy || !draft.category} />
                <Field label="Pack quantity" value={draft.quantity} onChange={changeQuantity} type="number" min={1} max={9999} required disabled={busy} />
                <div className="md:col-span-2">
                  <Field label="Product use or extra details (optional)" value={productContext} onChange={setProductContext} placeholder="e.g. Transparent tabs that go inside a mobile case to attach a phone charm" disabled={busy} />
                </div>
              </div>
              <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-bold text-slate-800">SKU codes</summary>
                <p className="mt-2 text-xs leading-5 text-slate-500">AI fills product and colour codes with the generated title. Category follows your selection; pack quantity follows the title’s confirmed pack. Brand defaults to MBRO. Your custom SKU edits take priority; reset to the generated SKU to use these codes again.</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {([
                    ["brandCode", "Brand code"], ["categoryCode", "Category code"],
                    ["productCode", "Product code"], ["colorCode", "Color code"],
                  ] as const).map(([key, label]) => (
                    <Field key={key} label={label} value={skuCodes[key]} onChange={(value) => setSkuCodes((current) => ({ ...current, [key]: value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) }))} disabled={busy} />
                  ))}
                </div>
              </details>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Product ID / Style ID" value={missingSelection || !draft.productName ? "" : listingRows[0].styleId} onChange={setSkuOverride} disabled={busy || !draft.productName} placeholder="Generate the title to create its ID" />
                <Field label="SKU ID" value={missingSelection || !draft.productName ? "" : listingRows[0].sku} onChange={setSkuOverride} disabled={busy || !draft.productName} placeholder="Generated with the title, then editable" />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Both IDs stay matched. Generated SKUs have no .D suffix. You can edit each listing’s SKU after generating it.</p>
              {skuOverride !== null && <button type="button" disabled={busy} onClick={() => setSkuOverride(null)} className="mt-2 text-xs font-semibold text-violet-700 hover:underline">Reset to generated SKU</button>}
            </Section>
            </>}

            {activeStep === 2 && <>
            <Section title="2. Upload image and generate" description="AI combines your selections and image to create the title, matching SKU codes and description.">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_210px]">
                <div>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">AI provider</span>
                    <select
                      value={provider}
                      disabled={busy}
                      onChange={(event) => changeProvider(event.target.value as AiProvider)}
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    >
                      <option value="gemini">Gemini</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </label>
                  <label className="mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 px-4 text-center transition hover:border-violet-500 hover:bg-violet-50">
                    <ImagePlus className="h-6 w-6 text-violet-600" />
                    <span className="mt-2 text-sm font-bold text-slate-800">Choose product image</span>
                    <span className="mt-1 text-xs text-slate-500">PNG, JPG, JPEG, or WEBP up to 10 MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={chooseImage}
                      disabled={busy}
                      className="sr-only"
                    />
                  </label>
                  <MeeshoImageUpload target={{ rowId: draft.id, field: "image1" }} value={draft.image1} file={imageFile} onChange={url => setField("image1", url)} disabled={busy} label={imageFile ? "Upload selected image to Meesho" : "Upload image to Meesho"} />
                  <div className="mt-4"><Field label="Pack quantity for title and SKU" value={draft.quantity} onChange={changeQuantity} type="number" min={1} max={9999} required disabled={busy} /></div>
                  <button
                    type="button"
                    onClick={() => void scanImage()}
                    disabled={busy || (!imageFile && !draft.image1.trim()) || !!missingSelection}
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isScanning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isScanning ? "Generating listing..." : "Generate title & SKU"}
                  </button>
                  {missingSelection ? <p className="mt-2 text-xs font-medium text-violet-700">{missingSelection}</p> : null}
                  {imageFile ? <p className="mt-2 truncate text-xs text-slate-500">{imageFile.name}</p> : null}
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {previewUrl || generalProductImageSource(draft.image1) ? (
                    <Image src={previewUrl || generalProductImageSource(draft.image1)} alt="Product upload preview" width={320} height={320} unoptimized referrerPolicy="no-referrer" className="h-56 w-full object-contain" />
                  ) : (
                    <div className="flex h-56 flex-col items-center justify-center px-5 text-center text-sm text-slate-400">
                      <ImagePlus className="h-7 w-7" />
                      <p className="mt-2">Your upload preview appears here.</p>
                    </div>
                  )}
                </div>
              </div>
              <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-bold text-slate-800">Add multiple products from images</summary>
                <p className="mt-2 text-xs leading-5 text-slate-500">Choose up to 20 product images. Each image gets its own AI title and matching product/colour SKU codes. Your category and supplier details apply to all; structured filenames can set the pack quantity and brand.</p>
                <label className="mt-3 block text-sm font-semibold">Product images for batch
                  <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-xs" onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length > 20 || files.some((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) { setError("Choose up to 20 PNG, JPG, or WEBP images, each up to 10 MB."); return; }
                    setBatchImageFiles(files); setError("");
                  }} />
                </label>
                {!!batchImageFiles.length && <p className="mt-2 text-xs text-slate-500">{batchImageFiles.length} images ready: {batchImageFiles.map((file) => file.name).join(", ")}</p>}
                <button type="button" disabled={busy || !batchImageFiles.length || !!missingSelection} onClick={() => void generateImageBatch()} className="mt-3 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{isGeneratingBatch ? "Generating batch..." : "Generate titles and add image batch"}</button>
                {batchProgress && <p role="status" className="mt-2 text-xs text-violet-700">{batchProgress}</p>}
              </details>
            </Section>

            <Section title="Review product details" description="The non-title fields are prefilled. Review the generated title and any edits before adding this product to the batch.">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field label="Product name / title" value={draft.productName} onChange={(value) => setField("productName", value)} required />
                </div>
                <Field label="Product ID / Style ID" value={draft.productName ? listingRows[0].styleId : ""} onChange={setSkuOverride} disabled={busy || !draft.productName} placeholder="Generated with the title, then editable" />
                <Field label="SKU ID" value={draft.productName ? listingRows[0].sku : ""} onChange={setSkuOverride} disabled={busy || !draft.productName} placeholder="Generated with the title, then editable" />
                <p className="text-xs text-slate-500 md:col-span-2">Edit either ID to update both. Use 1–100 letters, numbers, hyphens, underscores or dots; each listing needs a unique SKU.{skuOverride !== null && <button type="button" disabled={busy} onClick={() => setSkuOverride(null)} className="ml-2 font-semibold text-violet-700 hover:underline">Reset to generated SKU</button>}</p>
                <Field label="Variation" value={draft.variation} onChange={(value) => setField("variation", value)} />
                <Field label="Color" value={draft.color} onChange={(value) => setField("color", value)} />
                <Field label="Material" value={draft.material} onChange={(value) => setField("material", value)} />
                <Field label="Theme" value={draft.theme} onChange={(value) => setField("theme", value)} />
                <Field label="Net weight (g)" value={draft.weight} onChange={(value) => setField("weight", value)} type="number" />
                <div className="md:col-span-2">
                  <Field label="Included components" value={draft.includedComponents} onChange={(value) => setField("includedComponents", value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Product description</span>
                    <textarea value={draft.description} onChange={(event) => setField("description", event.target.value)} rows={4} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                  </label>
                </div>
              </div>
            </Section>

            <Section title="Pricing & stock" description="Review your selling prices, stock and tax details. Image links are in the next section.">
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <Download className="h-4 w-4 shrink-0 text-violet-700" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-800">Meesho export template</span>
                  <span className="mt-0.5 block text-xs text-slate-500">meesho-template.xlsx is used automatically, just like phone listings. No upload needed.</span>
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Meesho price" value={draft.price} onChange={(value) => setField("price", value)} type="number" />
                <Field label="Wrong/defective return price" value={draft.wrongDefectiveReturnsPrice} onChange={(value) => setField("wrongDefectiveReturnsPrice", value)} type="number" />
                <Field label="MRP" value={draft.mrp} onChange={(value) => setField("mrp", value)} type="number" />
                <Field label="GST %" value={draft.gst} onChange={(value) => setField("gst", value)} type="number" />
                <Field label="HSN ID" value={draft.hsn} onChange={(value) => setField("hsn", value)} />
                <Field label="Inventory" value={draft.inventory} onChange={(value) => setField("inventory", value)} type="number" />
                <Field label="Brand name" value={draft.brand} onChange={(value) => setField("brand", value)} />
                <Field label="Group ID (automatic)" value={listingRows[0].groupId} onChange={() => {}} readOnly />
              </div>
            </Section>

            <Section title="Product images" description="Choose a main image and up to three supporting images together. Check their order, then upload to fill the matching links. Image 1 is the front image used in the review table.">
              <GeneralProductImages rowId={draft.id} listing={draft} disabled={busy} onChange={setField} />
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">These links are included in your Excel export. Changing a link updates its preview immediately; uploading a local image for AI detection does not replace a hosted link until the upload succeeds.</p>
            </Section>

            <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <summary className="cursor-pointer text-base font-bold text-slate-950">Manufacturer, packer, and importer details</summary>
              <p className="mt-2 text-sm text-slate-500">Complete the manufacturer, packer, and importer information for your listing.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Country of origin" value={draft.country} onChange={(value) => setField("country", value)} />
                <Field label="Manufacturer name" value={draft.manufacturer} onChange={(value) => setField("manufacturer", value)} />
                <Field label="Manufacturer pincode" value={draft.manufacturerPincode} onChange={(value) => setField("manufacturerPincode", value)} />
                <Field label="Manufacturer address" value={draft.manufacturerAddress} onChange={(value) => setField("manufacturerAddress", value)} />
                <Field label="Packer name" value={draft.packer} onChange={(value) => setField("packer", value)} />
                <Field label="Packer pincode" value={draft.packerPincode} onChange={(value) => setField("packerPincode", value)} />
                <Field label="Packer address" value={draft.packerAddress} onChange={(value) => setField("packerAddress", value)} />
                <Field label="Importer name" value={draft.importer} onChange={(value) => setField("importer", value)} />
                <Field label="Importer pincode" value={draft.importerPincode} onChange={(value) => setField("importerPincode", value)} />
                <div className="md:col-span-2"><Field label="Importer address" value={draft.importerAddress} onChange={(value) => setField("importerAddress", value)} /></div>
              </div>
            </details>
            </>}
          </div>

          {activeStep === 3 && <aside className="grid gap-5 lg:grid-cols-2">
            {!!variants.length&&<div className="lg:col-span-2"><MeeshoVariantImagesUpload productId={draft.id} variants={variants.map((variant,index)=>({...listingRows[index+1],rowId:variant.id,version:variant.version,title:variant.productName}))} disabled={busy} onChange={(rowId,url)=>setVariants(current=>withVariantMainImage(current,rowId,url))}/></div>}
            <Section title="Add AI variants" description={maxNewVariants ? `Add 1–${maxNewVariants} more variants. Existing listings stay intact; each new row gets its own SKU and Group ID.` : "This product has reached the 500-variant limit."}>
              <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-950">
                <div className="flex items-center gap-2 font-bold"><Layers3 className="h-4 w-4" /> Current batch</div>
                <p className="mt-2 text-violet-800">1 parent + {variants.length} variant{variants.length === 1 ? "" : "s"}</p>
                {isStoredProduct && <p className="mt-1 text-xs text-violet-700">Stored product · {availableVariants} variant spaces available. Save below after creating new variants.</p>}
              </div>
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">AI provider</span>
                <select value={provider} onChange={(event) => changeProvider(event.target.value as AiProvider)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
                  <option value="gemini">Gemini</option><option value="openai">OpenAI</option>
                </select>
              </label>
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">More variants</span>
                <input type="number" min="1" max={maxNewVariants} disabled={!maxNewVariants} value={variantCount} onChange={(event) => { setVariantCount(event.target.value); setPreparedVariantTitles([]); }} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
              </label>
                <button type="button" onClick={() => void generateVariants()} disabled={busy || !maxNewVariants || !!missingSelection || !selectedProductTitle(draft.productName, selections) || preparedVariantTitles.length === Number(variantCount)} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                {isGeneratingVariants ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isGeneratingVariants ? "Generating..." : preparedVariantTitles.length === Number(variantCount) ? "All titles ready" : preparedVariantTitles.length ? "Continue generating" : "Generate variant titles"}
              </button>
              {variantProgress ? <p className="mt-2 text-center text-xs font-medium text-violet-700" role="status">{variantProgress}</p> : null}
              {!!preparedVariantTitles.length && <div className="mt-4 space-y-3">
                <p className="text-xs font-bold text-slate-700">Review AI variant titles</p>
                {preparedVariantTitles.map((title, index) => <label key={index} className="block text-xs text-slate-500">Variant title {index + 1}<textarea rows={3} value={title} onChange={(event) => setPreparedVariantTitles((current) => current.map((value, i) => i === index ? event.target.value : value))} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-violet-500" /></label>)}
                <button type="button" disabled={busy} onClick={() => void createVariants()} className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{isCreatingVariants ? "Preparing variants..." : `Create ${preparedVariantTitles.length} variants`}</button>
              </div>}
            </Section>

            <Section title="Listing batch" description="The parent and every new variant remain editable until export.">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Parent · V{parentVersion}</p>
                <p className="mt-1 text-[10px] font-semibold text-blue-700">Group {listingRows[0].groupId}</p>
                <p className="mt-1 text-sm font-bold leading-5 text-slate-900">{draft.productName || "AI-generated title will appear here"}</p>
                <div className="mt-3"><Field label="Parent SKU ID" value={missingSelection ? "" : listingRows[0].sku} onChange={setSkuOverride} disabled={busy} /></div>
              </div>
              <div className="mt-3 space-y-3">
                {variants.length ? variants.map((variant, index) => (
                  <div key={variant.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-md bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">V{variant.version}</span>
                      <span className="text-[10px] font-semibold text-blue-700">Group {listingRows[index + 1].groupId}</span>
                      <button type="button" onClick={() => removeBatchProduct(draft.id, variant.id)} className="text-rose-600 hover:text-rose-700" aria-label={`Remove variant ${variant.version}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <textarea value={variant.productName} onChange={(event) => updateVariant(variant.id, event.target.value)} rows={3} className="mt-3 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs leading-5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                    <div className="mt-3"><Field label={`Variant V${variant.version} SKU ID`} value={listingRows[index + 1].sku} disabled={busy} onChange={(value) => setVariants((current) => current.map((entry) => entry.id === variant.id ? { ...entry, skuOverride: value } : entry))} /></div>
                  </div>
                )) : <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs leading-5 text-slate-500">No variants yet. Generate any number from 1 to 50 when the parent listing is ready.</p>}
              </div>
              <button type="button" onClick={() => addProductToBatch(4)} disabled={busy} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Review batch table
              </button>
            </Section>
          </aside>}
        </div>}
        </fieldset>

        {activeStep === 4 && <GeneralProductPreviewTable products={batch} disabled={busy} onEdit={editBatchProduct} onChange={updateBatchRow} onRemove={removeBatchProduct} onClear={() => {
          if (!window.confirm("Clear all products and variants from this local batch?")) return;
          setBatch([]); startAnotherProduct();
        }} />}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{batch.length} parents · {batchRows.length - batch.length} variants in the local batch</p>
          <div className="flex flex-wrap gap-2">
            {activeStep > 1 && <button type="button" disabled={busy} onClick={() => goToStep(activeStep === 4 ? (editingProductId ? 3 : 1) : activeStep - 1)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Previous</button>}
            {activeStep === 2 && editingProductId && <button type="button" disabled={busy} onClick={() => { editBatchProduct(editingProductId); setActiveStep(4); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel editing</button>}
            {activeStep === 1 && <button type="button" disabled={busy || !!missingSelection} onClick={() => setActiveStep(2)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Continue to product details</button>}
            {activeStep === 2 && <button type="button" disabled={busy || !!missingSelection || !selectedProductTitle(draft.productName, selections)} onClick={() => addProductToBatch()} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{editingProductId ? "Update product in batch" : "Add product to batch"}</button>}
            {activeStep === 3 && <button type="button" disabled={busy} onClick={() => addProductToBatch(4)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Review batch</button>}
            {(activeStep === 3 || activeStep === 4) && <button type="button" disabled={busy} onClick={() => { if (activeStep === 3) { const invalid = generalProductBatchError(listingRows); if (invalid) { setError(invalid); return; } const item = snapshot(); setBatch((current) => current.map((entry) => entry.draft.id === draft.id ? item : entry)); } startAnotherProduct(); }} className="rounded-xl border border-violet-200 px-4 py-2.5 text-sm font-bold text-violet-700">Add another product</button>}
            {activeStep === 4 && <button type="button" disabled={busy || !batchRows.length} onClick={() => void exportListings()} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{isExporting ? "Exporting..." : "Download Excel batch"}</button>}
            {(activeStep === 3 || activeStep === 4) && <button type="button" disabled={busy || !batchRows.length} onClick={() => void saveBatchToDatabase()} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Database className="h-4 w-4" />{isSavingDatabase ? "Saving to database..." : activeStep === 3 && isStoredProduct ? "Save variants to database" : "Save batch to database"}</button>}
          </div>
        </div>
      </div>
    </main>
  );
}

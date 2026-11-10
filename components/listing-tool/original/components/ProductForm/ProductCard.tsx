"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  Database,
  FileText,
  Layers3,
  PackagePlus,
  Plus,
  Save,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  useForm,
} from "react-hook-form";
import { useRouter } from "@/components/listing-tool/navigation";

import {
  generateSKU,
} from "@/components/listing-tool/original/lib/sku";
import { applyProductBrand, getBrandSupplyDetails } from "@/components/listing-tool/original/lib/brands";
import {
  DEFAULT_PRODUCT_PRICE,
  DEFAULT_WRONG_DEFECTIVE_RETURN_DISCOUNT,
  getVariantPrice,
  getWrongDefectiveReturnDiscount,
} from "@/components/listing-tool/original/lib/pricing";

import AiProductScanner, {
  type AiProvider,
  type GeneratedProductDetails,
} from "./AiProductScanner";
import DesignLibraryPicker, {
  buildModelTitle,
  type SavedDesign,
} from "./DesignLibraryPicker";
import ExportButton from "./ExportButton";
import ImageLinks from "./ImageLinks";
import ModelSelector from "./ModelSelector";
import PreviewTable from "./PreviewTable";
import ProductDetails from "./ProductDetails";

export interface SelectedModel {
  model: string;
}

export type FormData = {
  sku: string;

  productName: string;
  description: string;

  brand: string;
  category: string;
  material: string;
  color: string;
  theme: string;
  type: string;

  price: number;
  wrongDefectiveReturnsPrice?: number;
  mrp: number;
  gst: number;
  hsn: string;

  weight: number;
  inventory: number;

  country: string;

  manufacturer: string;
  manufacturerAddress: string;
  manufacturerPincode: string;

  packer: string;
  packerAddress: string;
  packerPincode: string;

  importer: string;
  importerAddress: string;
  importerPincode: string;

  genericName: string;
  size: string;
  quantity: number;

  length: number;
  width: number;

  designName: string;
  designCode: string;
  designNumber: string;
  designId: string;
  styleId?: string;

  printType: string;
  finish: string;
  version: string;

  image1: string;
  image2: string;
  image3: string;
  image4: string;

  groupId: string;
};

export type Product = FormData & {
  id: string;
  models: SelectedModel[];

  parentId?: string;
  variantNumber?: number;
  variantType?: "standard" | "charm";
};

type VariantImageField =
  | "image1"
  | "image2"
  | "image3"
  | "image4";

type ApiNextDesignNumber = {
  success: boolean;
  designNumber: string;
  usedDesignNumbers?: string[];
};

type ApiBatchResponse = {
  success: boolean;
  message: string;
  product: Product;
  variants: Product[];
};

type BuilderStep = 1 | 2 | 3 | 4;

const DEFAULT_VALUES: FormData = {
  sku: "",

  productName: "",
  description: "",

  brand: "Mobiro",
  category: "Mobile Cases & Covers",
  material: "Silicone",
  color: "Transparent",
  theme: "No Theme",
  type: "Designer",

  price: DEFAULT_PRODUCT_PRICE,
  wrongDefectiveReturnsPrice: 1,
  mrp: 899,
  gst: 18,
  hsn: "3926",

  weight: 25,
  inventory: 2000,

  country: "India",

  ...getBrandSupplyDetails("Mobiro"),

  importer: "Not Required",
  importerAddress: "Not Required",
  importerPincode: "Not Required",

  genericName: "Mobile Cases & Covers",

  size: "Free Size",
  quantity: 1,

  length: 8,
  width: 1,

  designName: "",
  designCode: "",
  designNumber: "",
  designId: "",

  printType: "UVV",
  finish: "WL",
  version: "1",

  image1: "",
  image2: "",
  image3: "",
  image4: "",

  groupId: "",
};

const API_BASE_URL = "/api/tools/listing-tool";

const DESIGN_NUMBER_START = 317;

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",
          ...options.headers,
        },

        cache: "no-store",
      },
    );

  const data =
    (await response
      .json()
      .catch(() => null)) as
      | T
      | {
          message?: string;
        }
      | null;

  if (!response.ok) {
    throw new Error(
      data &&
        typeof data ===
          "object" &&
        "message" in data &&
        typeof data.message ===
          "string"
        ? data.message
        : "The request failed.",
    );
  }

  return data as T;
}

function getNextGroupId(
  products: Product[],
) {
  const highestNumber =
    products.reduce(
      (highest, product) => {
        const match =
          product.groupId.match(
            /^Group\s+(\d+)$/i,
          );

        return match
          ? Math.max(
              highest,
              Number(
                match[1],
              ),
            )
          : highest;
      },
      0,
    );

  return `Group ${String(
    highestNumber + 1,
  ).padStart(2, "0")}`;
}

function isUsefulAiValue(
  value?: string,
) {
  const valueToCheck =
    value
      ?.trim()
      .toLowerCase();

  return Boolean(
    valueToCheck &&
      valueToCheck !==
        "not specified" &&
      valueToCheck !==
        "unknown" &&
      valueToCheck !== "n/a",
  );
}

function createLocalId() {
  if (
    typeof crypto !==
      "undefined" &&
    "randomUUID" in crypto
  ) {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function ProductCard() {
  const router = useRouter();
  const uploadFormId = useId();
  const [uploadFormEpoch, setUploadFormEpoch] = useState(0);

  const {
    register,
    watch,
    reset,
    getValues,
    setValue,
    control,
  } = useForm<FormData>({
    defaultValues:
      DEFAULT_VALUES,
  });

  /*
  |--------------------------------------------------------------------------
  | ONLY CURRENT UNSAVED BATCH
  |--------------------------------------------------------------------------
  */

  const [
    products,
    setProducts,
  ] = useState<Product[]>(
    [],
  );

  const [
    selectedModels,
    setSelectedModels,
  ] = useState<
    SelectedModel[]
  >([]);

  const [
    editingProductId,
    setEditingProductId,
  ] = useState<
    string | null
  >(null);

  const [
    variantQuantities,
    setVariantQuantities,
  ] = useState<
    Record<
      string,
      string
    >
  >({});

  const [
    variantTitles,
    setVariantTitles,
  ] = useState<
    Record<
      string,
      string[]
    >
  >({});

  const [
    generatingVariantTitles,
    setGeneratingVariantTitles,
  ] = useState<
    Record<
      string,
      boolean
    >
  >({});

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    databaseError,
    setDatabaseError,
  ] = useState<
    string | null
  >(null);

  const [
    designNumberLoading,
    setDesignNumberLoading,
  ] = useState(false);

  const [
    activeStep,
    setActiveStep,
  ] = useState<BuilderStep>(1);

  const [
    designLibraryCodes,
    setDesignLibraryCodes,
  ] = useState<string[]>([]);

  const [
    designLibraryRefreshKey,
    setDesignLibraryRefreshKey,
  ] = useState(0);

  const [
    generatedProductTitle,
    setGeneratedProductTitle,
  ] = useState("");

  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");

  const formData = watch();

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

  const selectedModel =
    selectedModels[0]
      ?.model ?? "";

  const hasOneModel =
    selectedModels.length ===
    1;

  /*
  |--------------------------------------------------------------------------
  | GET NEXT AVAILABLE DESIGN NUMBER
  |
  | The backend reads MongoDB directly.
  |
  | Starting point = 317.
  |--------------------------------------------------------------------------
  */

  const assignNextParentDesignNumber =
    async () => {
      try {
        setDesignNumberLoading(
          true,
        );

        setDatabaseError(
          null,
        );

        const result =
          await apiRequest<ApiNextDesignNumber>(
            "/products/next-design-number",
          );

        /*
        |--------------------------------------------------------------------------
        | Numbers already saved in MongoDB
        |--------------------------------------------------------------------------
        */

        const usedDatabaseNumbers =
          new Set<number>(
            (
              result.usedDesignNumbers ??
              []
            )
              .map((value) =>
                Number(
                  String(
                    value,
                  ).trim(),
                ),
              )
              .filter(
                (value) =>
                  Number.isInteger(
                    value,
                  ) &&
                  value >=
                    DESIGN_NUMBER_START,
              ),
          );

        /*
        |--------------------------------------------------------------------------
        | Numbers already assigned in CURRENT UNSAVED BATCH
        |--------------------------------------------------------------------------
        */

        const usedBatchNumbers =
          new Set<number>(
            products
              .filter(
                (product) =>
                  !product.parentId,
              )
              .map((product) =>
                Number(
                  String(
                    product.designNumber,
                  ).trim(),
                ),
              )
              .filter(
                (value) =>
                  Number.isInteger(
                    value,
                  ) &&
                  value >=
                    DESIGN_NUMBER_START,
              ),
          );

        /*
        |--------------------------------------------------------------------------
        | Start with backend's answer
        |--------------------------------------------------------------------------
        */

        let nextNumber =
          Math.max(
            DESIGN_NUMBER_START,
            Number(
              result.designNumber,
            ) ||
              DESIGN_NUMBER_START,
          );

        /*
        |--------------------------------------------------------------------------
        | Protect against numbers already used in
        | local unsaved parents.
        |--------------------------------------------------------------------------
        */

        while (
          usedDatabaseNumbers.has(
            nextNumber,
          ) ||
          usedBatchNumbers.has(
            nextNumber,
          )
        ) {
          nextNumber +=
            1;
        }

        const designNumber =
          String(
            nextNumber,
          );

        /*
        |--------------------------------------------------------------------------
        | Assign Design Number
        |--------------------------------------------------------------------------
        */

        setValue(
          "designNumber",
          designNumber,
          {
            shouldDirty: true,
            shouldValidate: true,
          },
        );

        /*
        |--------------------------------------------------------------------------
        | Generate SKU immediately
        |--------------------------------------------------------------------------
        */

        if (
          selectedModel &&
          formData.designCode.trim()
        ) {
          const sku =
            generateSKU({
              brand:
                formData.brand,

              category:
                formData.category,

              model:
                selectedModel,

              color:
                formData.color,

              printType:
                formData.printType,

              finish:
                formData.finish,

              designCode:
                formData.designCode,

              designNumber,

              version: "1",
            });

          setValue(
            "sku",
            sku,
            {
              shouldDirty: true,
              shouldValidate: true,
            },
          );
        }

        return designNumber;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to generate a new Design Number.";

        setDatabaseError(
          message,
        );

        alert(message);

        return "";
      } finally {
        setDesignNumberLoading(
          false,
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Automatically assign Design Number to NEW parent form
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      editingProductId
    ) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Already assigned.
    |--------------------------------------------------------------------------
    */

    if (
      formData.designNumber.trim()
    ) {
      return;
    }

    void assignNextParentDesignNumber();

    // Only react to editor reset / new batch parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editingProductId,
    products.length,
  ]);

  /*
  |--------------------------------------------------------------------------
  | AUTO SKU GENERATION
  |--------------------------------------------------------------------------
  |
  | Any change to SKU inputs immediately regenerates the SKU.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!selectedModel) {
      return;
    }

    if (
      !formData.designCode.trim()
    ) {
      return;
    }

    if (
      !formData.designNumber.trim()
    ) {
      return;
    }

    const sku =
      generateSKU({
        brand:
          formData.brand,

        category:
          formData.category,

        model:
          selectedModel,

        color:
          formData.color,

        printType:
          formData.printType,

        finish:
          formData.finish,

        designCode:
          formData.designCode,

        designNumber:
          formData.designNumber,

        version:
          formData.version ||
          "1",
      });

    if (
      sku === formData.sku
    ) {
      return;
    }

    setValue(
      "sku",
      sku,
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
  }, [
    selectedModel,
    formData.brand,
    formData.category,
    formData.color,
    formData.printType,
    formData.finish,
    formData.designCode,
    formData.designNumber,
    formData.version,
    formData.sku,
    setValue,
  ]);

  /*
  |--------------------------------------------------------------------------
  | RESET FORM
  |--------------------------------------------------------------------------
  */

  const resetEditor =
    () => {
      setUploadFormEpoch(value => value + 1);
      reset(
        DEFAULT_VALUES,
      );

      setValue(
        "sku",
        "",
        {
          shouldDirty: false,
        },
      );

      setSelectedModels(
        [],
      );

      setGeneratedProductTitle("");

      setEditingProductId(
        null,
      );

      setActiveStep(1);
    };

  const handleDesignsLoaded =
    useCallback(
      (designs: SavedDesign[]) => {
        setDesignLibraryCodes(
          designs.map(
            (design) =>
              design.designCode,
          ),
        );
      },
      [],
    );

  const selectSavedDesign =
    (design: SavedDesign) => {
      setValue(
        "designId",
        design.id,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );

      setValue(
        "designName",
        design.designName,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );

      setValue(
        "designCode",
        design.designCode,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );

      if (isUsefulAiValue(design.category)) {
        setValue(
          "category",
          design.category.trim(),
          {
            shouldDirty: true,
            shouldValidate: true,
          },
        );
      }

      if (isUsefulAiValue(design.theme)) {
        setValue(
          "theme",
          design.theme.trim(),
          {
            shouldDirty: true,
            shouldValidate: true,
          },
        );
      }

      if (isUsefulAiValue(design.productType)) {
        setValue(
          "type",
          design.productType.trim(),
          {
            shouldDirty: true,
            shouldValidate: true,
          },
        );
      }

      const generatedTitle =
        buildModelTitle(
          design,
          selectedModel,
        );

      setGeneratedProductTitle(
        generatedTitle,
      );

      setValue(
        "productName",
        generatedTitle,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );

      setDatabaseError(null);
    };

  const changeAssistantModel =
    (nextModel: string) => {
      const cleanModel = nextModel.trim();

      if (!cleanModel) {
        setSelectedModels([]);
        return;
      }

      const previousModel = selectedModel;
      const currentValues = getValues();

      setSelectedModels([
        {
          model: cleanModel,
        },
      ]);

      if (!currentValues.productName.trim()) {
        return;
      }

      const updatedTitle = buildModelTitle(
        {
          id: currentValues.designId,
          designName: currentValues.designName,
          designCode: currentValues.designCode,
          imageUrl: currentValues.image1,
          thumbnailUrl: currentValues.image1,
          source: "manual",
          usageCount: 0,
          sampleTitle: currentValues.productName,
          sampleModel: previousModel,
          category: currentValues.category,
          theme: currentValues.theme,
          productType: currentValues.type,
        },
        cleanModel,
      );

      setGeneratedProductTitle(updatedTitle);
      setValue(
        "productName",
        updatedTitle,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    };

  /*
  |--------------------------------------------------------------------------
  | AI GENERATED DATA
  |--------------------------------------------------------------------------
  */

  const handleAiGenerated =
    (
      data: GeneratedProductDetails,
    ) => {
      if (
        isUsefulAiValue(
          data.title,
        )
      ) {
        setGeneratedProductTitle(
          data.title.trim(),
        );

        setValue(
          "productName",
          data.title.trim(),
          {
            shouldDirty: true,
          },
        );
      }

      if (
        isUsefulAiValue(
          data.color,
        )
      ) {
        setValue(
          "color",
          data.color.trim(),
          {
            shouldDirty: true,
          },
        );
      }

      if (
        isUsefulAiValue(
          data.material,
        )
      ) {
        setValue(
          "material",
          data.material.trim(),
          {
            shouldDirty: true,
          },
        );
      }

      if (
        isUsefulAiValue(
          data.designName,
        )
      ) {
        setValue(
          "designName",
          data.designName.trim(),
          {
            shouldDirty: true,
          },
        );
      }

      if (
        isUsefulAiValue(
          data.designCode,
        )
      ) {
        setValue(
          "designCode",
          data.designCode
            .toUpperCase()
            .replace(
              /[^A-Z]/g,
              "",
            )
            .slice(
              0,
              8,
            ),
          {
            shouldDirty: true,
          },
        );
      }

      if (data.designId) {
        setValue(
          "designId",
          data.designId,
          {
            shouldDirty: true,
            shouldValidate: true,
          },
        );
      }

      if (data.imageUrl) {
        setValue(
          "image1",
          data.imageUrl,
          {
            shouldDirty: true,
            shouldValidate: true,
          },
        );
      }

      setDesignLibraryRefreshKey(
        (current) => current + 1,
      );
    };

  /*
  |--------------------------------------------------------------------------
  | ADD PRODUCT TO LOCAL BATCH
  |--------------------------------------------------------------------------
  */

  const addProductToBatch =
    async () => {
      const values =
        getValues();

      if (!Number.isFinite(values.price) || values.price < 0) {
        alert("Please enter a price of ₹0 or more.");
        return;
      }

      if (!hasOneModel) {
        alert(
          "Please select exactly one phone model first.",
        );
        return;
      }

      if (
        !values.productName.trim()
      ) {
        alert(
          "Please select or enter a product name.",
        );
        return;
      }

      if (
        !values.designName.trim()
      ) {
        alert(
          "Please enter a Design Name.",
        );
        return;
      }

      if (
        !values.designCode.trim()
      ) {
        alert(
          "Please enter a Design Code.",
        );
        return;
      }

      if (!values.designId) {
        const designNameWordCount =
          values.designName
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .length;

        if (
          designNameWordCount < 2 ||
          designNameWordCount > 3
        ) {
          alert(
            "Design Name must contain only 2 or 3 words.",
          );
          return;
        }

        if (
          !/^[A-Z]{4,8}$/.test(
            values.designCode
              .trim()
              .toUpperCase(),
          )
        ) {
          alert(
            "Design Code must contain 4 to 8 uppercase letters.",
          );
          return;
        }
      }

      let currentValues =
        values;

      /*
      |--------------------------------------------------------------------------
      | NEW PARENT
      |
      | Make sure a Design Number has been generated.
      |--------------------------------------------------------------------------
      */

      if (
        !editingProductId &&
        !currentValues.designNumber.trim()
      ) {
        const designNumber =
          await assignNextParentDesignNumber();

        if (!designNumber) {
          return;
        }

        currentValues = {
          ...getValues(),
          designNumber,
        };
      }

      /*
      |--------------------------------------------------------------------------
      | Generate SKU again immediately before
      | placing product into the batch.
      |--------------------------------------------------------------------------
      */

      const generatedSku =
        generateSKU({
          brand:
            currentValues.brand,

          category:
            currentValues.category,

          model:
            selectedModel,

          color:
            currentValues.color,

          printType:
            currentValues.printType,

          finish:
            currentValues.finish,

          designCode:
            currentValues.designCode,

          designNumber:
            currentValues.designNumber,

          version: "1",
        });

      setValue(
        "sku",
        generatedSku,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );

      currentValues = {
        ...currentValues,
        sku: generatedSku,
      };

      /*
      |--------------------------------------------------------------------------
      | Current batch duplicate checks
      |--------------------------------------------------------------------------
      */

      const otherParentProducts =
        products.filter(
          (product) =>
            !product.parentId &&
            product.id !==
              editingProductId,
        );

      const duplicateProduct =
        otherParentProducts.find(
          (product) =>
            product.productName
              .trim()
              .toLowerCase() ===
            currentValues.productName
              .trim()
              .toLowerCase(),
        );

      if (
        duplicateProduct
      ) {
        alert(
          "This product title already exists in the current batch.",
        );
        return;
      }

      const duplicateDesignCode =
        otherParentProducts.find(
          (product) =>
            product.designCode
              .trim()
              .toLowerCase() ===
            currentValues.designCode
              .trim()
              .toLowerCase() &&
            (!currentValues.designId ||
              product.designId !==
                currentValues.designId),
        );

      if (
        duplicateDesignCode
      ) {
        alert(
          "This Design Code is already used in the current batch.",
        );
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Local product
      |--------------------------------------------------------------------------
      */

      const productToSave: Product =
        {
          ...currentValues,

          price:
            currentValues.price,

          wrongDefectiveReturnsPrice:
            getWrongDefectiveReturnDiscount(
              currentValues.wrongDefectiveReturnsPrice,
            ),

          id:
            editingProductId ??
            createLocalId(),

          version: "1",

          groupId:
            editingProductId
              ? products.find(
                  (
                    product,
                  ) =>
                    product.id ===
                    editingProductId,
                )?.groupId ??
                getNextGroupId(
                  products,
                )
              : getNextGroupId(
                  products,
                ),

          models:
            selectedModels.map(
              (model) => ({
                ...model,
              }),
            ),
        };

      if (
        editingProductId
      ) {
        setProducts((current) => {
          const previousParent = current.find(
            (product) => product.id === editingProductId,
          );

          return current.map((product) => {
            if (product.id === editingProductId) return productToSave;

            if (
              product.parentId === editingProductId &&
              (product.variantType ?? "standard") === "standard"
            ) {
              return {
                ...(previousParent?.brand !== productToSave.brand
                  ? applyProductBrand(product, productToSave.brand)
                  : product),
                ...(previousParent?.price !== productToSave.price
                  ? {
                      price: getVariantPrice(
                        productToSave.price,
                        product.variantNumber ?? product.version,
                      ),
                    }
                  : {}),
              };
            }

            return product;
          });
        });
      } else {
        setProducts(
          (current) => [
            ...current,
            productToSave,
          ],
        );
      }

      setDatabaseError(
        null,
      );

      /*
      |--------------------------------------------------------------------------
      | Keep the parent selected and continue to the focused variant step.
      | The database is still untouched until Step 4.
      |--------------------------------------------------------------------------
      */

      setEditingProductId(
        productToSave.id,
      );

      setActiveStep(3);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  /*
  |--------------------------------------------------------------------------
  | EDIT PARENT
  |--------------------------------------------------------------------------
  */

  const editProduct =
    (
      product: Product,
    ) => {
      if (
        product.parentId
      ) {
        alert(
          "Variants are managed below their parent product.",
        );

        return;
      }

      setGeneratedProductTitle("");

      reset({
        ...DEFAULT_VALUES,
        ...product,
        wrongDefectiveReturnsPrice:
          getWrongDefectiveReturnDiscount(
            product.wrongDefectiveReturnsPrice,
          ),
        groupId:
          product.groupId,
        version: "1",
      });

      setSelectedModels(
        product.models.map(
          (model) => ({
            ...model,
          }),
        ),
      );

      setEditingProductId(
        product.id,
      );

      setActiveStep(2);

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });
    };

  /*
  |--------------------------------------------------------------------------
  | REMOVE
  |--------------------------------------------------------------------------
  */

  const removeProduct =
    (
      product: Product,
    ) => {
      const message =
        product.parentId
          ? `Remove Variant V${product.variantNumber}?`
          : "Remove this product and all of its variants from the current batch?";

      if (
        !window.confirm(
          message,
        )
      ) {
        return;
      }

      setProducts(
        (current) =>
          current.filter(
            (item) => {
              if (
                item.id ===
                product.id
              ) {
                return false;
              }

              if (
                !product.parentId &&
                item.parentId ===
                  product.id
              ) {
                return false;
              }

              return true;
            },
          ),
      );

      setVariantQuantities(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            product.id
          ];

          return next;
        },
      );

      setVariantTitles(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            product.id
          ];

          return next;
        },
      );
    };

  /*
  |--------------------------------------------------------------------------
  | IMAGE UPDATE
  |--------------------------------------------------------------------------
  */

  const updateVariantImage =
    (
      variantId: string,
      field: VariantImageField,
      value: string,
    ) => {
      setProducts(
        (current) =>
          current.map(
            (
              product,
            ) =>
              product.id ===
              variantId
                ? {
                    ...product,
                    [field]:
                      value,
                  }
                : product,
          ),
      );
    };

  /*
  |--------------------------------------------------------------------------
  | VARIANT AI TITLES
  |--------------------------------------------------------------------------
  */

  const generateVariantTitles =
    async (
      parentProduct: Product,
    ) => {
      const quantity =
        Number(
          variantQuantities[
            parentProduct.id
          ] || 0,
        );

      if (
        !Number.isInteger(
          quantity,
        ) ||
        quantity < 1 ||
        quantity > 10
      ) {
        alert(
          "Enter a variant quantity between 1 and 10 before generating AI titles.",
        );

        return;
      }

      try {
        setGeneratingVariantTitles(
          (current) => ({
            ...current,

            [parentProduct.id]:
              true,
          }),
        );

        setDatabaseError(
          null,
        );

        const response =
          await fetch(
            "/api/tools/listing-tool/ai/variant-titles",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                parentTitle:
                  parentProduct.productName,

                category:
                  parentProduct.category,

                model:
                  parentProduct
                    .models[0]
                    ?.model,

                theme:
                  parentProduct.theme,

                productType:
                  parentProduct.type,

                provider: aiProvider,

                usedTitles: [...products.map((product) => product.productName), ...Object.values(variantTitles).flat()],

                count:
                  quantity,
              }),
            },
          );

        const result =
          (await response.json()) as {
            titles?: unknown;
            error?: string;
          };

        if (
          !response.ok ||
          !Array.isArray(
            result.titles,
          )
        ) {
          throw new Error(
            result.error ||
              "Unable to generate variant titles.",
          );
        }

        const titles =
          result.titles
            .map(
              (title) =>
                String(
                  title || "",
                ).trim(),
            )
            .filter(
              Boolean,
            );

        if (
          titles.length !==
          quantity
        ) {
          throw new Error(
            "AI did not generate the requested number of variant titles.",
          );
        }

        setVariantTitles(
          (current) => ({
            ...current,

            [parentProduct.id]:
              titles,
          }),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to generate variant titles.";

        setDatabaseError(
          message,
        );

        alert(
          message,
        );
      } finally {
        setGeneratingVariantTitles(
          (current) => ({
            ...current,

            [parentProduct.id]:
              false,
          }),
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CREATE LOCAL VARIANTS
  |--------------------------------------------------------------------------
  */

  const createVariants =
    (
      parentProduct: Product,
    ) => {
      const quantity =
        Number(
          variantQuantities[
            parentProduct.id
          ] || 0,
        );

      if (
        !Number.isInteger(
          quantity,
        ) ||
        quantity < 1 ||
        quantity > 10
      ) {
        alert(
          "Enter a variant quantity between 1 and 10.",
        );

        return;
      }

      const titles =
        variantTitles[
          parentProduct.id
        ] ?? [];

      if (
        titles.length !==
        quantity
      ) {
        alert(
          "Generate the related AI titles before creating variants.",
        );

        return;
      }

      const existingVariants =
        products.filter(
          (product) =>
            product.parentId ===
            parentProduct.id,
        );

      let highestGroupNumber =
        products.reduce(
          (
            highest,
            product,
          ) => {
            const match =
              product.groupId.match(
                /^Group\s+(\d+)$/i,
              );

            return match
              ? Math.max(
                  highest,
                  Number(
                    match[1],
                  ),
                )
              : highest;
          },
          0,
        );

      const variants:
        Product[] =
        Array.from(
          {
            length:
              quantity,
          },
          (
            _,
            index,
          ) => {
            const versionNumber =
              existingVariants.length +
              index +
              2;

            highestGroupNumber +=
              1;

            /*
            |--------------------------------------------------------------------------
            | IMPORTANT:
            | Variant keeps parent's Design Number.
            |--------------------------------------------------------------------------
            */

            const variantSku =
              generateSKU({
                brand:
                  parentProduct.brand,

                category:
                  parentProduct.category,

                model:
                  parentProduct
                    .models[0]
                    ?.model ??
                  "",

                color:
                  parentProduct.color,

                printType:
                  parentProduct.printType,

                finish:
                  parentProduct.finish,

                designCode:
                  parentProduct.designCode,

                designNumber:
                  parentProduct.designNumber,

                version:
                  String(
                    versionNumber,
                  ),
              });

            return {
              ...parentProduct,

              id:
                createLocalId(),

              parentId:
                parentProduct.id,

              variantNumber:
                versionNumber,

              price:
                getVariantPrice(
                  parentProduct.price,
                  versionNumber,
                ),

              wrongDefectiveReturnsPrice:
                getWrongDefectiveReturnDiscount(
                  parentProduct.wrongDefectiveReturnsPrice,
                ),

              productName:
                titles[
                  index
                ],

              description:
                parentProduct.description
                  ? `${parentProduct.description}\n\nVariant V${versionNumber}.`
                  : `Variant V${versionNumber}.`,

              /*
              |--------------------------------------------------------------------------
              | SAME DESIGN NUMBER AS PARENT
              |--------------------------------------------------------------------------
              */

              designNumber:
                parentProduct.designNumber,

              /*
              |--------------------------------------------------------------------------
              | NEW VERSION
              |--------------------------------------------------------------------------
              */

              version:
                String(
                  versionNumber,
                ),

              /*
              |--------------------------------------------------------------------------
              | NEW UNIQUE SKU
              |--------------------------------------------------------------------------
              */

              sku:
                variantSku,

              groupId:
                `Group ${String(
                  highestGroupNumber,
                ).padStart(
                  2,
                  "0",
                )}`,

              models:
                parentProduct.models.map(
                  (model) => ({
                    ...model,
                  }),
                ),
            };
          },
        );

      setProducts(
        (current) => [
          ...current,
          ...variants,
        ],
      );

      setVariantQuantities(
        (current) => ({
          ...current,

          [parentProduct.id]:
            "",
        }),
      );

      setVariantTitles(
        (current) => {
          const next =
            {
              ...current,
            };

          delete next[
            parentProduct.id
          ];

          return next;
        },
      );
    };

  /*
  |--------------------------------------------------------------------------
  | SAVE PARENT + VARIANTS
  |--------------------------------------------------------------------------
  */

  const saveProductToDatabase =
    async (
      parentProduct: Product,
    ) => {
      const localVariants =
        products
          .filter(
            (product) =>
              product.parentId ===
              parentProduct.id,
          )
          .sort(
            (
              first,
              second,
            ) =>
              (first.variantNumber ??
                0) -
              (second.variantNumber ??
                0),
          );

      if (
        !window.confirm(
          `Save "${parentProduct.productName}"${
            localVariants.length
              ? ` and ${localVariants.length} variant(s)`
              : ""
          } to the database?`,
        )
      ) {
        return;
      }

      setIsSaving(true);

      setDatabaseError(
        null,
      );

      try {
        /*
        |--------------------------------------------------------------------------
        | Parent data
        |--------------------------------------------------------------------------
        */

        const {
          id: localParentId,
          parentId:
            ignoredParentId,
          variantNumber:
            ignoredVariantNumber,

          ...parentData
        } =
          parentProduct;

        void localParentId;
        void ignoredParentId;
        void ignoredVariantNumber;

        const cleanParentData =
          {
            ...parentData,

            parentId:
              undefined,

            variantNumber:
              undefined,

            version: "1",

            models:
              parentProduct.models.map(
                (model) => ({
                  ...model,
                }),
              ),
          };

        /*
        |--------------------------------------------------------------------------
        | Variant data
        |--------------------------------------------------------------------------
        */

        const cleanVariants =
          localVariants.map(
            (variant) => {
              const {
                id: localVariantId,
                parentId:
                  localVariantParentId,

                ...variantData
              } = variant;

              void localVariantId;
              void localVariantParentId;

              return {
                ...variantData,

                /*
                |--------------------------------------------------------------------------
                | Keep parent Design Number
                |--------------------------------------------------------------------------
                */

                designNumber:
                  parentProduct.designNumber,

                models:
                  variant.models.map(
                    (model) => ({
                      ...model,
                    }),
                  ),
              };
            },
          );

        /*
        |--------------------------------------------------------------------------
        | ONE BACKEND TRANSACTION
        |--------------------------------------------------------------------------
        */

        const result =
          await apiRequest<ApiBatchResponse>(
            "/products/batch",
            {
              method:
                "POST",

              body: JSON.stringify(
                {
                  parent:
                    cleanParentData,

                  variants:
                    cleanVariants,
                },
              ),
            },
          );

        /*
        |--------------------------------------------------------------------------
        | Remove saved records from local batch
        |--------------------------------------------------------------------------
        */

        setProducts(
          (current) =>
            current.filter(
              (product) =>
                product.id !==
                  parentProduct.id &&
                product.parentId !==
                  parentProduct.id,
            ),
        );

        setVariantQuantities(
          (current) => {
            const next = {
              ...current,
            };

            delete next[
              parentProduct.id
            ];

            return next;
          },
        );

        setVariantTitles(
          (current) => {
            const next = {
              ...current,
            };

            delete next[
              parentProduct.id
            ];

            return next;
          },
        );

        alert(
          result.variants
            .length > 0
            ? `Product and ${result.variants.length} variant(s) saved successfully.`
            : "Product saved successfully.",
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to save the product.";

        setDatabaseError(
          message,
        );

        alert(
          message,
        );
      } finally {
        setIsSaving(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | CLEAR BATCH
  |--------------------------------------------------------------------------
  */

  const resetBatch =
    () => {
      if (
        !products.length
      ) {
        resetEditor();
        return;
      }

      if (
        !window.confirm(
          "Clear all unsaved products and variants from this batch?",
        )
      ) {
        return;
      }

      resetEditor();

      setProducts(
        [],
      );

      setVariantQuantities(
        {},
      );

      setVariantTitles(
        {},
      );

      setDatabaseError(
        null,
      );
    };

  /*
  |--------------------------------------------------------------------------
  | COUNTS
  |--------------------------------------------------------------------------
  */

  const parentProducts =
    products.filter(
      (product) =>
        !product.parentId,
    );

  const variantCount =
    products.length -
    parentProducts.length;

  const imageCount = [
    formData.image1,
    formData.image2,
    formData.image3,
    formData.image4,
  ].filter((value) => value?.trim()).length;

  const detailsReady = Boolean(
    formData.productName?.trim() &&
    formData.designName?.trim() &&
    formData.designCode?.trim(),
  );

  const currentParent =
    parentProducts.find(
      (product) =>
        product.id ===
        editingProductId,
    ) ??
    parentProducts[
      parentProducts.length - 1
    ];

  const currentVariants =
    currentParent
      ? products.filter(
          (product) =>
            product.parentId ===
            currentParent.id,
        )
      : [];

  const currentVariantQuantity =
    currentParent
      ? variantQuantities[
          currentParent.id
        ] ?? ""
      : "";

  const currentVariantTitles =
    currentParent
      ? variantTitles[
          currentParent.id
        ] ?? []
      : [];

  const generatingCurrentTitles =
    currentParent
      ? Boolean(
          generatingVariantTitles[
            currentParent.id
          ],
        )
      : false;

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-0.5 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <PackagePlus size={20} className="text-blue-600" />
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Create Product
                </h1>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${editingProductId && activeStep === 2 ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                  {editingProductId && activeStep === 2
                    ? "Editing product"
                    : activeStep >= 3
                      ? "Unsaved draft"
                      : "New product"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Follow four clear steps. Only the section you need is shown at each stage.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/products")}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Database size={16} />
            View Listed Products
          </button>
        </div>
      </header>

      {databaseError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {databaseError}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Four-step workflow</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Complete one section at a time</h2>
            <p className="mt-1 text-sm text-slate-500">Your work stays in this unsaved workspace until you save it from the final step.</p>
          </div>

          <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Product creation steps">
            <WorkflowStep step={1} title="Select model" detail={hasOneModel ? selectedModel : "Choose one phone"} icon={<Smartphone size={16} />} active={activeStep === 1} complete={hasOneModel} onClick={() => setActiveStep(1)} />
            <WorkflowStep step={2} title="Product details" detail={detailsReady ? "Required details ready" : "Listing, price and images"} icon={<FileText size={16} />} active={activeStep === 2} complete={Boolean(currentParent) || detailsReady} disabled={!hasOneModel} onClick={() => setActiveStep(2)} />
            <WorkflowStep step={3} title="Create variants" detail={currentVariants.length ? `${currentVariants.length} variants created` : "Optional variant setup"} icon={<Layers3 size={16} />} active={activeStep === 3} complete={currentVariants.length > 0} optional disabled={!currentParent} onClick={() => setActiveStep(3)} />
            <WorkflowStep step={4} title="Batch & save" detail={`${products.length} unsaved records`} icon={<Database size={16} />} active={activeStep === 4} complete={false} disabled={!products.length} onClick={() => setActiveStep(4)} />
          </nav>
        </div>

        <div className="bg-[#f8fafc] p-4 sm:p-5">
          {activeStep === 1 && (
            <>
              <ModelSelector selectedModels={selectedModels} setSelectedModels={setSelectedModels} />
              {selectedModels.length > 1 && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  Keep only one phone model selected for each parent product.
                </p>
              )}
            </>
          )}

          {activeStep === 2 && hasOneModel && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4">
                <p className="text-sm font-bold text-slate-900">Creating for {selectedModel}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Complete the required title, design name and design code. Pricing, product attributes and image links stay together in this step.
                </p>
              </div>

              <input
                type="hidden"
                {...register("designId")}
              />

              <DesignLibraryPicker
                selectedDesignId={formData.designId}
                selectedModel={selectedModel}
                refreshKey={designLibraryRefreshKey}
                onSelect={selectSavedDesign}
                onDesignsLoaded={handleDesignsLoaded}
              />

              <details className="group overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <span className="flex items-center gap-3">
                    <span className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                      <Sparkles size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-900">AI image assistant</span>
                      <span className="mt-0.5 block text-xs text-slate-500">Optional — scan an image to fill product details faster</span>
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-slate-400 transition group-open:rotate-90" />
                </summary>
                <div className="border-t border-slate-100 p-4 sm:p-5">
                  <AiProductScanner
                    imageTargetId={editingProductId || `phone-draft-${uploadFormId}-${uploadFormEpoch}`}
                    imageValue={formData.image1}
                    onImageUploaded={url => setValue("image1", url, { shouldDirty: true, shouldValidate: true })}
                    category={formData.category}
                    model={selectedModel}
                    theme={formData.theme}
                    productType={formData.type}
                    provider={aiProvider}
                    onCategoryChange={(value) =>
                      setValue("category", value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    onModelChange={changeAssistantModel}
                    onThemeChange={(value) =>
                      setValue("theme", value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    onProductTypeChange={(value) =>
                      setValue("type", value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    onProviderChange={changeAiProvider}
                    usedDesignCodes={Array.from(
                      new Set([
                        ...designLibraryCodes,
                        ...products.map((product) => product.designCode),
                      ]),
                    )}
                    onGenerated={handleAiGenerated}
                  />
                </div>
              </details>

              <ProductDetails register={register} control={control} setValue={setValue} watch={watch} selectedModel={selectedModel} generatedProductTitle={generatedProductTitle} />
              <ImageLinks register={register} rowId={editingProductId || `phone-draft-${uploadFormId}-${uploadFormEpoch}`} values={formData} onChange={(field, url) => setValue(field, url, { shouldDirty: true, shouldValidate: true })} />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                <span>{imageCount} of 4 image links added</span>
                <span>Design number and SKU are generated automatically</span>
              </div>
            </div>
          )}

          {activeStep === 3 && currentParent && (
            <div className="space-y-4">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                        Parent ready
                      </span>
                      <span className="text-xs font-semibold text-slate-500">Design {currentParent.designNumber}</span>
                    </div>
                    <h3 className="mt-2 text-base font-bold text-slate-950">{currentParent.productName}</h3>
                    <p className="mt-1 text-xs text-slate-500">{currentParent.models[0]?.model} · {currentParent.sku}</p>
                  </div>
                  <button type="button" onClick={() => setActiveStep(2)} className={secondaryButtonClass}>
                    Edit product details
                  </button>
                </div>

                <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                  <div>
                    <label htmlFor="variant-quantity" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Number of variants
                    </label>
                    <input
                      id="variant-quantity"
                      type="number"
                      min={1}
                      max={10}
                      value={currentVariantQuantity}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariantQuantities((current) => ({
                          ...current,
                          [currentParent.id]: value,
                        }));
                        setVariantTitles((current) => {
                          const next = { ...current };
                          delete next[currentParent.id];
                          return next;
                        });
                      }}
                      placeholder="1 to 10"
                      className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Every variant keeps the parent design number and receives a unique title, version and SKU.
                    </p>
                    <button
                      type="button"
                      onClick={() => void generateVariantTitles(currentParent)}
                      disabled={generatingCurrentTitles || !currentVariantQuantity}
                      className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 text-sm font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      {generatingCurrentTitles ? "Generating titles..." : "Generate variant titles"}
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Variant titles</p>
                        <p className="mt-1 text-xs text-slate-500">Generate titles, then edit any wording before creating variants.</p>
                      </div>
                      {currentVariantTitles.length > 0 && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                          {currentVariantTitles.length} ready
                        </span>
                      )}
                    </div>

                    {currentVariantTitles.length ? (
                      <div className="mt-4 space-y-3">
                        {currentVariantTitles.map((title, index) => (
                          <label key={`${currentParent.id}-title-${index}`} className="grid gap-2 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-center">
                            <span className="text-xs font-bold text-slate-500">V{currentVariants.length + index + 2}</span>
                            <input
                              value={title}
                              onChange={(event) => {
                                const value = event.target.value;
                                setVariantTitles((current) => ({
                                  ...current,
                                  [currentParent.id]: (current[currentParent.id] ?? []).map((currentTitle, titleIndex) =>
                                    titleIndex === index ? value : currentTitle,
                                  ),
                                }));
                              }}
                              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                          </label>
                        ))}

                        <button
                          type="button"
                          onClick={() => createVariants(currentParent)}
                          disabled={
                            currentVariantTitles.length !== Number(currentVariantQuantity) ||
                            currentVariantTitles.some((title) => !title.trim())
                          }
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Plus size={16} />
                          Create {currentVariantQuantity || ""} variants
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                        <Layers3 className="mx-auto h-6 w-6 text-slate-300" />
                        <p className="mt-2 text-xs font-semibold text-slate-600">No titles generated yet</p>
                        <p className="mt-1 text-[11px] text-slate-400">Enter a quantity, then generate related titles.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {currentVariants.length > 0 && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Created variants</h3>
                      <p className="mt-1 text-xs text-slate-500">These records are ready for final review. All fields remain editable in Step 4.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                      {currentVariants.length} total
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {currentVariants.map((variant) => (
                      <div key={variant.id} className="min-w-0 rounded-xl border border-emerald-100 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">V{variant.variantNumber}</span>
                          <button type="button" onClick={() => removeProduct(variant)} className="text-[11px] font-bold text-rose-600 hover:text-rose-700">
                            Remove
                          </button>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-slate-800">{variant.productName}</p>
                        <p className="mt-1 truncate text-[10px] text-slate-400">{variant.sku}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeStep === 4 && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4">
              <p className="text-sm font-bold text-slate-900">Final batch review</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Review and edit every field below. Use Save Parent + Variants above the table, or export the complete unsaved batch.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">
            {activeStep === 1 && (hasOneModel ? `${selectedModel} selected. Continue when ready.` : "Choose exactly one phone model to begin.")}
            {activeStep === 2 && "Required fields: product title, design name and design code."}
            {activeStep === 3 && "Variants are optional. You can continue directly to the batch."}
            {activeStep === 4 && "Only Save Parent + Variants permanently stores these records."}
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            {editingProductId && activeStep === 2 && (
              <button type="button" onClick={resetEditor} className={secondaryButtonClass}>
                Cancel Editing
              </button>
            )}

            {activeStep > 1 && (
              <button type="button" onClick={() => setActiveStep((activeStep - 1) as BuilderStep)} className={secondaryButtonClass}>
                Previous
              </button>
            )}

            {activeStep === 1 && (
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                disabled={!hasOneModel}
                className={primaryButtonClass}
              >
                Continue to product details
                <ChevronRight size={16} />
              </button>
            )}

            {activeStep === 2 && (
              <button
                type="button"
                onClick={() => void addProductToBatch()}
                disabled={isSaving || designNumberLoading || !detailsReady}
                className={primaryButtonClass}
              >
                {editingProductId ? <Check size={17} /> : <Plus size={17} />}
                {designNumberLoading
                  ? "Generating Design Number..."
                  : editingProductId
                    ? "Update details & continue"
                    : "Add product & continue"}
                {!designNumberLoading && <ChevronRight size={16} />}
              </button>
            )}

            {activeStep === 3 && (
              <button type="button" onClick={() => setActiveStep(4)} className={primaryButtonClass}>
                Review batch
                <ChevronRight size={16} />
              </button>
            )}

            {activeStep === 4 && (
              <button type="button" onClick={resetEditor} className={primaryButtonClass}>
                <Plus size={16} />
                Create another product
              </button>
            )}
          </div>
        </div>
      </section>

      {activeStep === 4 && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={<Smartphone size={19} />} label="Selected model" value={selectedModel || "Mixed batch"} helper="Current product model" />
            <SummaryCard icon={<PackagePlus size={19} />} label="Parent products" value={String(parentProducts.length)} helper="In current batch" />
            <SummaryCard icon={<Layers3 size={19} />} label="Variants" value={String(variantCount)} helper="Linked to parents" />
            <SummaryCard icon={<Database size={19} />} label="Batch records" value={String(products.length)} helper="Not saved yet" />
          </section>

          <div className="flex flex-col gap-1 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 4 · Batch record</p>
            <h2 className="text-xl font-bold text-slate-900">Review, edit, save or export</h2>
            <p className="text-sm text-slate-500">Expand a parent to edit every field. Database and export actions are available only on this final page.</p>
          </div>

      {/* BATCH TABLE */}

      <PreviewTable
        data={
          formData
        }
        selectedModels={
          selectedModels
        }
        products={
          products
        }
        isSaving={
          isSaving
        }
        databaseError={
          databaseError
        }
        variantQuantities={
          variantQuantities
        }
        variantTitles={
          variantTitles
        }
        generatingVariantTitles={
          generatingVariantTitles
        }
        onSetVariantQuantity={(
          productId,
          value,
        ) => {
          setVariantQuantities(
            (current) => ({
              ...current,
              [productId]:
                value,
            }),
          );

          setVariantTitles(
            (current) => {
              const next = {
                ...current,
              };

              delete next[
                productId
              ];

              return next;
            },
          );
        }}
        onGenerateVariantTitles={
          generateVariantTitles
        }
        onCreateVariants={
          createVariants
        }
        onEditProduct={
          editProduct
        }
        onRemoveProduct={
          removeProduct
        }
        onSaveProduct={
          saveProductToDatabase
        }
        onUpdateProduct={(
          productId,
          field,
          value,
        ) => {
          if (field === "brand") {
            setProducts((current) => {
              const parent = current.find(
                (product) => product.id === productId && !product.parentId,
              );
              return current.map((product) =>
                product.id === productId ||
                (parent && product.parentId === parent.id &&
                  (product.variantType ?? "standard") === "standard")
                  ? applyProductBrand(product, value)
                  : product,
              );
            });
            if (editingProductId === productId) {
              setValue("brand", value, { shouldDirty: true });
              const details = getBrandSupplyDetails(value);
              for (const key of Object.keys(details) as Array<keyof typeof details>) {
                setValue(key, details[key], { shouldDirty: true });
              }
            }
            return;
          }

          if (field === "price") {
            const price = Number(value || 0);
            if (!Number.isFinite(price) || price < 0) return;

            setProducts((current) => {
              const parent = current.find(
                (product) => product.id === productId && !product.parentId,
              );

              return current.map((product) => {
                if (product.id === productId) return { ...product, price };

                if (
                  parent &&
                  parent.price !== price &&
                  product.parentId === parent.id &&
                  (product.variantType ?? "standard") === "standard"
                ) {
                  return {
                    ...product,
                    price: getVariantPrice(
                      price,
                      product.variantNumber ?? product.version,
                    ),
                  };
                }

                return product;
              });
            });

            if (editingProductId === productId) {
              setValue("price", price, { shouldDirty: true });
            }
            return;
          }

          if (field === "wrongDefectiveReturnsPrice") {
            const discount = getWrongDefectiveReturnDiscount(value);
            setProducts((current) => current.map((product) =>
              product.id === productId
                ? { ...product, wrongDefectiveReturnsPrice: discount }
                : product,
            ));
            if (editingProductId === productId) {
              setValue("wrongDefectiveReturnsPrice", discount, { shouldDirty: true });
            }
            return;
          }

          setProducts(
            (current) =>
              current.map(
                (product) => {
                  if (
                    product.id !==
                    productId
                  ) {
                    return product;
                  }

                  if (
                    field ===
                      "mrp" ||
                    field ===
                      "inventory" ||
                    field ===
                      "gst" ||
                    field ===
                      "weight" ||
                    field ===
                      "quantity" ||
                    field ===
                      "length" ||
                    field ===
                      "width"
                  ) {
                    return {
                      ...product,

                      [field]:
                        Number(
                          value ||
                            0,
                        ),
                    };
                  }

                  return {
                    ...product,

                    [field]:
                      value,
                  };
                },
              ),
          );
        }}
        onUpdateVariantImage={
          updateVariantImage
        }
        onUpdateProductModels={(
          productId,
          model,
        ) => {
          setProducts(
            (current) =>
              current.map(
                (
                  product,
                ) => {
                  if (
                    product.id !==
                    productId
                  ) {
                    return product;
                  }

                  return {
                    ...product,

                    models: [
                      {
                        model,
                      },
                    ],
                  };
                },
              ),
          );
        }}
        onClearBatch={
          resetBatch
        }
        totalProducts={
          parentProducts.length
        }
        totalVariants={
          variantCount
        }
        showVariantGenerator={
          false
        }
      />

      {/* DATABASE INFO */}

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm">
            <Save size={19} />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">
              Review first, save when ready
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              Products and variants remain in this local batch until you select
              <strong> Save Parent + Variants</strong> above the table. Saving removes them from this workspace
              and makes them available on the Listed Products page.
            </p>
          </div>
        </div>
      </div>

      {/* EXPORT */}

      <ExportButton
        products={
          products
        }
        onReset={
          resetBatch
        }
      />
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">{icon}</div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-slate-400">{helper}</p>
    </div>
  );
}

function WorkflowStep({ step, title, detail, icon, active, complete = false, optional = false, disabled = false, onClick }: { step: BuilderStep; title: string; detail: string; icon: ReactNode; active: boolean; complete?: boolean; optional?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "step" : undefined}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-blue-200 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${complete ? "bg-emerald-100 text-emerald-700" : active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
        {complete ? <Check size={16} /> : icon}
      </span>
      <span className="min-w-0">
        <span className={`block text-[9px] font-bold uppercase tracking-wider ${active ? "text-blue-600" : "text-slate-400"}`}>
          Step {step}{optional ? " · Optional" : ""}
        </span>
        <span className="mt-0.5 block truncate text-xs font-bold text-slate-800">{title}</span>
        <span className="mt-0.5 block truncate text-[10px] text-slate-500">{detail}</span>
      </span>
    </button>
  );
}

const secondaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40";
const primaryButtonClass = "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40";

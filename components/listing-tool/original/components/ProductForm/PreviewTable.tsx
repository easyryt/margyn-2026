"use client";

import {
  ChevronDown,
  ChevronRight,
  Database,
  Image as ImageIcon,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { BRANDS } from "@/components/listing-tool/original/lib/brands";
import { getWrongDefectiveReturnDiscount } from "@/components/listing-tool/original/lib/pricing";
import ProductTitleNotice from "@/components/listing-tool/original/components/ProductTitleNotice";
import MeeshoImageUpload from "@/components/listing-tool/original/components/MeeshoImageUpload";
import MeeshoImageSetUpload from "@/components/listing-tool/original/components/MeeshoImageSetUpload";

import type {
  FormData,
  Product,
  SelectedModel,
} from "./ProductCard";

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
  | "printType"
  | "finish"
  | "version"
  | "groupId"
  | "image1"
  | "image2"
  | "image3"
  | "image4";

type VariantImageField =
  | "image1"
  | "image2"
  | "image3"
  | "image4";

type Props = {
  data: FormData;
  selectedModels: SelectedModel[];
  products?: Product[];

  isSaving?: boolean;
  databaseError?: string | null;

  totalProducts?: number;
  totalVariants?: number;
  showVariantGenerator?: boolean;

  variantQuantities?: Record<string, string>;
  variantTitles?: Record<string, string[]>;
  generatingVariantTitles?: Record<
    string,
    boolean
  >;

  onSetVariantQuantity?: (
    productId: string,
    value: string,
  ) => void;

  onGenerateVariantTitles?: (
    product: Product,
  ) => void;

  onCreateVariants?: (
    product: Product,
  ) => void;

  onEditProduct?: (
    product: Product,
  ) => void;

  onRemoveProduct?: (
    product: Product,
  ) => void;

  onSaveProduct?: (
    product: Product,
  ) => void;

  onUpdateProduct?: (
    productId: string,
    field: EditableField,
    value: string,
  ) => void;

  onUpdateProductModels?: (
    productId: string,
    model: string,
  ) => void;

  onUpdateVariantImage?: (
    variantId: string,
    field: VariantImageField,
    value: string,
  ) => void;

  onClearBatch?: () => void;
};

export default function PreviewTable({
  data,
  selectedModels,
  products = [],
  isSaving = false,
  databaseError = null,
  totalProducts = 0,
  totalVariants = 0,
  showVariantGenerator = true,
  variantQuantities = {},
  variantTitles = {},
  generatingVariantTitles = {},
  onSetVariantQuantity,
  onGenerateVariantTitles,
  onCreateVariants,
  onEditProduct,
  onRemoveProduct,
  onSaveProduct,
  onUpdateProduct,
  onUpdateProductModels,
  onUpdateVariantImage,
  onClearBatch,
}: Props) {
  const parents = useMemo(
    () =>
      products.filter(
        (product) =>
          !product.parentId,
      ),
    [products],
  );

  const variantsByParent =
    useMemo(() => {
      const map =
        new Map<
          string,
          Product[]
        >();

      for (const product of products) {
        if (!product.parentId) {
          continue;
        }

        const list =
          map.get(
            product.parentId,
          ) ?? [];

        list.push(product);

        map.set(
          product.parentId,
          list,
        );
      }

      for (const [
        parentId,
        variants,
      ] of map) {
        variants.sort(
          (first, second) =>
            (first.variantNumber ??
              0) -
            (second.variantNumber ??
              0),
        );

        map.set(
          parentId,
          variants,
        );
      }

      return map;
    }, [products]);

  const [
    expandedParents,
    setExpandedParents,
  ] = useState<Set<string>>(
    () =>
      new Set(
        parents.map(
          (parent) =>
            parent.id,
        ),
      ),
  );

  const toggleParent = (
    id: string,
  ) => {
    setExpandedParents(
      (current) => {
        const next =
          new Set(current);

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      },
    );
  };

  const expandAll = () => {
    setExpandedParents(
      new Set(
        parents.map(
          (parent) =>
            parent.id,
        ),
      ),
    );
  };

  const collapseAll = () => {
    setExpandedParents(
      new Set(),
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER                                                           */}
      {/* ---------------------------------------------------------------- */}

      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Batch editor
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Products & Variants
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Every parent and variant is editable here before export or database save.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
              {totalProducts}{" "}
              parent
              {totalProducts === 1
                ? ""
                : "s"}
            </span>

            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">
              {totalVariants}{" "}
              variant
              {totalVariants === 1
                ? ""
                : "s"}
            </span>

            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">
              Unsaved
            </span>
          </div>
        </div>

        {products.length ===
        0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No products in the batch yet.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Add a product above and it will appear here as an editable table.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">
              Scroll horizontally to edit all fields. Type and Product Name stay fixed.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  expandAll
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Expand All
              </button>

              <button
                type="button"
                onClick={
                  collapseAll
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Collapse All
              </button>

              {onClearBatch && (
                <button
                  type="button"
                  onClick={
                    onClearBatch
                  }
                  disabled={
                    isSaving
                  }
                  className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Clear Batch
                </button>
              )}
            </div>
          </div>
        )}

        {parents.length > 0 && onSaveProduct && (
          <div role="region" aria-label="Save batch products" aria-busy={isSaving} className="mt-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ready to save</h3>
              <p className="mt-1 text-xs text-slate-500">
                Save each parent together with its variants here. No horizontal scrolling needed.
              </p>
            </div>
            {parents.map((parent) => {
              const variantCount = variantsByParent.get(parent.id)?.length ?? 0;

              return (
                <div key={parent.id} className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">{parent.productName}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Design {parent.designNumber || "—"} · 1 parent + {variantCount} variant{variantCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSaveProduct(parent)}
                    disabled={isSaving}
                    aria-label={`Save Parent + Variants: ${parent.productName}`}
                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <Database size={16} aria-hidden="true" />
                    {isSaving ? "Saving..." : "Save Parent + Variants"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <ProductTitleNotice titles={products.map((product) => product.productName)} />
        {databaseError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {databaseError}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* TABLE                                                            */}
      {/* ---------------------------------------------------------------- */}

      {products.length >
        0 && (
        <div className="relative isolate overflow-x-auto rounded-xl">
          <table className="w-full min-w-[3300px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100">
                <Head
                  sticky
                  leftClass="left-0"
                  widthClass="w-[110px]"
                  stickyBg="bg-slate-100"
                  zIndex="z-50"
                >
                  Type
                </Head>

                <Head
                  sticky
                  leftClass="left-[110px]"
                  widthClass="w-[320px]"
                  stickyBg="bg-slate-100"
                  zIndex="z-50"
                >
                  Product Name
                </Head>

                <Head>
                  Model
                </Head>

                <Head>
                  Description
                </Head>

                <Head>
                  Brand
                </Head>

                <Head>
                  Category
                </Head>

                <Head>
                  Material
                </Head>

                <Head>
                  Color
                </Head>

                <Head>
                  Theme
                </Head>

                <Head>
                  Type
                </Head>

                <Head>
                  Price
                </Head>

                <Head>
                  Wrong/Defective Return Discount (₹)
                </Head>

                <Head>
                  MRP
                </Head>

                <Head>
                  GST
                </Head>

                <Head>
                  HSN
                </Head>

                <Head>
                  Weight
                </Head>

                <Head>
                  Inventory
                </Head>

                <Head>
                  Country
                </Head>

                <Head>
                  Manufacturer
                </Head>

                <Head>
                  Manufacturer Address
                </Head>

                <Head>
                  Manufacturer Pincode
                </Head>

                <Head>
                  Packer
                </Head>

                <Head>
                  Packer Address
                </Head>

                <Head>
                  Packer Pincode
                </Head>

                <Head>
                  Importer
                </Head>

                <Head>
                  Importer Address
                </Head>

                <Head>
                  Importer Pincode
                </Head>

                <Head>
                  Generic Name
                </Head>

                <Head>
                  Size
                </Head>

                <Head>
                  Quantity
                </Head>

                <Head>
                  Length
                </Head>

                <Head>
                  Width
                </Head>

                <Head>
                  Design Name
                </Head>

                <Head>
                  Design Code
                </Head>

                <Head>
                  Design Number
                </Head>

                <Head>
                  SKU
                </Head>

                <Head>
                  Print Type
                </Head>

                <Head>
                  Finish
                </Head>

                <Head>
                  Version
                </Head>

                <Head>
                  Group ID
                </Head>

                <Head>
                  Image 1
                </Head>

                <Head>
                  Image 2
                </Head>

                <Head>
                  Image 3
                </Head>

                <Head>
                  Image 4
                </Head>

                <Head>
                  Actions
                </Head>
              </tr>
            </thead>

            <tbody>
              {parents.map(
                (parent) => {
                  const variants =
                    variantsByParent.get(
                      parent.id,
                    ) ?? [];

                  const expanded =
                    expandedParents.has(
                      parent.id,
                    );

                  const quantity =
                    variantQuantities[
                      parent.id
                    ] ?? "";

                  const titles =
                    variantTitles[
                      parent.id
                    ] ?? [];

                  const generating =
                    Boolean(
                      generatingVariantTitles[
                        parent.id
                      ],
                    );

                  return (
                    <ParentGroup
                      key={
                        parent.id
                      }
                      parent={
                        parent
                      }
                      variants={
                        variants
                      }
                      expanded={
                        expanded
                      }
                      quantity={
                        quantity
                      }
                      titles={
                        titles
                      }
                      generating={
                        generating
                      }
                      showVariantGenerator={
                        showVariantGenerator
                      }
                      saving={
                        isSaving
                      }
                      onToggle={() =>
                        toggleParent(
                          parent.id,
                        )
                      }
                      onSetQuantity={
                        onSetVariantQuantity
                      }
                      onGenerateTitles={
                        onGenerateVariantTitles
                      }
                      onCreateVariants={
                        onCreateVariants
                      }
                      onEdit={
                        onEditProduct
                      }
                      onRemove={
                        onRemoveProduct
                      }
                      onUpdate={
                        onUpdateProduct
                      }
                      onUpdateModel={
                        onUpdateProductModels
                      }
                    />
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* EMPTY PREVIEW                                                    */}
      {/* ---------------------------------------------------------------- */}

      {products.length ===
        0 && (
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Preview
              value={
                data.productName
              }
              label="Product"
            />

            <Preview
              value={data.brand}
              label="Brand"
            />

            <Preview
              value={
                data.designName
              }
              label="Design"
            />

            <Preview
              value={
                data.designNumber
              }
              label="Design No."
            />

            <Preview
              value={
                data.designCode
              }
              label="Design Code"
            />

            <Preview
              value={data.sku}
              label="SKU"
            />

            <Preview
              value={`₹${Number(
                data.price ??
                  0,
              ).toLocaleString(
                "en-IN",
              )}`}
              label="Price"
            />

            <Preview
              value={`₹${getWrongDefectiveReturnDiscount(
                data.wrongDefectiveReturnsPrice,
              ).toLocaleString("en-IN")}`}
              label="Wrong/Defective Return Discount (₹)"
            />

            <Preview
              value={`${Number(
                data.inventory ??
                  0,
              ).toLocaleString(
                "en-IN",
              )} units`}
              label="Stock"
            />

            <Preview
              value={
                selectedModels[0]
                  ?.model ??
                "No model"
              }
              label="Phone Model"
            />
          </div>
        </div>
      )}
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| Parent
|--------------------------------------------------------------------------
*/

function ParentGroup({
  parent,
  variants,
  expanded,
  quantity,
  titles,
  generating,
  showVariantGenerator,
  saving,
  onToggle,
  onSetQuantity,
  onGenerateTitles,
  onCreateVariants,
  onEdit,
  onRemove,
  onUpdate,
  onUpdateModel,
}: {
  parent: Product;
  variants: Product[];
  expanded: boolean;
  quantity: string;
  titles: string[];
  generating: boolean;
  showVariantGenerator: boolean;
  saving: boolean;
  onToggle: () => void;
  onSetQuantity?: (
    id: string,
    value: string,
  ) => void;
  onGenerateTitles?: (
    product: Product,
  ) => void;
  onCreateVariants?: (
    product: Product,
  ) => void;
  onEdit?: (
    product: Product,
  ) => void;
  onRemove?: (
    product: Product,
  ) => void;
  onUpdate?: (
    id: string,
    field: EditableField,
    value: string,
  ) => void;
  onUpdateModel?: (
    id: string,
    model: string,
  ) => void;
}) {
  const complete =
    Number(quantity || 0) >
      0 &&
    titles.length ===
      Number(
        quantity || 0,
      );

  return (
    <>
      {/* ================================================================ */}
      {/* PARENT ROW                                                        */}
      {/* ================================================================ */}

      <tr className="border-b-2 border-slate-300 bg-white align-top">
        <Cell
          sticky
          leftClass="left-0"
          widthClass="w-[110px]"
          rowBg="!bg-white"
          zIndex="z-40"
        >
          <div className="flex min-w-[95px] flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggle}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                title="Expand/collapse variants"
              >
                {expanded ? (
                  <ChevronDown
                    size={15}
                  />
                ) : (
                  <ChevronRight
                    size={15}
                  />
                )}
              </button>

              <span className="rounded-full bg-blue-100 px-2 py-1 text-[9px] font-bold uppercase text-blue-700">
                Parent V1
              </span>
            </div>

            <div className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
              {variants.length}{" "}
              variant
              {variants.length ===
              1
                ? ""
                : "s"}
            </div>
          </div>
        </Cell>

        <EditableCell
          sticky
          stickyLeft="left-[110px]"
          stickyWidth="w-[320px]"
          rowBg="!bg-white"
          value={
            parent.productName
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "productName",
              value,
            )
          }
          wide
        />

        <ModelCell
          product={parent}
          onUpdate={
            onUpdateModel
          }
        />


        <EditableCell
          value={
            parent.description
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "description",
              value,
            )
          }
          wide
          multiline
        />

        <BrandCell product={parent} onUpdate={onUpdate} />

        <EditableCell
          value={
            parent.category
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "category",
              value,
            )
          }
          wide
        />

        <EditableCell
          value={
            parent.material
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "material",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.color
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "color",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.theme
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "theme",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.type
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "type",
              value,
            )
          }
        />

        <NumberCell
          value={
            parent.price
          }
          min={0}
          step="any"
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "price",
              value,
            )
          }
        />

        <NumberCell
          value={getWrongDefectiveReturnDiscount(parent.wrongDefectiveReturnsPrice)}
          min={0}
          max={30}
          step={1}
          onChange={(value) =>
            onUpdate?.(parent.id, "wrongDefectiveReturnsPrice", value)
          }
        />

        <NumberCell
          value={
            parent.mrp
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "mrp",
              value,
            )
          }
        />

        <NumberCell
          value={
            parent.gst
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "gst",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.hsn
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "hsn",
              value,
            )
          }
        />

        <NumberCell
          value={
            parent.weight
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "weight",
              value,
            )
          }
        />

        <NumberCell
          value={
            parent.inventory
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "inventory",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.country
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "country",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.manufacturer
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "manufacturer",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.manufacturerAddress
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "manufacturerAddress",
              value,
            )
          }
          wide
        />

        <EditableCell
          value={
            parent.manufacturerPincode
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "manufacturerPincode",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.packer
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "packer",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.packerAddress
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "packerAddress",
              value,
            )
          }
          wide
        />

        <EditableCell
          value={
            parent.packerPincode
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "packerPincode",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.importer
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "importer",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.importerAddress
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "importerAddress",
              value,
            )
          }
          wide
        />

        <EditableCell
          value={
            parent.importerPincode
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "importerPincode",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.genericName
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "genericName",
              value,
            )
          }
          wide
        />

        <EditableCell
          value={
            parent.size
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "size",
              value,
            )
          }
        />

        <NumberCell
          value={
            parent.quantity
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "quantity",
              value,
            )
          }
        />

        <NumberCell
          value={
            parent.length
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "length",
              value,
            )
          }
        />

        <NumberCell
          value={
            parent.width
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "width",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.designName
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "designName",
              value,
            )
          }
          wide
        />

        <EditableCell
          value={
            parent.designCode
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "designCode",
              value.toUpperCase(),
            )
          }
          mono
        />

        <EditableCell
          value={
            parent.designNumber
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "designNumber",
              value,
            )
          }
          mono
        />

        <EditableCell
          value={
            parent.sku
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "sku",
              value.toUpperCase(),
            )
          }
          mono
          wide
        />

        <EditableCell
          value={
            parent.printType
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "printType",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.finish
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "finish",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.version
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "version",
              value,
            )
          }
        />

        <EditableCell
          value={
            parent.groupId
          }
          onChange={(
            value,
          ) =>
            onUpdate?.(
              parent.id,
              "groupId",
              value,
            )
          }
          mono
        />

        <ImageCell
          product={parent}
          field="image1"
          onUpdate={
            onUpdate
          }
        />

        <ImageCell
          product={parent}
          field="image2"
          onUpdate={
            onUpdate
          }
        />

        <ImageCell
          product={parent}
          field="image3"
          onUpdate={
            onUpdate
          }
        />

        <ImageCell
          product={parent}
          field="image4"
          onUpdate={
            onUpdate
          }
        />

        <Cell>
          <div className="flex min-w-[190px] flex-col gap-2">
            <div className="flex gap-2">
              <ActionButton
                onClick={() =>
                  onEdit?.(
                    parent,
                  )
                }
                disabled={
                  saving
                }
              >
                <Pencil
                  size={13}
                />
                Edit Form
              </ActionButton>

              <ActionButton
                danger
                onClick={() =>
                  onRemove?.(
                    parent,
                  )
                }
                disabled={
                  saving
                }
              >
                <Trash2
                  size={13}
                />
                Remove
              </ActionButton>
            </div>

          </div>
        </Cell>
      </tr>

      {/* ================================================================ */}
      {/* VARIANT GENERATION                                               */}
      {/* ================================================================ */}

      {showVariantGenerator && (
      <tr className="border-b border-slate-200 bg-slate-50">
        <td
          colSpan={45}
          className="p-3"
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Variant Generation
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Generate AI titles, then create the variants. They will appear directly underneath this parent.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={10}
                value={
                  quantity
                }
                onChange={(
                  event,
                ) =>
                  onSetQuantity?.(
                    parent.id,
                    event.target
                      .value,
                  )
                }
                placeholder="Variant quantity"
                className="h-10 w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <ActionButton
                onClick={() =>
                  onGenerateTitles?.(
                    parent,
                  )
                }
                disabled={
                  saving ||
                  generating
                }
                violet
              >
                <Sparkles
                  size={14}
                />

                {generating
                  ? "Generating..."
                  : "Generate AI Titles"}
              </ActionButton>

              <ActionButton
                onClick={() =>
                  onCreateVariants?.(
                    parent,
                  )
                }
                disabled={
                  saving ||
                  !complete
                }
                violetFill
              >
                <Plus
                  size={14}
                />

                Create{" "}
                {Number(
                  quantity ||
                    0,
                ) || ""}{" "}
                Variants
              </ActionButton>
            </div>
          </div>

          {titles.length >
            0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {titles.map(
                (
                  title,
                  index,
                ) => (
                  <span
                    key={`${title}-${index}`}
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                  >
                    V
                    {variants.length +
                      index +
                      2}
                    :{" "}
                    {title}
                  </span>
                ),
              )}
            </div>
          )}
        </td>
      </tr>
      )}

      {/* ================================================================ */}
      {/* VARIANTS                                                          */}
      {/* ================================================================ */}

      {expanded &&
        variants.map(
          (variant) => (
            <VariantRow
              key={
                variant.id
              }
              product={
                variant
              }
              saving={
                saving
              }
              onRemove={
                onRemove
              }
              onUpdate={
                onUpdate
              }
              onUpdateModel={
                onUpdateModel
              }
            />
          ),
        )}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| Variant Row
|--------------------------------------------------------------------------
*/

function VariantRow({
  product,
  saving,
  onRemove,
  onUpdate,
  onUpdateModel,
}: {
  product: Product;
  saving: boolean;
  onRemove?: (
    product: Product,
  ) => void;
  onUpdate?: (
    id: string,
    field: EditableField,
    value: string,
  ) => void;
  onUpdateModel?: (
    id: string,
    model: string,
  ) => void;
}) {
  return (
    <tr className="border-b border-blue-100 bg-blue-50/40 align-top">
      {/* --------------------------------------------------------------- */}
      {/* FIXED TYPE                                                       */}
      {/* --------------------------------------------------------------- */}

      <Cell
        sticky
        leftClass="left-0"
        widthClass="w-[110px]"
        rowBg="!bg-white"
        zIndex="z-40"
      >
        <span className="inline-flex min-w-[85px] items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
          Variant V
          {product.variantNumber ??
            product.version}
        </span>
      </Cell>

      {/* --------------------------------------------------------------- */}
      {/* FIXED PRODUCT NAME                                               */}
      {/* --------------------------------------------------------------- */}

      <EditableCell
        sticky
        stickyLeft="left-[110px]"
        stickyWidth="w-[320px]"
        rowBg="!bg-white"
        value={
          product.productName
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "productName",
            value,
          )
        }
        wide
      />

      <ModelCell
        product={product}
        onUpdate={
          onUpdateModel
        }
      />

      <EditableCell
        value={
          product.description
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "description",
            value,
          )
        }
        wide
        multiline
      />

      <BrandCell product={product} onUpdate={onUpdate} />

      <EditableCell
        value={
          product.category
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "category",
            value,
          )
        }
        wide
      />

      <EditableCell
        value={
          product.material
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "material",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.color
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "color",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.theme
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "theme",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.type
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "type",
            value,
          )
        }
      />

      <NumberCell
        value={
          product.price
        }
        min={0}
        step="any"
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "price",
            value,
          )
        }
      />

      <NumberCell
        value={getWrongDefectiveReturnDiscount(product.wrongDefectiveReturnsPrice)}
        min={0}
        max={30}
        step={1}
        onChange={(value) =>
          onUpdate?.(product.id, "wrongDefectiveReturnsPrice", value)
        }
      />

      <NumberCell
        value={
          product.mrp
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "mrp",
            value,
          )
        }
      />

      <NumberCell
        value={
          product.gst
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "gst",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.hsn
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "hsn",
            value,
          )
        }
      />

      <NumberCell
        value={
          product.weight
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "weight",
            value,
          )
        }
      />

      <NumberCell
        value={
          product.inventory
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "inventory",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.country
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "country",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.manufacturer
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "manufacturer",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.manufacturerAddress
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "manufacturerAddress",
            value,
          )
        }
        wide
      />

      <EditableCell
        value={
          product.manufacturerPincode
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "manufacturerPincode",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.packer
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "packer",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.packerAddress
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "packerAddress",
            value,
          )
        }
        wide
      />

      <EditableCell
        value={
          product.packerPincode
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "packerPincode",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.importer
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "importer",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.importerAddress
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "importerAddress",
            value,
          )
        }
        wide
      />

      <EditableCell
        value={
          product.importerPincode
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "importerPincode",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.genericName
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "genericName",
            value,
          )
        }
        wide
      />

      <EditableCell
        value={
          product.size
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "size",
            value,
          )
        }
      />

      <NumberCell
        value={
          product.quantity
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "quantity",
            value,
          )
        }
      />

      <NumberCell
        value={
          product.length
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "length",
            value,
          )
        }
      />

      <NumberCell
        value={
          product.width
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "width",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.designName
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "designName",
            value,
          )
        }
        wide
      />

      <EditableCell
        value={
          product.designCode
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "designCode",
            value.toUpperCase(),
          )
        }
        mono
      />

      <EditableCell
        value={
          product.designNumber
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "designNumber",
            value,
          )
        }
        mono
      />

      <EditableCell
        value={
          product.sku
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "sku",
            value.toUpperCase(),
          )
        }
        mono
        wide
      />

      <EditableCell
        value={
          product.printType
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "printType",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.finish
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "finish",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.version
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "version",
            value,
          )
        }
      />

      <EditableCell
        value={
          product.groupId
        }
        onChange={(value) =>
          onUpdate?.(
            product.id,
            "groupId",
            value,
          )
        }
        mono
      />

      <ImageCell
        product={product}
        field="image1"
        onUpdate={
          onUpdate
        }
      />

      <ImageCell
        product={product}
        field="image2"
        onUpdate={
          onUpdate
        }
      />

      <ImageCell
        product={product}
        field="image3"
        onUpdate={
          onUpdate
        }
      />

      <ImageCell
        product={product}
        field="image4"
        onUpdate={
          onUpdate
        }
      />

      <Cell>
        <div className="flex min-w-[120px] flex-col gap-2">
          <ActionButton
            danger
            onClick={() =>
              onRemove?.(
                product,
              )
            }
            disabled={
              saving
            }
            full
          >
            <Trash2
              size={13}
            />
            Remove Variant
          </ActionButton>
        </div>
      </Cell>
    </tr>
  );
}

/*
|--------------------------------------------------------------------------
| Model Cell
|--------------------------------------------------------------------------
*/

function BrandCell({ product, onUpdate }: {
  product: Product;
  onUpdate?: Props["onUpdateProduct"];
}) {
  const brands = BRANDS.some((brand) => brand === product.brand)
    ? BRANDS
    : [...BRANDS, product.brand];

  return (
    <Cell>
      <select
        aria-label={`Brand for ${product.productName}`}
        value={product.brand}
        onChange={(event) => onUpdate?.(product.id, "brand", event.target.value)}
        className="min-w-[150px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {brands.map((brand) => <option key={brand} value={brand}>{brand || "Select brand"}</option>)}
      </select>
    </Cell>
  );
}

function ModelCell({
  product,
  onUpdate,
}: {
  product: Product;
  onUpdate?: (
    id: string,
    model: string,
  ) => void;
}) {
  const model =
    product.models?.[0]
      ?.model ?? "";


  return (
    <Cell>
      <div className="min-w-[230px] space-y-1">
        <input
          value={model}
          onChange={(
            event,
          ) =>
            onUpdate?.(
              product.id,
              event.target
                .value,
            )
          }
          placeholder="Phone model"
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </Cell>
  );
}

/*
|--------------------------------------------------------------------------
| Image Cell
|--------------------------------------------------------------------------
*/

function ImageCell({
  product,
  field,
  onUpdate,
}: {
  product: Product;
  field: VariantImageField;
  onUpdate?: (
    id: string,
    field: EditableField,
    value: string,
  ) => void;
}) {
  const [hidden, setHidden] = useState(false);
  const value =
    product[field] ?? "";
  const imageUrl = value.trim();
  const imageLabel = `Image ${field.slice(-1)}`;
  const open = !hidden && Boolean(imageUrl);
  const toggleLabel = `${open ? "Hide" : "Show"} ${imageLabel.toLowerCase()} preview for ${product.productName}`;

  return (
    <Cell>
      <div className="min-w-[240px]">
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={value}
            aria-label={`${imageLabel} URL for ${product.productName}`}
            onChange={(
              event,
            ) =>
              onUpdate?.(
                product.id,
                field,
                event.target
                  .value,
              )
            }
            placeholder={`Paste ${field} URL`}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="button"
            onClick={() => setHidden((current) => !current)}
            disabled={!imageUrl}
            aria-label={toggleLabel}
            aria-expanded={open}
            className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            title={toggleLabel}
          >
            {open ? (
              <X
                size={13}
              />
            ) : (
              <ImageIcon
                size={13}
              />
            )}
          </button>
        </div>

        {onUpdate && field === "image1" && <MeeshoImageSetUpload rowId={product.id} values={product} onChange={(slot, url) => onUpdate(product.id, slot, url)} compact />}
        {onUpdate && <MeeshoImageUpload target={{ rowId: product.id, field }} value={value} onChange={url => onUpdate(product.id, field, url)} />}
        {open && (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <ImagePreview
                key={imageUrl}
                src={imageUrl}
                alt={`${imageLabel} for ${product.productName}`}
              />
            </div>
          )}
      </div>
    </Cell>
  );
}

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <p role="status" className="flex h-28 items-center justify-center px-3 text-center text-xs text-slate-500">
        Unable to load preview. Check the image URL.
      </p>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="h-28 w-full object-contain"
      onError={() => setFailed(true)}
    />
  );
}

/*
|--------------------------------------------------------------------------
| Editable Cell
|
| IMPORTANT FIX:
| Sticky cells ALWAYS use solid white background.
|--------------------------------------------------------------------------
*/

function EditableCell({
  value,
  onChange,
  wide = false,
  mono = false,
  multiline = false,
  sticky = false,
  stickyLeft = "",
  stickyWidth = "",
  rowBg = "!bg-white",
}: {
  value?: string | number;
  onChange: (
    value: string,
  ) => void;
  wide?: boolean;
  mono?: boolean;
  multiline?: boolean;
  sticky?: boolean;
  stickyLeft?: string;
  stickyWidth?: string;
  rowBg?: string;
}) {
  return (
    <Cell
      sticky={
        sticky
      }
      leftClass={
        stickyLeft
      }
      widthClass={
        stickyWidth
      }
      rowBg={
        rowBg
      }
      zIndex={
        sticky
          ? "z-40"
          : undefined
      }
    >
      {multiline ? (
        <textarea
          value={
            value ?? ""
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          rows={2}
          className={[
            "min-h-[55px] w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none",
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
            wide
              ? "min-w-[260px]"
              : "min-w-[150px]",
            mono
              ? "font-mono"
              : "",
          ].join(
            " ",
          )}
        />
      ) : (
        <input
          value={
            value ?? ""
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          className={[
            "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none",
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
            wide
              ? "min-w-[230px]"
              : "min-w-[140px]",
            mono
              ? "font-mono"
              : "",
          ].join(
            " ",
          )}
        />
      )}
    </Cell>
  );
}

/*
|--------------------------------------------------------------------------
| Number Cell
|--------------------------------------------------------------------------
*/

function NumberCell({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value?: number;
  min?: number;
  max?: number;
  step?: number | "any";
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <Cell>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={
          value ?? 0
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        className="w-[100px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </Cell>
  );
}

/*
|--------------------------------------------------------------------------
| Read-only text
|--------------------------------------------------------------------------
*/

function TextCell({
  value,
  disabled = false,
  mono = false,
}: {
  value?: string | number;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <Cell>
      <input
        value={
          value ?? ""
        }
        disabled={
          disabled
        }
        readOnly={
          disabled
        }
        onChange={() =>
          undefined
        }
        className={[
          "w-[150px] rounded-lg border px-2.5 py-2 text-xs outline-none",
          disabled
            ? "cursor-not-allowed border-transparent bg-slate-100 text-slate-500"
            : "border-slate-200 bg-white",
          mono
            ? "font-mono"
            : "",
        ].join(
          " ",
        )}
      />
    </Cell>
  );
}

/*
|--------------------------------------------------------------------------
| Action Button
|--------------------------------------------------------------------------
*/

function ActionButton({
  children,
  onClick,
  disabled = false,
  danger = false,
  success = false,
  violet = false,
  violetFill = false,
  full = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  success?: boolean;
  violet?: boolean;
  violetFill?: boolean;
  full?: boolean;
}) {
  let classes =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  if (success) {
    classes +=
      " bg-slate-900 text-white hover:bg-slate-800";
  } else if (danger) {
    classes +=
      " border border-red-200 bg-white text-red-600 hover:bg-red-50";
  } else if (violetFill) {
    classes +=
      " bg-blue-600 text-white hover:bg-blue-700";
  } else if (violet) {
    classes +=
      " border border-blue-200 bg-white text-blue-700 hover:bg-blue-50";
  } else {
    classes +=
      " border border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  }

  if (full) {
    classes +=
      " w-full";
  }

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      className={
        classes
      }
    >
      {children}
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| Table Header
|
| Fixed columns get an opaque background.
|--------------------------------------------------------------------------
*/

function Head({
  children,
  sticky = false,
  leftClass = "",
  widthClass = "",
  stickyBg = "bg-slate-100",
  zIndex = "z-30",
}: {
  children: React.ReactNode;
  sticky?: boolean;
  leftClass?: string;
  widthClass?: string;
  stickyBg?: string;
  zIndex?: string;
}) {
  return (
    <th
      className={[
        "whitespace-nowrap border-r border-slate-200 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 last:border-r-0",
        widthClass,

        sticky
          ? [
              "sticky",
              leftClass,
              zIndex,
              stickyBg,
              "relative",
              "isolate",
              "shadow-[3px_0_0_0_rgba(148,163,184,0.22)]",
            ].join(" ")
          : "",
      ].join(
        " ",
      )}
    >
      {children}
    </th>
  );
}

/*
|--------------------------------------------------------------------------
| Table Cell
|
| IMPORTANT FIX:
| - solid background
| - relative/isolate
| - higher z-index
| - right shadow
| - no transparency
|--------------------------------------------------------------------------
*/

function Cell({
  children,
  sticky = false,
  leftClass = "",
  widthClass = "",
  rowBg = "bg-white",
  zIndex = "z-10",
}: {
  children: React.ReactNode;
  sticky?: boolean;
  leftClass?: string;
  widthClass?: string;
  rowBg?: string;
  zIndex?: string;
}) {
  return (
    <td
      className={[
        "border-r border-slate-100 px-2.5 py-2.5 last:border-r-0",
        widthClass,

        sticky
          ? [
              "sticky",
              leftClass,
              zIndex,
              "!bg-white",
              "relative",
              "isolate",
              "shadow-[3px_0_0_0_rgba(148,163,184,0.20)]",
            ].join(" ")
          : rowBg,
      ].join(
        " ",
      )}
    >
      {children}
    </td>
  );
}

/*
|--------------------------------------------------------------------------
| Empty preview
|--------------------------------------------------------------------------
*/

function Preview({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

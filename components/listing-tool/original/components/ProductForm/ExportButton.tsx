"use client";

import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  RotateCcw,
  Square,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { exportExcel } from "@/components/listing-tool/original/lib/excel";
import type { Product } from "./ProductCard";

type Props = {
  products?: Product[];
  onReset: () => void;
};

export default function ExportButton({
  products,
  onReset,
}: Props) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const safeProducts =
    useMemo(
      () =>
        Array.isArray(products)
          ? products
          : [],
      [products],
    );

  /*
  |--------------------------------------------------------------------------
  | Selected product IDs
  |--------------------------------------------------------------------------
  */

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    showSelection,
    setShowSelection,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Keep selection synchronized with products
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(
        () => {
          setSelectedIds(
            (current) => {
              const validIds =
                new Set(
                  safeProducts.map(
                    (product) =>
                      product.id,
                  ),
                );

        /*
        |--------------------------------------------------------------------------
        | First load:
        | select all products
        |--------------------------------------------------------------------------
        */

              if (
                current.size === 0 &&
                safeProducts.length >
                  0
              ) {
                return new Set(
                  safeProducts.map(
                    (product) =>
                      product.id,
                  ),
                );
              }

        /*
        |--------------------------------------------------------------------------
        | Remove IDs that no longer exist
        |--------------------------------------------------------------------------
        */

              const next =
                new Set<string>();

              for (
                const id of current
              ) {
                if (
                  validIds.has(id)
                ) {
                  next.add(id);
                }
              }

              return next;
            },
          );
        },
      );

    return () =>
      window.cancelAnimationFrame(
        frame,
      );
  }, [safeProducts]);

  /*
  |--------------------------------------------------------------------------
  | Selected products
  |--------------------------------------------------------------------------
  */

  const selectedProducts =
    useMemo(
      () =>
        safeProducts.filter(
          (product) =>
            selectedIds.has(
              product.id,
            ),
        ),
      [
        safeProducts,
        selectedIds,
      ],
    );

  /*
  |--------------------------------------------------------------------------
  | Selection helpers
  |--------------------------------------------------------------------------
  */

  const selectAll = () => {
    setSelectedIds(
      new Set(
        safeProducts.map(
          (product) =>
            product.id,
        ),
      ),
    );
  };

  const clearSelection =
    () => {
      setSelectedIds(
        new Set(),
      );
    };

  const toggleProduct = (
    productId: string,
  ) => {
    setSelectedIds(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(productId)
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

  /*
  |--------------------------------------------------------------------------
  | Export
  |--------------------------------------------------------------------------
  */

  const handleExport =
    async () => {
      if (
        safeProducts.length ===
        0
      ) {
        alert(
          "Please add at least one product to the batch.",
        );

        return;
      }

      if (
        selectedProducts.length ===
        0
      ) {
        alert(
          "Please select at least one product to export.",
        );

        return;
      }

      try {
        setLoading(true);

        await exportExcel(
          selectedProducts,
        );

        alert(
          "Excel exported successfully.",
        );
      } catch (error) {
        console.error(error);

        alert(
          error instanceof Error
            ? error.message
            : "Failed to export Excel.",
        );
      } finally {
        setLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Reset
  |--------------------------------------------------------------------------
  */

  const handleReset = () => {
    if (
      window.confirm(
        "Clear the current form and all products in the batch?",
      )
    ) {
      setSelectedIds(
        new Set(),
      );

      onReset();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Selection state
  |--------------------------------------------------------------------------
  */

  const allSelected =
    safeProducts.length >
      0 &&
    selectedProducts.length ===
      safeProducts.length;

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ================================================================ */}
      {/* PRODUCT SELECTION                                                 */}
      {/* ================================================================ */}

      {safeProducts.length >
        0 && (
        <div className="border-b border-slate-200">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Export Products
                </h3>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                  {
                    safeProducts.length
                  }{" "}
                  total
                </span>

                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                  {
                    selectedProducts.length
                  }{" "}
                  selected
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Select the products you want to include
                in Excel.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={
                  selectAll
                }
                disabled={
                  loading
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={
                  clearSelection
                }
                disabled={
                  loading
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowSelection(
                    (value) =>
                      !value,
                  )
                }
                disabled={
                  loading
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {showSelection ? (
                  <>
                    Hide
                    <ChevronUp
                      size={14}
                    />
                  </>
                ) : (
                  <>
                    Choose
                    <ChevronDown
                      size={14}
                    />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* PRODUCT LIST                                                   */}
          {/* ============================================================ */}

          {showSelection && (
            <div className="max-h-[360px] overflow-y-auto border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
              <div className="space-y-2">
                {safeProducts.map(
                  (product) => {
                    const isSelected =
                      selectedIds.has(
                        product.id,
                      );

                    return (
                      <button
                        key={
                          product.id
                        }
                        type="button"
                        onClick={() =>
                          toggleProduct(
                            product.id,
                          )
                        }
                        disabled={
                          loading
                        }
                        className={[
                          "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                          isSelected
                            ? "border-blue-200 bg-blue-50"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {isSelected ? (
                          <CheckSquare
                            size={19}
                            className="shrink-0 text-blue-600"
                          />
                        ) : (
                          <Square
                            size={19}
                            className="shrink-0 text-slate-300"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {product.productName ||
                              "Untitled Product"}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-slate-400">
                            {product.brand && (
                              <span>
                                {
                                  product.brand
                                }
                              </span>
                            )}

                            {product.category && (
                              <>
                                <span>
                                  ·
                                </span>

                                <span>
                                  {
                                    product.category
                                  }
                                </span>
                              </>
                            )}

                            {product.designCode && (
                              <>
                                <span>
                                  ·
                                </span>

                                <span>
                                  {
                                    product.designCode
                                  }
                                </span>
                              </>
                            )}

                            {product.designNumber && (
                              <>
                                <span>
                                  ·
                                </span>

                                <span>
                                  #
                                  {
                                    product.designNumber
                                  }
                                </span>
                              </>
                            )}

                            {product.groupId && (
                              <>
                                <span>
                                  ·
                                </span>

                                <span>
                                  {
                                    product.groupId
                                  }
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="text-xs font-bold text-slate-800">
                            ₹
                            {Number(
                              product.price ||
                                0,
                            ).toLocaleString(
                              "en-IN",
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            Stock{" "}
                            {Number(
                              product.inventory ||
                                0,
                            ).toLocaleString(
                              "en-IN",
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>

              {allSelected && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <Check
                    size={14}
                  />
                  All products are
                  selected.
                </div>
              )}

              {!allSelected &&
                selectedProducts.length >
                  0 && (
                  <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                    {
                      selectedProducts.length
                    }{" "}
                    product
                    {selectedProducts.length !==
                    1
                      ? "s"
                      : ""}{" "}
                    selected for export.
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* EXPORT ACTIONS                                                    */}
      {/* ================================================================ */}

      <div className="p-6">
        <div className="mb-4 flex flex-col gap-1">
          <p className="text-sm font-bold text-slate-900">
            {selectedProducts.length >
            0
              ? `Ready to export ${selectedProducts.length} product${
                  selectedProducts.length ===
                  1
                    ? ""
                    : "s"
                }`
              : "Ready to export"}
          </p>

          <p className="text-xs text-slate-500">
            Export the selected products
            from the current batch.
          </p>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={
              handleReset
            }
            disabled={
              loading
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw
              size={20}
            />

            Reset Batch
          </button>

          <button
            type="button"
            onClick={
              handleExport
            }
            disabled={
              loading ||
              safeProducts.length ===
                0 ||
              selectedProducts.length ===
                0
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? (
              <>
                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Exporting...
              </>
            ) : (
              <>
                <Download
                  size={20}
                />

                Export Batch (
                {
                  selectedProducts.length
                }
                )
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

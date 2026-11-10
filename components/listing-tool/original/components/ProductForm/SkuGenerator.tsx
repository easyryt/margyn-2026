"use client";

import {
  CheckCircle2,
  Eye,
  Loader2,
  LockKeyhole,
  Sparkles,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import type {
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";

import {
  FINISHES,
  PRINT_TYPES,
} from "@/components/listing-tool/original/lib/options";

import { generateSKU } from "@/components/listing-tool/original/lib/sku";

import type { FormData } from "./ProductCard";

type Props = {
  register: UseFormRegister<FormData>;
  watch: UseFormWatch<FormData>;
  selectedModel: string;
};

type DesignNumberAvailabilityResponse = {
  success: boolean;
  designNumber: string;
  available: boolean;
};

const API_BASE_URL = "/api/tools/listing-tool";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
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
      typeof data === "object" &&
      "message" in data &&
      typeof data.message ===
        "string"
        ? data.message
        : "Request failed.",
    );
  }

  return data as T;
}

export default function SkuGenerator({
  register,
  watch,
  selectedModel,
}: Props) {
  const brand = watch("brand");
  const category = watch("category");
  const color = watch("color");

  const designName =
    watch("designName");

  const designCode =
    watch("designCode");

  const designNumber =
    watch("designNumber");

  const designId =
    watch("designId");

  const printType =
    watch("printType");

  const finish =
    watch("finish");

  const version =
    watch("version");

  /*
  |--------------------------------------------------------------------------
  | Generate Design Number
  |--------------------------------------------------------------------------
  */

  const [
    checkingNumber,
    setCheckingNumber,
  ] = useState(false);

  const [
    numberAvailable,
    setNumberAvailable,
  ] = useState<
    boolean | null
  >(null);

  /*
  |--------------------------------------------------------------------------
  | IMPORTANT
  |
  | We intentionally do NOT use setValue here.
  |
  | ProductDetails does not pass setValue.
  | The SKU is calculated live from the current form values.
  |
  | ProductCard regenerates the final SKU before adding/saving.
  |--------------------------------------------------------------------------
  */

  const generatedSku =
    selectedModel &&
    designCode?.trim() &&
    designNumber?.trim()
      ? generateSKU({
          brand,
          category,

          model:
            selectedModel,

          color,
          printType,
          finish,

          designCode:
            designCode.trim(),

          designNumber:
            designNumber.trim(),

          version:
            version || "1",
        })
      : "";

  /*
  |--------------------------------------------------------------------------
  | Check current Design Number
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const cleanNumber =
      designNumber?.trim();

    if (!cleanNumber) {
      const frame =
        window.requestAnimationFrame(
          () => {
            setNumberAvailable(null);
          },
        );

      return () =>
        window.cancelAnimationFrame(
          frame,
        );
    }

    const timer =
      window.setTimeout(
        async () => {
          try {
            setCheckingNumber(
              true,
            );

            const params =
              new URLSearchParams();

            params.set(
              "designNumber",
              cleanNumber,
            );

            const result =
              await apiRequest<DesignNumberAvailabilityResponse>(
                `/products/design-number-available?${params.toString()}`,
              );

            setNumberAvailable(
              result.available,
            );

          } catch {
            /*
            |--------------------------------------------------------------------------
            | Do not block UI.
            |
            | Backend save will perform the final check.
            |--------------------------------------------------------------------------
            */
          } finally {
            setCheckingNumber(
              false,
            );
          }
        },
        300,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    designNumber,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SKU Preview
  |--------------------------------------------------------------------------
  */

  let preview =
    "Select model and complete SKU fields.";

  if (generatedSku) {
    preview =
      generatedSku;
  }

  return (
    <div className="border-t border-slate-200 pt-8">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER                                                           */}
      {/* ---------------------------------------------------------------- */}

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Sparkles
            size={20}
            className="text-violet-600"
          />

          <h3 className="text-xl font-semibold text-slate-900">
            Design and SKU
          </h3>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          {designId
            ? "This product is reusing only the saved Design Name and Design Code. Its Design Number is new and belongs only to this product."
            : "Design Number is generated for parent products. The first available number starts from 317. The SKU is generated automatically."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* ---------------------------------------------------------------- */}
        {/* DESIGN NAME                                                      */}
        {/* ---------------------------------------------------------------- */}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Design Name
          </label>

          <input
            {...register(
              "designName",
            )}
            readOnly={Boolean(designId)}
            placeholder="Ocean Soul Silhouette"
            className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
              designId
                ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            }`}
          />

          <p className="mt-1 text-xs text-slate-500">
            {designId
              ? "Saved artwork name."
              : "Use only 2 or 3 short words."}
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* DESIGN CODE                                                      */}
        {/* ---------------------------------------------------------------- */}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Design Code
          </label>

          <input
            {...register(
              "designCode",
            )}
            maxLength={8}
            readOnly={Boolean(designId)}
            placeholder="OCNSLSHT"
            className={`w-full rounded-xl border px-4 py-3 font-mono uppercase outline-none transition ${
              designId
                ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            }`}
          />

          <p className="mt-1 text-xs text-slate-500">
            {designId
              ? "Saved artwork code."
              : "Use 4 to 8 uppercase letters."}
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* DESIGN NUMBER                                                    */}
        {/* ---------------------------------------------------------------- */}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Design Number
          </label>

          <div className="relative">
            <input
              {...register(
                "designNumber",
              )}
              readOnly
              placeholder="317"
              className={[
                "w-full cursor-not-allowed rounded-xl border px-4 py-3 pr-12 font-mono font-semibold outline-none",

                numberAvailable ===
                false
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              ].join(" ")}
            />

            {checkingNumber ? (
              <Loader2
                size={17}
                className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-violet-600"
              />
            ) : numberAvailable ===
              true ? (
              <CheckCircle2
                size={17}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600"
              />
            ) : numberAvailable ===
              false ? (
              <XCircle
                size={17}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600"
              />
            ) : (
              <LockKeyhole
                size={16}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600"
              />
            )}
          </div>

          <div className="mt-1 text-xs">
            {checkingNumber ? (
              <span className="text-slate-400">
                Checking availability...
              </span>
            ) : numberAvailable ===
              true ? (
              <span className="text-emerald-700">
                Design Number available.
              </span>
            ) : numberAvailable ===
              false ? (
              <span className="text-red-600">
                Design Number already exists.
              </span>
            ) : (
              <span className="text-slate-500">
                Parent sequence starts from 317.
              </span>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* SKU                                                              */}
        {/* ---------------------------------------------------------------- */}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            SKU
          </label>

          <input
            {...register("sku")}
            value={
              generatedSku
            }
            readOnly
            placeholder="SKU will be generated automatically"
            className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 font-mono text-sm text-slate-600 outline-none"
          />

          <p className="mt-1 text-xs text-slate-500">
            SKU changes automatically when Design Code,
            Design Number, model, color, finish, or
            version changes.
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* PRINT TYPE                                                       */}
        {/* ---------------------------------------------------------------- */}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Print Type
          </label>

          <select
            {...register(
              "printType",
            )}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          >
            {PRINT_TYPES.map(
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
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* FINISH                                                           */}
        {/* ---------------------------------------------------------------- */}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Finish
          </label>

          <select
            {...register(
              "finish",
            )}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          >
            {FINISHES.map(
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
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* VERSION                                                          */}
        {/* ---------------------------------------------------------------- */}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Version
          </label>

          <input
            {...register(
              "version",
            )}
            readOnly
            value={
              version || "1"
            }
            className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 outline-none"
          />

          <p className="mt-1 text-xs text-slate-500">
            Parent V1. Variants V2, V3, V4...
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* SKU PREVIEW                                                       */}
      {/* ---------------------------------------------------------------- */}

      <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-violet-700">
          <Eye size={18} />

          <span className="font-semibold">
            SKU Preview
          </span>
        </div>

        <p className="mb-2 text-sm text-slate-600">
          Design:{" "}
          <span className="font-semibold text-slate-800">
            {designName ||
              "Not generated yet"}
          </span>
        </p>

        <p className="mb-2 text-sm text-slate-600">
          Design Number:{" "}
          <span className="font-semibold text-emerald-700">
            {designNumber ||
              "Not assigned yet"}
          </span>
        </p>

        <p className="mb-2 text-sm text-slate-600">
          Version:{" "}
          <span className="font-semibold text-slate-800">
            {version || "1"}
          </span>
        </p>

        <code className="block break-all rounded-lg bg-white p-3 font-mono text-sm text-slate-800">
          {preview}
        </code>
      </div>
    </div>
  );
}

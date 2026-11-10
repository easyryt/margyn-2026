"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Plus,
  Search,
  Smartphone,
  Trash2,
} from "lucide-react";

import { PHONE_MODELS } from "@/components/listing-tool/original/lib/models";

import SectionCard from "./SectionCard";

import type {
  SelectedModel,
} from "./ProductCard";

type Props = {
  selectedModels: SelectedModel[];

  setSelectedModels: React.Dispatch<
    React.SetStateAction<
      SelectedModel[]
    >
  >;
};

export default function ModelSelector({
  selectedModels,
  setSelectedModels,
}: Props) {
  const [
    search,
    setSearch,
  ] = useState("");

  const searchRef =
    useRef<HTMLInputElement>(
      null,
    );

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const filteredModels =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return [];
      }

      return PHONE_MODELS
        .filter(
          (model) =>
            model
              .toLowerCase()
              .includes(
                keyword,
              ) &&
            !selectedModels.some(
              (item) =>
                item.model ===
                model,
            ),
        )
        .sort(
          (a, b) =>
            a.localeCompare(
              b,
            ),
        )
        .slice(
          0,
          8,
        );
    }, [
      search,
      selectedModels,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Add Model
  |--------------------------------------------------------------------------
  */

  function addModel(
    model: string,
  ) {
    if (
      selectedModels.some(
        (item) =>
          item.model ===
          model,
      )
    ) {
      return;
    }

    setSelectedModels(
      (previous) => [
        ...previous,

        {
          model,
        },
      ],
    );

    setSearch("");

    requestAnimationFrame(
      () => {
        searchRef.current?.focus();
      },
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Remove Model
  |--------------------------------------------------------------------------
  */

  function removeModel(
    model: string,
  ) {
    setSelectedModels(
      (previous) =>
        previous.filter(
          (item) =>
            item.model !==
            model,
        ),
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Clear All
  |--------------------------------------------------------------------------
  */

  function clearAll() {
    if (
      selectedModels.length ===
      0
    ) {
      return;
    }

    if (
      window.confirm(
        "Remove all selected phone models?",
      )
    ) {
      setSelectedModels(
        [],
      );
    }
  }

  return (
    <SectionCard
      title="Phone Models"
      description={`${PHONE_MODELS.length.toLocaleString("en-IN")} workbook-compatible models are available to search or browse.`}
    >
      {/* ================================================================ */}
      {/* SEARCH                                                           */}
      {/* ================================================================ */}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            ref={searchRef}
            value={
              search
            }
            onChange={(
              event,
            ) =>
              setSearch(
                event.target
                  .value,
              )
            }
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                  "Enter" &&
                filteredModels.length >
                  0
              ) {
                event.preventDefault();

                addModel(
                  filteredModels[0],
                );
              }
            }}
            placeholder="Search any compatible model..."
            className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <select
          value=""
          onChange={(event) => {
            if (event.target.value) {
              addModel(event.target.value);
            }
          }}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          aria-label="Browse all compatible models"
        >
          <option value="">Browse all compatible models…</option>
          {PHONE_MODELS.map((model) => (
            <option
              key={model}
              value={model}
              disabled={selectedModels.some((item) => item.model === model)}
            >
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* ================================================================ */}
      {/* SEARCH RESULTS                                                   */}
      {/* ================================================================ */}

      {filteredModels.length >
        0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {filteredModels.map(
            (model) => (
              <button
                key={model}
                type="button"
                onClick={() =>
                  addModel(
                    model,
                  )
                }
                className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-none"
              >
                <div className="flex items-center gap-3">
                  <Smartphone
                    size={18}
                    className="text-slate-500"
                  />

                  <span className="font-medium text-slate-800">
                    {model}
                  </span>
                </div>

                <Plus
                  size={18}
                  className="text-blue-600"
                />
              </button>
            ),
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TOOLBAR                                                          */}
      {/* ================================================================ */}

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Selected Models
          </h3>

          <p className="text-sm text-slate-500">
            {selectedModels.length}{" "}
            model
            {selectedModels.length ===
            1
              ? ""
              : "s"}{" "}
            selected
          </p>
        </div>

        <button
          type="button"
          onClick={
            clearAll
          }
          disabled={
            selectedModels.length ===
            0
          }
          className="rounded-lg border border-red-200 px-4 py-2 font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear All
        </button>
      </div>

      {/* ================================================================ */}
      {/* EMPTY STATE                                                      */}
      {/* ================================================================ */}

      {selectedModels.length ===
        0 && (
        <div className="mt-6 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <Smartphone
            size={40}
            className="mx-auto mb-4 text-slate-400"
          />

          <h4 className="text-lg font-semibold text-slate-700">
            No Phone Models Added
          </h4>

          <p className="mt-2 text-sm text-slate-500">
            Search for a phone model
            above and press Enter or
            click the &quot;+&quot; button to add
            it.
          </p>
        </div>
      )}

      {/* ================================================================ */}
      {/* SELECTED MODEL TABLE                                             */}
      {/* ================================================================ */}

      {selectedModels.length >
        0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Phone Model
                </th>

                <th className="w-24 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Remove
                </th>
              </tr>
            </thead>

            <tbody>
              {selectedModels.map(
                (item) => (
                  <tr
                    key={
                      item.model
                    }
                    className="border-t border-slate-200 transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                          <Smartphone
                            size={18}
                            className="text-blue-600"
                          />
                        </div>

                        <div>
                          <p className="font-medium text-slate-800">
                            {
                              item.model
                            }
                          </p>

                          <p className="text-xs text-slate-400">
                            Phone model
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          removeModel(
                            item.model,
                          )
                        }
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                        title="Remove phone model"
                      >
                        <Trash2
                          size={18}
                        />
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

    </SectionCard>
  );
}

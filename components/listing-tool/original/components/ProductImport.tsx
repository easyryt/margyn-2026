"use client";

import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

const API_BASE_URL = "/api/tools/listing-tool";

type ImportRowError = {
  sheet?: string;
  row?: number;
  message?: string;
};

type ImportResponse = {
  success?: boolean;
  message?: string;
  imported?: number;
  updated?: number;
  unchanged?: number;
  parentProducts?: number;
  variants?: number;
  designsImported?: number;
  designsUpdated?: number;
  designsUnchanged?: number;
  designReferences?: number;
  existingProductsMatched?: number;
  existingProductsUpdated?: number;
  matchedDesignProducts?: number;
  unmatchedDesignCodes?: string[];
  failed?: number;
  errors?: ImportRowError[];
};

type ProductImportProps = {
  onImported?: () => void | Promise<void>;
  compact?: boolean;
};

const acceptedExtensions = [".xlsx", ".xls", ".csv"];

function isSupportedFile(file: File) {
  const name = file.name.toLowerCase();
  return acceptedExtensions.some((extension) => name.endsWith(extension));
}

export default function ProductImport({
  onImported,
  compact = false,
}: ProductImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");

  const selectFile = (selected?: File) => {
    setResult(null);
    setError("");

    if (!selected) {
      setFile(null);
      return;
    }

    if (!isSupportedFile(selected)) {
      setFile(null);
      setError("Choose an Excel (.xlsx or .xls) or CSV file.");
      return;
    }

    if (selected.size > 15 * 1024 * 1024) {
      setFile(null);
      setError("The spreadsheet must be 15 MB or smaller.");
      return;
    }

    setFile(selected);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const submitImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || importing) return;

    try {
      setImporting(true);
      setError("");
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/products/import`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as
        | ImportResponse
        | null;

      if (!response.ok) {
        throw new Error(data?.message || "The spreadsheet could not be imported.");
      }

      setResult(data ?? { message: "Import finished." });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";

      window.dispatchEvent(new CustomEvent("products-imported"));
      await onImported?.();
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "The spreadsheet could not be imported.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <section
      id="product-import"
      className={`rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${compact ? "p-4" : "p-5 sm:p-6"}`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-600 p-3 text-white shadow-sm">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-slate-950">Import design library or products</h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                Excel import
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              First upload the workbook containing the “design name” sheet. It saves the code-to-name library and repairs existing products. Then upload a Meesho listing workbook; a product is stored only after its SKU Design Code has a matching Design Name.
            </p>
          </div>
        </div>

        <form onSubmit={submitImport} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="sr-only"
          />
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-11 min-w-0 items-center gap-3 rounded-xl border border-dashed px-3 py-2 transition sm:min-w-72 ${dragging ? "border-blue-500 bg-blue-100" : "border-blue-300 bg-white"}`}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Upload className="h-4 w-4 shrink-0 text-blue-600" />
              <span className="truncate text-sm font-semibold text-slate-700">
                {file?.name || "Choose or drop spreadsheet"}
              </span>
            </button>
            {file ? (
              <button
                type="button"
                onClick={clearFile}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Remove selected file"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={!file || importing}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importing…" : "Import spreadsheet"}
          </button>
        </form>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">{result.message || "Spreadsheet import finished."}</p>
              <p className="mt-1">
                Products: {Number(result.imported || 0)} created · {Number(result.updated || 0)} updated · {Number(result.unchanged || 0)} unchanged
              </p>
              {result.designsImported !== undefined ? (
                <>
                  <p className="mt-1">
                    Designs: {Number(result.designsImported || 0)} created · {Number(result.designsUpdated || 0)} updated · {Number(result.designsUnchanged || 0)} unchanged · {Number(result.designReferences || 0)} reference rows
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    Existing products: {Number(result.existingProductsMatched || 0)} matched · {Number(result.existingProductsUpdated || 0)} updated with Design Names
                  </p>
                </>
              ) : null}
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {Number(result.parentProducts || 0)} parent products · {Number(result.variants || 0)} variants · {Number(result.matchedDesignProducts || 0)} products matched to Design Names · {Number(result.failed || 0)} failed
              </p>
              {result.unmatchedDesignCodes?.length ? (
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  No saved Design Name for: {result.unmatchedDesignCodes.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
          {result.errors?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-9 text-xs text-amber-800">
              {result.errors.slice(0, 5).map((item, index) => (
                <li key={`${item.sheet}-${item.row}-${index}`}>
                  {item.sheet || "Sheet"}, row {item.row || "?"}: {item.message || "Could not import row."}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

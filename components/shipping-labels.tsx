"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Icon } from "./icons";
const MAX_FILE_SIZE = 1024 * 1024 * 1024;
type Stats = { orders: number; products: number; pages: number };
function fileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(2) + " MB"
    : Math.max(1, Math.round(bytes / 1024)) + " KB";
}
export default function ShippingLabels() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryDownloading, setSummaryDownloading] = useState(false);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [summaryBlob, setSummaryBlob] = useState<Blob | null>(null);
  const [stats, setStats] = useState<Stats>({
    orders: 0,
    products: 0,
    pages: 0,
  });
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const downloadUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = downloadUrls.current;
    return () => {
      request.current?.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  useEffect(() => {
    if (zipBlob) resultHeading.current?.focus();
  }, [zipBlob]);

  function selectFile(next: File | null) {
    if (request.current) return;
    if (
      next &&
      !(
        next.type === "application/pdf" ||
        (!next.type && /\.pdf$/i.test(next.name))
      )
    ) {
      setError("Choose a PDF file to continue.");
      return;
    }
    if (next && (!next.size || next.size > MAX_FILE_SIZE)) {
      setError(
        !next.size
          ? "This PDF is empty. Choose another file."
          : "Choose a PDF up to 1 GB.",
      );
      return;
    }
    setFile(next);
    setError("");
    setZipBlob(null);
    setSummaryBlob(null);
  }
  function onInput(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] || null);
    event.target.value = "";
  }
  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    if (request.current) return;
    if (event.dataTransfer.files.length !== 1) {
      setError("Choose one PDF at a time.");
      return;
    }
    selectFile(event.dataTransfer.files[0]);
  }
  async function upload(
    action: "stats" | "process" | "summary",
    signal: AbortSignal,
  ) {
    if (!file) throw new Error("Choose a PDF first.");
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/tools/shipping-labels/" + action, {
      method: "POST",
      body: form,
      signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        response.status === 401
          ? "Your session has expired. Please sign in again."
          : data.error ||
              data.message ||
              "Could not process this PDF. Please try again.",
      );
    }
    return response;
  }
  async function processPdf() {
    if (!file || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setPhase("Reading your PDF…");
    try {
      // Preserve the original tool flow: statistics, sorted ZIP, then summary on demand.
      const statsResponse = await upload("stats", controller.signal);
      const data = await statsResponse.json();
      if (controller.signal.aborted) return;
      setPhase("Grouping labels by SKU…");
      const processResponse = await upload("process", controller.signal);
      const zip = await processResponse.blob();
      if (!controller.signal.aborted) {
        setStats({
          orders: data.orders ?? 0,
          products: data.products ?? 0,
          pages: data.pages ?? 0,
        });
        setZipBlob(zip);
      }
    } catch (error) {
      if (!controller.signal.aborted) setError((error as Error).message);
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setLoading(false);
        setPhase("");
      }
    }
  }
  function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    downloadUrls.current.add(url);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      downloadUrls.current.delete(url);
    }, 1000);
  }
  async function downloadSummary() {
    if (!file || request.current) return;
    if (summaryBlob) {
      downloadFile(summaryBlob, "Order-Summary.pdf");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setSummaryDownloading(true);
    setError("");
    try {
      const response = await upload("summary", controller.signal);
      const blob = await response.blob();
      if (!controller.signal.aborted) {
        setSummaryBlob(blob);
        downloadFile(blob, "Order-Summary.pdf");
      }
    } catch (error) {
      if (!controller.signal.aborted) setError((error as Error).message);
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setSummaryDownloading(false);
      }
    }
  }
  function cancel() {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setPhase("");
    setSummaryDownloading(false);
  }
  return (
    <main className="shipping-tool">
      <header className="shipping-heading">
        <h1>Shipping Labels</h1>
        <p>Sort a shipping-label PDF by SKU and download the grouped files.</p>
      </header>

      <section className="shipping-panel" aria-label="Shipping-label PDF sorter">
        {error && (
          <div role="alert" className="shipping-error">
            <p>{error}</p>
            {error.includes("sign in again") && (
              <Link href="/login?next=/tools/shipping-labels">Sign in again</Link>
            )}
          </div>
        )}

        {zipBlob ? (
          <>
            <header className="shipping-result-heading">
              <span className="shipping-result-icon"><Icon name="check" size={20} /></span>
              <div>
                <h2 ref={resultHeading} tabIndex={-1}>Labels ready to download</h2>
                <p>{file?.name}</p>
              </div>
            </header>

            <dl className="shipping-stats">
              <div><dt>Orders</dt><dd>{stats.orders}</dd></div>
              <div><dt>SKUs</dt><dd>{stats.products}</dd></div>
              <div><dt>PDF pages</dt><dd>{stats.pages}</dd></div>
            </dl>

            <div className="shipping-downloads">
              <button
                type="button"
                className="tools-primary-button"
                aria-describedby="shipping-zip-description"
                onClick={() => downloadFile(zipBlob, "Sorted-Orders.zip")}
              >
                <Icon name="download" size={18} /> Download ZIP
              </button>
              <button
                type="button"
                className="shipping-secondary-button"
                onClick={() => void downloadSummary()}
                disabled={summaryDownloading}
              >
                <Icon name="file" size={18} />
                <span aria-live="polite">{summaryDownloading ? "Preparing summary…" : "Download summary PDF"}</span>
              </button>
            </div>
            <p id="shipping-zip-description" className="shipping-hint">The ZIP includes one PDF per SKU and the order summary.</p>
            <button
              type="button"
              className="shipping-text-button"
              onClick={() => {
                selectFile(null);
                requestAnimationFrame(() => uploadButton.current?.focus());
              }}
              disabled={summaryDownloading}
            >
              <Icon name="refresh" size={16} /> Sort another PDF
            </button>
          </>
        ) : (
          <>
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              aria-label="Upload shipping-label PDF"
              onChange={onInput}
              disabled={loading}
              hidden
            />
            <div className={file ? "shipping-selected-file" : undefined}>
              <button
                ref={uploadButton}
                type="button"
                className={`shipping-dropzone${dragging ? " is-dragging" : ""}`}
                aria-label={file ? "Change PDF" : "Choose PDF"}
                aria-describedby={file ? "shipping-selected-name" : "shipping-pdf-requirements"}
                disabled={loading}
                onClick={() => input.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!loading) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <span className="shipping-upload-icon">
                  <Icon name={file ? "file" : "upload"} size={24} />
                </span>
                {file ? (
                  <>
                    <span id="shipping-selected-name">
                      <strong>{file.name}</strong>
                      <small>{fileSize(file.size)}</small>
                    </span>
                    <span className="shipping-change-label">Change PDF</span>
                  </>
                ) : (
                  <span>
                    <strong>Choose PDF</strong>
                    <small>Drop one PDF here or browse files · Up to 1 GB</small>
                  </span>
                )}
              </button>
              {file && (
                <button
                  type="button"
                  className="shipping-remove"
                  aria-label="Remove selected PDF"
                  disabled={loading}
                  onClick={() => {
                    selectFile(null);
                    uploadButton.current?.focus();
                  }}
                >
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
            {!file && (
              <p className="shipping-hint" id="shipping-pdf-requirements">
                Use an unlocked, text-based PDF with SKUs and order numbers.
              </p>
            )}
            {loading ? (
              <div className="shipping-progress">
                <span className="shipping-spinner" aria-hidden="true" />
                <p role="status">{phase}</p>
                <button type="button" className="shipping-text-button" onClick={cancel}>Cancel</button>
              </div>
            ) : file && (
              <div className="shipping-sort-row">
                <button type="button" className="tools-primary-button" onClick={() => void processPdf()}>
                  Sort labels <Icon name="arrow" size={17} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

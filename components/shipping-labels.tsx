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
  const [completed, setCompleted] = useState(false);
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
  const request = useRef<AbortController | null>(null);
  const downloadUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = downloadUrls.current;
    return () => {
      request.current?.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  function selectFile(next: File | null) {
    if (loading || summaryDownloading) return;
    setError("");
    setCompleted(false);
    setZipBlob(null);
    setSummaryBlob(null);
    setStats({ orders: 0, products: 0, pages: 0 });
    if (
      next &&
      !(
        next.type === "application/pdf" ||
        (!next.type && /\.pdf$/i.test(next.name))
      )
    ) {
      setError("Choose a PDF file to continue.");
      setFile(null);
      return;
    }
    if (next && (!next.size || next.size > MAX_FILE_SIZE)) {
      setError(
        !next.size
          ? "This PDF is empty. Choose another file."
          : "Choose a PDF smaller than 1 GB.",
      );
      setFile(null);
      return;
    }
    setFile(next);
    if (input.current) input.current.value = "";
  }
  function onInput(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] || null);
  }
  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
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
    if (!file || loading) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setCompleted(false);
    setError("");
    setPhase("Reading your PDF and finding order details…");
    try {
      // Preserve the original tool flow: statistics, sorted ZIP, then summary on demand.
      const statsResponse = await upload("stats", controller.signal);
      const data = await statsResponse.json();
      setStats({
        orders: data.orders ?? 0,
        products: data.products ?? 0,
        pages: data.pages ?? 0,
      });
      setPhase("Sorting labels by SKU and preparing your downloads…");
      const processResponse = await upload("process", controller.signal);
      const zip = await processResponse.blob();
      if (!controller.signal.aborted) {
        setZipBlob(zip);
        setCompleted(true);
      }
    } catch (error) {
      if (!controller.signal.aborted) setError((error as Error).message);
    } finally {
      if (!controller.signal.aborted) {
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
    if (!file || summaryDownloading) return;
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
      if (!controller.signal.aborted) setSummaryDownloading(false);
    }
  }
  function cancel() {
    request.current?.abort();
    setLoading(false);
    setPhase("");
    setSummaryDownloading(false);
  }
  function reset() {
    cancel();
    selectFile(null);
  }
  return (
    <main className="shipping-tool">
      <header className="tools-page-heading">
        <div>
          <span className="tools-eyebrow">DISPATCH / MARGYN TOOLS</span>
          <h1>Shipping Labels</h1>
          <p>
            Less sorting. More shipping. Get every label in the right place.
          </p>
        </div>
        <span className="tools-live-badge">
          <span /> READY TO USE
        </span>
      </header>
      <div className="shipping-steps" aria-label="Processing steps">
        {["Upload PDF", "Sort by SKU", "Download files"].map((label, index) => (
          <div
            key={label}
            className={
              completed || (file && index === 0) || (loading && index === 1)
                ? "active"
                : ""
            }
          >
            <span>
              {completed || (file && index === 0) ? (
                <Icon name="check" size={12} />
              ) : (
                index + 1
              )}
            </span>
            {label}
            {index < 2 && <i />}
          </div>
        ))}
      </div>
      <div className="shipping-layout">
        <section
          className="shipping-main-panel"
          aria-label="Shipping-label PDF sorter"
        >
          <div className="shipping-panel-title">
            <span className="shipping-panel-icon">
              <Icon name={completed ? "check" : "upload"} size={20} />
            </span>
            <div>
              <h2>
                {completed
                  ? "Your files are ready."
                  : "Let’s get your labels sorted."}
              </h2>
              <p>
                {completed
                  ? "Grouped, organized and ready for your next dispatch."
                  : "Start with your original shipping-label PDF."}
              </p>
            </div>
          </div>
          {error && (
            <div role="alert" className="shipping-error">
              <Icon name="shield" size={17} />
              <div>
                <p>{error}</p>
                {error.includes("sign in again") && (
                  <Link href="/login?next=/tools/shipping-labels">
                    Sign in again <Icon name="arrow" size={13} />
                  </Link>
                )}
              </div>
            </div>
          )}
          {!completed ? (
            <>
              <input
                ref={input}
                type="file"
                accept="application/pdf,.pdf"
                id="shipping-label-pdf"
                aria-label="Upload shipping-label PDF"
                onChange={onInput}
                disabled={loading}
                className="shipping-file-input"
              />
              <button
                type="button"
                className={
                  "shipping-dropzone" + (dragging ? " is-dragging" : "")
                }
                aria-label="Choose shipping-label PDF"
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
                  <Icon name="upload" size={30} />
                </span>
                <strong>
                  {dragging
                    ? "Drop your PDF here"
                    : "Drag & drop your PDF here"}
                </strong>
                <span>
                  or <b>browse files</b> from your computer
                </span>
                <small>PDF format · One file at a time · Up to 1 GB</small>
              </button>
              {file && (
                <div className="shipping-selected-file">
                  <span>
                    <Icon name="file" size={21} />
                  </span>
                  <div>
                    <strong>{file.name}</strong>
                    <small>
                      {fileSize(file.size)} ·{" "}
                      {loading ? "Processing" : "Ready to process"}
                    </small>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectFile(null)}
                    disabled={loading}
                    aria-label="Remove selected PDF"
                  >
                    <Icon name="close" size={17} />
                  </button>
                </div>
              )}
              {loading && (
                <div
                  className="shipping-progress"
                  role="status"
                  aria-live="polite"
                >
                  <span className="shipping-spinner" />
                  <div>
                    <strong>Working on your labels</strong>
                    <span>{phase}</span>
                  </div>
                  <button type="button" onClick={cancel}>
                    Cancel
                  </button>
                </div>
              )}
              <div className="shipping-panel-footer">
                <span>
                  <Icon name="shield" size={14} /> Your PDF is processed
                  privately.
                </span>
                <button
                  type="button"
                  className="tools-primary-button"
                  onClick={() => void processPdf()}
                  disabled={!file || loading}
                >
                  {loading ? "Processing PDF…" : "Process PDF"}
                  <Icon name={loading ? "clock" : "arrow"} size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="shipping-complete-note" role="status">
                <span>
                  <Icon name="check" size={19} />
                </span>
                <div>
                  <strong>Processing complete</strong>
                  <p>{file?.name}</p>
                </div>
              </div>
              <div className="shipping-stats">
                {[
                  { label: "Orders", value: stats.orders, icon: "box" },
                  { label: "Products", value: stats.products, icon: "layers" },
                  { label: "PDF pages", value: stats.pages, icon: "file" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <Icon name={stat.icon} size={19} />
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
              <div className="shipping-downloads">
                <button
                  type="button"
                  onClick={() =>
                    zipBlob && downloadFile(zipBlob, "Sorted-Orders.zip")
                  }
                  disabled={!zipBlob}
                >
                  <span>
                    <Icon name="download" size={20} />
                  </span>
                  <div>
                    <strong>Download ZIP</strong>
                    <small>Labels grouped by SKU + Summary.pdf</small>
                  </div>
                  <Icon name="arrow" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => void downloadSummary()}
                  disabled={summaryDownloading}
                >
                  <span>
                    <Icon
                      name={summaryDownloading ? "clock" : "file"}
                      size={20}
                    />
                  </span>
                  <div>
                    <strong>
                      {summaryDownloading
                        ? "Preparing summary…"
                        : "Download Summary PDF"}
                    </strong>
                    <small>Product SKUs and order quantities</small>
                  </div>
                  <Icon name="arrow" size={16} />
                </button>
              </div>
              <div className="shipping-reset-row">
                <span>Your source file stays unchanged.</span>
                <button
                  type="button"
                  onClick={reset}
                  disabled={summaryDownloading}
                >
                  <Icon name="refresh" size={15} /> Process another file
                </button>
              </div>
            </>
          )}
        </section>
        <aside className="shipping-help">
          <section>
            <span className="tools-eyebrow">FROM UPLOAD TO DISPATCH</span>
            <h2>
              A little order.
              <br />A lot less busywork.
            </h2>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <h3>Upload your labels</h3>
                  <p>
                    Choose one original PDF containing your shipping labels.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>We group by SKU</h3>
                  <p>
                    Labels for the same product are collected into their own
                    PDF.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Download & get moving</h3>
                  <p>Get a ZIP with your sorted PDFs, plus an order summary.</p>
                </div>
              </li>
            </ol>
          </section>
          <div className="shipping-tip">
            <Icon name="file" size={20} />
            <div>
              <strong>A quick heads-up</strong>
              <p>
                Use text-based labels with SKU and order numbers. Scanned images
                and encrypted PDFs aren’t supported.
              </p>
            </div>
          </div>
          <div className="shipping-private">
            <Icon name="shield" size={18} />
            <p>
              Files are processed for your request and temporary uploads are
              removed afterwards.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

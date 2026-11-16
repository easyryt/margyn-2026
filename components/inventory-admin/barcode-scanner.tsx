"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { InventoryRow } from "./original/inventory/InventoryDetail";

type CameraSession = { stream?: MediaStream; timer?: number };
type Product = { name: string; skuBase?: string };
type PackedInventory = {
  productId: string;
  designCode: string;
  quantity: number | null;
};
type ScanResult = {
  inventory: PackedInventory;
  product: Product | null;
  design: InventoryRow | null;
};
const api = "/api/tools/inventory-admin";

function cameraMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access was blocked. Allow camera access in your browser, or enter the code below.";
  if (name === "NotFoundError") return "No camera was found. Enter the code below.";
  if (name === "NotReadableError") return "The camera is busy or unavailable. Close any apps using it and try again, or enter the code below.";
  return "Couldn’t start the camera. Try again or enter the code below.";
}

async function postInventory(path: string, data: object, signal: AbortSignal) {
  return fetch(api + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    signal,
  });
}

async function readInventory(path: string, signal: AbortSignal) {
  try {
    const response = await fetch(api + path, { cache: "no-store", signal });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function packLabel(code: string, signal: AbortSignal) {
  const response = await postInventory("/packing/scan", { code }, signal);
  if (response.status === 401) throw new Error("Your session has expired. Sign in again to scan labels.");
  const data = await response.json();
  if (response.ok && data.inventory) {
    return { inventory: data.inventory as PackedInventory, alreadyPacked: false };
  }
  if (data.message === "Barcode already used") {
    const lookup = await postInventory("/packing/lookup", { code }, signal);
    const match = lookup.ok ? await lookup.json() : null;
    return {
      inventory: match?.product?.id ? {
        productId: match.product.id,
        designCode: match.barcode.designCode,
        quantity: match.printedInventory?.quantity ?? null,
      } : null,
      alreadyPacked: true,
    };
  }
  if (response.status === 404) throw new Error("No product matches this code. Check the label and try again.");
  if (data.message === "No printed stock available for this barcode SKU") throw new Error("There’s no printed stock left for this label.");
  if (response.status === 429) throw new Error("Too many scans. Wait a moment before trying again.");
  throw new Error("Couldn’t confirm packing. Scan or enter the same label to check it.");
}

export default function BarcodeScanner() {
  const video = useRef<HTMLVideoElement>(null);
  const camera = useRef<CameraSession | null>(null);
  const request = useRef<AbortController | null>(null);
  const lastCameraCode = useRef("");
  const packedCodes = useRef(new Set<string>());
  const rawForm = useRef<HTMLDetailsElement>(null);
  const [cameraState, setCameraState] = useState<"off" | "starting" | "scanning">("off");
  const [cameraError, setCameraError] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"packing" | "restocking" | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [rawUnits, setRawUnits] = useState("");
  const [rawNotice, setRawNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const releaseCamera = useCallback(() => {
    const session = camera.current;
    camera.current = null;
    if (!session) return;
    window.clearTimeout(session.timer);
    session.stream?.getTracks().forEach(track => track.stop());
    if (video.current?.srcObject) video.current.srcObject = null;
  }, []);

  useEffect(() => () => {
    releaseCamera();
    request.current?.abort();
  }, [releaseCamera]);

  function stopCamera() {
    releaseCamera();
    setCameraState("off");
  }

  async function scan(value: string) {
    const scannedCode = value.trim();
    if (!scannedCode || request.current) return;
    if (camera.current) lastCameraCode.current = scannedCode;
    if (rawForm.current) rawForm.current.open = false;
    setCode(scannedCode);
    setScanMessage("");
    setScanError("");
    setResult(null);
    setRawNotice(null);
    setRawUnits("");
    if (scannedCode.length > 256) {
      setScanError("This code is too long. Use the code printed on your Inventory label.");
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setBusy("packing");
    try {
      const packed = await packLabel(scannedCode, AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]));
      if (controller.signal.aborted) return;
      packedCodes.current.add(scannedCode);
      setScanMessage(packed.alreadyPacked ? "Already packed" : "Packed · 1 printed unit deducted");

      const inventory = packed.inventory;
      if (!inventory || !/^[a-f0-9]{24}$/i.test(inventory.productId)) return;
      // Packing has already succeeded. Keep its confirmation even if the detail requests fail.
      const detailSignal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]);
      const [productData, designData] = await Promise.all([
        readInventory("/products/" + inventory.productId, detailSignal),
        readInventory("/inventory/design/" + inventory.productId, detailSignal),
      ]);
      const design = Array.isArray(designData?.inventory)
        ? designData.inventory.find((row: InventoryRow) => row.designCode === inventory.designCode) ?? null
        : null;
      const product = productData?.product ?? productData;
      if (!controller.signal.aborted) setResult({ inventory, product, design });
    } catch (error) {
      if (!controller.signal.aborted) {
        setScanError(error instanceof Error && !(error instanceof TypeError) && !(error instanceof SyntaxError) && error.name !== "TimeoutError"
          ? error.message : "Couldn’t confirm packing. Scan or enter the same label to check it.");
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  async function addRawStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result || request.current) return;
    const quantity = Number(rawUnits);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      setRawNotice({ text: "Enter a positive whole number.", error: true });
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setBusy("restocking");
    setRawNotice(null);
    try {
      const response = await postInventory("/inventory/raw", { productId: result.inventory.productId, quantity }, controller.signal);
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Couldn’t add raw stock.");
      if (controller.signal.aborted) return;
      const units = quantity === 1 ? "unit" : "units";
      const balance = Number.isSafeInteger(data?.inventory?.quantity) ? ` · ${data.inventory.quantity} raw in stock` : "";
      setRawNotice({ text: `${quantity} raw ${units} added${balance}` });
      setRawUnits("");
      if (rawForm.current) rawForm.current.open = false;
    } catch (error) {
      if (!controller.signal.aborted) {
        setRawNotice({
          text: error instanceof Error && !(error instanceof TypeError) ? error.message : "Couldn’t confirm the raw stock update. Check Inventory before adding it again.",
          error: true,
        });
      }
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  async function startCamera() {
    if (camera.current || request.current) return;
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access requires HTTPS or localhost. You can enter the code below.");
      return;
    }

    const session: CameraSession = {};
    camera.current = session;
    setCameraState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (camera.current !== session) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      session.stream = stream;
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (camera.current !== session) return;

      const preview = video.current;
      const frame = document.createElement("canvas");
      const context = frame.getContext("2d", { willReadFrequently: true });
      if (!preview || !context) throw new Error("Cannot show camera preview");
      const reader = new BrowserMultiFormatReader();
      preview.srcObject = stream;
      await preview.play();
      if (camera.current !== session) return;
      setCameraState("scanning");

      function scanFrame() {
        if (camera.current !== session || !preview || !context) return;
        if (!rawForm.current?.open && !request.current && preview.videoWidth && preview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          // Skip frames that do not contain a readable barcode.
          try {
            if (frame.width !== preview.videoWidth || frame.height !== preview.videoHeight) {
              frame.width = preview.videoWidth;
              frame.height = preview.videoHeight;
            }
            context.drawImage(preview, 0, 0);
            const value = reader.decodeFromCanvas(frame).getText().trim();
            if (value && value !== lastCameraCode.current && !packedCodes.current.has(value)) void scan(value);
          } catch {
            // Keep scanning while the user positions the label.
          }
        }
        session.timer = window.setTimeout(scanFrame, 250);
      }

      scanFrame();
    } catch (error) {
      if (camera.current !== session) return;
      stopCamera();
      setCameraError(cameraMessage(error));
    }
  }

  return (
    <section className="barcode-scanner" aria-labelledby="barcode-scanner-title">
      <header>
        <h1 id="barcode-scanner-title">Scan barcode</h1>
        <p>Scan a label to pack one item and reduce its printed stock.</p>
      </header>

      <div className="stock-panel scanner-panel">
        {scanMessage && <p role="status" className="stock-success">{scanMessage}</p>}
        {scanError && <p role="alert" className="stock-error">{scanError}</p>}
        <div className="scanner-preview" hidden={cameraState === "off"}>
          <video ref={video} muted playsInline aria-label="Camera preview" />
          <span className="scanner-guide" aria-hidden="true" />
        </div>
        {cameraState === "off" ? (
          <button type="button" className="stock-add-button" onClick={() => void startCamera()} disabled={!!busy}>Start camera</button>
        ) : (
          <>
            <p>{cameraState === "starting" ? "Starting camera…" : "Hold the next label in the frame."}</p>
            <button type="button" className="stock-cancel-button" onClick={stopCamera}>Stop camera</button>
          </>
        )}
        {cameraError && <p role="alert" className="stock-error">{cameraError}</p>}

        <form className="scanner-manual" onSubmit={event => { event.preventDefault(); void scan(code); }}>
          <label htmlFor="inventory-barcode">Enter barcode manually</label>
          <input id="inventory-barcode" value={code} onChange={event => setCode(event.target.value)} maxLength={256} autoComplete="off" disabled={!!busy} />
          <button type="submit" className="stock-cancel-button" disabled={!!busy || !code.trim()}>Pack item</button>
        </form>
        {busy === "packing" && !scanMessage && <p role="status">Packing item…</p>}
      </div>
      {result && (
        <section className="stock-panel scanner-result" aria-label="Scanned product">
          <div>
            <h2>{result.product?.name ?? "Scanned product"}</h2>
            {result.design?.designName && result.design.designName !== result.product?.name && <p>{result.design.designName}</p>}
            <p>{result.inventory.designCode}{result.design?.mode ? ` · ${result.design.mode}` : ""}</p>
            {(result.design?.designSku || result.product?.skuBase) && <p>SKU: {result.design?.designSku || result.product?.skuBase}</p>}
          </div>
          <dl className="stock-model-quantities scanner-counts">
            <div><dt>Printed stock</dt><dd>{result.design?.quantity ?? result.inventory.quantity ?? "—"}</dd></div>
            <div><dt>Total labels</dt><dd>{result.design?.totalBarcodes ?? "—"}</dd></div>
            <div><dt>Available labels</dt><dd>{result.design?.availableBarcodes ?? "—"}</dd></div>
          </dl>
          <details ref={rawForm} className="scanner-restock">
            <summary>Add raw stock</summary>
            <form className="scanner-manual" onSubmit={event => void addRawStock(event)}>
              <label htmlFor="scanner-raw-units">Raw units to add</label>
              <input id="scanner-raw-units" type="number" min="1" step="1" required inputMode="numeric" value={rawUnits} onChange={event => setRawUnits(event.target.value)} disabled={!!busy} />
              <button type="submit" className="stock-add-button" disabled={!!busy}>{busy === "restocking" ? "Adding…" : "Add units"}</button>
            </form>
          </details>
          {rawNotice && <p role={rawNotice.error ? "alert" : "status"} className={rawNotice.error ? "stock-error" : "stock-success"}>{rawNotice.text}</p>}
        </section>
      )}
    </section>
  );
}

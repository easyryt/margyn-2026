"use client";

import Image from "next/image";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

function UploadedImage({ url, name, className }: { url: string; name: string; className: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return <div className={`relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {status === "loading" && <p role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-slate-500"><LoaderCircle size={16} className="animate-spin" />Loading image…</p>}
      {status === "error" ? <p role="alert" className="p-4 text-center text-xs text-rose-600">The uploaded image could not be loaded.</p> : <Image
        src={url}
        alt={`Uploaded image: ${name}`}
        width={480}
        height={480}
        unoptimized
        loading="eager"
        referrerPolicy="no-referrer"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className="h-48 w-full object-contain"
      />}
    </div>;
}

export default function UploadedImagePreview({ url, name, className = "" }: { url: string; name: string; className?: string }) {
  // Mount immediately after upload, resetting the loading state for each new URL.
  return <UploadedImage key={url} url={url} name={name} className={className} />;
}

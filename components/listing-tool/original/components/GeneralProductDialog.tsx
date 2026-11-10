"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export default function GeneralProductDialog({ title, description, children, footer, onClose }: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog ref={dialog} aria-label={title} onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-5xl overflow-hidden rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 open:flex open:flex-col">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        <button type="button" aria-label={`Close ${title}`} onClick={onClose} className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-500"><X size={18} /></button>
      </header>
      <div className="min-h-0 overflow-y-auto p-5 sm:p-6">{children}</div>
      {footer && <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">{footer}</footer>}
    </dialog>
  );
}

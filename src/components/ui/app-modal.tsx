"use client";

import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidthClass?: string;
  closeLabel?: string;
};

export function AppModal({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-xl",
  closeLabel = "Close",
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className={`w-full ${maxWidthClass} rounded-2xl bg-white/15 p-5 shadow-2xl backdrop-blur-xl`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
          >
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

"use client";
import { useEffect } from "react";

export function MobileMenu({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="menu"
      className="fixed inset-0 z-50 md:hidden"
    >
      <button
        aria-label="close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 cursor-default"
      />
      <div
        className="relative brut bg-surface m-3 mt-14"
        style={{ fontFamily: "var(--font-hand)", fontWeight: 700 }}
      >
        <div className="flex items-center justify-between border-b-2 border-ink px-3 py-2">
          <span
            className="text-ink uppercase tracking-[0.2em] text-xs"
            style={{ fontFamily: "var(--font-display)" }}
          >
            // menu
          </span>
          <button
            onClick={onClose}
            aria-label="close"
            className="w-7 h-7 border-2 border-ink text-ink flex items-center justify-center hover:bg-ink hover:text-bg transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-3 space-y-2">{children}</div>
      </div>
    </div>
  );
}

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="open menu"
      className="shrink-0 w-10 h-10 border-2 border-ink bg-surface text-ink flex items-center justify-center hover:bg-ink hover:text-bg transition-colors"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <line x1="3" y1="7" x2="21" y2="7" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="17" x2="21" y2="17" />
      </svg>
    </button>
  );
}

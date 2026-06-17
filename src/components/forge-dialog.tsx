"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ── Types ──────────────────────────────────────

export type DialogMode =
  | { type: "prompt";  title: string; placeholder?: string; initial?: string; onConfirm: (value: string) => void; onCancel: () => void }
  | { type: "confirm"; title: string; message: string;                         onConfirm: () => void;              onCancel: () => void }
  | null;

interface ForgeDialogProps {
  dialog: DialogMode;
}

// ── Component ─────────────────────────────────

export const ForgeDialog = ({ dialog }: ForgeDialogProps) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input value when a new prompt opens
  useEffect(() => {
    if (dialog?.type === "prompt") {
      setValue(dialog.initial ?? "");
      // Focus + select after paint
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [dialog]);

  if (!dialog) return null;

  const handleConfirm = () => {
    if (dialog.type === "prompt") {
      const trimmed = value.trim();
      if (!trimmed) return;
      dialog.onConfirm(trimmed);
    } else {
      dialog.onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter")  { e.preventDefault(); handleConfirm(); }
    if (e.key === "Escape") { e.preventDefault(); dialog.onCancel(); }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="dialog-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="absolute inset-0 z-[400] flex items-center justify-center bg-black/70"
        onClick={dialog.onCancel}
      >
        <motion.div
          key="dialog-panel"
          initial={{ opacity: 0, scale: 0.97, y: -6 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{ opacity: 0,    scale: 0.97, y: -6  }}
          transition={{ duration: 0.1 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          className="w-full max-w-sm border border-[color:var(--forge-border)] bg-[#0a0a0a] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.9)]"
        >
          {/* Title */}
          <div className="mb-4 font-[family-name:var(--font-editor)] text-xs uppercase tracking-[0.18em] text-zinc-400">
            {dialog.title}
          </div>

          {/* Confirm body */}
          {dialog.type === "confirm" && (
            <p className="mb-5 font-[family-name:var(--font-editor)] text-[12px] text-zinc-300">
              {dialog.message}
            </p>
          )}

          {/* Prompt input */}
          {dialog.type === "prompt" && (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={dialog.placeholder ?? ""}
              className="mb-5 w-full border border-[color:var(--forge-border)] bg-black px-3 py-2 font-[family-name:var(--font-editor)] text-[12px] text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500"
              spellCheck={false}
            />
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={dialog.onCancel}
              className="border border-[color:var(--forge-border)] px-4 py-1.5 font-[family-name:var(--font-editor)] text-[11px] uppercase tracking-wide text-zinc-500 transition hover:border-zinc-500 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`border px-4 py-1.5 font-[family-name:var(--font-editor)] text-[11px] uppercase tracking-wide transition ${
                dialog.type === "confirm"
                  ? "border-zinc-400 text-zinc-200 hover:border-white hover:bg-white hover:text-black"
                  : "border-white bg-white text-black hover:bg-zinc-200"
              }`}
            >
              {dialog.type === "confirm" ? "Delete" : "OK"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

"use client";

import { useEffect, useRef, useState } from "react";

export type MenuItemDivider = { type: "divider" };
export type MenuItemAction = {
  type?: "action";
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
};
export type MenuItemCheck = {
  type: "check";
  label: string;
  checked: boolean;
  shortcut?: string;
  onClick: () => void;
};

export type MenuItem = MenuItemDivider | MenuItemAction | MenuItemCheck;

export interface MenuDef {
  label: string;
  items: MenuItem[];
}

export interface MenuBarProps {
  menus: MenuDef[];
}

// ── Dropdown ──────────────────────────────────

function Dropdown({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  return (
    <div className="absolute left-0 top-full z-[500] mt-px min-w-[220px] border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)] py-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)] [isolation:isolate]">
      {items.map((item, i) => {
        if (item.type === "divider") {
          return <div key={i} className="my-1 border-t border-[color:var(--forge-border)]" />;
        }

        const isCheck    = item.type === "check";
        const checked    = isCheck ? (item as MenuItemCheck).checked : false;
        const isDisabled = !isCheck && (item as MenuItemAction).disabled === true;
        const shortcut   = (item as MenuItemAction).shortcut;

        return (
          <button
            key={i}
            type="button"
            disabled={isDisabled}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDisabled) { item.onClick(); onClose(); }
            }}
            className={`flex w-full items-center justify-between gap-8 px-4 py-[5px] text-left font-[family-name:var(--font-editor)] text-[11px] transition-colors ${
              isDisabled
                ? "cursor-default text-[color:var(--forge-muted)] opacity-40"
                : "cursor-default text-[color:var(--forge-fg)] hover:bg-[color:var(--forge-hover)]"
            }`}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {/* checkmark — theme-aware */}
              <span className="w-3 shrink-0 text-[10px] leading-none text-[color:var(--forge-fg)]">
                {isCheck ? (checked ? "✓" : "") : ""}
              </span>
              {item.label}
            </span>
            {shortcut && (
              <span className="shrink-0 text-[10px] text-[color:var(--forge-muted)]">{shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── MenuBar ───────────────────────────────────

export const MenuBar = ({ menus }: MenuBarProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const onOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenIndex(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenIndex(null); };
    document.addEventListener("mousedown", onOutside, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [openIndex]);

  return (
    <div ref={barRef} className="flex items-center">
      {menus.map((menu, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={menu.label} className="relative">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpenIndex(isOpen ? null : idx); }}
              onMouseEnter={() => { if (openIndex !== null && openIndex !== idx) setOpenIndex(idx); }}
              className={`rounded-sm px-2.5 py-[3px] font-[family-name:var(--font-editor)] text-[11px] tracking-wide transition-colors select-none ${
                isOpen
                  ? "bg-[color:var(--forge-hover)] text-[color:var(--forge-fg)]"
                  : "text-[color:var(--forge-fg)] opacity-70 hover:opacity-100 hover:bg-[color:var(--forge-hover)]"
              }`}
            >
              {menu.label}
            </button>

            {isOpen && <Dropdown items={menu.items} onClose={() => setOpenIndex(null)} />}
          </div>
        );
      })}
    </div>
  );
};

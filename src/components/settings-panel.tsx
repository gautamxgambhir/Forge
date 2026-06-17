"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";
import type { ThemeMode } from "@/hooks/use-theme";
import type { SidebarSide, TerminalSide } from "@/editor/store";

const THEMES: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "dark",   label: "Dark",   icon: "◐" },
  { value: "light",  label: "Light",  icon: "○" },
  { value: "system", label: "System", icon: "◑" },
];

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  anchorBottom: number;
  anchorLeft:   number;
  // editor
  fontSize:    number;
  typingSpeed: number;
  minimapOn:   boolean;
  onFontSize:    (v: number) => void;
  onTypingSpeed: (v: number) => void;
  onMinimapOn:   (v: boolean) => void;
  // layout
  sidebarSide:  SidebarSide;
  terminalSide: TerminalSide;
  onSidebarSide:  (v: SidebarSide) => void;
  onTerminalSide: (v: TerminalSide) => void;
}

export const SettingsPanel = ({
  open, onClose, anchorBottom, anchorLeft,
  fontSize, typingSpeed, minimapOn,
  onFontSize, onTypingSpeed, onMinimapOn,
  sidebarSide, terminalSide, onSidebarSide, onTerminalSide,
}: SettingsPanelProps) => {
  const { mode: themeMode, setTheme } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  const segBtn = (active: boolean) =>
    `flex-1 py-1.5 text-[10px] uppercase tracking-wide transition ${
      active
        ? "bg-[color:var(--forge-fg)] text-[color:var(--forge-bg)]"
        : "text-[color:var(--forge-muted)] hover:text-[color:var(--forge-fg)]"
    }`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          key="settings-panel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.12 }}
          style={{ bottom: anchorBottom, left: anchorLeft }}
          className="fixed z-[500] w-68 border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)] shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[color:var(--forge-border)] px-4 py-2.5">
            <span className="font-[family-name:var(--font-editor)] text-[10px] uppercase tracking-[0.2em] text-[color:var(--forge-muted)]">
              Settings
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-[14px] leading-none text-[color:var(--forge-muted)] transition hover:text-[color:var(--forge-fg)]"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 p-4 font-[family-name:var(--font-editor)] text-[11px]">

            {/* Theme */}
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-[color:var(--forge-muted)]">Theme</div>
              <div className="flex border border-[color:var(--forge-border)]">
                {THEMES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setTheme(t.value)} title={t.label}
                    className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] uppercase tracking-wide transition ${
                      themeMode === t.value
                        ? "bg-[color:var(--forge-fg)] text-[color:var(--forge-bg)]"
                        : "text-[color:var(--forge-muted)] hover:text-[color:var(--forge-fg)]"
                    }`}>
                    <span className="text-[13px]">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Layout: sidebar side */}
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-[color:var(--forge-muted)]">Explorer</div>
              <div className="flex border border-[color:var(--forge-border)]">
                <button type="button" onClick={() => onSidebarSide("left")}  className={segBtn(sidebarSide === "left")}>Left</button>
                <button type="button" onClick={() => onSidebarSide("right")} className={segBtn(sidebarSide === "right")}>Right</button>
              </div>
            </div>

            {/* Layout: terminal side */}
            <div>
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.15em] text-[color:var(--forge-muted)]">Terminal</div>
              <div className="flex border border-[color:var(--forge-border)]">
                <button type="button" onClick={() => onTerminalSide("bottom")} className={segBtn(terminalSide === "bottom")}>Bottom</button>
                <button type="button" onClick={() => onTerminalSide("right")}  className={segBtn(terminalSide === "right")}>Right</button>
              </div>
            </div>

            {/* Minimap */}
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--forge-muted)]">Minimap</span>
              <button type="button" onClick={() => onMinimapOn(!minimapOn)}
                className={`border px-3 py-0.5 text-[10px] uppercase tracking-wide transition ${
                  minimapOn
                    ? "border-[color:var(--forge-fg)] bg-[color:var(--forge-fg)] text-[color:var(--forge-bg)]"
                    : "border-[color:var(--forge-border)] text-[color:var(--forge-muted)] hover:text-[color:var(--forge-fg)]"
                }`}>
                {minimapOn ? "On" : "Off"}
              </button>
            </div>

            {/* Font size */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[color:var(--forge-muted)]">Font size</span>
                <span className="text-[color:var(--forge-muted)] opacity-60">{fontSize}px</span>
              </div>
              <input type="range" min={10} max={24} step={1} value={fontSize}
                onChange={(e) => onFontSize(Number(e.target.value))}
                className="w-full accent-[color:var(--forge-fg)]" />
            </div>

            {/* Terminal speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[color:var(--forge-muted)]">Terminal speed</span>
                <span className="text-[color:var(--forge-muted)] opacity-60">{typingSpeed}ms</span>
              </div>
              <input type="range" min={4} max={40} step={2} value={typingSpeed}
                onChange={(e) => onTypingSpeed(Number(e.target.value))}
                className="w-full accent-[color:var(--forge-fg)]" />
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

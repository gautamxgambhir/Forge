"use client";

import { MenuBar } from "@/components/menu-bar";
import type { MenuDef } from "@/components/menu-bar";

export interface TopBarProps {
  currentFileName: string;
  isRunning: boolean;
  sidebarVisible: boolean;
  terminalVisible: boolean;
  minimapEnabled: boolean;
  isMobile?: boolean;
  onMobileSidebarToggle?: () => void;
  // File
  onNewFile: () => void;
  onSaveFile: () => void;
  onShowSettings: () => void;
  // Edit
  onUndo: () => void;
  onRedo: () => void;
  onFind: () => void;
  onReplace: () => void;
  // Selection
  onSelectAll: () => void;
  onDuplicateLine: () => void;
  onMoveLinesUp: () => void;
  onMoveLinesDown: () => void;
  // View
  viewMode: "code" | "visual" | "split";
  onViewModeChange: (mode: "code" | "visual" | "split") => void;
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  onToggleMinimap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  // Go
  onGoToLine: () => void;
  // Run
  onRun: () => void;
  onClearOutput: () => void;
  // Terminal
  onNewTerminal: () => void;
  onClearTerminal: () => void;
  // Help
  onShowHelp: () => void;
  onShowAbout: () => void;
}

export const TopBar = ({
  currentFileName,
  isRunning,
  sidebarVisible,
  terminalVisible,
  minimapEnabled,
  viewMode,
  onViewModeChange,
  isMobile = false,
  onMobileSidebarToggle,
  onNewFile,
  onSaveFile,
  onShowSettings,
  onUndo,
  onRedo,
  onFind,
  onReplace,
  onSelectAll,
  onDuplicateLine,
  onMoveLinesUp,
  onMoveLinesDown,
  onToggleSidebar,
  onToggleTerminal,
  onToggleMinimap,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onGoToLine,
  onRun,
  onClearOutput,
  onNewTerminal,
  onClearTerminal,
  onShowHelp,
  onShowAbout,
}: TopBarProps) => {

  const menus: MenuDef[] = [
    {
      label: "File",
      items: [
        { label: "New File",  shortcut: "Ctrl+N", onClick: onNewFile },
        { type: "divider" },
        { label: "Save",      shortcut: "Ctrl+S", onClick: onSaveFile },
        { type: "divider" },
        { label: "Settings",  shortcut: "Ctrl+,", onClick: onShowSettings },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo",    shortcut: "Ctrl+Z", onClick: onUndo },
        { label: "Redo",    shortcut: "Ctrl+Y", onClick: onRedo },
        { type: "divider" },
        { label: "Find",    shortcut: "Ctrl+F", onClick: onFind },
        { label: "Replace", shortcut: "Ctrl+H", onClick: onReplace },
      ],
    },
    {
      label: "Selection",
      items: [
        { label: "Select All",      shortcut: "Ctrl+A",      onClick: onSelectAll },
        { type: "divider" },
        { label: "Duplicate Line",  shortcut: "Shift+Alt+↓", onClick: onDuplicateLine },
        { label: "Move Line Up",    shortcut: "Alt+↑",       onClick: onMoveLinesUp },
        { label: "Move Line Down",  shortcut: "Alt+↓",       onClick: onMoveLinesDown },
      ],
    },
    {
      label: "View",
      items: [
        { type: "check", label: "Explorer", checked: sidebarVisible,  shortcut: "Ctrl+B", onClick: onToggleSidebar },
        { type: "check", label: "Terminal", checked: terminalVisible, shortcut: "Ctrl+`", onClick: onToggleTerminal },
        { type: "divider" },
        { type: "check", label: "Code View", checked: viewMode === "code", onClick: () => onViewModeChange("code") },
        { type: "check", label: "Visual Explorer", checked: viewMode === "visual", onClick: () => onViewModeChange("visual") },
        { type: "check", label: "Split View", checked: viewMode === "split", onClick: () => onViewModeChange("split") },
        { type: "divider" },
        { type: "check", label: "Minimap",  checked: minimapEnabled,  onClick: onToggleMinimap },
        { type: "divider" },
        { label: "Zoom In",    shortcut: "Ctrl++", onClick: onZoomIn },
        { label: "Zoom Out",   shortcut: "Ctrl+-", onClick: onZoomOut },
        { label: "Reset Zoom", shortcut: "Ctrl+0", onClick: onResetZoom },
      ],
    },
    {
      label: "Go",
      items: [
        { label: "Go to Line…", shortcut: "Ctrl+G", onClick: onGoToLine },
      ],
    },
    {
      label: "Run",
      items: [
        { label: isRunning ? "Running…" : "Run File", shortcut: "Ctrl+Enter", disabled: isRunning, onClick: onRun },
        { type: "divider" },
        { label: "Clear Output", onClick: onClearOutput },
      ],
    },
    {
      label: "Terminal",
      items: [
        { label: "New Terminal",    onClick: onNewTerminal },
        { type: "divider" },
        { label: "Clear Terminal",  onClick: onClearTerminal },
        { type: "check", label: "Show Terminal", checked: terminalVisible, shortcut: "Ctrl+`", onClick: onToggleTerminal },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "FORGE Command Reference", onClick: onShowHelp },
        { type: "divider" },
        { label: "About FORGE",          onClick: onShowAbout },
      ],
    },
  ];

  return (
    <header className="relative flex h-10 shrink-0 items-center border-b border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
      {/* Logo / mobile hamburger */}
      <div
        className={`flex h-full w-10 shrink-0 items-center justify-center border-r border-[color:var(--forge-border)] ${isMobile ? "cursor-pointer" : ""}`}
        onClick={isMobile ? onMobileSidebarToggle : undefined}
      >
        <span className="select-none font-[family-name:var(--font-pixel)] text-[11px] tracking-widest text-[color:var(--forge-fg)]">
          {isMobile ? "≡" : "F"}
        </span>
      </div>

      {/* Menu bar — desktop only */}
      {!isMobile && (
        <div className="flex h-full min-w-0 flex-1 items-center px-1">
          <MenuBar menus={menus} />
        </div>
      )}

      {/* Mobile: filename + run */}
      {isMobile && (
        <div className="flex min-w-0 flex-1 items-center justify-between px-2">
          <span className="truncate font-[family-name:var(--font-editor)] text-[11px] text-[color:var(--forge-muted)]">
            {currentFileName}
          </span>
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            className="ml-2 shrink-0 border border-[color:var(--forge-border)] px-3 py-1 font-[family-name:var(--font-editor)] text-[10px] uppercase tracking-wide text-[color:var(--forge-fg)] transition hover:bg-[color:var(--forge-hover)] disabled:opacity-50"
          >
            {isRunning ? "Running…" : "▶ Run"}
          </button>
        </div>
      )}

      {/* Desktop: centred filename */}
      {!isMobile && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <span className="select-none font-[family-name:var(--font-editor)] text-[11px] text-[color:var(--forge-muted)]">
            {currentFileName}
          </span>
        </div>
      )}

      {/* Desktop: Run button — top-right */}
      {!isMobile && (
        <div className="ml-auto flex h-full shrink-0 items-center border-l border-[color:var(--forge-border)] px-3">
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 border border-[color:var(--forge-border)] px-3 py-1 font-[family-name:var(--font-editor)] text-[11px] uppercase tracking-wide text-[color:var(--forge-fg)] transition hover:bg-[color:var(--forge-hover)] disabled:opacity-40"
          >
            <span className="text-[10px]">▶</span>
            <span>{isRunning ? "Running…" : "Run"}</span>
          </button>
        </div>
      )}
    </header>
  );
};

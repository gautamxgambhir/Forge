"use client";

import { useMemo, useRef, useState } from "react";
import type { ForgeFile } from "@/types/editor";
import { usePanelResize } from "@/hooks/use-panel-resize";
import { ForgeDialog } from "@/components/forge-dialog";
import { SettingsPanel } from "@/components/settings-panel";
import type { DialogMode } from "@/components/forge-dialog";
import { useForgeStore } from "@/editor/store";

interface SidebarProps {
  files: ForgeFile[];
  activeFileId: string;
  collapsed: boolean;
  width: number;
  onToggleCollapsed: () => void;
  onResize: (nextWidth: number) => void;
  onOpenFile: (fileId: string) => void;
  onCreateFile: (fileName?: string) => void;
  onRenameFile: (fileId: string, nextName: string) => void;
  onDeleteFile: (fileId: string) => void;
  fontSize: number;
  typingSpeed: number;
  minimapOn: boolean;
  onFontSize: (v: number) => void;
  onTypingSpeed: (v: number) => void;
  onMinimapOn: (v: boolean) => void;
}

export const Sidebar = ({
  files, activeFileId, collapsed, width,
  onToggleCollapsed, onResize, onOpenFile,
  onCreateFile, onRenameFile, onDeleteFile,
  fontSize, typingSpeed, minimapOn,
  onFontSize, onTypingSpeed, onMinimapOn,
}: SidebarProps) => {
  const sidebarSide    = useForgeStore((s) => s.sidebarSide);
  const terminalSide   = useForgeStore((s) => s.terminalSide);
  const setSidebarSide = useForgeStore((s) => s.setSidebarSide);
  const setTerminalSide = useForgeStore((s) => s.setTerminalSide);
  const displayWidth = collapsed ? 48 : width;
  const { startResize, isResizing } = usePanelResize({
    axis: "x",
    onResize: (delta) => onResize(width + delta),
  });

  const [dialog,       setDialog]       = useState<DialogMode>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [anchor,       setAnchor]       = useState({ bottom: 48, left: 0 });
  const gearRef = useRef<HTMLButtonElement>(null);

  const closeDialog = () => setDialog(null);

  const getAnchor = () => {
    const rect = gearRef.current?.getBoundingClientRect();
    if (!rect) return { bottom: 48, left: 0 };
    return { bottom: window.innerHeight - rect.top + 4, left: rect.left };
  };

  const filesSorted = useMemo(
    () => [...files].sort((a, b) => {
      if (a.name === "welcome.forge" || a.name === "README.forge") return -1;
      if (b.name === "welcome.forge" || b.name === "README.forge") return  1;
      return a.name.localeCompare(b.name);
    }),
    [files],
  );

  const handleCreate = () => setDialog({
    type: "prompt", title: "New file", placeholder: "filename.forge", initial: "",
    onConfirm: (name) => { closeDialog(); onCreateFile(name); }, onCancel: closeDialog,
  });

  const handleRename = (file: ForgeFile) => setDialog({
    type: "prompt", title: "Rename file", placeholder: file.name, initial: file.name,
    onConfirm: (name) => { closeDialog(); onRenameFile(file.id, name); }, onCancel: closeDialog,
  });

  const handleDelete = (file: ForgeFile) => setDialog({
    type: "confirm", title: "Delete file",
    message: `Delete "${file.name}"? This cannot be undone.`,
    onConfirm: () => { closeDialog(); onDeleteFile(file.id); }, onCancel: closeDialog,
  });

  return (
    <>
      <aside
        className="relative flex h-full shrink-0 border-r border-[color:var(--forge-border)] bg-[color:var(--forge-bg)]"
        style={{ width: displayWidth }}
      >
        <div className="flex h-full min-h-0 flex-1 flex-col">

          {/* Header */}
          <div className="flex h-10 items-center justify-between border-b border-[color:var(--forge-border)] px-2">
            {!collapsed && (
              <span className="font-[family-name:var(--font-editor)] text-xs uppercase tracking-[0.2em] text-[color:var(--forge-muted)]">
                Explorer
              </span>
            )}
            <div className="flex items-center gap-1">
              {!collapsed && (
                <button type="button" onClick={handleCreate} title="New file"
                  className="rounded border border-[color:var(--forge-border)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] text-xs text-[color:var(--forge-muted)] transition hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]">
                  +
                </button>
              )}
              <button type="button" onClick={onToggleCollapsed}
                title={collapsed ? "Expand" : "Collapse"}
                className="rounded border border-[color:var(--forge-border)] px-1.5 py-0.5 font-[family-name:var(--font-editor)] text-xs text-[color:var(--forge-muted)] transition hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]">
                {collapsed ? ">" : "<"}
              </button>
            </div>
          </div>

          {/* File list */}
          {collapsed ? (
            <div className="flex flex-1 flex-col items-center gap-2 overflow-auto py-2">
              {filesSorted.map((file) => (
                <button type="button" key={file.id} onClick={() => onOpenFile(file.id)}
                  title={file.name}
                  className={`h-8 w-8 rounded border text-xs transition ${
                    activeFileId === file.id
                      ? "border-[color:var(--forge-fg)] bg-[color:var(--forge-fg)] text-[color:var(--forge-bg)]"
                      : "border-[color:var(--forge-border)] text-[color:var(--forge-muted)] hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]"
                  }`}>
                  {file.name.slice(0, 2).toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <div className="forge-scrollbar flex flex-1 flex-col overflow-auto px-1 py-2">
              <div className="mb-2 px-2 font-[family-name:var(--font-editor)] text-[10px] uppercase tracking-[0.15em] text-[color:var(--forge-muted)]">
                root/
              </div>
              <ul className="space-y-0.5">
                {filesSorted.map((file) => {
                  const active = file.id === activeFileId;
                  return (
                    <li key={file.id}
                      className={`group flex items-center justify-between rounded border px-2 py-1 ${
                        active
                          ? "border-[color:var(--forge-fg)] bg-[color:var(--forge-fg)] text-[color:var(--forge-bg)]"
                          : "border-transparent text-[color:var(--forge-muted)] hover:border-[color:var(--forge-border)] hover:text-[color:var(--forge-fg)]"
                      }`}>
                      <button type="button" onClick={() => onOpenFile(file.id)}
                        className="flex-1 truncate text-left font-[family-name:var(--font-editor)] text-xs"
                        title={file.name}>
                        {file.name}
                      </button>
                      <div className="ml-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button type="button" onClick={() => handleRename(file)} title="Rename"
                          className={`rounded border px-1 text-[10px] transition ${
                            active
                              ? "border-[color:var(--forge-bg)]/30 text-[color:var(--forge-bg)] hover:border-[color:var(--forge-bg)]"
                              : "border-[color:var(--forge-border)] text-[color:var(--forge-muted)] hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]"
                          }`}>R</button>
                        <button type="button" onClick={() => handleDelete(file)} title="Delete"
                          className={`rounded border px-1 text-[10px] transition ${
                            active
                              ? "border-[color:var(--forge-bg)]/30 text-[color:var(--forge-bg)] hover:border-[color:var(--forge-bg)]"
                              : "border-[color:var(--forge-border)] text-[color:var(--forge-muted)] hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]"
                          }`}>D</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Bottom gear */}
          <div className="flex items-center border-t border-[color:var(--forge-border)] px-2 py-2">
            <button
              ref={gearRef}
              type="button"
              title="Settings"
              onClick={() => { setAnchor(getAnchor()); setSettingsOpen((v) => !v); }}
              className={`flex h-8 w-8 items-center justify-center rounded border text-[16px] transition ${
                settingsOpen
                  ? "border-[color:var(--forge-fg)] text-[color:var(--forge-fg)]"
                  : "border-[color:var(--forge-border)] text-[color:var(--forge-muted)] hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]"
              }`}
            >
              ⚙
            </button>
          </div>

        </div>

        {/* Resize handle */}
        {!collapsed && (
          <div role="separator" aria-orientation="vertical" onMouseDown={startResize}
            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition ${
              isResizing ? "bg-[color:var(--forge-fg)]/40" : "hover:bg-[color:var(--forge-fg)]/20"
            }`}
          />
        )}
      </aside>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        anchorBottom={anchor.bottom}
        anchorLeft={anchor.left}
        fontSize={fontSize}
        typingSpeed={typingSpeed}
        minimapOn={minimapOn}
        onFontSize={onFontSize}
        onTypingSpeed={onTypingSpeed}
        onMinimapOn={onMinimapOn}
        sidebarSide={sidebarSide}
        terminalSide={terminalSide}
        onSidebarSide={setSidebarSide}
        onTerminalSide={setTerminalSide}
      />

      <ForgeDialog dialog={dialog} />
    </>
  );
};

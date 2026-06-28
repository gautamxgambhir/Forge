"use client";

import type { ForgeFile } from "@/types/editor";

interface EditorTabsProps {
  files: ForgeFile[];
  openTabs: string[];
  activeFileId: string;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  viewMode: "code" | "visual" | "split";
  onViewModeChange: (mode: "code" | "visual" | "split") => void;
}

export const EditorTabs = ({
  files,
  openTabs,
  activeFileId,
  onSelectTab,
  onCloseTab,
  viewMode,
  onViewModeChange,
}: EditorTabsProps) => {
  const openFiles = openTabs
    .map((fileId) => files.find((file) => file.id === fileId))
    .filter((file): file is ForgeFile => Boolean(file));

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[color:var(--forge-border)] bg-[color:var(--forge-surface)] select-none">
      {/* Tabs scroll area */}
      <div className="forge-scrollbar flex h-full flex-1 items-stretch overflow-x-auto">
        {openFiles.map((file) => {
          const active = file.id === activeFileId;
          return (
            <div
              key={file.id}
              className={`group relative flex shrink-0 items-center border-r border-[color:var(--forge-border)] px-3 ${
                active
                  ? "bg-[color:var(--forge-bg)] text-[color:var(--forge-fg)]"
                  : "bg-[color:var(--forge-surface)] text-[color:var(--forge-muted)] hover:bg-[color:var(--forge-bg)] hover:text-[color:var(--forge-fg)]"
              }`}
            >
              {/* filename */}
              <button
                type="button"
                onClick={() => onSelectTab(file.id)}
                className="max-w-[180px] truncate text-left font-[family-name:var(--font-editor)] text-xs leading-none no-underline decoration-transparent"
              >
                {file.name}
              </button>

              {/* close × */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCloseTab(file.id); }}
                title="Close"
                className="ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm font-[family-name:var(--font-editor)] text-xs leading-none text-[color:var(--forge-muted)] opacity-0 transition hover:bg-[color:var(--forge-hover)] hover:text-[color:var(--forge-fg)] group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Toolbar buttons */}
      <div className="flex h-full items-center gap-1.5 px-3 border-l border-[color:var(--forge-border)]">
        <button
          type="button"
          onClick={() => onViewModeChange("code")}
          title="Code View"
          className={`flex h-6 items-center justify-center px-2.5 font-[family-name:var(--font-editor)] text-[10px] tracking-wide border cursor-pointer transition ${
            viewMode === "code"
              ? "border-[color:var(--forge-fg)] bg-[color:var(--forge-fg)] text-[color:var(--forge-bg)] font-bold"
              : "border-[color:var(--forge-border)] text-[color:var(--forge-muted)] hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]"
          }`}
        >
          &lt;&gt; Code
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("visual")}
          title="Visual Explorer"
          className={`flex h-6 items-center justify-center px-2.5 font-[family-name:var(--font-editor)] text-[10px] tracking-wide border cursor-pointer transition ${
            viewMode === "visual"
              ? "border-[color:var(--forge-fg)] bg-[color:var(--forge-fg)] text-[color:var(--forge-bg)] font-bold"
              : "border-[color:var(--forge-border)] text-[color:var(--forge-muted)] hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]"
          }`}
        >
          ▣ Visual
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("split")}
          title="Split View"
          className={`flex h-6 items-center justify-center px-2.5 font-[family-name:var(--font-editor)] text-[10px] tracking-wide border cursor-pointer transition ${
            viewMode === "split"
              ? "border-[color:var(--forge-fg)] bg-[color:var(--forge-fg)] text-[color:var(--forge-bg)] font-bold"
              : "border-[color:var(--forge-border)] text-[color:var(--forge-muted)] hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]"
          }`}
        >
          ◫ Split
        </button>
      </div>
    </div>
  );
};

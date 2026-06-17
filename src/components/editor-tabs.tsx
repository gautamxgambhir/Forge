"use client";

import type { ForgeFile } from "@/types/editor";

interface EditorTabsProps {
  files: ForgeFile[];
  openTabs: string[];
  activeFileId: string;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
}

export const EditorTabs = ({
  files,
  openTabs,
  activeFileId,
  onSelectTab,
  onCloseTab,
}: EditorTabsProps) => {
  const openFiles = openTabs
    .map((fileId) => files.find((file) => file.id === fileId))
    .filter((file): file is ForgeFile => Boolean(file));

  return (
    <div className={`forge-scrollbar flex h-10 items-stretch overflow-x-auto bg-[color:var(--forge-bg)] ${openFiles.length > 0 ? "border-b border-[color:var(--forge-border)]" : ""}`}>
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
  );
};

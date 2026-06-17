"use client";

const D = () => <div className="border-t border-[color:var(--forge-border)]" />;

const Row = ({ label, keys, bold }: { label: string; keys: string[]; bold?: boolean }) => (
  <div className="flex items-center justify-between gap-8 py-[7px]">
    <span className={`font-[family-name:var(--font-editor)] text-[12px] ${bold ? "font-bold text-[color:var(--forge-fg)]" : "text-[color:var(--forge-muted)]"}`}>
      {label}
    </span>
    <div className="flex items-center gap-1.5">
      {keys.map((k) => (
        <kbd key={k} className="flex h-6 min-w-[1.6rem] items-center justify-center border border-[color:var(--forge-border)] bg-[color:var(--forge-surface2)] px-1.5 font-[family-name:var(--font-editor)] text-[11px] text-[color:var(--forge-muted)]">
          {k}
        </kbd>
      ))}
    </div>
  </div>
);

export const EditorEmpty = ({ onNewFile }: { onNewFile: () => void }) => (
  <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-[color:var(--forge-bg)] select-none">
    <div className="mb-2 font-[family-name:var(--font-pixel)] text-2xl tracking-[0.3em] text-[color:var(--forge-fg)]">
      FORGE
    </div>
    <div className="mb-10 font-[family-name:var(--font-editor)] text-[11px] tracking-[0.15em] text-[color:var(--forge-muted)]">
      v1.0.0
    </div>

    <div className="w-full max-w-[340px] border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)] px-6 py-2">
      <Row label="Run file"        keys={["Ctrl", "Enter"]} bold />
      <D /><Row label="New file"        keys={["Ctrl", "N"]} />
      <D /><Row label="Toggle sidebar"  keys={["Ctrl", "B"]} />
      <D /><Row label="Toggle terminal" keys={["Ctrl", "`"]} />
      <D /><Row label="Find"            keys={["Ctrl", "F"]} />
      <D /><Row label="Go to line"      keys={["Ctrl", "G"]} />
      <D /><Row label="Settings"        keys={["Ctrl", ","]} />
    </div>

    <button
      type="button"
      onClick={onNewFile}
      className="mt-8 border border-[color:var(--forge-border)] px-4 py-2 font-[family-name:var(--font-editor)] text-[11px] text-[color:var(--forge-muted)] transition hover:border-[color:var(--forge-muted)] hover:text-[color:var(--forge-fg)]"
    >
      + New file
    </button>
    <p className="mt-4 font-[family-name:var(--font-editor)] text-[10px] text-[color:var(--forge-muted)] opacity-50">
      or click a file in the explorer
    </p>
  </div>
);

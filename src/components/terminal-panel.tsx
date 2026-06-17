"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TerminalEntry } from "@/types/editor";
import type { TerminalSession } from "@/editor/store";
import type { TerminalSide } from "@/editor/store";
import { usePanelResize } from "@/hooks/use-panel-resize";

interface TerminalPanelProps {
  sessions:        TerminalSession[];
  activeSessionId: string;
  history:         string[];
  collapsed:       boolean;
  expanded:        boolean;
  height:          number;
  width:           number;
  side:            TerminalSide;
  typingSpeedMs:   number;
  onCommand:         (command: string) => void;
  onClear:           () => void;
  onToggleCollapse:  () => void;
  onToggleExpand:    () => void;
  onResizeHeight:    (height: number) => void;
  onResizeWidth:     (width: number) => void;
  onNewSession:      () => void;
  onCloseSession:    (id: string) => void;
  onSelectSession:   (id: string) => void;
}

export const TerminalPanel = ({
  sessions, activeSessionId, history,
  collapsed, expanded, height, width, side,
  typingSpeedMs,
  onCommand, onClear, onToggleCollapse, onToggleExpand,
  onResizeHeight, onResizeWidth,
  onNewSession, onCloseSession, onSelectSession,
}: TerminalPanelProps) => {
  const [command,      setCommand]      = useState("");
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [revealed,     setRevealed]     = useState<Record<string, number>>({});
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const isRight  = side === "right";
  const isBottom = side === "bottom";

  // Resize handles
  const { startResize: startResizeY, isResizing: isResizingY } = usePanelResize({
    axis: "y",
    onResize: (delta) => onResizeHeight(height - delta),
  });
  const { startResize: startResizeX, isResizing: isResizingX } = usePanelResize({
    axis: "x",
    onResize: (delta) => onResizeWidth(width - delta),
  });

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const entries: TerminalEntry[] = activeSession?.entries ?? [];

  // Collapsed dimension
  const HEADER_H = 36;

  // Compute rendered size
  const renderedStyle = useMemo(() => {
    if (isBottom) {
      if (collapsed) return { height: HEADER_H };
      if (expanded)  return { height: Math.max(height, 420) };
      return { height };
    }
    // right side
    if (collapsed) return { width: HEADER_H };
    return { width, minWidth: width, maxWidth: width };
  }, [isBottom, collapsed, expanded, height, width]);

  // Typing animation
  useEffect(() => {
    const t = window.setInterval(() => {
      setRevealed((cur) => {
        let changed = false;
        const next = { ...cur };
        for (const e of entries) {
          const target = e.text.length;
          const cur2 = next[e.id] ?? (e.animate ? 0 : target);
          if (cur2 < target) { next[e.id] = Math.min(target, cur2 + 1); changed = true; }
        }
        return changed ? next : cur;
      });
    }, Math.max(typingSpeedMs, 8));
    return () => window.clearInterval(t);
  }, [entries, typingSpeedMs]);

  // Auto-scroll
  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: "smooth" });
  }, [entries, revealed]);

  // Reset when switching sessions
  useEffect(() => { setRevealed({}); }, [activeSessionId]);

  const handleSubmit = () => {
    const cmd = command.trim();
    if (!cmd) return;
    onCommand(cmd);
    setCommand("");
    setHistoryIndex(null);
  };

  const handleHistory = (dir: "up" | "down") => {
    if (!history.length) return;
    if (dir === "up") {
      setHistoryIndex((i) => {
        const idx = i === null ? history.length - 1 : Math.max(0, i - 1);
        setCommand(history[idx] ?? "");
        return idx;
      });
    } else {
      setHistoryIndex((i) => {
        if (i === null) return null;
        const idx = i + 1;
        if (idx >= history.length) { setCommand(""); return null; }
        setCommand(history[idx] ?? "");
        return idx;
      });
    }
  };

  const copyOutput = async () => {
    const text = entries.map((e) => e.text).join("\n");
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
  };

  const btn = "border border-[color:var(--forge-border)] px-2 py-0.5 font-[family-name:var(--font-editor)] text-[10px] uppercase tracking-wide text-[color:var(--forge-muted)] transition hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)]";

  return (
    <section
      className={`relative flex bg-[color:var(--forge-bg)] ${
        isRight
          ? "h-full flex-col border-l border-[color:var(--forge-border)]"
          : "w-full flex-col border-t border-[color:var(--forge-border)]"
      }`}
      style={renderedStyle}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Bottom resize handle (drag top edge when terminal is at bottom) */}
      {isBottom && !collapsed && (
        <div
          role="separator"
          aria-orientation="horizontal"
          onMouseDown={startResizeY}
          className={`absolute left-0 top-0 z-10 h-1 w-full cursor-row-resize transition ${
            isResizingY ? "bg-[color:var(--forge-fg)]/30" : "hover:bg-[color:var(--forge-fg)]/15"
          }`}
        />
      )}

      {/* Right resize handle (drag left edge when terminal is on the right) */}
      {isRight && !collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={startResizeX}
          className={`absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize transition ${
            isResizingX ? "bg-[color:var(--forge-fg)]/30" : "hover:bg-[color:var(--forge-fg)]/15"
          }`}
        />
      )}

      {/* Header: session tabs + action buttons */}
      <div className="flex h-9 shrink-0 items-stretch border-b border-[color:var(--forge-border)]">

        {/* Session tabs */}
        <div className="forge-scrollbar flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {sessions.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={`group flex shrink-0 cursor-pointer items-center border-r border-[color:var(--forge-border)] px-3 font-[family-name:var(--font-editor)] text-[11px] transition ${
                  active
                    ? "bg-[color:var(--forge-bg)] text-[color:var(--forge-fg)]"
                    : "bg-[color:var(--forge-surface)] text-[color:var(--forge-muted)] hover:text-[color:var(--forge-fg)]"
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <span className="max-w-[120px] truncate">{session.name}</span>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onCloseSession(session.id); }}
                    className="ml-2 flex h-3.5 w-3.5 items-center justify-center text-[color:var(--forge-muted)] opacity-0 transition hover:text-[color:var(--forge-fg)] group-hover:opacity-100"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* New session + */}
          <button
            type="button"
            onClick={onNewSession}
            title="New terminal session"
            className="flex shrink-0 items-center border-r border-[color:var(--forge-border)] px-3 font-[family-name:var(--font-editor)] text-[color:var(--forge-muted)] transition hover:text-[color:var(--forge-fg)]"
          >
            +
          </button>
        </div>

        {/* Right-side actions */}
        <div className="flex shrink-0 items-center gap-1.5 px-2">
          <button type="button" onClick={copyOutput}       className={btn}>Copy</button>
          <button type="button" onClick={onClear}          className={btn}>Clear</button>
          {isBottom && (
            <button type="button" onClick={onToggleExpand} className={btn}>
              {expanded ? "Compact" : "Expand"}
            </button>
          )}
          <button type="button" onClick={onToggleCollapse} className={btn}>
            {collapsed ? "Open" : "Hide"}
          </button>
        </div>
      </div>

      {/* Output + input — hidden when collapsed */}
      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            ref={outputRef}
            className="forge-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2 font-[family-name:var(--font-editor)] text-xs leading-5"
          >
            {entries.length === 0 ? (
              <div className="text-[color:var(--forge-muted)]">No output yet.</div>
            ) : (
              entries.map((entry) => {
                const visible = entry.text.slice(0, revealed[entry.id] ?? entry.text.length);
                const cls =
                  entry.type === "error"  ? "text-[color:var(--forge-fg)] opacity-70" :
                  entry.type === "system" ? "text-[color:var(--forge-muted)]" :
                  entry.type === "input"  ? "text-[color:var(--forge-fg)] opacity-90" :
                                            "text-[color:var(--forge-fg)]";
                return (
                  <pre key={entry.id} className={`m-0 whitespace-pre-wrap ${cls}`}>
                    {visible}
                  </pre>
                );
              })
            )}
          </div>

          <div className="shrink-0 border-t border-[color:var(--forge-border)] px-3 py-2">
            <div className="flex items-center gap-2 font-[family-name:var(--font-editor)] text-xs">
              <span className="shrink-0 text-[color:var(--forge-muted)]">forge@os</span>
              <input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")     { e.preventDefault(); handleSubmit(); }
                  if (e.key === "ArrowUp")   { e.preventDefault(); handleHistory("up"); }
                  if (e.key === "ArrowDown") { e.preventDefault(); handleHistory("down"); }
                }}
                className="h-6 min-w-0 flex-1 bg-transparent text-[color:var(--forge-fg)] outline-none placeholder:text-[color:var(--forge-muted)] placeholder:opacity-40"
                placeholder="Type command..."
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

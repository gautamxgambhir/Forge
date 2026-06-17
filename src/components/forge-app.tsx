"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";
import { EditorTabs } from "@/components/editor-tabs";
import { EditorPane } from "@/components/editor-pane";
import { EditorEmpty } from "@/components/editor-empty";
import { TerminalPanel } from "@/components/terminal-panel";
import { ContactModal } from "@/components/contact-modal";
import { useForgeStore } from "@/editor/store";
import { runSource, handleShellCommand } from "@/language/forge-runtime";
import type { FileSystemAdapter } from "@/language/forge-runtime";
import { useTheme } from "@/hooks/use-theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type monaco from "monaco-editor";

const BOOT_MESSAGES = [
  { text: "BOOTING FORGE...",                            type: "system" as const, animate: false },
  { text: "Loading modules...",                             type: "system" as const, animate: true  },
  { text: "Loading profile...",                             type: "system" as const, animate: true  },
  { text: "Loading projects...",                            type: "system" as const, animate: true  },
  { text: "Loading memories...",                            type: "system" as const, animate: true  },
  { text: "Ready.",                                         type: "system" as const, animate: true  },
  { text: "Type  discover  or  help  to see all commands.", type: "system" as const, animate: true  },
];

export const ForgeApp = () => {
  // ── Store: files ───────────────────────────────────────────────────
  const files        = useForgeStore((s) => s.files);
  const openTabs     = useForgeStore((s) => s.openTabs);
  const activeFileId = useForgeStore((s) => s.activeFileId);

  // ── Store: layout ──────────────────────────────────────────────────
  const sidebarSide        = useForgeStore((s) => s.sidebarSide);
  const sidebarCollapsed   = useForgeStore((s) => s.sidebarCollapsed);
  const sidebarWidth       = useForgeStore((s) => s.sidebarWidth);
  const terminalSide       = useForgeStore((s) => s.terminalSide);
  const terminalCollapsed  = useForgeStore((s) => s.terminalCollapsed);
  const terminalExpanded   = useForgeStore((s) => s.terminalExpanded);
  const terminalHeight     = useForgeStore((s) => s.terminalHeight);
  const terminalWidth      = useForgeStore((s) => s.terminalWidth);

  // ── Store: terminal sessions ───────────────────────────────────────
  const terminalSessions       = useForgeStore((s) => s.terminalSessions);
  const activeTerminalId       = useForgeStore((s) => s.activeTerminalId);
  const terminalHistory        = useForgeStore((s) => s.terminalHistory);
  const booted                 = useForgeStore((s) => s.booted);

  // ── Store: actions ─────────────────────────────────────────────────
  const markBooted              = useForgeStore((s) => s.markBooted);
  const openFile                = useForgeStore((s) => s.openFile);
  const updateFileContent       = useForgeStore((s) => s.updateFileContent);
  const createFile              = useForgeStore((s) => s.createFile);
  const renameFile              = useForgeStore((s) => s.renameFile);
  const deleteFile              = useForgeStore((s) => s.deleteFile);
  const closeTab                = useForgeStore((s) => s.closeTab);
  const setSidebarCollapsed     = useForgeStore((s) => s.setSidebarCollapsed);
  const setSidebarWidth         = useForgeStore((s) => s.setSidebarWidth);
  const setTerminalCollapsed    = useForgeStore((s) => s.setTerminalCollapsed);
  const toggleTermExpanded      = useForgeStore((s) => s.toggleTerminalExpanded);
  const setTerminalHeight       = useForgeStore((s) => s.setTerminalHeight);
  const setTerminalWidth        = useForgeStore((s) => s.setTerminalWidth);
  const appendEntry             = useForgeStore((s) => s.appendTerminalEntry);
  const appendEntries           = useForgeStore((s) => s.appendTerminalEntries);
  const clearTerminal           = useForgeStore((s) => s.clearTerminal);
  const addHistory              = useForgeStore((s) => s.addTerminalHistory);
  const createTerminalSession   = useForgeStore((s) => s.createTerminalSession);
  const closeTerminalSession    = useForgeStore((s) => s.closeTerminalSession);
  const setActiveTerminalSession = useForgeStore((s) => s.setActiveTerminalSession);
  const listFileNames           = useForgeStore((s) => s.listFileNames);
  const readFileByName          = useForgeStore((s) => s.readFileByName);
  const openFileByName          = useForgeStore((s) => s.openFileByName);

  // ── Theme + breakpoint ─────────────────────────────────────────────
  const { resolved: resolvedTheme } = useTheme();
  const { isMobile, isTablet }      = useBreakpoint();

  // ── Local UI state ─────────────────────────────────────────────────
  const [showAbout,         setShowAbout]         = useState(false);
  const [showContact,       setShowContact]       = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [fontSize,          setFontSize]          = useState(14);
  const [typingSpeed,       setTypingSpeed]       = useState(10);
  const [minimapOn,         setMinimapOn]         = useState(true);
  const [isRunning,         setIsRunning]         = useState(false);

  // ── Monaco ref ─────────────────────────────────────────────────────
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // ── FS adapter ─────────────────────────────────────────────────────
  const fsRef = useRef<FileSystemAdapter>({
    listFileNames:  () => [],
    readFileByName: () => undefined,
    openFileByName: () => false,
  });
  fsRef.current = useMemo<FileSystemAdapter>(
    () => ({ listFileNames, readFileByName, openFileByName }),
    [listFileNames, readFileByName, openFileByName],
  );

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) ?? files[0],
    [activeFileId, files],
  );

  // ── Boot ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (booted) return;
    appendEntries(BOOT_MESSAGES);
    markBooted();
  }, [appendEntries, booted, markBooted]);

  // ── Output helper ──────────────────────────────────────────────────
  const emitOutput = useCallback(
    (lines: string[], errorMsg?: string, shouldClear?: boolean, openFileSig?: string) => {
      if (shouldClear) { clearTerminal(); return; }
      if (lines.length > 0)
        appendEntries(lines.map((text) => ({ text, type: "output" as const, animate: true })));
      if (errorMsg)    appendEntry(errorMsg, "error", false);
      if (openFileSig) openFileByName(openFileSig);
    },
    [appendEntries, appendEntry, clearTerminal, openFileByName],
  );

  // ── Run file ───────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (!activeFile || isRunning) return;
    setIsRunning(true);
    setTerminalCollapsed(false);
    appendEntry(`▶  ${activeFile.name}`, "system", false);
    window.setTimeout(() => {
      const result = runSource(activeFile.content, fsRef.current);
      if (activeFile.name === "contact.forge") {
        emitOutput(result.lines, result.error, result.shouldClear, result.openFile);
        appendEntry("  → Opening contact form...", "system", true);
        setShowContact(true);
        setIsRunning(false);
        return;
      }
      emitOutput(result.lines, result.error, result.shouldClear, result.openFile);
      setIsRunning(false);
    }, 0);
  }, [activeFile, isRunning, appendEntry, emitOutput, setTerminalCollapsed]);

  // ── Terminal command ───────────────────────────────────────────────
  const handleCommand = useCallback(
    (command: string) => {
      const trimmed = command.trim();
      appendEntry(`forge@os  ${trimmed}`, "input", false);
      if (!trimmed) return;
      addHistory(trimmed);
      const lower = trimmed.toLowerCase();
      if (lower === "clear" || lower === "cls") { clearTerminal(); return; }
      if (["contact", "show contact", "contact()", "open contact"].includes(lower)) {
        emitOutput(handleShellCommand(trimmed, fsRef.current).lines);
        setTerminalCollapsed(false);
        appendEntry("  → Opening contact form...", "system", true);
        setShowContact(true);
        return;
      }
      const result = handleShellCommand(trimmed, fsRef.current);
      if (result.shouldClear) { clearTerminal(); return; }
      emitOutput(result.lines, result.error, result.shouldClear, result.openFile);
    },
    [appendEntry, addHistory, clearTerminal, emitOutput, setTerminalCollapsed],
  );

  // ── Monaco actions ─────────────────────────────────────────────────
  const monacoAction = useCallback((id: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    ed.getAction(id)?.run();
  }, []);

  const handleUndo          = useCallback(() => monacoAction("undo"),                                 [monacoAction]);
  const handleRedo          = useCallback(() => monacoAction("redo"),                                 [monacoAction]);
  const handleFind          = useCallback(() => monacoAction("actions.find"),                         [monacoAction]);
  const handleReplace       = useCallback(() => monacoAction("editor.action.startFindReplaceAction"), [monacoAction]);
  const handleSelectAll     = useCallback(() => monacoAction("editor.action.selectAll"),              [monacoAction]);
  const handleDuplicate     = useCallback(() => monacoAction("editor.action.copyLinesDownAction"),    [monacoAction]);
  const handleMoveLinesUp   = useCallback(() => monacoAction("editor.action.moveLinesUpAction"),      [monacoAction]);
  const handleMoveLinesDown = useCallback(() => monacoAction("editor.action.moveLinesDownAction"),    [monacoAction]);
  const handleGoToLine      = useCallback(() => monacoAction("editor.action.gotoLine"),               [monacoAction]);

  // ── Panel toggles ──────────────────────────────────────────────────
  const handleToggleSidebar  = useCallback(() => setSidebarCollapsed(!sidebarCollapsed),  [setSidebarCollapsed, sidebarCollapsed]);
  const handleToggleTerminal = useCallback(() => setTerminalCollapsed(!terminalCollapsed), [setTerminalCollapsed, terminalCollapsed]);
  const handleToggleMinimap  = useCallback(() => setMinimapOn((v) => !v), []);
  const handleZoomIn         = useCallback(() => setFontSize((v) => Math.min(v + 1, 24)), []);
  const handleZoomOut        = useCallback(() => setFontSize((v) => Math.max(v - 1, 10)), []);
  const handleResetZoom      = useCallback(() => setFontSize(14), []);

  const handleShowHelp = useCallback(() => {
    emitOutput(handleShellCommand("discover", fsRef.current).lines);
    setTerminalCollapsed(false);
  }, [emitOutput, setTerminalCollapsed]);

  const handleNewTerminalSession = useCallback(() => {
    createTerminalSession();
    setTerminalCollapsed(false);
  }, [createTerminalSession, setTerminalCollapsed]);

  // ── Global keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if (ctrl && e.key === "b")     { e.preventDefault(); handleToggleSidebar(); }
      if (ctrl && e.key === "`")     { e.preventDefault(); handleToggleTerminal(); }
      if (ctrl && e.key === "n")     { e.preventDefault(); createFile(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRun, handleToggleSidebar, handleToggleTerminal, createFile]);

  // ── Responsive overrides ───────────────────────────────────────────
  // Mobile: terminal forced bottom, minimap off, slightly smaller font
  const effectiveTerminalSide = isMobile ? "bottom" : terminalSide;
  const effectiveFontSize     = isMobile ? Math.min(fontSize, 13) : fontSize;
  const effectiveMinimap      = isMobile ? false : minimapOn;

  const terminalVisible = !terminalCollapsed;
  const sidebarVisible  = !sidebarCollapsed;

  // ── Sidebar element ────────────────────────────────────────────────
  const sidebarEl = (
    <Sidebar
      files={files}
      activeFileId={activeFile?.id ?? ""}
      collapsed={isTablet ? true : sidebarCollapsed}
      width={sidebarWidth}
      onToggleCollapsed={() => {
        if (isMobile) setShowMobileSidebar(false);
        else handleToggleSidebar();
      }}
      onResize={setSidebarWidth}
      onOpenFile={(id) => { openFile(id); if (isMobile) setShowMobileSidebar(false); }}
      onCreateFile={createFile}
      onRenameFile={renameFile}
      onDeleteFile={deleteFile}
      fontSize={fontSize}
      typingSpeed={typingSpeed}
      minimapOn={minimapOn}
      onFontSize={setFontSize}
      onTypingSpeed={setTypingSpeed}
      onMinimapOn={setMinimapOn}
    />
  );

  // ── Editor + terminal area ─────────────────────────────────────────
  const editorAreaEl = (
    <div className={`flex min-w-0 flex-1 bg-[color:var(--forge-bg)] ${effectiveTerminalSide === "right" ? "flex-row" : "flex-col"}`}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EditorTabs
          files={files}
          openTabs={openTabs}
          activeFileId={activeFile?.id ?? ""}
          onSelectTab={openFile}
          onCloseTab={closeTab}
        />
        {openTabs.length === 0 ? (
          <EditorEmpty onNewFile={createFile} />
        ) : (
          <EditorPane
            fileName={activeFile?.name ?? "welcome.forge"}
            value={activeFile?.content ?? ""}
            minimapEnabled={effectiveMinimap}
            fontSize={effectiveFontSize}
            resolvedTheme={resolvedTheme}
            onChange={(v) => { if (activeFile) updateFileContent(activeFile.id, v); }}
            onEditorMount={(ed) => { editorRef.current = ed; }}
          />
        )}
      </div>

      <TerminalPanel
        sessions={terminalSessions}
        activeSessionId={activeTerminalId}
        history={terminalHistory}
        collapsed={terminalCollapsed}
        expanded={terminalExpanded}
        height={isMobile ? 200 : terminalHeight}
        width={terminalWidth}
        side={effectiveTerminalSide}
        typingSpeedMs={typingSpeed}
        onCommand={handleCommand}
        onClear={clearTerminal}
        onToggleCollapse={handleToggleTerminal}
        onToggleExpand={toggleTermExpanded}
        onResizeHeight={setTerminalHeight}
        onResizeWidth={setTerminalWidth}
        onNewSession={handleNewTerminalSession}
        onCloseSession={closeTerminalSession}
        onSelectSession={setActiveTerminalSession}
      />
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-[color:var(--forge-bg)] text-[color:var(--forge-fg)]">

      {/* Top bar */}
      <TopBar
        currentFileName={activeFile?.name ?? "welcome.forge"}
        isRunning={isRunning}
        sidebarVisible={sidebarVisible}
        terminalVisible={terminalVisible}
        minimapEnabled={minimapOn}
        isMobile={isMobile}
        onMobileSidebarToggle={() => setShowMobileSidebar((v) => !v)}
        onNewFile={createFile}
        onSaveFile={() => { appendEntry("✓ saved.", "system", false); setTerminalCollapsed(false); }}
        onShowSettings={() => { /* via sidebar gear */ }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFind={handleFind}
        onReplace={handleReplace}
        onSelectAll={handleSelectAll}
        onDuplicateLine={handleDuplicate}
        onMoveLinesUp={handleMoveLinesUp}
        onMoveLinesDown={handleMoveLinesDown}
        onToggleSidebar={handleToggleSidebar}
        onToggleTerminal={handleToggleTerminal}
        onToggleMinimap={handleToggleMinimap}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onGoToLine={handleGoToLine}
        onRun={handleRun}
        onClearOutput={clearTerminal}
        onNewTerminal={handleNewTerminalSession}
        onClearTerminal={clearTerminal}
        onShowHelp={handleShowHelp}
        onShowAbout={() => setShowAbout(true)}
      />

      {/* Main layout: desktop/tablet sidebar in normal flow */}
      <div className="flex min-h-0 flex-1">
        {!isMobile && sidebarSide === "left"  && sidebarEl}
        {editorAreaEl}
        {!isMobile && sidebarSide === "right" && sidebarEl}
      </div>

      {/* Mobile sidebar — slide-in drawer */}
      <AnimatePresence>
        {isMobile && showMobileSidebar && (
          <>
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-[400] bg-black/60"
              onClick={() => setShowMobileSidebar(false)}
            />
            <motion.div
              key="mobile-drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute left-0 top-0 z-[500] h-full"
            >
              {sidebarEl}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Contact modal */}
      <ContactModal
        open={showContact}
        onClose={() => setShowContact(false)}
        onResult={(lines) => {
          setShowContact(false);
          setTerminalCollapsed(false);
          appendEntries(lines.map((text) => ({ text, type: "output" as const, animate: true })));
        }}
      />

      {/* About modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div
            key="about"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowAbout(false)}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.11 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)] p-5"
            >
              <div className="mb-1 font-[family-name:var(--font-pixel)] text-sm tracking-[0.2em] text-[color:var(--forge-fg)]">
                FORGE
              </div>
              <div className="mb-4 font-[family-name:var(--font-editor)] text-[10px] tracking-[0.15em] text-[color:var(--forge-muted)]">
                v1.0.0 — Portfolio of Gautam Gambhir
              </div>
              {/* Profile box — CSS border avoids Unicode glyph-width misalignment */}
              <div className="mb-[1.75em] border border-[color:var(--forge-fg)] px-3 py-2 font-[family-name:var(--font-editor)] text-[11px] leading-[1.75] text-[color:var(--forge-fg)] opacity-80">
                <div>Gautam Gambhir</div>
                <div>Developer &amp; Designer &nbsp;·&nbsp; Class 12</div>
                <div>New Delhi, India</div>
              </div>
              <pre className="m-0 whitespace-pre-wrap font-[family-name:var(--font-editor)] text-[11px] leading-[1.75] text-[color:var(--forge-fg)] opacity-80">
{`  Email   →  ggambhir1919@gmail.com
  GitHub  →  github.com/gautamxgambhir
  Twitter →  x.com/gautamxgambhir

FORGE is a command-based exploration
language built to navigate a developer
portfolio as a code editor.

Start exploring:
  discover
  show about
  show projects
  inspect sheriff
  hire me`}
              </pre>
              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="mt-4 border border-[color:var(--forge-border)] px-3 py-1.5 font-[family-name:var(--font-editor)] text-[10px] uppercase tracking-wide text-[color:var(--forge-muted)] transition hover:border-[color:var(--forge-muted)] hover:text-[color:var(--forge-fg)]"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

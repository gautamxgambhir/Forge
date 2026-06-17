"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { createInitialFiles } from "@/editor/default-files";
import type { ForgeFile, TerminalEntry, TerminalEntryType } from "@/types/editor";

// ── Utilities ─────────────────────────────────

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeFileName = (raw: string): string => {
  const name = raw.trim().replace(/\s+/g, "-");
  if (!name) return "new-file.forge";
  return name.endsWith(".forge") ? name : `${name}.forge`;
};

const ensureUniqueFileName = (candidate: string, files: ForgeFile[]): string => {
  if (!files.some((f) => f.name.toLowerCase() === candidate.toLowerCase())) {
    return candidate;
  }
  const dot  = candidate.lastIndexOf(".");
  const base = dot >= 0 ? candidate.slice(0, dot) : candidate;
  const ext  = dot >= 0 ? candidate.slice(dot)  : ".forge";
  let n = 2;
  let next = `${base}-${n}${ext}`;
  while (files.some((f) => f.name.toLowerCase() === next.toLowerCase())) {
    next = `${base}-${++n}${ext}`;
  }
  return next;
};

const makeEntry = (payload: TerminalPayload): TerminalEntry => ({
  id:        nanoid(),
  text:      payload.text,
  type:      payload.type ?? "output",
  animate:   payload.animate ?? true,
  createdAt: Date.now(),
});

// ── Types ──────────────────────────────────────

type TerminalPayload = {
  text:     string;
  type?:    TerminalEntryType;
  animate?: boolean;
};

export interface TerminalSession {
  id:      string;
  name:    string;
  entries: TerminalEntry[];
  history: string[];
}

export type SidebarSide    = "left" | "right";
export type TerminalSide   = "bottom" | "right";

interface ForgeStore {
  // ── Files ────────────────────────────────────
  files:        ForgeFile[];
  openTabs:     string[];
  activeFileId: string;

  // ── Layout ───────────────────────────────────
  sidebarSide:      SidebarSide;
  sidebarCollapsed: boolean;
  sidebarWidth:     number;
  terminalSide:     TerminalSide;
  terminalCollapsed:  boolean;
  terminalExpanded:   boolean;
  terminalHeight:     number;
  terminalWidth:      number;

  // ── Terminal sessions ─────────────────────────
  terminalSessions:      TerminalSession[];
  activeTerminalId:      string;
  terminalHistory:       string[];

  // ── Boot ─────────────────────────────────────
  booted: boolean;

  // ── File actions ─────────────────────────────
  markBooted:        () => void;
  openFile:          (fileId: string) => void;
  openFileByName:    (fileName: string) => boolean;
  readFileByName:    (fileName: string) => string | undefined;
  listFileNames:     () => string[];
  updateFileContent: (fileId: string, content: string) => void;
  createFile:        (requestedName?: string) => void;
  renameFile:        (fileId: string, nextName: string) => void;
  deleteFile:        (fileId: string) => void;
  closeTab:          (fileId: string) => void;

  // ── Layout actions ────────────────────────────
  setSidebarSide:       (side: SidebarSide) => void;
  setSidebarCollapsed:  (collapsed: boolean) => void;
  setSidebarWidth:      (width: number) => void;
  setTerminalSide:      (side: TerminalSide) => void;
  setTerminalCollapsed: (collapsed: boolean) => void;
  toggleTerminalExpanded: () => void;
  setTerminalHeight:    (height: number) => void;
  setTerminalWidth:     (width: number) => void;

  // ── Terminal session actions ──────────────────
  createTerminalSession:    (name?: string) => void;
  closeTerminalSession:     (id: string) => void;
  setActiveTerminalSession: (id: string) => void;
  renameTerminalSession:    (id: string, name: string) => void;
  appendTerminalEntry:      (text: string, type?: TerminalEntryType, animate?: boolean) => void;
  appendTerminalEntries:    (entries: TerminalPayload[]) => void;
  clearTerminal:            () => void;
  addTerminalHistory:       (command: string) => void;

  // ── Computed helpers ──────────────────────────
  activeTerminalEntries: () => TerminalEntry[];
}

// ── Initial data ──────────────────────────────

const INITIAL_FILES          = createInitialFiles();
const INITIAL_ACTIVE_FILE_ID = INITIAL_FILES[0]?.id ?? "";

const makeSession = (name: string): TerminalSession => ({
  id:      nanoid(),
  name,
  entries: [],
  history: [],
});

const INITIAL_SESSION = makeSession("forge");

// ── Store ─────────────────────────────────────

export const useForgeStore = create<ForgeStore>((set, get) => ({
  // files
  files:        INITIAL_FILES,
  openTabs:     INITIAL_ACTIVE_FILE_ID ? [INITIAL_ACTIVE_FILE_ID] : [],
  activeFileId: INITIAL_ACTIVE_FILE_ID,

  // layout
  sidebarSide:      "left",
  sidebarCollapsed: false,
  sidebarWidth:     280,
  terminalSide:     "bottom",
  terminalCollapsed:  false,
  terminalExpanded:   false,
  terminalHeight:     220,
  terminalWidth:      400,

  // terminal sessions
  terminalSessions: [INITIAL_SESSION],
  activeTerminalId: INITIAL_SESSION.id,
  terminalHistory:  [],

  // boot
  booted: false,

  // ── File actions ────────────────────────────

  markBooted: () => set({ booted: true }),

  openFile: (fileId) => {
    if (!get().files.some((f) => f.id === fileId)) return;
    set((s) => ({
      activeFileId: fileId,
      openTabs: s.openTabs.includes(fileId) ? s.openTabs : [...s.openTabs, fileId],
    }));
  },

  openFileByName: (fileName) => {
    const target = get().files.find(
      (f) => f.name.toLowerCase() === fileName.toLowerCase(),
    );
    if (!target) return false;
    get().openFile(target.id);
    return true;
  },

  readFileByName: (fileName) =>
    get().files.find((f) => f.name.toLowerCase() === fileName.toLowerCase())?.content,

  listFileNames: () => get().files.map((f) => f.name),

  updateFileContent: (fileId, content) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === fileId ? { ...f, content } : f)),
    })),

  createFile: (requestedName) =>
    set((s) => {
      const name       = normalizeFileName(requestedName ?? `new-file-${s.files.length + 1}.forge`);
      const uniqueName = ensureUniqueFileName(name, s.files);
      const newFile: ForgeFile = {
        id:      nanoid(),
        name:    uniqueName,
        content: `# ${uniqueName}\n\ndiscover\n`,
      };
      return {
        files:        [...s.files, newFile],
        openTabs:     [...s.openTabs, newFile.id],
        activeFileId: newFile.id,
      };
    }),

  renameFile: (fileId, nextName) =>
    set((s) => {
      if (!s.files.some((f) => f.id === fileId)) return s;
      const uniqueName = ensureUniqueFileName(
        normalizeFileName(nextName),
        s.files.filter((f) => f.id !== fileId),
      );
      return { files: s.files.map((f) => (f.id === fileId ? { ...f, name: uniqueName } : f)) };
    }),

  deleteFile: (fileId) =>
    set((s) => {
      if (s.files.length <= 1) return s;
      const nextFiles    = s.files.filter((f) => f.id !== fileId);
      const nextOpenTabs = s.openTabs.filter((id) => id !== fileId);
      const fallback     = nextOpenTabs[0] ?? nextFiles[0]?.id ?? "";
      return {
        files:        nextFiles,
        openTabs:     nextOpenTabs.length ? nextOpenTabs : [fallback],
        activeFileId: s.activeFileId === fileId ? fallback : s.activeFileId,
      };
    }),

  closeTab: (fileId) =>
    set((s) => {
      const nextTabs = s.openTabs.filter((id) => id !== fileId);
      return {
        openTabs:     nextTabs,
        activeFileId: s.activeFileId === fileId ? (nextTabs[nextTabs.length - 1] ?? "") : s.activeFileId,
      };
    }),

  // ── Layout actions ──────────────────────────

  setSidebarSide:       (side) => set({ sidebarSide: side }),
  setSidebarCollapsed:  (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarWidth:      (width) => set({ sidebarWidth: clamp(width, 180, 480), sidebarCollapsed: false }),
  setTerminalSide:      (side) => set({ terminalSide: side }),
  setTerminalCollapsed: (collapsed) => set({ terminalCollapsed: collapsed }),
  toggleTerminalExpanded: () => set((s) => ({ terminalExpanded: !s.terminalExpanded })),
  setTerminalHeight:    (height) => set({ terminalHeight: clamp(height, 120, 600), terminalCollapsed: false }),
  setTerminalWidth:     (width)  => set({ terminalWidth:  clamp(width,  200, 700), terminalCollapsed: false }),

  // ── Terminal session actions ─────────────────

  createTerminalSession: (name) =>
    set((s) => {
      const session = makeSession(name ?? `forge ${s.terminalSessions.length + 1}`);
      return {
        terminalSessions: [...s.terminalSessions, session],
        activeTerminalId: session.id,
      };
    }),

  closeTerminalSession: (id) =>
    set((s) => {
      if (s.terminalSessions.length <= 1) return s;
      const next = s.terminalSessions.filter((t) => t.id !== id);
      const nextActiveId = s.activeTerminalId === id
        ? (next[next.length - 1]?.id ?? "")
        : s.activeTerminalId;
      return { terminalSessions: next, activeTerminalId: nextActiveId };
    }),

  setActiveTerminalSession: (id) => set({ activeTerminalId: id }),

  renameTerminalSession: (id, name) =>
    set((s) => ({
      terminalSessions: s.terminalSessions.map((t) => (t.id === id ? { ...t, name } : t)),
    })),

  appendTerminalEntry: (text, type = "output", animate = true) =>
    set((s) => ({
      terminalSessions: s.terminalSessions.map((t) =>
        t.id === s.activeTerminalId
          ? { ...t, entries: [...t.entries, makeEntry({ text, type, animate })] }
          : t,
      ),
    })),

  appendTerminalEntries: (entries) =>
    set((s) => ({
      terminalSessions: s.terminalSessions.map((t) =>
        t.id === s.activeTerminalId
          ? { ...t, entries: [...t.entries, ...entries.map(makeEntry)] }
          : t,
      ),
    })),

  clearTerminal: () =>
    set((s) => ({
      terminalSessions: s.terminalSessions.map((t) =>
        t.id === s.activeTerminalId ? { ...t, entries: [] } : t,
      ),
    })),

  addTerminalHistory: (command) => {
    const cmd = command.trim();
    if (!cmd) return;
    set((s) => ({
      terminalHistory: [...s.terminalHistory, cmd],
      terminalSessions: s.terminalSessions.map((t) =>
        t.id === s.activeTerminalId
          ? { ...t, history: [...t.history, cmd] }
          : t,
      ),
    }));
  },

  activeTerminalEntries: () => {
    const s = get();
    return s.terminalSessions.find((t) => t.id === s.activeTerminalId)?.entries ?? [];
  },
}));

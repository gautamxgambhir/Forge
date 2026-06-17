export type TerminalEntryType = "system" | "output" | "error" | "input";

export interface ForgeFile {
  id: string;
  name: string;
  content: string;
}

export interface TerminalEntry {
  id: string;
  text: string;
  type: TerminalEntryType;
  animate: boolean;
  createdAt: number;
}

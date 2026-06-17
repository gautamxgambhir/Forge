// ─────────────────────────────────────────────
//  FORGE Language — AST  (v2 — scripting)
// ─────────────────────────────────────────────

// ══════════════════════════════════════════════
//  COMMAND NODES  (exploration language)
// ══════════════════════════════════════════════

export interface ShowCommand    { kind: "ShowCommand";    topic: string;   line: number; }
export interface InspectCommand { kind: "InspectCommand"; target: string;  line: number; }
export interface OpenCommand    { kind: "OpenCommand";    target: string;  line: number; }
export interface SearchCommand  { kind: "SearchCommand";  keyword: string; line: number; }
export interface DiscoverCommand{ kind: "DiscoverCommand";                 line: number; }
export interface HelpCommand    { kind: "HelpCommand";                     line: number; }
export interface ClearCommand   { kind: "ClearCommand";                    line: number; }

export interface PipeCommand {
  kind: "PipeCommand";
  entity: string;
  action: string;
  line: number;
}

export interface NaturalCommand {
  kind: "NaturalCommand";
  words: string[];
  line: number;
}

export interface UnknownCommand {
  kind: "UnknownCommand";
  raw: string;
  line: number;
}

// ══════════════════════════════════════════════
//  EXPRESSION NODES  (scripting)
// ══════════════════════════════════════════════

export type BinOp =
  | "+" | "-" | "*" | "/" | "%"
  | "==" | "!=" | "<" | "<=" | ">" | ">="
  | "and" | "or";

export interface NumberLit   { kind: "NumberLit";   value: number;              }
export interface StringLit   { kind: "StringLit";   value: string;              }
export interface BoolLit     { kind: "BoolLit";     value: boolean;             }
export interface NullLit     { kind: "NullLit";                                  }
export interface ArrayLit    { kind: "ArrayLit";    elements: Expr[];            }
export interface VarExpr     { kind: "VarExpr";     name: string;               }
export interface BinExpr     { kind: "BinExpr";     op: BinOp; left: Expr; right: Expr; }
export interface UnaryExpr   { kind: "UnaryExpr";   op: "-" | "not"; operand: Expr; }
export interface CallExpr    { kind: "CallExpr";    callee: string; args: Expr[]; line: number; }
export interface IndexExpr   { kind: "IndexExpr";   object: Expr; index: Expr;  }
export interface MemberExpr  { kind: "MemberExpr";  object: Expr; prop: string; }

export type Expr =
  | NumberLit | StringLit | BoolLit | NullLit
  | ArrayLit | VarExpr | BinExpr | UnaryExpr
  | CallExpr | IndexExpr | MemberExpr;

// ══════════════════════════════════════════════
//  STATEMENT NODES  (scripting)
// ══════════════════════════════════════════════

export interface SetStmt      { kind: "SetStmt";    name: string; value: Expr;  line: number; }
export interface AssignStmt   { kind: "AssignStmt"; name: string; value: Expr;  line: number; }
export interface PrintStmt    { kind: "PrintStmt";  args: Expr[];               line: number; }
export interface ExprStmt     { kind: "ExprStmt";   expr: Expr;                 line: number; }
export interface ReturnStmt   { kind: "ReturnStmt"; value: Expr | null;         line: number; }

export interface IfStmt {
  kind: "IfStmt";
  condition: Expr;
  body: ScriptStmt[];
  elseBody: ScriptStmt[] | null;
  line: number;
}

export interface RepeatStmt {
  kind: "RepeatStmt";
  times: Expr;
  body: ScriptStmt[];
  line: number;
}

export interface EachStmt {
  kind: "EachStmt";
  varName: string;
  iterable: Expr;
  body: ScriptStmt[];
  line: number;
}

export interface WhileStmt {
  kind: "WhileStmt";
  condition: Expr;
  body: ScriptStmt[];
  line: number;
}

export interface DefineStmt {
  kind: "DefineStmt";
  name: string;
  params: string[];
  body: ScriptStmt[];
  line: number;
}

export type ScriptStmt =
  | SetStmt | AssignStmt | PrintStmt | ExprStmt
  | ReturnStmt | IfStmt | RepeatStmt | EachStmt
  | WhileStmt | DefineStmt;

// ══════════════════════════════════════════════
//  UNION  —  any top-level node
// ══════════════════════════════════════════════

export type ForgeNode =
  // commands
  | ShowCommand | InspectCommand | OpenCommand | SearchCommand
  | DiscoverCommand | HelpCommand | ClearCommand
  | PipeCommand | NaturalCommand | UnknownCommand
  // script statements (wrapped so the interpreter can distinguish)
  | ScriptNode;

/** Wrapper so command nodes and script nodes share the ForgeNode union */
export interface ScriptNode {
  kind: "ScriptNode";
  stmt: ScriptStmt;
  line: number;
}

export interface ForgeProgram {
  kind: "ForgeProgram";
  commands: ForgeNode[];
}

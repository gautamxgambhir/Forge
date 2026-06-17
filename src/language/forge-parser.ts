// ─────────────────────────────────────────────
//  FORGE Language — Parser  (v2 — scripting)
//
//  Dual-mode parser:
//   • Command mode  — show, inspect, open, pipe…
//   • Script mode   — set, define, if, repeat, each…
//
//  Heuristic: if the first token of a line is a
//  known script keyword → parse as script.
//  Otherwise → parse as exploration command.
// ─────────────────────────────────────────────

import { forgeTokenize } from "./forge-lexer";
import type { FToken, FTokenType } from "./forge-lexer";
import type {
  ForgeProgram, ForgeNode, ScriptNode, ScriptStmt, Expr, BinOp,
  ShowCommand, InspectCommand, OpenCommand, SearchCommand,
  DiscoverCommand, HelpCommand, ClearCommand, PipeCommand,
  NaturalCommand, UnknownCommand,
  SetStmt, AssignStmt, PrintStmt, ExprStmt, ReturnStmt,
  IfStmt, RepeatStmt, EachStmt, WhileStmt, DefineStmt,
  NumberLit, StringLit, BoolLit, NullLit, ArrayLit,
  VarExpr, BinExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr,
} from "./forge-ast";

export class ForgeParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly col: number,
  ) {
    super(message);
    this.name = "ForgeParseError";
  }
}

// ── Script keywords ───────────────────────────
const SCRIPT_KEYWORDS = new Set([
  "set", "define", "if", "else", "repeat", "each", "while",
  "return", "print", "true", "false", "null",
]);

// ── Command verb sets ─────────────────────────
const SHOW_VERBS     = new Set(["show"]);
const INSPECT_VERBS  = new Set(["inspect", "view", "describe"]);
const OPEN_VERBS     = new Set(["open", "load"]);
const SEARCH_VERBS   = new Set(["search", "find", "grep"]);
const DISCOVER_VERBS = new Set(["discover", "list", "ls", "commands"]);
const HELP_VERBS     = new Set(["help", "?", "man"]);
const CLEAR_VERBS    = new Set(["clear", "cls", "reset"]);
const NATURAL_SEEDS  = new Set(["hire", "future", "coffee", "sudo", "matrix", "secret"]);

const SHOW_SHORTHANDS = new Set([
  "about", "profile", "skills", "projects", "contact",
  "experience", "resume", "timeline", "achievements",
  "stats", "github", "socials",
]);

// ══════════════════════════════════════════════
//  Token stream helper
// ══════════════════════════════════════════════

class TokenStream {
  private pos = 0;

  constructor(private tokens: FToken[]) {}

  peek(offset = 0): FToken {
    return this.tokens[this.pos + offset] ?? { type: "EOF", value: "", line: 0, col: 0 };
  }
  advance(): FToken {
    const t = this.tokens[this.pos];
    if (t && t.type !== "EOF") this.pos++;
    return t ?? { type: "EOF", value: "", line: 0, col: 0 };
  }
  check(type: FTokenType, value?: string): boolean {
    const t = this.peek();
    return t.type === type && (value === undefined || t.value.toLowerCase() === value.toLowerCase());
  }
  checkWord(value: string): boolean {
    return this.check("WORD", value);
  }
  match(type: FTokenType, value?: string): boolean {
    if (this.check(type, value)) { this.advance(); return true; }
    return false;
  }
  matchWord(value: string): boolean { return this.match("WORD", value); }
  expect(type: FTokenType, msg?: string): FToken {
    if (!this.check(type)) {
      const t = this.peek();
      throw new ForgeParseError(
        msg ?? `Expected ${type}, got '${t.value || t.type}'`,
        t.line, t.col,
      );
    }
    return this.advance();
  }
  skipNewlines() { while (this.check("NEWLINE")) this.advance(); }
  atEnd(): boolean { return this.peek().type === "EOF"; }
}

// ══════════════════════════════════════════════
//  Main parse entry point
// ══════════════════════════════════════════════

export function forgeParseSource(source: string): ForgeProgram {
  const allTokens = forgeTokenize(source).filter((t) => t.type !== "COMMENT");
  const stream = new TokenStream(allTokens);
  const commands: ForgeNode[] = [];

  stream.skipNewlines();
  while (!stream.atEnd()) {
    const node = parseTopLevel(stream);
    if (node) commands.push(node);
    // consume remaining newlines / semicolons between statements
    while (stream.check("NEWLINE")) stream.advance();
  }

  return { kind: "ForgeProgram", commands };
}

// ══════════════════════════════════════════════
//  Top-level dispatch
// ══════════════════════════════════════════════

function parseTopLevel(s: TokenStream): ForgeNode | null {
  const first = s.peek();
  if (first.type === "EOF") return null;

  const w = first.type === "WORD" ? first.value.toLowerCase() : "";

  // ── Script keywords → script mode ────────
  if (first.type !== "WORD" || SCRIPT_KEYWORDS.has(w)) {
    return parseScriptStatement(s);
  }

  // ── Peek ahead for arrow → pipe command ──
  // Collect the whole logical line (up to NEWLINE / EOF / LBRACE)
  // to determine if it's a pipe
  const lineTokens = collectLine(s);
  const arrowIdx = lineTokens.findIndex((t) => t.type === "ARROW");

  if (arrowIdx !== -1) {
    const before = lineTokens.slice(0, arrowIdx).filter(wordOrStr);
    const after  = lineTokens.slice(arrowIdx + 1).filter(wordOrStr);
    if (before.length > 0 && after.length > 0) {
      return {
        kind: "PipeCommand",
        entity: before.map((t) => t.value).join(" "),
        action: after.map((t) => t.value).join(" "),
        line: first.line,
      } satisfies PipeCommand;
    }
  }

  // Check if first word of line is a known script verb we missed
  // (e.g. user wrote  greet("world")  — a call expression statement)
  // If line contains LPAREN, treat as script expression statement
  if (lineTokens.some((t) => t.type === "LPAREN" || t.type === "ASSIGN")) {
    // re-feed these tokens into a mini script parser
    return parseScriptLineFromTokens(lineTokens, first.line);
  }

  return parseCommandFromTokens(lineTokens, first.line);
}

// ── Collect tokens for the current logical line ─────────────

function collectLine(s: TokenStream): FToken[] {
  const tokens: FToken[] = [];
  // A line ends at NEWLINE or EOF, BUT we must handle
  // block bodies like  if cond { … }  — we stop BEFORE the brace
  // and let the script parser handle the block separately.
  while (!s.atEnd() && !s.check("NEWLINE") && !s.check("LBRACE")) {
    tokens.push(s.advance());
  }
  // consume the trailing newline
  if (s.check("NEWLINE")) s.advance();
  return tokens;
}

function wordOrStr(t: FToken): boolean {
  return t.type === "WORD" || t.type === "STRING";
}

// ══════════════════════════════════════════════
//  Command-mode parser
// ══════════════════════════════════════════════

function parseCommandFromTokens(tokens: FToken[], lineNum: number): ForgeNode {
  const words = tokens.filter(wordOrStr).map((t) => t.value);
  if (words.length === 0) return { kind: "DiscoverCommand", line: lineNum };

  const w0 = words[0]!.toLowerCase();

  if (NATURAL_SEEDS.has(w0)) {
    return { kind: "NaturalCommand", words, line: lineNum } satisfies NaturalCommand;
  }
  if (SHOW_VERBS.has(w0)) {
    return words.length < 2
      ? { kind: "DiscoverCommand", line: lineNum }
      : { kind: "ShowCommand", topic: words.slice(1).join(" "), line: lineNum } satisfies ShowCommand;
  }
  if (INSPECT_VERBS.has(w0)) {
    return words.length < 2
      ? { kind: "ShowCommand", topic: "projects", line: lineNum }
      : { kind: "InspectCommand", target: words.slice(1).join(" "), line: lineNum } satisfies InspectCommand;
  }
  if (OPEN_VERBS.has(w0)) {
    return words.length < 2
      ? { kind: "DiscoverCommand", line: lineNum }
      : { kind: "OpenCommand", target: words.slice(1).join(" "), line: lineNum } satisfies OpenCommand;
  }
  if (SEARCH_VERBS.has(w0)) {
    return words.length < 2
      ? { kind: "UnknownCommand", raw: w0, line: lineNum }
      : { kind: "SearchCommand", keyword: words.slice(1).join(" "), line: lineNum } satisfies SearchCommand;
  }
  if (DISCOVER_VERBS.has(w0)) return { kind: "DiscoverCommand", line: lineNum };
  if (HELP_VERBS.has(w0))     return { kind: "HelpCommand",     line: lineNum };
  if (CLEAR_VERBS.has(w0))    return { kind: "ClearCommand",    line: lineNum };
  if (SHOW_SHORTHANDS.has(w0)) {
    return { kind: "ShowCommand", topic: w0, line: lineNum } satisfies ShowCommand;
  }

  return { kind: "UnknownCommand", raw: words.join(" "), line: lineNum } satisfies UnknownCommand;
}

// ── Re-parse a collected line as a script expression stmt ────

function parseScriptLineFromTokens(tokens: FToken[], lineNum: number): ForgeNode {
  // synthetic EOF
  const synth = [...tokens, { type: "EOF" as const, value: "", line: lineNum, col: 0 }];
  const s = new TokenStream(synth);
  try {
    const stmt = parseStmt(s);
    return wrap(stmt, lineNum);
  } catch {
    const raw = tokens.filter(wordOrStr).map((t) => t.value).join(" ");
    return { kind: "UnknownCommand", raw, line: lineNum };
  }
}

// ══════════════════════════════════════════════
//  Script-mode parser
// ══════════════════════════════════════════════

function parseScriptStatement(s: TokenStream): ForgeNode {
  const line = s.peek().line;
  const stmt = parseStmt(s);
  return wrap(stmt, line);
}

function wrap(stmt: ScriptStmt, line: number): ScriptNode {
  return { kind: "ScriptNode", stmt, line };
}

function parseStmt(s: TokenStream): ScriptStmt {
  const tok = s.peek();
  const line = tok.line;
  const w = tok.type === "WORD" ? tok.value.toLowerCase() : "";

  // set <name> = <expr>
  if (w === "set") {
    s.advance();
    const nameTok = s.expect("WORD", "Expected variable name after 'set'");
    s.expect("ASSIGN", `Expected '=' after '${nameTok.value}'`);
    const value = parseExpr(s);
    consumeNewline(s);
    return { kind: "SetStmt", name: nameTok.value, value, line } satisfies SetStmt;
  }

  // define <name>(<params>) { <body> }
  if (w === "define") {
    s.advance();
    const nameTok = s.expect("WORD", "Expected function name after 'define'");
    s.expect("LPAREN", `Expected '(' after function name '${nameTok.value}'`);
    const params: string[] = [];
    s.skipNewlines();
    while (!s.check("RPAREN") && !s.atEnd()) {
      const p = s.expect("WORD", "Expected parameter name");
      params.push(p.value);
      s.skipNewlines();
      if (!s.check("RPAREN")) { s.expect("COMMA", "Expected ',' between params"); s.skipNewlines(); }
    }
    s.expect("RPAREN", "Expected ')' after params");
    s.skipNewlines();
    const body = parseBlock(s);
    return { kind: "DefineStmt", name: nameTok.value, params, body, line } satisfies DefineStmt;
  }

  // if <expr> { <body> } [else { <body> }]
  if (w === "if") {
    s.advance();
    const condition = parseExpr(s);
    s.skipNewlines();
    const body = parseBlock(s);
    let elseBody: ScriptStmt[] | null = null;
    s.skipNewlines();
    if (s.checkWord("else")) {
      s.advance();
      s.skipNewlines();
      elseBody = parseBlock(s);
    }
    return { kind: "IfStmt", condition, body, elseBody, line } satisfies IfStmt;
  }

  // repeat <expr> { <body> }
  if (w === "repeat") {
    s.advance();
    const times = parseExpr(s);
    s.skipNewlines();
    const body = parseBlock(s);
    return { kind: "RepeatStmt", times, body, line } satisfies RepeatStmt;
  }

  // each <var> in <expr> { <body> }
  if (w === "each") {
    s.advance();
    const varTok = s.expect("WORD", "Expected variable name after 'each'");
    if (!s.checkWord("in")) {
      throw new ForgeParseError("Expected 'in' after loop variable", s.peek().line, s.peek().col);
    }
    s.advance(); // consume 'in'
    const iterable = parseExpr(s);
    s.skipNewlines();
    const body = parseBlock(s);
    return { kind: "EachStmt", varName: varTok.value, iterable, body, line } satisfies EachStmt;
  }

  // while <expr> { <body> }
  if (w === "while") {
    s.advance();
    const condition = parseExpr(s);
    s.skipNewlines();
    const body = parseBlock(s);
    return { kind: "WhileStmt", condition, body, line } satisfies WhileStmt;
  }

  // return [<expr>]
  if (w === "return") {
    s.advance();
    let value: Expr | null = null;
    if (!s.check("NEWLINE") && !s.check("RBRACE") && !s.atEnd()) {
      value = parseExpr(s);
    }
    consumeNewline(s);
    return { kind: "ReturnStmt", value, line } satisfies ReturnStmt;
  }

  // print(<expr>, ...)  or  print <expr>  — both forms
  if (w === "print") {
    s.advance();
    const args: Expr[] = [];
    if (s.check("LPAREN")) {
      s.advance();
      s.skipNewlines();
      while (!s.check("RPAREN") && !s.atEnd()) {
        args.push(parseExpr(s));
        s.skipNewlines();
        if (!s.check("RPAREN")) { s.match("COMMA"); s.skipNewlines(); }
      }
      s.match("RPAREN");
    } else if (!s.check("NEWLINE") && !s.check("RBRACE") && !s.atEnd()) {
      // bare print without parens: print "hello"
      args.push(parseExpr(s));
    }
    consumeNewline(s);
    return { kind: "PrintStmt", args, line } satisfies PrintStmt;
  }

  // <name> = <expr>  (assignment without 'set')
  if (tok.type === "WORD" && s.peek(1).type === "ASSIGN") {
    const name = s.advance().value;
    s.advance(); // =
    const value = parseExpr(s);
    consumeNewline(s);
    return { kind: "AssignStmt", name, value, line } satisfies AssignStmt;
  }

  // expression statement  (function call etc.)
  const expr = parseExpr(s);
  consumeNewline(s);
  return { kind: "ExprStmt", expr, line } satisfies ExprStmt;
}

function parseBlock(s: TokenStream): ScriptStmt[] {
  s.expect("LBRACE", "Expected '{' to open block");
  s.skipNewlines();
  const stmts: ScriptStmt[] = [];
  while (!s.check("RBRACE") && !s.atEnd()) {
    stmts.push(parseStmt(s));
    s.skipNewlines();
  }
  const closeTok = s.peek();
  if (!s.match("RBRACE")) {
    throw new ForgeParseError("Expected '}' to close block", closeTok.line, closeTok.col);
  }
  return stmts;
}

function consumeNewline(s: TokenStream) {
  if (s.check("NEWLINE") || s.atEnd()) { s.match("NEWLINE"); }
}

// ══════════════════════════════════════════════
//  Expression parser  (Pratt-style precedence)
// ══════════════════════════════════════════════

function parseExpr(s: TokenStream): Expr { return parseOr(s); }

function parseOr(s: TokenStream): Expr {
  let left = parseAnd(s);
  while (s.check("OR")) {
    s.advance();
    const right = parseAnd(s);
    left = { kind: "BinExpr", op: "or", left, right } satisfies BinExpr;
  }
  return left;
}

function parseAnd(s: TokenStream): Expr {
  let left = parseEquality(s);
  while (s.check("AND")) {
    s.advance();
    const right = parseEquality(s);
    left = { kind: "BinExpr", op: "and", left, right } satisfies BinExpr;
  }
  return left;
}

function parseEquality(s: TokenStream): Expr {
  let left = parseComparison(s);
  while (s.check("EQ") || s.check("NEQ")) {
    const op = s.advance().value as BinOp;
    const right = parseComparison(s);
    left = { kind: "BinExpr", op, left, right } satisfies BinExpr;
  }
  return left;
}

function parseComparison(s: TokenStream): Expr {
  let left = parseAdditive(s);
  while (s.check("LT") || s.check("LTE") || s.check("GT") || s.check("GTE")) {
    const op = s.advance().value as BinOp;
    const right = parseAdditive(s);
    left = { kind: "BinExpr", op, left, right } satisfies BinExpr;
  }
  return left;
}

function parseAdditive(s: TokenStream): Expr {
  let left = parseMultiplicative(s);
  while (s.check("PLUS") || s.check("MINUS")) {
    const op = s.advance().value as BinOp;
    const right = parseMultiplicative(s);
    left = { kind: "BinExpr", op, left, right } satisfies BinExpr;
  }
  return left;
}

function parseMultiplicative(s: TokenStream): Expr {
  let left = parseUnary(s);
  while (s.check("STAR") || s.check("SLASH") || s.check("PERCENT")) {
    const op = s.advance().value as BinOp;
    const right = parseUnary(s);
    left = { kind: "BinExpr", op, left, right } satisfies BinExpr;
  }
  return left;
}

function parseUnary(s: TokenStream): Expr {
  if (s.check("MINUS")) {
    s.advance();
    const operand = parseUnary(s);
    return { kind: "UnaryExpr", op: "-", operand } satisfies UnaryExpr;
  }
  if (s.check("NOT")) {
    s.advance();
    const operand = parseUnary(s);
    return { kind: "UnaryExpr", op: "not", operand } satisfies UnaryExpr;
  }
  return parseCallOrMember(s);
}

function parseCallOrMember(s: TokenStream): Expr {
  let expr = parsePrimary(s);

  while (true) {
    if (s.check("LPAREN") && expr.kind === "VarExpr") {
      // function call
      const callee = (expr as VarExpr).name;
      const line = s.peek().line;
      s.advance(); // (
      const args: Expr[] = [];
      s.skipNewlines();
      while (!s.check("RPAREN") && !s.atEnd()) {
        args.push(parseExpr(s));
        s.skipNewlines();
        if (!s.check("RPAREN")) { s.match("COMMA"); s.skipNewlines(); }
      }
      s.expect("RPAREN", "Expected ')' after arguments");
      expr = { kind: "CallExpr", callee, args, line } satisfies CallExpr;
    } else if (s.check("LBRACKET")) {
      s.advance();
      const index = parseExpr(s);
      s.expect("RBRACKET", "Expected ']'");
      expr = { kind: "IndexExpr", object: expr, index } satisfies IndexExpr;
    } else if (s.check("DOT")) {
      s.advance();
      const propTok = s.expect("WORD", "Expected property name after '.'");
      expr = { kind: "MemberExpr", object: expr, prop: propTok.value } satisfies MemberExpr;
    } else {
      break;
    }
  }
  return expr;
}

function parsePrimary(s: TokenStream): Expr {
  const tok = s.peek();

  if (tok.type === "NUMBER") {
    s.advance();
    return { kind: "NumberLit", value: parseFloat(tok.value) } satisfies NumberLit;
  }
  if (tok.type === "STRING") {
    s.advance();
    return { kind: "StringLit", value: tok.value } satisfies StringLit;
  }
  if (tok.type === "WORD") {
    const w = tok.value.toLowerCase();
    if (w === "true")  { s.advance(); return { kind: "BoolLit", value: true  } satisfies BoolLit; }
    if (w === "false") { s.advance(); return { kind: "BoolLit", value: false } satisfies BoolLit; }
    if (w === "null")  { s.advance(); return { kind: "NullLit"               } satisfies NullLit; }
    s.advance();
    return { kind: "VarExpr", name: tok.value } satisfies VarExpr;
  }
  if (tok.type === "LBRACKET") {
    s.advance();
    const elements: Expr[] = [];
    s.skipNewlines();
    while (!s.check("RBRACKET") && !s.atEnd()) {
      elements.push(parseExpr(s));
      s.skipNewlines();
      if (!s.check("RBRACKET")) { s.match("COMMA"); s.skipNewlines(); }
    }
    s.expect("RBRACKET", "Expected ']'");
    return { kind: "ArrayLit", elements } satisfies ArrayLit;
  }
  if (tok.type === "LPAREN") {
    s.advance();
    const expr = parseExpr(s);
    s.expect("RPAREN", "Expected ')'");
    return expr;
  }

  throw new ForgeParseError(
    `Unexpected token '${tok.value || tok.type}'`,
    tok.line, tok.col,
  );
}

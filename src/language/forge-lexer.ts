// ─────────────────────────────────────────────
//  FORGE Language — Lexer  (v2 — scripting)
//
//  Command mode examples:
//    show about
//    inspect sheriff
//    about -> show
//
//  Script mode examples (playground):
//    set name = "Gautam"
//    set age  = 17
//    print("Hello " + name)
//    if age > 16 { print("developer") }
//    repeat 3 { print("loop") }
//    each skill in skills { print(skill) }
//    define greet(who) { print("Hi " + who) }
//    greet("world")
// ─────────────────────────────────────────────

export type FTokenType =
  // ── Command-mode tokens ──────────────────
  | "WORD"       // bare identifier / keyword / name
  | "ARROW"      // ->
  | "COMMENT"    // # …
  | "NEWLINE"
  | "EOF"
  // ── Script-mode tokens ──────────────────
  | "STRING"     // "…"
  | "NUMBER"     // 42 / 3.14
  | "ASSIGN"     // =
  | "EQ"         // ==
  | "NEQ"        // !=
  | "LT"         // <
  | "LTE"        // <=
  | "GT"         // >
  | "GTE"        // >=
  | "AND"        // and / &&
  | "OR"         // or / ||
  | "NOT"        // not / !
  | "PLUS"       // +
  | "MINUS"      // -
  | "STAR"       // *
  | "SLASH"      // /
  | "PERCENT"    // %
  | "LPAREN"     // (
  | "RPAREN"     // )
  | "LBRACE"     // {
  | "RBRACE"     // }
  | "LBRACKET"   // [
  | "RBRACKET"   // ]
  | "COMMA"      // ,
  | "DOT"        // .
  | "COLON";     // :

export interface FToken {
  type: FTokenType;
  value: string;
  line: number;
  col: number;
}

export class ForgeLexError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly col: number,
  ) {
    super(message);
    this.name = "ForgeLexError";
  }
}

export function forgeTokenize(source: string): FToken[] {
  const tokens: FToken[] = [];
  let pos = 0;
  let line = 1;
  let lineStart = 0;

  const col = () => pos - lineStart + 1;
  const peek = (offset = 0) => source[pos + offset] ?? "";
  const advance = () => {
    const ch = source[pos++];
    if (ch === "\n") { line++; lineStart = pos; }
    return ch;
  };
  const push = (type: FTokenType, value: string, c = col()) =>
    tokens.push({ type, value, line, col: c });

  while (pos < source.length) {
    const c = col();
    const ch = peek();

    // ── Whitespace (not newline) ─────────────
    if (ch === " " || ch === "\t" || ch === "\r") { advance(); continue; }

    // ── Comment ──────────────────────────────
    if (ch === "#") {
      let text = "";
      while (pos < source.length && peek() !== "\n") text += advance();
      push("COMMENT", text, c);
      continue;
    }

    // ── Newline ───────────────────────────────
    if (ch === "\n") {
      const l = line;
      advance();
      tokens.push({ type: "NEWLINE", value: "\n", line: l, col: c });
      continue;
    }

    // ── Arrow -> ─────────────────────────────
    if (ch === "-" && peek(1) === ">") {
      advance(); advance();
      push("ARROW", "->", c);
      continue;
    }

    // ── Two-char operators ───────────────────
    const two = ch + peek(1);
    if (two === "==") { advance(); advance(); push("EQ",  "==", c); continue; }
    if (two === "!=") { advance(); advance(); push("NEQ", "!=", c); continue; }
    if (two === "<=") { advance(); advance(); push("LTE", "<=", c); continue; }
    if (two === ">=") { advance(); advance(); push("GTE", ">=", c); continue; }
    if (two === "&&") { advance(); advance(); push("AND", "&&", c); continue; }
    if (two === "||") { advance(); advance(); push("OR",  "||", c); continue; }

    // ── Single-char operators / punctuation ──
    switch (ch) {
      case "=": advance(); push("ASSIGN", "=", c); continue;
      case "<": advance(); push("LT",     "<", c); continue;
      case ">": advance(); push("GT",     ">", c); continue;
      case "+": advance(); push("PLUS",   "+", c); continue;
      case "-": advance(); push("MINUS",  "-", c); continue;
      case "*": advance(); push("STAR",   "*", c); continue;
      case "/": advance(); push("SLASH",  "/", c); continue;
      case "%": advance(); push("PERCENT","%", c); continue;
      case "!": advance(); push("NOT",    "!", c); continue;
      case "(": advance(); push("LPAREN", "(", c); continue;
      case ")": advance(); push("RPAREN", ")", c); continue;
      case "{": advance(); push("LBRACE", "{", c); continue;
      case "}": advance(); push("RBRACE", "}", c); continue;
      case "[": advance(); push("LBRACKET","[",c); continue;
      case "]": advance(); push("RBRACKET","]",c); continue;
      case ",": advance(); push("COMMA",  ",", c); continue;
      case ".": advance(); push("DOT",    ".", c); continue;
      case ":": advance(); push("COLON",  ":", c); continue;
    }

    // ── Quoted string ─────────────────────────
    if (ch === '"') {
      advance();
      let str = "";
      while (pos < source.length && peek() !== '"' && peek() !== "\n") {
        if (peek() === "\\") {
          advance();
          const esc = advance();
          switch (esc) {
            case "n":  str += "\n"; break;
            case "t":  str += "\t"; break;
            case "\\": str += "\\"; break;
            case '"':  str += '"';  break;
            default:   str += "\\" + esc;
          }
        } else {
          str += advance();
        }
      }
      if (peek() === '"') advance();
      push("STRING", str, c);
      continue;
    }

    // ── Number ────────────────────────────────
    if (/[0-9]/.test(ch)) {
      let num = "";
      while (/[0-9.]/.test(peek())) num += advance();
      push("NUMBER", num, c);
      continue;
    }

    // ── Word / identifier / keyword ───────────
    // Hyphens allowed *inside* a word (care-kit) but not at start
    if (/[a-zA-Z_]/.test(ch)) {
      let word = "";
      while (/[a-zA-Z0-9_\-]/.test(peek())) word += advance();
      // Remap logical keywords to tokens
      if (word === "and")  { push("AND",  word, c); continue; }
      if (word === "or")   { push("OR",   word, c); continue; }
      if (word === "not")  { push("NOT",  word, c); continue; }
      push("WORD", word, c);
      continue;
    }

    // ── Skip anything else silently ───────────
    advance();
  }

  tokens.push({ type: "EOF", value: "", line, col: col() });
  return tokens;
}

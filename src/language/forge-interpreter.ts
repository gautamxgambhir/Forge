// ─────────────────────────────────────────────
//  FORGE Language — Interpreter  (v2)
//  Handles both command nodes and script nodes.
// ─────────────────────────────────────────────

import type {
  ForgeProgram, ForgeNode, ScriptStmt, Expr,
  SetStmt, AssignStmt, PrintStmt, ExprStmt, ReturnStmt,
  IfStmt, RepeatStmt, EachStmt, WhileStmt, DefineStmt,
} from "./forge-ast";
import {
  ABOUT_OUTPUT, PROFILE_OUTPUT, SKILLS_OUTPUT, PROJECTS_OUTPUT,
  EXPERIENCE_OUTPUT, CONTACT_OUTPUT, RESUME_OUTPUT, TIMELINE_OUTPUT,
  ACHIEVEMENTS_OUTPUT, SOCIALS_OUTPUT, STATS_OUTPUT,
  DISCOVER_OUTPUT, HELP_OUTPUT,
  HIRE_ME_OUTPUT, FUTURE_OUTPUT, COFFEE_OUTPUT, MATRIX_OUTPUT, SECRET_OUTPUT,
  PIPE_ACTIONS, renderProjectCard, searchPortfolio, visitorOutput, suggestCommand,
} from "./forge-data";

// ── Public types ──────────────────────────────

export interface ForgeResult {
  lines: string[];
  error?: string;
  shouldClear?: boolean;
  openFile?: string;
}

export interface ForgeFileAdapter {
  listFileNames: () => string[];
  readFileByName: (name: string) => string | undefined;
  openFileByName: (name: string) => boolean;
}

// ── Runtime values ─────────────────────────────

export type FVal =
  | { t: "num";  v: number }
  | { t: "str";  v: string }
  | { t: "bool"; v: boolean }
  | { t: "null" }
  | { t: "arr";  v: FVal[] }
  | { t: "fn";   params: string[]; body: ScriptStmt[]; closure: Env };

const fNum  = (v: number):  FVal => ({ t: "num",  v });
const fStr  = (v: string):  FVal => ({ t: "str",  v });
const fBool = (v: boolean): FVal => ({ t: "bool", v });
const fNull: FVal = { t: "null" };
const fArr  = (v: FVal[]): FVal  => ({ t: "arr",  v });

function stringify(val: FVal): string {
  if (val.t === "null")  return "null";
  if (val.t === "bool")  return val.v ? "true" : "false";
  if (val.t === "num")   return Number.isInteger(val.v) ? String(val.v) : String(val.v);
  if (val.t === "str")   return val.v;
  if (val.t === "arr")   return "[" + val.v.map(stringify).join(", ") + "]";
  if (val.t === "fn")    return "<function>";
  return "";
}

function isTruthy(val: FVal): boolean {
  if (val.t === "null")  return false;
  if (val.t === "bool")  return val.v;
  if (val.t === "num")   return val.v !== 0;
  if (val.t === "str")   return val.v.length > 0;
  if (val.t === "arr")   return val.v.length > 0;
  return true;
}

// ── Return signal ──────────────────────────────

class ReturnSignal { constructor(public val: FVal) {} }

// ── Environment (scope) ────────────────────────

class Env {
  private vars = new Map<string, FVal>();
  constructor(private parent?: Env) {}

  get(name: string): FVal {
    if (this.vars.has(name)) return this.vars.get(name)!;
    if (this.parent) return this.parent.get(name);
    throw new Error(`Undefined variable '${name}'`);
  }
  set(name: string, val: FVal): void { this.vars.set(name, val); }
  assign(name: string, val: FVal): void {
    if (this.vars.has(name)) { this.vars.set(name, val); return; }
    if (this.parent) { this.parent.assign(name, val); return; }
    // auto-declare at top scope if not found
    this.vars.set(name, val);
  }
  has(name: string): boolean {
    return this.vars.has(name) || (this.parent?.has(name) ?? false);
  }
  child(): Env { return new Env(this); }
}

// ── Interpreter ────────────────────────────────

const MAX_ITERATIONS = 1000;

export class ForgeInterpreter {
  private out: string[] = [];
  private shouldClear = false;
  private openFileSig: string | undefined;
  private globals: Env;

  constructor(private fs?: ForgeFileAdapter) {
    this.globals = new Env();
    this.registerBuiltins();
  }

  // ── Built-in functions ─────────────────────

  private builtins = new Map<string, (args: FVal[]) => FVal>();

  private registerBuiltins() {
    const reg = (name: string, fn: (args: FVal[]) => FVal) =>
      this.builtins.set(name, fn);

    reg("len", ([a]) => {
      if (!a) throw new Error("len() requires an argument");
      if (a.t === "arr") return fNum(a.v.length);
      if (a.t === "str") return fNum(a.v.length);
      throw new Error(`len() does not support '${a.t}'`);
    });
    reg("str",  ([a]) => fStr(a ? stringify(a) : ""));
    reg("num",  ([a]) => {
      if (!a) return fNum(0);
      if (a.t === "num") return a;
      if (a.t === "str") { const n = parseFloat(a.v); return isNaN(n) ? fNull : fNum(n); }
      return fNull;
    });
    reg("bool", ([a]) => fBool(a ? isTruthy(a) : false));
    reg("type", ([a]) => fStr(a ? a.t : "null"));
    reg("push",  ([arr, item]) => {
      if (!arr || arr.t !== "arr") throw new Error("push() requires an array");
      return fArr([...arr.v, item ?? fNull]);
    });
    reg("pop", ([arr]) => {
      if (!arr || arr.t !== "arr") throw new Error("pop() requires an array");
      return fArr(arr.v.slice(0, -1));
    });
    reg("join", ([arr, sep]) => {
      if (!arr || arr.t !== "arr") throw new Error("join() requires an array");
      return fStr(arr.v.map(stringify).join(sep?.t === "str" ? sep.v : ", "));
    });
    reg("split", ([str, sep]) => {
      if (!str || str.t !== "str") throw new Error("split() requires a string");
      const s = sep?.t === "str" ? sep.v : " ";
      return fArr(str.v.split(s).map(fStr));
    });
    reg("upper", ([s]) => fStr(s?.t === "str" ? s.v.toUpperCase() : ""));
    reg("lower", ([s]) => fStr(s?.t === "str" ? s.v.toLowerCase() : ""));
    reg("trim",  ([s]) => fStr(s?.t === "str" ? s.v.trim() : ""));
    reg("range", (args) => {
      const start = args.length >= 2 ? (args[0]!.t === "num" ? args[0]!.v : 0) : 0;
      const end   = args.length >= 2
        ? (args[1]!.t === "num" ? args[1]!.v : 0)
        : (args[0]?.t === "num" ? args[0].v : 0);
      const step  = args[2]?.t === "num" ? args[2].v : 1;
      const arr: FVal[] = [];
      for (let i = start; i < end; i += step) arr.push(fNum(i));
      return fArr(arr);
    });
    reg("abs",   ([n]) => fNum(Math.abs(n?.t === "num" ? n.v : 0)));
    reg("floor", ([n]) => fNum(Math.floor(n?.t === "num" ? n.v : 0)));
    reg("ceil",  ([n]) => fNum(Math.ceil( n?.t === "num" ? n.v : 0)));
    reg("round", ([n]) => fNum(Math.round(n?.t === "num" ? n.v : 0)));
    reg("sqrt",  ([n]) => fNum(Math.sqrt( n?.t === "num" ? n.v : 0)));
    reg("max",   (args) => fNum(Math.max( ...args.filter(a => a.t === "num").map(a => (a as {t:"num",v:number}).v))));
    reg("min",   (args) => fNum(Math.min( ...args.filter(a => a.t === "num").map(a => (a as {t:"num",v:number}).v))));
    reg("random",() => fNum(Math.random()));
    reg("print", (args) => { this.emitLine(args.map(stringify).join(" ")); return fNull; });
    reg("input", ([prompt]) => {
      this.emitLine(prompt?.t === "str" ? prompt.v : "");
      return fStr(""); // no real input in terminal — return empty string
    });
  }

  // ── Public run API ─────────────────────────

  run(program: ForgeProgram): ForgeResult {
    this.out = [];
    this.shouldClear = false;
    this.openFileSig = undefined;

    try {
      for (const node of program.commands) {
        this.execNode(node);
      }
    } catch (err) {
      if (err instanceof ReturnSignal) {
        // top-level return — ignore value
      } else {
        return {
          lines: this.out,
          error: `  Error: ${(err as Error).message}`,
        };
      }
    }

    return {
      lines: this.out,
      shouldClear: this.shouldClear || undefined,
      openFile: this.openFileSig,
    };
  }

  // ── Emit helpers ───────────────────────────

  private emitLine(text: string) {
    for (const l of text.split("\n")) this.out.push(l);
  }
  private emit(block: string) { this.emitLine(block); }

  // ── Node dispatch ──────────────────────────

  private execNode(node: ForgeNode) {
    if (node.kind === "ScriptNode") {
      this.execStmt(node.stmt, this.globals);
      return;
    }
    switch (node.kind) {
      case "ShowCommand":     return this.execShow(node.topic);
      case "InspectCommand":  return this.execInspect(node.target);
      case "OpenCommand":     return this.execOpen(node.target);
      case "SearchCommand":   return this.emit(searchPortfolio(node.keyword));
      case "DiscoverCommand": return this.emit(DISCOVER_OUTPUT);
      case "HelpCommand":     return this.emit(HELP_OUTPUT);
      case "ClearCommand":    this.shouldClear = true; return;
      case "PipeCommand":     return this.execPipe(node.entity, node.action);
      case "NaturalCommand":  return this.execNatural(node.words);
      case "UnknownCommand":  return this.execUnknown(node.raw);
    }
  }

  // ── Command handlers (same as before) ──────

  private execShow(topic: string) {
    const t = topic.toLowerCase().trim();
    const map: Record<string, string> = {
      about: ABOUT_OUTPUT, profile: PROFILE_OUTPUT, skills: SKILLS_OUTPUT,
      projects: PROJECTS_OUTPUT, experience: EXPERIENCE_OUTPUT,
      contact: CONTACT_OUTPUT, resume: RESUME_OUTPUT,
      timeline: TIMELINE_OUTPUT, achievements: ACHIEVEMENTS_OUTPUT,
      socials: SOCIALS_OUTPUT, stats: STATS_OUTPUT, github: SOCIALS_OUTPUT,
    };
    if (map[t]) { this.emit(map[t]!); return; }
    if (t === "visitor" || t === "visitors") { this.emit(visitorOutput()); return; }
    this.emit(`  Unknown topic: "${topic}"\n  Try: show about · show skills · show projects`);
  }

  private execInspect(target: string) {
    const card = renderProjectCard(target.toLowerCase().trim());
    if (card) { this.emit(card); return; }
    const s = suggestCommand(target.toLowerCase().split(" ")[0] ?? target);
    this.emit(`  Project "${target}" not found.${s ? `\n  Did you mean: ${s}` : ""}\n  Run: show projects`);
  }

  private execOpen(target: string) {
    const fileMap: Record<string, string> = {
      about: "about.forge", projects: "projects.forge", skills: "skills.forge",
      experience: "experience.forge", contact: "contact.forge",
      resume: "resume.forge", welcome: "welcome.forge",
      playground: "playground.forge", explore: "explore.forge",
    };
    const t = target.toLowerCase().trim();
    const fileName = fileMap[t] ?? (t.endsWith(".forge") ? t : `${t}.forge`);
    const ok = this.fs?.openFileByName(fileName) ?? false;
    this.emit(ok ? `  Opened ${fileName}` : `  File not found: ${fileName}`);
    if (ok) this.openFileSig = fileName;
  }

  private execPipe(entity: string, action: string) {
    const e = entity.toLowerCase().trim();
    const a = action.toLowerCase().trim();
    if (a === "inspect" || a === "view" || a === "describe") { this.execInspect(e); return; }
    const ea = PIPE_ACTIONS[e];
    if (ea) {
      const fn = ea[a] ?? ea["show"];
      if (fn) { this.emit(fn()); return; }
      this.emit(`  Action "${action}" unavailable for "${entity}".\n  Available: ${Object.keys(ea).join(" · ")}`);
      return;
    }
    const card = renderProjectCard(e);
    if (card) { this.emit(card); return; }
    this.emit(`  Unknown entity: "${entity}".\n  Try: about -> show  ·  projects -> list  ·  sheriff -> inspect`);
  }

  private execNatural(words: string[]) {
    const phrase = words.join(" ").toLowerCase().trim();
    if (phrase.startsWith("hire"))        { this.emit(HIRE_ME_OUTPUT); return; }
    if (phrase.startsWith("future"))      { this.emit(FUTURE_OUTPUT);  return; }
    if (phrase.startsWith("coffee"))      { this.emit(COFFEE_OUTPUT);  return; }
    if (phrase === "matrix")              { this.emit(MATRIX_OUTPUT);  return; }
    if (phrase === "secret")              { this.emit(SECRET_OUTPUT);  return; }
    if (phrase.startsWith("sudo hire"))   { this.emit(HIRE_ME_OUTPUT); return; }
    if (phrase.startsWith("sudo future")) { this.emit(FUTURE_OUTPUT);  return; }
    if (phrase.startsWith("sudo coffee")) { this.emit(COFFEE_OUTPUT);  return; }
    if (phrase.startsWith("sudo")) {
      this.emit(`  [sudo] Unknown: "${words.slice(1).join(" ")}"\n  Try: sudo hire · sudo future · sudo coffee`);
      return;
    }
    this.execUnknown(words.join(" "));
  }

  private execUnknown(raw: string) {
    const s = suggestCommand(raw.split(" ")[0] ?? raw);
    this.emit(`  Unknown command: "${raw}"${s ? `\n  Did you mean: ${s}` : ""}\n  Type  discover  or  help`);
  }

  // ══════════════════════════════════════════
  //  Script: Statement executor
  // ══════════════════════════════════════════

  private execStmt(stmt: ScriptStmt, env: Env) {
    switch (stmt.kind) {
      case "SetStmt":     { const v = this.evalExpr(stmt.value, env); env.set(stmt.name, v); break; }
      case "AssignStmt":  { const v = this.evalExpr(stmt.value, env); env.assign(stmt.name, v); break; }
      case "PrintStmt":   {
        const parts = stmt.args.map((a) => stringify(this.evalExpr(a, env)));
        this.emitLine(parts.join(" "));
        break;
      }
      case "ExprStmt":    { this.evalExpr(stmt.expr, env); break; }
      case "ReturnStmt":  {
        const v = stmt.value ? this.evalExpr(stmt.value, env) : fNull;
        throw new ReturnSignal(v);
      }
      case "IfStmt":      this.execIf(stmt, env);     break;
      case "RepeatStmt":  this.execRepeat(stmt, env);  break;
      case "EachStmt":    this.execEach(stmt, env);    break;
      case "WhileStmt":   this.execWhile(stmt, env);   break;
      case "DefineStmt":  this.execDefine(stmt, env);  break;
    }
  }

  private execStmts(stmts: ScriptStmt[], env: Env) {
    for (const s of stmts) this.execStmt(s, env);
  }

  private execIf(stmt: IfStmt, env: Env) {
    const cond = this.evalExpr(stmt.condition, env);
    if (isTruthy(cond)) {
      this.execStmts(stmt.body, env.child());
    } else if (stmt.elseBody) {
      this.execStmts(stmt.elseBody, env.child());
    }
  }

  private execRepeat(stmt: RepeatStmt, env: Env) {
    const timesVal = this.evalExpr(stmt.times, env);
    const times = timesVal.t === "num" ? Math.floor(timesVal.v) : 0;
    for (let i = 0; i < Math.min(times, MAX_ITERATIONS); i++) {
      const child = env.child();
      child.set("i", fNum(i));
      try { this.execStmts(stmt.body, child); }
      catch (e) { if (e instanceof ReturnSignal) throw e; break; }
    }
  }

  private execEach(stmt: EachStmt, env: Env) {
    const iter = this.evalExpr(stmt.iterable, env);
    if (iter.t !== "arr") throw new Error(`'each' requires an array, got '${iter.t}'`);
    let count = 0;
    for (const item of iter.v) {
      if (count++ >= MAX_ITERATIONS) break;
      const child = env.child();
      child.set(stmt.varName, item);
      try { this.execStmts(stmt.body, child); }
      catch (e) { if (e instanceof ReturnSignal) throw e; break; }
    }
  }

  private execWhile(stmt: WhileStmt, env: Env) {
    let count = 0;
    while (isTruthy(this.evalExpr(stmt.condition, env))) {
      if (count++ >= MAX_ITERATIONS) {
        this.emitLine("  [max iterations reached — loop stopped]");
        break;
      }
      const child = env.child();
      try { this.execStmts(stmt.body, child); }
      catch (e) { if (e instanceof ReturnSignal) throw e; break; }
    }
  }

  private execDefine(stmt: DefineStmt, env: Env) {
    const fn: FVal = { t: "fn", params: stmt.params, body: stmt.body, closure: env };
    env.set(stmt.name, fn);
  }

  // ══════════════════════════════════════════
  //  Script: Expression evaluator
  // ══════════════════════════════════════════

  private evalExpr(expr: Expr, env: Env): FVal {
    switch (expr.kind) {
      case "NumberLit": return fNum(expr.value);
      case "StringLit": return fStr(expr.value);
      case "BoolLit":   return fBool(expr.value);
      case "NullLit":   return fNull;
      case "ArrayLit":  return fArr(expr.elements.map((e) => this.evalExpr(e, env)));

      case "VarExpr": {
        if (env.has(expr.name)) return env.get(expr.name);
        throw new Error(`Undefined variable '${expr.name}'`);
      }

      case "BinExpr": {
        const l = this.evalExpr(expr.left, env);
        const r = this.evalExpr(expr.right, env);
        return this.evalBin(expr.op, l, r);
      }

      case "UnaryExpr": {
        const v = this.evalExpr(expr.operand, env);
        if (expr.op === "-") {
          if (v.t !== "num") throw new Error(`Unary '-' requires a number`);
          return fNum(-v.v);
        }
        return fBool(!isTruthy(v));
      }

      case "CallExpr": {
        // check builtins
        const builtin = this.builtins.get(expr.callee);
        if (builtin) {
          const args = expr.args.map((a) => this.evalExpr(a, env));
          return builtin(args) ?? fNull;
        }
        // user-defined function
        if (env.has(expr.callee)) {
          const fn = env.get(expr.callee);
          if (fn.t !== "fn") throw new Error(`'${expr.callee}' is not a function`);
          const callEnv = fn.closure.child();
          for (let i = 0; i < fn.params.length; i++) {
            const arg = expr.args[i] ? this.evalExpr(expr.args[i]!, env) : fNull;
            callEnv.set(fn.params[i]!, arg);
          }
          try {
            this.execStmts(fn.body, callEnv);
            return fNull;
          } catch (e) {
            if (e instanceof ReturnSignal) return e.val;
            throw e;
          }
        }
        throw new Error(`Function '${expr.callee}' does not exist`);
      }

      case "IndexExpr": {
        const obj = this.evalExpr(expr.object, env);
        const idx = this.evalExpr(expr.index, env);
        if (obj.t === "arr") {
          const i = idx.t === "num" ? idx.v : 0;
          const norm = i < 0 ? obj.v.length + i : i;
          return obj.v[norm] ?? fNull;
        }
        if (obj.t === "str") {
          const i = idx.t === "num" ? idx.v : 0;
          const norm = i < 0 ? obj.v.length + i : i;
          return obj.v[norm] !== undefined ? fStr(obj.v[norm]!) : fNull;
        }
        throw new Error(`Cannot index into '${obj.t}'`);
      }

      case "MemberExpr": {
        const obj = this.evalExpr(expr.object, env);
        const prop = expr.prop.toLowerCase();
        // array properties
        if (obj.t === "arr") {
          if (prop === "length" || prop === "len") return fNum(obj.v.length);
          if (prop === "first") return obj.v[0] ?? fNull;
          if (prop === "last")  return obj.v[obj.v.length - 1] ?? fNull;
        }
        if (obj.t === "str") {
          if (prop === "length" || prop === "len") return fNum(obj.v.length);
          if (prop === "upper") return fStr(obj.v.toUpperCase());
          if (prop === "lower") return fStr(obj.v.toLowerCase());
          if (prop === "trim")  return fStr(obj.v.trim());
        }
        throw new Error(`No property '${expr.prop}' on ${obj.t}`);
      }
    }
  }

  private evalBin(op: string, l: FVal, r: FVal): FVal {
    switch (op) {
      case "+": {
        if (l.t === "str" || r.t === "str") return fStr(stringify(l) + stringify(r));
        if (l.t === "num" && r.t === "num") return fNum(l.v + r.v);
        if (l.t === "arr" && r.t === "arr") return fArr([...l.v, ...r.v]);
        throw new Error(`Cannot add '${l.t}' and '${r.t}'`);
      }
      case "-":  this.numCheck(l, r, "-"); return fNum((l as {v:number}).v - (r as {v:number}).v);
      case "*":  this.numCheck(l, r, "*"); return fNum((l as {v:number}).v * (r as {v:number}).v);
      case "/":  this.numCheck(l, r, "/");
                 if ((r as {v:number}).v === 0) throw new Error("Division by zero");
                 return fNum((l as {v:number}).v / (r as {v:number}).v);
      case "%":  this.numCheck(l, r, "%"); return fNum((l as {v:number}).v % (r as {v:number}).v);
      case "==": return fBool(this.isEqual(l, r));
      case "!=": return fBool(!this.isEqual(l, r));
      case "<":  this.numCheck(l, r, "<");  return fBool((l as {v:number}).v <  (r as {v:number}).v);
      case "<=": this.numCheck(l, r, "<="); return fBool((l as {v:number}).v <= (r as {v:number}).v);
      case ">":  this.numCheck(l, r, ">");  return fBool((l as {v:number}).v >  (r as {v:number}).v);
      case ">=": this.numCheck(l, r, ">="); return fBool((l as {v:number}).v >= (r as {v:number}).v);
      case "and": return fBool(isTruthy(l) && isTruthy(r));
      case "or":  return fBool(isTruthy(l) || isTruthy(r));
      default:    throw new Error(`Unknown operator '${op}'`);
    }
  }

  private numCheck(l: FVal, r: FVal, op: string) {
    if (l.t !== "num" || r.t !== "num")
      throw new Error(`Operator '${op}' requires numbers, got '${l.t}' and '${r.t}'`);
  }

  private isEqual(a: FVal, b: FVal): boolean {
    if (a.t !== b.t) return false;
    if (a.t === "null") return true;
    if (a.t === "num"  && b.t === "num")  return a.v === b.v;
    if (a.t === "str"  && b.t === "str")  return a.v === b.v;
    if (a.t === "bool" && b.t === "bool") return a.v === b.v;
    return false;
  }
}

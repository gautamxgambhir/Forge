// ─────────────────────────────────────────────
//  FORGE — Runtime
//  Public API: parse + run FORGE source code.
// ─────────────────────────────────────────────

import { forgeTokenize } from "./forge-lexer";
import { forgeParseSource } from "./forge-parser";
import { ForgeInterpreter } from "./forge-interpreter";
import type { ForgeFileAdapter, ForgeResult } from "./forge-interpreter";

export type { ForgeResult, ForgeFileAdapter };

// ── Re-export as FileSystemAdapter alias ──────
// so forge-os-app.tsx keeps the same import shape

export type FileSystemAdapter = ForgeFileAdapter;

// ── Run a full .forge source string ───────────

export function runSource(source: string, fs?: ForgeFileAdapter): ForgeResult {
  // Filter blank / comment-only lines before parsing
  const lines = source.split("\n");
  const meaningfulLines = lines.filter((l) => {
    const t = l.trim();
    return t.length > 0 && !t.startsWith("#");
  });
  if (meaningfulLines.length === 0) {
    return { lines: [] };
  }

  const program = forgeParseSource(source);
  const interp = new ForgeInterpreter(fs);
  return interp.run(program);
}

// ── Run a single terminal command string ──────

export function handleShellCommand(
  command: string,
  fs?: ForgeFileAdapter,
): ForgeResult {
  const trimmed = command.trim();
  if (!trimmed) return { lines: [] };
  return runSource(trimmed, fs);
}

// ── Autocomplete data for Monaco ──────────────

export const FORGE_KEYWORDS: string[] = [
  // command verbs
  "show", "inspect", "open", "search", "discover", "help", "clear",
  // script keywords
  "set", "define", "if", "else", "repeat", "each", "in",
  "while", "return", "print", "true", "false", "null",
];

export const FORGE_TOPICS = [
  "about",
  "profile",
  "skills",
  "projects",
  "experience",
  "contact",
  "resume",
  "timeline",
  "achievements",
  "stats",
  "socials",
];

export const FORGE_PROJECTS = [
  "sheriff",
  "surfer",
  "care-kit",
  "acencert",
  "minementor",
  "argos",
  "carebot",
];

export const FORGE_PIPE_ACTIONS = [
  "show",
  "list",
  "count",
  "inspect",
  "display",
];

export const FORGE_COMPLETIONS: Array<{
  label: string;
  insertText: string;
  detail: string;
  docs: string;
}> = [
  // Verbs
  { label: "show",     insertText: "show ",     detail: "show <topic>",   docs: "Display portfolio section"   },
  { label: "inspect",  insertText: "inspect ",  detail: "inspect <project>", docs: "Show project details"    },
  { label: "open",     insertText: "open ",     detail: "open <file>",    docs: "Open file in editor"         },
  { label: "search",   insertText: "search ",   detail: "search <kw>",    docs: "Search across portfolio"     },
  { label: "discover", insertText: "discover",  detail: "discover",       docs: "Show all commands"           },
  { label: "help",     insertText: "help",      detail: "help",           docs: "Show all commands"           },
  { label: "clear",    insertText: "clear",     detail: "clear",          docs: "Clear the terminal"          },
  // show completions
  { label: "show about",        insertText: "show about",        detail: "show about",        docs: "Who is Gautam"         },
  { label: "show profile",      insertText: "show profile",      detail: "show profile",      docs: "Name, role, focus"     },
  { label: "show skills",       insertText: "show skills",       detail: "show skills",       docs: "Technical skills"      },
  { label: "show projects",     insertText: "show projects",     detail: "show projects",     docs: "All projects"          },
  { label: "show experience",   insertText: "show experience",   detail: "show experience",   docs: "Work background"       },
  { label: "show achievements", insertText: "show achievements", detail: "show achievements", docs: "Awards & wins"         },
  { label: "show timeline",     insertText: "show timeline",     detail: "show timeline",     docs: "The journey"           },
  { label: "show contact",      insertText: "show contact",      detail: "show contact",      docs: "How to reach me"       },
  { label: "show resume",       insertText: "show resume",       detail: "show resume",       docs: "Full resume"           },
  { label: "show stats",        insertText: "show stats",        detail: "show stats",        docs: "Dev statistics"        },
  { label: "show socials",      insertText: "show socials",      detail: "show socials",      docs: "Social profiles"       },
  // inspect completions
  { label: "inspect sheriff",    insertText: "inspect sheriff",    detail: "inspect sheriff",    docs: "AI speed detection"    },
  { label: "inspect surfer",     insertText: "inspect surfer",     detail: "inspect surfer",     docs: "Chrome summarizer"     },
  { label: "inspect care-kit",   insertText: "inspect care-kit",   detail: "inspect care-kit",   docs: "Mental health AI"      },
  { label: "inspect acencert",   insertText: "inspect acencert",   detail: "inspect acencert",   docs: "NCERT AI generator"    },
  { label: "inspect minementor", insertText: "inspect minementor", detail: "inspect minementor", docs: "Minecraft AI bot"      },
  { label: "inspect argos",      insertText: "inspect argos",      detail: "inspect argos",      docs: "Debate bot"            },
  { label: "inspect carebot",    insertText: "inspect carebot",    detail: "inspect carebot",    docs: "Health support bot"    },
  // pipe
  { label: "about -> show",        insertText: "about -> show",        detail: "pipe",  docs: "Pipe entity to action" },
  { label: "skills -> show",       insertText: "skills -> show",       detail: "pipe",  docs: "Pipe entity to action" },
  { label: "projects -> show",     insertText: "projects -> show",     detail: "pipe",  docs: "Pipe entity to action" },
  { label: "projects -> list",     insertText: "projects -> list",     detail: "pipe",  docs: "List projects"         },
  { label: "projects -> count",    insertText: "projects -> count",    detail: "pipe",  docs: "Count projects"        },
  { label: "sheriff -> inspect",   insertText: "sheriff -> inspect",   detail: "pipe",  docs: "Inspect project"       },
  // easter eggs (hidden — no docs)
  { label: "hire me",       insertText: "hire me",       detail: "???", docs: "" },
  { label: "future me",     insertText: "future me",     detail: "???", docs: "" },
  { label: "coffee please", insertText: "coffee please", detail: "???", docs: "" },
  // ── Script completions ────────────────────────────────────────────────────
  { label: "set",    insertText: "set ${1:name} = ${2:value}",  detail: "set <name> = <value>",   docs: "Declare a variable"         },
  { label: "print",  insertText: "print(${1:value})",           detail: "print(<value>)",          docs: "Print to terminal"          },
  { label: "define", insertText: "define ${1:name}(${2:params}) {\n\t${3:# body}\n}", detail: "define <name>(<params>) { }", docs: "Define a function" },
  { label: "if",     insertText: "if ${1:condition} {\n\t${2:# body}\n}",             detail: "if <condition> { }",          docs: "Conditional"        },
  { label: "if else",insertText: "if ${1:condition} {\n\t${2:# body}\n} else {\n\t${3:# else}\n}", detail: "if … else { }",  docs: "Conditional with else" },
  { label: "repeat", insertText: "repeat ${1:3} {\n\t${2:# body}\n}",                detail: "repeat <n> { }",              docs: "Repeat n times"     },
  { label: "each",   insertText: "each ${1:item} in ${2:list} {\n\t${3:print(item)}\n}", detail: "each <var> in <list> { }", docs: "Loop over array"    },
  { label: "while",  insertText: "while ${1:condition} {\n\t${2:# body}\n}",         detail: "while <condition> { }",       docs: "While loop"         },
  { label: "return", insertText: "return ${1:value}",           detail: "return <value>",          docs: "Return from function"       },
  // built-in functions
  { label: "len",    insertText: "len(${1:value})",     detail: "len(value)",     docs: "Length of string or array"     },
  { label: "range",  insertText: "range(${1:start}, ${2:end})", detail: "range(start, end)", docs: "Array of numbers" },
  { label: "str",    insertText: "str(${1:value})",     detail: "str(value)",     docs: "Convert to string"             },
  { label: "num",    insertText: "num(${1:value})",     detail: "num(value)",     docs: "Convert to number"             },
  { label: "type",   insertText: "type(${1:value})",    detail: "type(value)",    docs: "Get type as string"            },
  { label: "push",   insertText: "push(${1:arr}, ${2:item})", detail: "push(arr, item)", docs: "Append item to array"  },
  { label: "pop",    insertText: "pop(${1:arr})",       detail: "pop(arr)",       docs: "Remove last item"              },
  { label: "join",   insertText: "join(${1:arr}, ${2:sep})",   detail: "join(arr, sep)",  docs: "Join array to string"  },
  { label: "split",  insertText: 'split(${1:str}, ${2:" "})',  detail: "split(str, sep)", docs: "Split string to array" },
  { label: "upper",  insertText: "upper(${1:str})",     detail: "upper(str)",     docs: "Uppercase string"              },
  { label: "lower",  insertText: "lower(${1:str})",     detail: "lower(str)",     docs: "Lowercase string"              },
  { label: "trim",   insertText: "trim(${1:str})",      detail: "trim(str)",      docs: "Trim whitespace"               },
  { label: "abs",    insertText: "abs(${1:n})",         detail: "abs(n)",         docs: "Absolute value"                },
  { label: "floor",  insertText: "floor(${1:n})",       detail: "floor(n)",       docs: "Floor"                         },
  { label: "ceil",   insertText: "ceil(${1:n})",        detail: "ceil(n)",        docs: "Ceiling"                       },
  { label: "round",  insertText: "round(${1:n})",       detail: "round(n)",       docs: "Round"                         },
  { label: "sqrt",   insertText: "sqrt(${1:n})",        detail: "sqrt(n)",        docs: "Square root"                   },
  { label: "max",    insertText: "max(${1:a}, ${2:b})", detail: "max(a, b, …)",   docs: "Maximum of values"             },
  { label: "min",    insertText: "min(${1:a}, ${2:b})", detail: "min(a, b, …)",   docs: "Minimum of values"             },
  { label: "random", insertText: "random()",            detail: "random()",       docs: "Random float 0–1"              },
];

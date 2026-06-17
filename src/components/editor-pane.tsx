"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect } from "react";
import { FORGE_COMPLETIONS, FORGE_KEYWORDS } from "@/language/forge-runtime";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center bg-[color:var(--forge-bg)] font-[family-name:var(--font-editor)] text-xs text-[color:var(--forge-muted)]">
      loading editor...
    </div>
  ),
});

let monacoConfigured = false;
let monacoNamespace: typeof import("monaco-editor") | null = null;

interface EditorPaneProps {
  fileName: string;
  value: string;
  minimapEnabled: boolean;
  fontSize: number;
  resolvedTheme: "dark" | "light";
  onChange: (nextValue: string) => void;
  onEditorMount?: (editor: import("monaco-editor").editor.IStandaloneCodeEditor) => void;
}

export const EditorPane = ({
  fileName,
  value,
  minimapEnabled,
  fontSize,
  resolvedTheme,
  onChange,
  onEditorMount,
}: EditorPaneProps) => {
  const handleBeforeMount = useCallback(
    (monaco: typeof import("monaco-editor")) => {
      // Always store the namespace so setTheme is always available
      monacoNamespace = monaco;
      if (monacoConfigured) return;

      // ── Register FORGE language ───────────────

      monaco.languages.register({ id: "forge" });

      monaco.languages.setMonarchTokensProvider("forge", {
        keywords: FORGE_KEYWORDS,
        verbs: ["show", "inspect", "open", "search", "discover", "help", "clear"],
        scriptKw: [
          "set", "define", "if", "else", "repeat", "each", "in",
          "while", "return", "print", "true", "false", "null",
        ],
        topics: [
          "about", "profile", "skills", "projects", "experience",
          "contact", "resume", "timeline", "achievements", "stats",
          "socials", "github",
        ],
        projects: [
          "sheriff", "surfer", "care-kit", "acencert",
          "minementor", "argos", "carebot",
        ],
        builtinFns: [
          "len", "str", "num", "bool", "type", "push", "pop",
          "join", "split", "upper", "lower", "trim", "range",
          "abs", "floor", "ceil", "round", "sqrt", "max", "min", "random",
        ],
        tokenizer: {
          root: [
            // comments
            [/#.*$/, "comment"],
            // arrow operator
            [/->/, "keyword.operator"],
            // quoted strings
            [/"[^"]*"/, "string"],
            // numbers
            [/\b\d+(\.\d+)?\b/, "number"],
            // identifiers — check categories
            [
              /[a-zA-Z_][\w\-]*/,
              {
                cases: {
                  "@verbs":      "keyword",
                  "@scriptKw":   "keyword.script",
                  "@builtinFns": "type.builtin",
                  "@topics":     "type",
                  "@projects":   "variable",
                  "@default":    "identifier",
                },
              },
            ],
            // operators
            [/[=!<>+\-*/%]+/, "operator"],
          ],
        },
      });

      monaco.languages.setLanguageConfiguration("forge", {
        comments: { lineComment: "#" },
      });

      // ── Dark theme ────────────────────────────

      monaco.editor.defineTheme("forge-theme-dark", {
        base: "vs-dark",
        inherit: false,
        rules: [
          { token: "",                 foreground: "d0d0d0", background: "000000" },
          { token: "comment",          foreground: "444444", fontStyle: "italic"  },
          { token: "keyword",          foreground: "ffffff", fontStyle: "bold"    },
          { token: "keyword.script",   foreground: "cccccc", fontStyle: "bold"    },
          { token: "keyword.operator", foreground: "666666"                       },
          { token: "type",             foreground: "b8b8b8"                       },
          { token: "type.builtin",     foreground: "c8c8c8"                       },
          { token: "variable",         foreground: "a0a0a0"                       },
          { token: "identifier",       foreground: "888888"                       },
          { token: "string",           foreground: "909090"                       },
          { token: "number",           foreground: "aaaaaa"                       },
          { token: "operator",         foreground: "666666"                       },
        ],
        colors: {
          "editor.background":                     "#000000",
          "editor.foreground":                     "#d0d0d0",
          "editorLineNumber.foreground":            "#333333",
          "editorLineNumber.activeForeground":      "#888888",
          "editorCursor.foreground":                "#ffffff",
          "editor.selectionBackground":             "#1a1a1a",
          "editor.inactiveSelectionBackground":     "#111111",
          "editor.lineHighlightBackground":         "#080808",
          "editorIndentGuide.background1":          "#111111",
          "editorIndentGuide.activeBackground1":    "#2a2a2a",
          "editorBracketMatch.background":          "#1a1a1a",
          "editorBracketMatch.border":              "#444444",
          "editorWidget.background":                "#0a0a0a",
          "editorWidget.border":                    "#2a2a2a",
          "editorSuggestWidget.background":         "#0a0a0a",
          "editorSuggestWidget.border":             "#2a2a2a",
          "editorSuggestWidget.foreground":         "#aaaaaa",
          "editorSuggestWidget.selectedBackground": "#1a1a1a",
          "editorSuggestWidget.selectedForeground": "#ffffff",
          "editorHoverWidget.background":           "#0a0a0a",
          "editorHoverWidget.border":               "#2a2a2a",
          "scrollbar.shadow":                       "#000000",
          "scrollbarSlider.background":             "#181818",
          "scrollbarSlider.hoverBackground":        "#222222",
          "scrollbarSlider.activeBackground":       "#2e2e2e",
          "minimap.background":                     "#000000",
          "input.background":                       "#0a0a0a",
          "input.border":                           "#2a2a2a",
          "focusBorder":                            "#444444",
          "list.hoverBackground":                   "#0e0e0e",
          "list.activeSelectionBackground":         "#1a1a1a",
        },
      });

      // ── Light theme ───────────────────────────

      monaco.editor.defineTheme("forge-theme-light", {
        base: "vs",
        inherit: false,
        rules: [
          { token: "",                 foreground: "111111", background: "c8c7c0" },
          { token: "comment",          foreground: "888880", fontStyle: "italic"  },
          { token: "keyword",          foreground: "000000", fontStyle: "bold"    },
          { token: "keyword.script",   foreground: "111111", fontStyle: "bold"    },
          { token: "keyword.operator", foreground: "666660"                       },
          { token: "type",             foreground: "222218"                       },
          { token: "type.builtin",     foreground: "333328"                       },
          { token: "variable",         foreground: "444438"                       },
          { token: "identifier",       foreground: "555548"                       },
          { token: "string",           foreground: "3a3a30"                       },
          { token: "number",           foreground: "2a2a22"                       },
          { token: "operator",         foreground: "777770"                       },
        ],
        colors: {
          "editor.background":                     "#c8c7c0",
          "editor.foreground":                     "#111111",
          "editorLineNumber.foreground":            "#999990",
          "editorLineNumber.activeForeground":      "#444440",
          "editorCursor.foreground":                "#000000",
          "editor.selectionBackground":             "#b0afaa",
          "editor.inactiveSelectionBackground":     "#b8b7b0",
          "editor.lineHighlightBackground":         "#c0bfb8",
          "editorIndentGuide.background1":          "#b8b8b0",
          "editorIndentGuide.activeBackground1":    "#a8a8a0",
          "editorBracketMatch.background":          "#b0afaa",
          "editorBracketMatch.border":              "#989890",
          "editorWidget.background":                "#bebdb6",
          "editorWidget.border":                    "#a8a8a0",
          "editorSuggestWidget.background":         "#bebdb6",
          "editorSuggestWidget.border":             "#a8a8a0",
          "editorSuggestWidget.foreground":         "#111111",
          "editorSuggestWidget.selectedBackground": "#b0afaa",
          "editorSuggestWidget.selectedForeground": "#000000",
          "editorHoverWidget.background":           "#bebdb6",
          "editorHoverWidget.border":               "#a8a8a0",
          "scrollbar.shadow":                       "#b8b7b0",
          "scrollbarSlider.background":             "#a8a8a0",
          "scrollbarSlider.hoverBackground":        "#989890",
          "scrollbarSlider.activeBackground":       "#888880",
          "minimap.background":                     "#c8c7c0",
          "input.background":                       "#c0bfb8",
          "input.border":                           "#a8a8a0",
          "focusBorder":                            "#777770",
          "list.hoverBackground":                   "#b8b7b0",
          "list.activeSelectionBackground":         "#b0afaa",
        },
      });

      // ── Autocomplete ──────────────────────────

      monaco.languages.registerCompletionItemProvider("forge", {
        triggerCharacters: [" "],
        provideCompletionItems(model, position) {
          const wordInfo = model.getWordUntilPosition(position);
          const lineText = model.getLineContent(position.lineNumber).trim();
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber:   position.lineNumber,
            startColumn:     wordInfo.startColumn,
            endColumn:       wordInfo.endColumn,
          };

          const suggestions: import("monaco-editor").languages.CompletionItem[] = [];

          for (const c of FORGE_COMPLETIONS) {
            // Only show completions relevant to what's typed
            const typed = lineText.toLowerCase();
            const label = c.label.toLowerCase();
            if (typed.length > 0 && !label.startsWith(typed) && !label.includes(typed)) {
              continue;
            }
            suggestions.push({
              label:  c.label,
              kind:   c.detail === "pipe"
                        ? monaco.languages.CompletionItemKind.Operator
                        : c.detail === "???"
                          ? monaco.languages.CompletionItemKind.Color
                          : FORGE_KEYWORDS.includes(c.label)
                            ? monaco.languages.CompletionItemKind.Keyword
                            : monaco.languages.CompletionItemKind.Function,
              insertText:  c.insertText,
              detail:      c.detail,
              documentation: c.docs ? { value: c.docs } : undefined,
              range,
            });
          }

          return { suggestions };
        },
      });

      // ── Hover tooltips ────────────────────────

      monaco.languages.registerHoverProvider("forge", {
        provideHover(model, position) {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const match = FORGE_COMPLETIONS.find(
            (c) => c.label.split(" ")[0] === word.word,
          );
          if (match && match.docs) {
            return {
              contents: [{ value: `**${match.detail}**\n\n${match.docs}` }],
            };
          }
          return null;
        },
      });

      monacoConfigured = true;
    },
    [],
  );

  const monacoTheme = resolvedTheme === "light" ? "forge-theme-light" : "forge-theme-dark";

  // Monaco ignores the `theme` prop on re-renders after initial mount.
  // Switch themes imperatively using the stored namespace from beforeMount.
  useEffect(() => {
    monacoNamespace?.editor.setTheme(monacoTheme);
  }, [monacoTheme]);

  return (
    <div
      className="flex min-h-0 flex-1"
      style={{ background: resolvedTheme === "light" ? "#c8c7c0" : "#000000" }}
    >
      <MonacoEditor
        path={fileName}
        language="forge"
        beforeMount={handleBeforeMount}
        onMount={(editor) => {
          // Apply the current theme immediately after mount (handles
          // the case where theme was restored from localStorage before
          // the editor was ready).
          monacoNamespace?.editor.setTheme(monacoTheme);
          onEditorMount?.(editor);
        }}
        theme={monacoTheme}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          automaticLayout:      true,
          minimap:              { enabled: minimapEnabled },
          contextmenu:          true,
          lineNumbers:          "on",
          smoothScrolling:      true,
          cursorBlinking:       "solid",
          cursorSmoothCaretAnimation: "on",
          tabSize:              2,
          insertSpaces:         true,
          detectIndentation:    false,
          matchBrackets:        "never",
          autoIndent:           "none",
          bracketPairColorization: { enabled: false },
          folding:              false,
          links:                false,
          fontFamily:           "var(--font-editor), 'JetBrains Mono', monospace",
          fontSize,
          fontLigatures:        false,
          renderWhitespace:     "none",
          wordWrap:             "off",
          quickSuggestions:     { strings: false, comments: false, other: true },
          suggestOnTriggerCharacters: true,
          multiCursorModifier:  "ctrlCmd",
          scrollBeyondLastLine: false,
          padding:              { top: 14, bottom: 14 },
          renderLineHighlight:  "line",
          occurrencesHighlight: "off",
          selectionHighlight:   false,
          find:                 { addExtraSpaceOnTop: false },
          lineDecorationsWidth: 8,
          glyphMargin:          false,
        }}
      />
    </div>
  );
};

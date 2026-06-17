<div align="center">
  <br />
  <pre>
███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
█████╗  ██║   ██║██████╔╝██║  ███╗█████╗  
██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝  
██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  </pre>
  <p><strong>Gautam Gambhir's developer portfolio — disguised as a code editor.</strong></p>
  <br />

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
  ![Monaco](https://img.shields.io/badge/Monaco_Editor-4.7-0078D4?style=flat-square&logo=visualstudiocode)
  ![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)
  ![Status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square)

  <br />
  <a href="https://forgeos.vercel.app"><strong>🔗 Live Demo →</strong></a>
  <br /><br />

</div>

---

## What is FORGE?

**FORGE** is my personal developer portfolio. Not a template, not a starter kit — just a portfolio that happens to look like a code editor.

It's a fully interactive, command-driven environment built around a retro IDE aesthetic — complete with a custom scripting language, working terminal, syntax highlighting, and a file explorer. You navigate it by typing commands, not clicking links.

Built by **[Gautam Gambhir](https://github.com/gautamxgambhir)** — feel free to look around, but this is not designed to be cloned and reused as your own portfolio.

```forge
# Welcome to FORGE
show about
inspect sheriff
show projects
search AI
```

---

## Features

| Feature | Description |
|---|---|
| 🖊️ **FORGE Language** | Custom scripting language with syntax highlighting, autocomplete & hover docs |
| 🗂️ **File Explorer** | Navigate `.forge` files like a real project |
| 💻 **Live Terminal** | Execute commands, run scripts, explore topics |
| 🎨 **Theming** | Dark · Light · System — all persisted to localStorage |
| ⚡ **Monaco Editor** | Full VS Code editor engine under the hood |
| 📱 **Responsive** | Works on mobile with adaptive layout |
| 🔀 **Multi-tab** | Open, close and switch between multiple files |
| ⌨️ **Keyboard Shortcuts** | `Ctrl+Enter` run, `Ctrl+B` sidebar, `Ctrl+`` terminal |

---

## The FORGE Language

FORGE is a minimal command language built for portfolio navigation. It's interpreted at runtime — no compilation needed.

### Commands

```forge
# ── Navigation ────────────────────────────
discover                   # list all available commands
show about                 # show the about section
show skills                # list technical skills
show projects              # browse all projects
show experience            # work & internship history
show timeline              # career timeline
show stats                 # activity & contributions

# ── Project inspection ───────────────────
inspect sheriff            # deep-dive into a specific project
inspect acencert
inspect surfer

# ── Search ───────────────────────────────
search AI                  # search across everything
search Next.js

# ── Social & contact ─────────────────────
show socials               # all social links
show github                # GitHub profile
contact                    # open the contact form
hire me                    # 👀
```

### Scripting

FORGE also supports a basic scripting syntax for `.forge` files:

```forge
# Variables
set name "Gautam"
set lang "TypeScript"

# Conditionals
if lang == "TypeScript"
  print "good taste."
else
  print "interesting choice."

# Loops
repeat 3
  print "FORGE"

# Functions
define greet name
  print "Hello, " + name
```

---

## Tech Stack

```
forge/
├── Next.js 16          — App Router, SSR, API routes
├── TypeScript 5        — Strict mode throughout
├── Monaco Editor       — VS Code's editor engine
├── Framer Motion       — Smooth UI animations
├── Zustand             — Lightweight state management
├── Tailwind CSS 4      — Utility-first styling
└── Resend              — Contact form email delivery
```

---

## Getting Started

### Clone & install

```bash
git clone https://github.com/gautamxgambhir/forge.git
cd forge
npm install
```

### Environment variables

```bash
cp .env.example .env.local
# Add your Resend API key for the contact form
```

```env
RESEND_API_KEY=re_your_key_here
```

### Run locally

```bash
npm run dev
# → http://localhost:3000
```

### Build for production

```bash
npm run build
npm start
```

---

## Deployment

FORGE is built for Vercel — zero-config deployment.

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to [vercel.com](https://vercel.com) for automatic deployments on every push.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          — Root layout, fonts, metadata
│   ├── page.tsx            — Entry point
│   └── globals.css         — CSS variables & theme tokens
├── components/
│   ├── forge-app.tsx       — Root app shell
│   ├── editor-pane.tsx     — Monaco editor + FORGE themes
│   ├── terminal-panel.tsx  — Interactive terminal
│   ├── sidebar.tsx         — File explorer + settings
│   ├── editor-tabs.tsx     — Tab bar
│   └── top-bar.tsx         — Menu bar
├── editor/
│   ├── store.ts            — Zustand global store
│   └── default-files.ts    — Initial .forge file content
├── hooks/
│   ├── use-theme.ts        — Dark/light/system theme
│   └── use-breakpoint.ts   — Responsive breakpoints
└── language/
    ├── forge-runtime.ts    — FORGE interpreter & commands
    └── forge-data.ts       — Portfolio data source
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | Run current file |
| `Ctrl + B` | Toggle sidebar |
| `Ctrl + `` ` | Toggle terminal |
| `Ctrl + N` | New file |
| `Ctrl + F` | Find in editor |
| `Ctrl + H` | Find & replace |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m "feat: add something cool"
git push origin feature/your-feature
# → open a Pull Request
```

---

## License

MIT © [Gautam Gambhir](https://github.com/gautamxgambhir)

---

<div align="center">
  <sub>Built with ☕ and way too many late nights.</sub>
  <br /><br />
  <a href="https://github.com/gautamxgambhir">GitHub</a> ·
  <a href="https://twitter.com/gautamxgambhir">Twitter</a> ·
  <a href="https://instagram.com/gautamxgambhir">Instagram</a>
</div>

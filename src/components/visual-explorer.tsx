"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PROJECTS } from "@/language/forge-data";

interface VisualSection {
  type: "about" | "projects" | "skills" | "experience" | "contact" | "discover" | "stats" | "inspect" | "unknown";
  param?: string;
  lineNumber: number;
  rawText: string;
}

interface AnalyzedVar {
  name: string;
  value: string;
  lineNumber: number;
}

interface AnalyzedFunc {
  name: string;
  params: string[];
  lineNumber: number;
}

interface FileAnalysis {
  sections: VisualSection[];
  variables: AnalyzedVar[];
  functions: AnalyzedFunc[];
}

interface VisualExplorerProps {
  fileName: string;
  content: string;
  onSelectLine: (lineNum: number) => void;
  onOpenFileByName: (name: string) => boolean;
}

// ── Line-by-line analyzer ──────────────────────────────────────
function analyzeForgeCode(code: string): FileAnalysis {
  const lines = code.split("\n");
  const sections: VisualSection[] = [];
  const variables: AnalyzedVar[] = [];
  const functions: AnalyzedFunc[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx] || "";
    const line = rawLine.trim();
    const lineNumber = idx + 1;

    if (!line || line.startsWith("#")) continue;

    // 1. Variable: set <name> = <val>
    const setMatch = line.match(/^set\s+([a-zA-Z_]\w*)\s*=\s*(.+)$/i);
    if (setMatch) {
      variables.push({
        name: setMatch[1] || "",
        value: setMatch[2] || "",
        lineNumber,
      });
      continue;
    }

    // 2. Function: define <name>(<args>) {
    const defineMatch = line.match(/^define\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/i);
    if (defineMatch) {
      const params = (defineMatch[2] || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      functions.push({
        name: defineMatch[1] || "",
        params,
        lineNumber,
      });
      continue;
    }

    // 3. Command: show <topic> or inspect <project> or pipe
    let normalized = line.toLowerCase();
    if (normalized.includes("->")) {
      const parts = normalized.split("->").map((p) => p.trim());
      if (parts.length === 2) {
        const entity = parts[0] || "";
        const action = parts[1] || "";
        if (action === "show" || action === "display" || action === "list") {
          normalized = `show ${entity}`;
        } else if (action === "inspect") {
          normalized = `inspect ${entity}`;
        }
      }
    }

    const showMatch = normalized.match(/^show\s+([a-zA-Z0-9_\-]+)/);
    if (showMatch) {
      const topic = showMatch[1] || "";
      if (topic === "about" || topic === "profile") {
        sections.push({ type: "about", lineNumber, rawText: rawLine });
      } else if (topic === "projects") {
        sections.push({ type: "projects", lineNumber, rawText: rawLine });
      } else if (topic === "skills") {
        sections.push({ type: "skills", lineNumber, rawText: rawLine });
      } else if (topic === "experience") {
        sections.push({ type: "experience", lineNumber, rawText: rawLine });
      } else if (topic === "contact") {
        sections.push({ type: "contact", lineNumber, rawText: rawLine });
      } else if (topic === "stats") {
        sections.push({ type: "stats", lineNumber, rawText: rawLine });
      } else if (topic === "achievements" || topic === "timeline" || topic === "resume") {
        sections.push({ type: "experience", lineNumber, rawText: rawLine });
      } else {
        sections.push({ type: "unknown", param: topic, lineNumber, rawText: rawLine });
      }
      continue;
    }

    const inspectMatch = normalized.match(/^inspect\s+([a-zA-Z0-9_\-]+)/);
    if (inspectMatch) {
      const project = inspectMatch[1] || "";
      sections.push({ type: "inspect", param: project, lineNumber, rawText: rawLine });
      continue;
    }

    if (normalized === "discover" || normalized === "help" || normalized.startsWith("help ")) {
      sections.push({ type: "discover", lineNumber, rawText: rawLine });
      continue;
    }

    if (normalized === "hire me" || normalized === "hire") {
      sections.push({ type: "contact", lineNumber, rawText: rawLine });
    }
  }

  return { sections, variables, functions };
}

export const VisualExplorer = ({
  fileName,
  content,
  onSelectLine,
  onOpenFileByName,
}: VisualExplorerProps) => {
  const [analysis, setAnalysis] = useState<FileAnalysis>({ sections: [], variables: [], functions: [] });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactStatus, setContactStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [contactLogs, setContactLogs] = useState<string[]>([]);

  useEffect(() => {
    const res = analyzeForgeCode(content);
    setAnalysis(res);

    // If an inspect command exists in the code, automatically select that project
    const inspectSec = res.sections.find((s) => s.type === "inspect");
    if (inspectSec && inspectSec.param) {
      setSelectedProject(inspectSec.param);
    } else {
      setSelectedProject(null);
    }
  }, [content]);

  // Section Header wrapper
  const SectionHeader = ({ title, line, onClick }: { title: string; line: number; onClick?: () => void }) => (
    <div
      onClick={() => {
        onSelectLine(line);
        onClick?.();
      }}
      className="group flex cursor-pointer items-center justify-between border-b border-[color:var(--forge-border)] bg-[color:var(--forge-surface2)] px-3 py-1.5 font-[family-name:var(--font-editor)] text-[11px] tracking-wider uppercase text-[color:var(--forge-muted)] transition hover:text-[color:var(--forge-fg)]"
    >
      <span>{title}</span>
      <span className="opacity-0 transition group-hover:opacity-100 font-[family-name:var(--font-mono)] text-[9px] text-[color:var(--forge-muted)]">
        Jump to line {line}
      </span>
    </div>
  );

  // 1. Welcome / Discover Component
  const WelcomeDiscover = ({ line }: { line: number }) => {
    const files = ["welcome.forge", "about.forge", "projects.forge", "skills.forge", "experience.forge", "contact.forge", "playground.forge"];
    return (
      <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
        <SectionHeader title="WELCOME // DISCOVER DESK" line={line} />
        <div className="p-4 font-[family-name:var(--font-editor)] text-xs text-[color:var(--forge-fg)] space-y-4">
          <div className="border border-[color:var(--forge-border)] p-3 bg-black/30 leading-relaxed font-mono">
            <span className="text-[color:var(--forge-muted)]">forge@os:~$</span> discover
            <div className="mt-2 text-[color:var(--forge-muted)]">
              Welcome to Gautam Gambhir's portfolio editor workspace. The GUI mode compiles code lines into interface blocks in real-time.
            </div>
          </div>
          <div>
            <div className="mb-2 font-bold uppercase tracking-wider text-[color:var(--forge-muted)] text-[10px]">
              Available Workspace Files
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {files.map((file) => (
                <button
                  key={file}
                  type="button"
                  onClick={() => onOpenFileByName(file)}
                  className="flex flex-col items-start border border-[color:var(--forge-border)] bg-black/20 p-2 text-left transition hover:border-[color:var(--forge-fg)]"
                >
                  <span className="font-bold text-[11px]">{file}</span>
                  <span className="text-[10px] text-[color:var(--forge-muted)]">Open in editor</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 2. About Identity Card
  const AboutIdentity = ({ line }: { line: number }) => (
    <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
      <SectionHeader title="IDENTITY CARD // GAUTAM GAMBHIR" line={line} />
      <div className="p-4 font-[family-name:var(--font-editor)] text-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Metadata */}
          <div className="border border-[color:var(--forge-border)] p-3 bg-black/20 space-y-2">
            <div className="flex justify-between border-b border-[color:var(--forge-border)] pb-1.5">
              <span className="text-[color:var(--forge-muted)]">NAME:</span>
              <span className="font-bold">Gautam Gambhir</span>
            </div>
            <div className="flex justify-between border-b border-[color:var(--forge-border)] pb-1.5">
              <span className="text-[color:var(--forge-muted)]">ROLE:</span>
              <span>Developer &amp; Designer</span>
            </div>
            <div className="flex justify-between border-b border-[color:var(--forge-border)] pb-1.5">
              <span className="text-[color:var(--forge-muted)]">CLASS:</span>
              <span>12 (Student)</span>
            </div>
            <div className="flex justify-between border-b border-[color:var(--forge-border)] pb-1.5">
              <span className="text-[color:var(--forge-muted)]">LOCATION:</span>
              <span>New Delhi, India</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:var(--forge-muted)]">UPTIME:</span>
              <span>6+ years coding</span>
            </div>
          </div>

          {/* Bio block */}
          <div className="flex flex-col justify-between border border-[color:var(--forge-border)] p-3 bg-black/20">
            <div className="leading-relaxed text-[color:var(--forge-fg)] opacity-90">
              I build web apps, AI bots, and browser extensions. I started writing Python at age 11. 
              I design interfaces, manage systems, and enjoy ethical hacking and bug bounties.
            </div>
            <div className="mt-4 flex gap-4 text-[10px] text-[color:var(--forge-muted)]">
              <a href="https://github.com/gautamxgambhir" target="_blank" rel="noreferrer" className="hover:text-[color:var(--forge-fg)] hover:underline">GITHUB</a>
              <a href="https://x.com/gautamxgambhir" target="_blank" rel="noreferrer" className="hover:text-[color:var(--forge-fg)] hover:underline">TWITTER</a>
              <a href="mailto:ggambhir1919@gmail.com" className="hover:text-[color:var(--forge-fg)] hover:underline">EMAIL</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 3. Projects Register / Detail
  const ProjectsGrid = ({ line }: { line: number }) => {
    const [search, setSearch] = useState("");
    
    const handleSelectProject = (slug: string) => {
      setSelectedProject(slug);
      const matchingInspect = analysis.sections.find(
        (s) => s.type === "inspect" && s.param === slug
      );
      if (matchingInspect) {
        onSelectLine(matchingInspect.lineNumber);
      } else {
        onSelectLine(line);
      }
    };

    if (selectedProject && PROJECTS[selectedProject]) {
      const p = PROJECTS[selectedProject]!;
      return (
        <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
          <div className="flex items-center justify-between border-b border-[color:var(--forge-border)] bg-[color:var(--forge-surface2)] px-3 py-1.5 font-[family-name:var(--font-editor)] text-[11px] uppercase tracking-wider text-[color:var(--forge-muted)]">
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="hover:text-[color:var(--forge-fg)] cursor-pointer"
              >
                ← PROJECTS
              </button>
              <span>/ INSPECT: {p.name}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedProject(null)}
              className="text-[10px] hover:text-[color:var(--forge-fg)] cursor-pointer"
            >
              CLOSE ×
            </button>
          </div>
          <div className="p-4 font-[family-name:var(--font-editor)] text-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase">{p.name}</h3>
              <p className="text-[11px] text-[color:var(--forge-muted)]">{p.tagline}</p>
            </div>

            <div className="border border-[color:var(--forge-border)] bg-black/20 p-3 leading-relaxed">
              <div className="mb-1 font-bold text-[10px] uppercase text-[color:var(--forge-muted)]">Description</div>
              {p.description}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-[color:var(--forge-border)] p-3 bg-black/20">
                <div className="mb-2 font-bold text-[10px] uppercase text-[color:var(--forge-muted)]">Stack</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <span key={s} className="border border-[color:var(--forge-border)] bg-black/35 px-1.5 py-0.5 text-[10px]">{s}</span>
                  ))}
                </div>
              </div>
              <div className="border border-[color:var(--forge-border)] p-3 bg-black/20">
                <div className="mb-2 font-bold text-[10px] uppercase text-[color:var(--forge-muted)]">Link</div>
                <a
                  href={`https://${p.link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block border border-[color:var(--forge-border)] px-3 py-1 text-[11px] hover:border-[color:var(--forge-fg)] transition uppercase"
                >
                  Visit Repository ↗
                </a>
              </div>
            </div>

            <div className="border border-[color:var(--forge-border)] p-3 bg-black/20">
              <div className="mb-1 font-bold text-[10px] uppercase text-[color:var(--forge-muted)]">Features</div>
              <ul className="space-y-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-[color:var(--forge-muted)] font-bold">[x]</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-[color:var(--forge-border)] p-3 bg-black/20">
              <div className="mb-1 font-bold text-[10px] uppercase text-[color:var(--forge-muted)]">Lesson Learned</div>
              <p className="italic text-[color:var(--forge-muted)]">"{p.lesson}"</p>
            </div>
          </div>
        </div>
      );
    }

    const filtered = Object.entries(PROJECTS).filter(([key, p]) => {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.stack.some((s) => s.toLowerCase().includes(q))
      );
    });

    return (
      <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
        <SectionHeader title="PROJECT REGISTER // SHIPPED PROJECTS" line={line} />
        <div className="p-4 font-[family-name:var(--font-editor)] text-xs space-y-4">
          <div className="flex items-center border border-[color:var(--forge-border)] bg-black/20 px-2.5 py-1.5">
            <span className="mr-2 text-[color:var(--forge-muted)] font-bold">$ search</span>
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[color:var(--forge-fg)] outline-none placeholder:text-[color:var(--forge-muted)]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(([key, p]) => (
              <div
                key={key}
                onClick={() => handleSelectProject(key)}
                className="flex cursor-pointer flex-col justify-between border border-[color:var(--forge-border)] bg-black/10 p-3 transition hover:border-[color:var(--forge-fg)] hover:bg-black/35 animate-fade-in"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[12px]">{p.name}</span>
                    <span className="text-[9px] text-[color:var(--forge-muted)] uppercase">Inspect</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[color:var(--forge-muted)] line-clamp-2">
                    {p.tagline}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.stack.slice(0, 3).map((s) => (
                    <span key={s} className="border border-[color:var(--forge-border)] bg-black/20 px-1 py-0.5 text-[8px] text-[color:var(--forge-muted)]">
                      {s}
                    </span>
                  ))}
                  {p.stack.length > 3 && (
                    <span className="text-[8px] text-[color:var(--forge-muted)] px-1">+{p.stack.length - 3}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 4. Skills Modules
  const SkillsModules = ({ line }: { line: number }) => {
    const skillGroups = [
      {
        title: "Languages",
        items: [
          { name: "Python", val: 95 },
          { name: "JavaScript", val: 80 },
          { name: "HTML / CSS", val: 85 },
          { name: "Bash", val: 65 },
        ],
      },
      {
        title: "Frontend",
        items: [
          { name: "React", val: 80 },
          { name: "Next.js", val: 75 },
          { name: "Tailwind CSS", val: 90 },
          { name: "Framer", val: 70 },
        ],
      },
      {
        title: "Backend & Integrations",
        items: [
          { name: "Node.js", val: 75 },
          { name: "Together AI", val: 80 },
          { name: "Chrome APIs", val: 70 },
        ],
      },
      {
        title: "Tools & Creative",
        items: [
          { name: "Figma", val: 85 },
          { name: "Git", val: 80 },
          { name: "Linux", val: 75 },
          { name: "Arduino", val: 60 },
        ],
      },
    ];

    const renderBar = (pct: number) => {
      const bars = Math.floor(pct / 10);
      const blocks = "█".repeat(bars);
      const dots = "░".repeat(10 - bars);
      return `[${blocks}${dots}]`;
    };

    return (
      <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
        <SectionHeader title="CAPABILITY MATRICES // SKILLS" line={line} />
        <div className="p-4 font-[family-name:var(--font-editor)] text-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skillGroups.map((g) => (
              <div key={g.title} className="border border-[color:var(--forge-border)] p-3 bg-black/20">
                <div className="mb-2 font-bold text-[10px] uppercase text-[color:var(--forge-muted)] tracking-wider">
                  {g.title}
                </div>
                <div className="space-y-1.5">
                  {g.items.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-[11px]">
                      <span className="text-[color:var(--forge-fg)]">{item.name}</span>
                      <span className="font-mono text-[10px] text-[color:var(--forge-muted)]">
                        {renderBar(item.val)} {item.val}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 5. Experience Timeline
  const ExperienceTimeline = ({ line }: { line: number }) => {
    const entries = [
      {
        year: "2024",
        event: "CodeDay IIT Delhi Hackathon",
        role: "1st Place Winner",
        desc: "Built a Together AI NCERT quiz generator app in 24 hours.",
        type: "success",
      },
      {
        year: "2024",
        event: "Counterspell Delhi Hackathon",
        role: "3rd Place Winner",
        desc: "Built a laser detector puzzle game with Python, Arduino, and hardware components.",
        type: "success",
      },
      {
        year: "2022",
        event: "AI Bot Development",
        role: "Independent Builder",
        desc: "Designed and prototyped MineMentor, Argos, and CareBot AI messaging assistants.",
        type: "system",
      },
      {
        year: "2020",
        event: "Chrome Summarizer Extension",
        role: "Developer",
        desc: "Created Surfer summarization Chrome extension using content parsing.",
        type: "system",
      },
      {
        year: "2018",
        event: "First Code Written",
        role: "Student",
        desc: "Discovered scripting by learning Python and automating local task routines.",
        type: "muted",
      },
    ];

    return (
      <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
        <SectionHeader title="CHRONOLOGICAL LOG // EXPERIENCE" line={line} />
        <div className="p-4 font-[family-name:var(--font-editor)] text-xs space-y-4">
          <div className="border-l border-[color:var(--forge-border)] pl-4 ml-2 space-y-5 relative">
            {entries.map((e, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[21px] top-1 h-2 w-2 border border-[color:var(--forge-border)] bg-[color:var(--forge-bg)]" />
                
                <div className="border border-[color:var(--forge-border)] bg-black/10 p-3 hover:border-[color:var(--forge-fg)] transition">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-[color:var(--forge-fg)]">
                      {e.year} : {e.event}
                    </span>
                    <span className={`text-[9px] uppercase px-1 border ${
                      e.type === "success" 
                        ? "border-[color:var(--forge-border)] text-[color:var(--forge-fg)]"
                        : "border-transparent text-[color:var(--forge-muted)]"
                    }`}>
                      {e.role}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-[color:var(--forge-muted)]">
                    {e.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 6. Contact Console
  const ContactConsole = ({ line }: { line: number }) => {
    const handleTransmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
        setContactStatus("error");
        setContactLogs(["Error: NAME, EMAIL, and MESSAGE payload are required."]);
        return;
      }

      setContactStatus("sending");
      setContactLogs([
        "Initializing comms link to Gautam...",
        "Resolving API endpoint /api/contact...",
      ]);

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: contactName.trim(),
            email: contactEmail.trim(),
            subject: contactSubject.trim() || "Message from FORGE Visual Explorer",
            message: contactMessage.trim(),
            website: "",
          }),
        });

        if (res.ok) {
          setContactStatus("success");
          setContactLogs((prev) => [
            ...prev,
            "HTTP Status 200 OK. Connection stable.",
            "Sending message payload...",
            "Comms TRANSMITTED successfully. Thank you!",
          ]);
          setContactName("");
          setContactEmail("");
          setContactSubject("");
          setContactMessage("");
        } else {
          throw new Error("HTTP " + res.status);
        }
      } catch (err: any) {
        setContactStatus("error");
        setContactLogs((prev) => [
          ...prev,
          `Relay failure: ${err?.message || "Connection refused"}`,
          "TRANSMISSION ABORTED.",
        ]);
      }
    };

    return (
      <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
        <SectionHeader title="COMMS LINK // CONTACT CONSOLE" line={line} />
        <div className="p-4 font-[family-name:var(--font-editor)] text-xs space-y-4">
          <form onSubmit={handleTransmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-[color:var(--forge-muted)] uppercase tracking-wider block">Sender Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={contactStatus === "sending"}
                  className="w-full border border-[color:var(--forge-border)] bg-black/25 px-2.5 py-1.5 text-xs text-[color:var(--forge-fg)] outline-none focus:border-[color:var(--forge-fg)]"
                  placeholder="GUEST_BUILDER"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-[color:var(--forge-muted)] uppercase tracking-wider block">Sender Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={contactStatus === "sending"}
                  className="w-full border border-[color:var(--forge-border)] bg-black/25 px-2.5 py-1.5 text-xs text-[color:var(--forge-fg)] outline-none focus:border-[color:var(--forge-fg)]"
                  placeholder="name@server.org"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-[color:var(--forge-muted)] uppercase tracking-wider block">Subject</label>
              <input
                type="text"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                disabled={contactStatus === "sending"}
                className="w-full border border-[color:var(--forge-border)] bg-black/25 px-2.5 py-1.5 text-xs text-[color:var(--forge-fg)] outline-none focus:border-[color:var(--forge-fg)]"
                placeholder="HIRE / DISCOVER / COLLABORATE"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-[color:var(--forge-muted)] uppercase tracking-wider block">Message Body</label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                disabled={contactStatus === "sending"}
                rows={4}
                className="w-full border border-[color:var(--forge-border)] bg-black/25 px-2.5 py-1.5 text-xs text-[color:var(--forge-fg)] outline-none focus:border-[color:var(--forge-fg)] resize-none"
                placeholder="Type your message text details..."
                required
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={contactStatus === "sending"}
                className="border border-[color:var(--forge-border)] px-4 py-1.5 font-bold uppercase tracking-wider hover:border-[color:var(--forge-fg)] hover:text-[color:var(--forge-fg)] transition disabled:opacity-50 cursor-pointer"
              >
                {contactStatus === "sending" ? "TRANSMITTING..." : "TRANSMIT MESSAGE"}
              </button>
              {contactStatus !== "idle" && (
                <button
                  type="button"
                  onClick={() => { setContactStatus("idle"); setContactLogs([]); }}
                  className="text-[10px] text-[color:var(--forge-muted)] hover:text-[color:var(--forge-fg)]"
                >
                  RESET FORM
                </button>
              )}
            </div>
          </form>

          {contactLogs.length > 0 && (
            <div className="border border-[color:var(--forge-border)] p-3 bg-black/35 font-mono text-[10px] leading-relaxed text-[color:var(--forge-muted)] space-y-1 max-h-[120px] overflow-y-auto">
              <div className="text-[color:var(--forge-fg)] font-bold text-[9px] uppercase tracking-wide mb-1 border-b border-[color:var(--forge-border)] pb-1">
                TRANSMISSION BUFFER LOG
              </div>
              {contactLogs.map((log, idx) => (
                <div key={idx} className={log.startsWith("Error") || log.includes("ABORTED") ? "text-red-400" : log.includes("SUCCESSFUL") ? "text-green-400" : ""}>
                  &gt; {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 7. Stats Component
  const VisitorStats = ({ line }: { line: number }) => (
    <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
      <SectionHeader title="VISITOR STATS // SYSTEM METRICS" line={line} />
      <div className="p-4 font-[family-name:var(--font-editor)] text-xs grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-[color:var(--forge-border)] p-2.5 bg-black/20 text-center">
          <div className="text-[10px] text-[color:var(--forge-muted)] uppercase">Visits</div>
          <div className="text-sm font-bold mt-1">482</div>
        </div>
        <div className="border border-[color:var(--forge-border)] p-2.5 bg-black/20 text-center">
          <div className="text-[10px] text-[color:var(--forge-muted)] uppercase">Avg Time</div>
          <div className="text-sm font-bold mt-1">3m 42s</div>
        </div>
        <div className="border border-[color:var(--forge-border)] p-2.5 bg-black/20 text-center">
          <div className="text-[10px] text-[color:var(--forge-muted)] uppercase">Command Runs</div>
          <div className="text-sm font-bold mt-1">1,241</div>
        </div>
        <div className="border border-[color:var(--forge-border)] p-2.5 bg-black/20 text-center">
          <div className="text-[10px] text-[color:var(--forge-muted)] uppercase">Active Mode</div>
          <div className="text-sm font-bold mt-1">Visual</div>
        </div>
      </div>
    </div>
  );

  // 8. Playground Script variables / methods inspector
  const PlaygroundInspector = () => (
    <div className="space-y-6">
      <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
        <div className="border-b border-[color:var(--forge-border)] bg-[color:var(--forge-surface2)] px-3 py-1.5 font-[family-name:var(--font-editor)] text-[11px] uppercase tracking-wider text-[color:var(--forge-muted)]">
          PLAYGROUND // ACTIVE INSPECTION
        </div>
        <div className="p-4 font-[family-name:var(--font-editor)] text-xs text-[color:var(--forge-muted)] leading-relaxed">
          This script file is being statically analyzed. You can write custom scripting operations like <code className="text-[color:var(--forge-fg)]">set name = "x"</code> or <code className="text-[color:var(--forge-fg)]">define square(n)</code>.
          The inspector lists live state values from declarations below.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Variables Table */}
        <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
          <div className="border-b border-[color:var(--forge-border)] bg-[color:var(--forge-surface2)] px-3 py-1.5 font-[family-name:var(--font-editor)] text-[11px] uppercase tracking-wider text-[color:var(--forge-muted)]">
            State Memory (set)
          </div>
          <div className="p-0 overflow-x-auto">
            {analysis.variables.length === 0 ? (
              <div className="p-4 font-[family-name:var(--font-editor)] text-xs text-[color:var(--forge-muted)] italic">
                No variables declared in code.
              </div>
            ) : (
              <table className="w-full text-left font-[family-name:var(--font-editor)] text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[color:var(--forge-border)] bg-black/10 text-[10px] text-[color:var(--forge-muted)] uppercase">
                    <th className="px-3 py-2">Variable</th>
                    <th className="px-3 py-2">Value</th>
                    <th className="px-3 py-2 text-right">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.variables.map((v) => (
                    <tr
                      key={v.name}
                      onClick={() => onSelectLine(v.lineNumber)}
                      className="border-b border-[color:var(--forge-border)] hover:bg-[color:var(--forge-hover)] cursor-pointer transition"
                    >
                      <td className="px-3 py-2 font-bold text-[color:var(--forge-fg)]">{v.name}</td>
                      <td className="px-3 py-2 font-mono text-[color:var(--forge-muted)] truncate max-w-[150px]">{v.value}</td>
                      <td className="px-3 py-2 text-right text-[10px] text-[color:var(--forge-muted)]">{v.lineNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Functions Table */}
        <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
          <div className="border-b border-[color:var(--forge-border)] bg-[color:var(--forge-surface2)] px-3 py-1.5 font-[family-name:var(--font-editor)] text-[11px] uppercase tracking-wider text-[color:var(--forge-muted)]">
            Active Methods (define)
          </div>
          <div className="p-0 overflow-x-auto">
            {analysis.functions.length === 0 ? (
              <div className="p-4 font-[family-name:var(--font-editor)] text-xs text-[color:var(--forge-muted)] italic">
                No custom functions defined.
              </div>
            ) : (
              <table className="w-full text-left font-[family-name:var(--font-editor)] text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[color:var(--forge-border)] bg-black/10 text-[10px] text-[color:var(--forge-muted)] uppercase">
                    <th className="px-3 py-2">Function</th>
                    <th className="px-3 py-2">Signature</th>
                    <th className="px-3 py-2 text-right">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.functions.map((f) => (
                    <tr
                      key={f.name}
                      onClick={() => onSelectLine(f.lineNumber)}
                      className="border-b border-[color:var(--forge-border)] hover:bg-[color:var(--forge-hover)] cursor-pointer transition"
                    >
                      <td className="px-3 py-2 font-bold text-[color:var(--forge-fg)]">{f.name}()</td>
                      <td className="px-3 py-2 font-mono text-[color:var(--forge-muted)]">
                        ({f.params.join(", ")})
                      </td>
                      <td className="px-3 py-2 text-right text-[10px] text-[color:var(--forge-muted)]">{f.lineNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col bg-[color:var(--forge-bg)] text-[color:var(--forge-fg)]">
      {/* Visual Workspace header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--forge-border)] bg-[color:var(--forge-surface)] px-4 py-2 select-none border-t md:border-t-0">
        <span className="font-[family-name:var(--font-editor)] text-[10px] tracking-[0.2em] uppercase text-[color:var(--forge-muted)]">
          VISUAL INSPECTOR // {fileName.toUpperCase()}
        </span>
        <span className="font-[family-name:var(--font-editor)] text-[9px] tracking-wide text-[color:var(--forge-muted)] flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
          SYNCHRONIZED
        </span>
      </div>

      {/* Main rendering area */}
      <div className="forge-scrollbar flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence mode="popLayout">
          {analysis.sections.length === 0 && (analysis.variables.length > 0 || analysis.functions.length > 0) ? (
            <motion.div
              key="playground"
              initial={{ opacity: 0, y: 5, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.99 }}
              transition={{ duration: 0.3 }}
            >
              <PlaygroundInspector />
            </motion.div>
          ) : analysis.sections.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-[60%] flex-col items-center justify-center font-[family-name:var(--font-editor)] text-xs text-[color:var(--forge-muted)] text-center max-w-[280px] mx-auto space-y-2 select-none"
            >
              <div className="font-bold text-[13px] text-[color:var(--forge-fg)] uppercase tracking-widest">Empty Workspace</div>
              <div>Write a natural exploration command (like <code className="text-[color:var(--forge-fg)] font-bold">show projects</code>) to render components here, or write scripting variables.</div>
            </motion.div>
          ) : (
            analysis.sections.map((section, idx) => {
              const key = `${section.type}-${section.lineNumber}`;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  className="space-y-4"
                >
                  {section.type === "discover" && <WelcomeDiscover line={section.lineNumber} />}
                  {section.type === "about" && <AboutIdentity line={section.lineNumber} />}
                  {section.type === "projects" && <ProjectsGrid line={section.lineNumber} />}
                  {section.type === "inspect" && <ProjectsGrid line={section.lineNumber} />}
                  {section.type === "skills" && <SkillsModules line={section.lineNumber} />}
                  {section.type === "experience" && <ExperienceTimeline line={section.lineNumber} />}
                  {section.type === "contact" && <ContactConsole line={section.lineNumber} />}
                  {section.type === "stats" && <VisitorStats line={section.lineNumber} />}
                  {section.type === "unknown" && (
                    <div className="border border-[color:var(--forge-border)] bg-[color:var(--forge-surface)]">
                      <SectionHeader title={`UNRESOLVED SYMBOL // ${section.param?.toUpperCase() || "UNKNOWN"}`} line={section.lineNumber} />
                      <div className="p-4 font-[family-name:var(--font-editor)] text-xs text-[color:var(--forge-muted)] italic">
                        Command raw text: "{section.rawText}". Component renderer not configured for this parameter.
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

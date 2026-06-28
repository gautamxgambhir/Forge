"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with a status line to print in the terminal */
  onResult: (lines: string[]) => void;
}

type Step = "name" | "email" | "subject" | "message" | "sending" | "done" | "error";

const PROMPT_LABELS: Record<Step, string> = {
  name:    "Your name",
  email:   "Your email",
  subject: "Subject",
  message: "Your message",
  sending: "",
  done:    "",
  error:   "",
};

export const ContactModal = ({ open, onClose, onResult }: ContactModalProps) => {
  const [step,    setStep]    = useState<Step>("name");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [err,     setErr]     = useState("");
  const inputRef  = useRef<HTMLInputElement>(null);
  const textaRef  = useRef<HTMLTextAreaElement>(null);

  // Honeypot field state
  const [website, setWebsite] = useState("");

  // Telemetry state
  const [openedAt, setOpenedAt] = useState(0);
  const [firstKeystrokeAt, setFirstKeystrokeAt] = useState<number | null>(null);
  const [keystrokesCount, setKeystrokesCount] = useState(0);
  const [mouseMovements, setMouseMovements] = useState(0);
  const [focusBlurCount, setFocusBlurCount] = useState(0);
  const [typingIntervals, setTypingIntervals] = useState<number[]>([]);
  const lastKeyTimeRef = useRef<number | null>(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setStep("name");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setErr("");
      setWebsite("");
      
      // Initialize telemetry
      setOpenedAt(Date.now());
      setFirstKeystrokeAt(null);
      setKeystrokesCount(0);
      setMouseMovements(0);
      setFocusBlurCount(0);
      setTypingIntervals([]);
      lastKeyTimeRef.current = null;
    }
  }, [open]);

  // Auto-focus on step change
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (step === "message") textaRef.current?.focus();
      else inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [step, open]);

  if (!open) return null;

  // ── Telemetry Collectors ─────────────────────

  const handleInputChange = (value: string, setter: (val: string) => void) => {
    setter(value);
    setErr("");
    
    const now = Date.now();
    if (firstKeystrokeAt === null) {
      setFirstKeystrokeAt(now);
    }
    setKeystrokesCount((prev) => prev + 1);

    if (lastKeyTimeRef.current !== null) {
      const diff = now - lastKeyTimeRef.current;
      // Cap individual keypress interval at 5000ms to avoid skewing average for pauses
      const cappedDiff = Math.min(diff, 5000);
      setTypingIntervals((prev) => [...prev.slice(-49), cappedDiff]);
    }
    lastKeyTimeRef.current = now;
  };

  const handleFocusBlur = () => {
    setFocusBlurCount((prev) => prev + 1);
  };

  // ── Validation ──────────────────────────────

  const validateCurrent = (): string | null => {
    if (step === "name") {
      if (!name.trim()) return "Name cannot be empty.";
      if (name.trim().length < 2) return "Name must be at least 2 characters.";
      if (name.trim().length > 80) return "Name cannot exceed 80 characters.";
    }
    if (step === "email") {
      if (!email.trim()) return "Email cannot be empty.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email address.";
    }
    if (step === "subject") {
      if (!subject.trim()) return "Subject cannot be empty.";
      if (subject.trim().length < 5) return "Subject must be at least 5 characters.";
      if (subject.trim().length > 120) return "Subject cannot exceed 120 characters.";
    }
    if (step === "message") {
      if (!message.trim()) return "Message cannot be empty.";
      if (message.trim().length < 30) return "Message must be at least 30 characters.";
      if (message.trim().length > 3000) return "Message cannot exceed 3000 characters.";
    }
    return null;
  };

  // ── Advance / submit ────────────────────────

  const handleNext = async () => {
    const validationErr = validateCurrent();
    if (validationErr) { setErr(validationErr); return; }
    setErr("");

    if (step === "name")    { setStep("email");   return; }
    if (step === "email")   { setStep("subject"); return; }
    if (step === "subject") { setStep("message"); return; }
    if (step === "message") {
      setStep("sending");
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: name.trim(), 
            email: email.trim(), 
            subject: subject.trim(),
            message: message.trim(),
            website: website.trim(),
            behavior: {
              openedAt,
              firstKeystrokeAt,
              keystrokesCount,
              mouseMovements,
              focusBlurCount,
              typingIntervals,
            }
          }),
        });
        const data = await res.json() as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setErr(data.error ?? "Failed to send. Please email directly.");
          setStep("error");
          return;
        }
        setStep("done");
        onResult([
          "",
          "  ╔════════════════════════════════════════╗",
          "  ║  MESSAGE SENT                         ║",
          "  ╚════════════════════════════════════════╝",
          "",
          `  From     ${name.trim()}`,
          `  Email    ${email.trim()}`,
          `  Subject  ${subject.trim()}`,
          "",
          "  Gautam will reply within 24 hours.",
          "  ggambhir1919@gmail.com",
          "",
        ]);
      } catch {
        setErr("Network error. Please email ggambhir1919@gmail.com directly.");
        setStep("error");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    // Ctrl+Enter submits message textarea; Enter advances all other steps
    if (e.key === "Enter" && (step !== "message" || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleNext();
    }
  };

  // ── Render ──────────────────────────────────

  const stepNum = { name: 1, email: 2, subject: 3, message: 4, sending: 4, done: 4, error: 4 }[step];
  const isFinal = step === "sending" || step === "done" || step === "error";

  return (
    <AnimatePresence>
      <motion.div
        key="contact-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="absolute inset-0 z-[400] flex items-center justify-center bg-black/75"
        onClick={() => { if (step !== "sending") onClose(); }}
      >
        <motion.div
          key="contact-panel"
          initial={{ opacity: 0, scale: 0.97, y: -8 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{ opacity: 0,    scale: 0.97, y: -8  }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          onMouseMove={() => setMouseMovements((m) => m + 1)}
          className="w-full max-w-md border border-[color:var(--forge-border)] bg-[#0a0a0a] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
        >
          {/* Invisible Honeypot Field */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            autoComplete="off"
            tabIndex={-1}
            className="absolute opacity-0 pointer-events-none -z-10 w-0 h-0"
          />

          {/* Header */}
          <div className="mb-1 font-[family-name:var(--font-editor)] text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            contact
          </div>
          <div className="mb-5 font-[family-name:var(--font-editor)] text-[11px] text-zinc-500">
            {!isFinal && (
              <span>
                Step {stepNum} / 4 &nbsp;·&nbsp; {PROMPT_LABELS[step]}
              </span>
            )}
            {step === "sending" && <span>Sending message...</span>}
            {step === "done"    && <span className="text-zinc-300">Message sent.</span>}
            {step === "error"   && <span className="text-zinc-400">Something went wrong.</span>}
          </div>

          {/* Progress dots */}
          <div className="mb-5 flex gap-1.5">
            {[1,2,3,4].map((n) => (
              <div
                key={n}
                className={`h-[2px] flex-1 transition-all ${
                  stepNum >= n ? "bg-white" : "bg-zinc-800"
                }`}
              />
            ))}
          </div>

          {/* ── Fields ── */}

          {step === "name" && (
            <div className="mb-4 space-y-1.5">
              <label className="block font-[family-name:var(--font-editor)] text-[11px] text-zinc-500">
                What's your name?
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => handleInputChange(e.target.value, setName)}
                onFocus={handleFocusBlur}
                onBlur={handleFocusBlur}
                placeholder="Ada Lovelace"
                className="w-full border border-[color:var(--forge-border)] bg-black px-3 py-2 font-[family-name:var(--font-editor)] text-[12px] text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500"
                spellCheck={false}
              />
            </div>
          )}

          {step === "email" && (
            <div className="mb-4 space-y-1.5">
              <label className="block font-[family-name:var(--font-editor)] text-[11px] text-zinc-500">
                Your email address
              </label>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => handleInputChange(e.target.value, setEmail)}
                onFocus={handleFocusBlur}
                onBlur={handleFocusBlur}
                placeholder="ada@example.com"
                className="w-full border border-[color:var(--forge-border)] bg-black px-3 py-2 font-[family-name:var(--font-editor)] text-[12px] text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500"
                spellCheck={false}
              />
            </div>
          )}

          {step === "subject" && (
            <div className="mb-4 space-y-1.5">
              <label className="block font-[family-name:var(--font-editor)] text-[11px] text-zinc-500">
                Subject
              </label>
              <input
                ref={inputRef}
                type="text"
                value={subject}
                onChange={(e) => handleInputChange(e.target.value, setSubject)}
                onFocus={handleFocusBlur}
                onBlur={handleFocusBlur}
                placeholder="Project Inquiry"
                className="w-full border border-[color:var(--forge-border)] bg-black px-3 py-2 font-[family-name:var(--font-editor)] text-[12px] text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500"
                spellCheck={false}
              />
            </div>
          )}

          {step === "message" && (
            <div className="mb-4 space-y-1.5">
              <label className="block font-[family-name:var(--font-editor)] text-[11px] text-zinc-500">
                Your message &nbsp;·&nbsp; Ctrl+Enter to send
              </label>
              <textarea
                ref={textaRef}
                value={message}
                onChange={(e) => handleInputChange(e.target.value, setMessage)}
                onFocus={handleFocusBlur}
                onBlur={handleFocusBlur}
                placeholder="Hey Gautam, I'd love to..."
                rows={5}
                className="w-full resize-none border border-[color:var(--forge-border)] bg-black px-3 py-2 font-[family-name:var(--font-editor)] text-[12px] text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500"
                spellCheck={false}
              />
            </div>
          )}

          {step === "sending" && (
            <div className="mb-4 py-4 text-center font-[family-name:var(--font-editor)] text-[11px] text-zinc-500">
              Sending...
            </div>
          )}

          {step === "done" && (
            <div className="mb-4 space-y-1 py-2 font-[family-name:var(--font-editor)] text-[11px]">
              <div className="text-zinc-300">Message delivered to Gautam.</div>
              <div className="text-zinc-600">He'll reply at <span className="text-zinc-400">{email}</span> within 24 hrs.</div>
            </div>
          )}

          {step === "error" && (
            <div className="mb-4 py-2 font-[family-name:var(--font-editor)] text-[11px] text-zinc-400">
              {err || "Unknown error."}<br />
              <span className="text-zinc-600">Email directly: ggambhir1919@gmail.com</span>
            </div>
          )}

          {/* Error message */}
          {err && step !== "error" && (
            <div className="mb-3 font-[family-name:var(--font-editor)] text-[11px] text-zinc-400">
              {err}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between gap-2">
            {step !== "sending" && (
              <button
                type="button"
                onClick={onClose}
                className="border border-[color:var(--forge-border)] px-3 py-1.5 font-[family-name:var(--font-editor)] text-[11px] uppercase tracking-wide text-zinc-600 transition hover:border-zinc-500 hover:text-white"
              >
                {step === "done" || step === "error" ? "Close" : "Cancel"}
              </button>
            )}

            {!isFinal && (
              <button
                type="button"
                onClick={handleNext}
                className="ml-auto border border-white bg-white px-4 py-1.5 font-[family-name:var(--font-editor)] text-[11px] uppercase tracking-wide text-black transition hover:bg-zinc-200"
              >
                {step === "message" ? "Send" : "Next →"}
              </button>
            )}

            {step === "done" && (
              <div className="ml-auto font-[family-name:var(--font-editor)] text-[11px] text-zinc-500">
                Check terminal for confirmation
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

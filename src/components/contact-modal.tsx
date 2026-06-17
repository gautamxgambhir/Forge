"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with a status line to print in the terminal */
  onResult: (lines: string[]) => void;
}

type Step = "name" | "email" | "message" | "sending" | "done" | "error";

const PROMPT_LABELS: Record<Step, string> = {
  name:    "Your name",
  email:   "Your email",
  message: "Your message",
  sending: "",
  done:    "",
  error:   "",
};

export const ContactModal = ({ open, onClose, onResult }: ContactModalProps) => {
  const [step,    setStep]    = useState<Step>("name");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [err,     setErr]     = useState("");
  const inputRef  = useRef<HTMLInputElement>(null);
  const textaRef  = useRef<HTMLTextAreaElement>(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setStep("name");
      setName("");
      setEmail("");
      setMessage("");
      setErr("");
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

  // ── Validation ──────────────────────────────

  const validateCurrent = (): string | null => {
    if (step === "name" && !name.trim())    return "Name cannot be empty.";
    if (step === "email") {
      if (!email.trim()) return "Email cannot be empty.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email address.";
    }
    if (step === "message" && !message.trim()) return "Message cannot be empty.";
    return null;
  };

  // ── Advance / submit ────────────────────────

  const handleNext = async () => {
    const validationErr = validateCurrent();
    if (validationErr) { setErr(validationErr); return; }
    setErr("");

    if (step === "name")    { setStep("email");   return; }
    if (step === "email")   { setStep("message"); return; }
    if (step === "message") {
      setStep("sending");
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
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

  const stepNum = { name: 1, email: 2, message: 3, sending: 3, done: 3, error: 3 }[step];
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
          className="w-full max-w-md border border-[color:var(--forge-border)] bg-[#0a0a0a] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95)]"
        >
          {/* Header */}
          <div className="mb-1 font-[family-name:var(--font-editor)] text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            contact
          </div>
          <div className="mb-5 font-[family-name:var(--font-editor)] text-[11px] text-zinc-500">
            {!isFinal && (
              <span>
                Step {stepNum} / 3 &nbsp;·&nbsp; {PROMPT_LABELS[step]}
              </span>
            )}
            {step === "sending" && <span>Sending message...</span>}
            {step === "done"    && <span className="text-zinc-300">Message sent.</span>}
            {step === "error"   && <span className="text-zinc-400">Something went wrong.</span>}
          </div>

          {/* Progress dots */}
          <div className="mb-5 flex gap-1.5">
            {[1,2,3].map((n) => (
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
                onChange={(e) => { setName(e.target.value); setErr(""); }}
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
                onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                placeholder="ada@example.com"
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
                onChange={(e) => { setMessage(e.target.value); setErr(""); }}
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

"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Status = "approved" | "pending" | "spam" | "archived";

interface Submission {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  timestamp: number;
  ip: string;
  spam_score: number;
  status: Status;
  reason?: string;
  raw_behavior?: string;
}

interface SystemLog {
  id: number;
  timestamp: number;
  ip: string;
  action: string;
  reason: string;
  spam_score: number;
}

interface IpReputation {
  ip: string;
  legitimate_count: number;
  spam_count: number;
  score: number;
  ban_expires_at: number;
  ban_count: number;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "logs" | "bans">("messages");
  
  // Data states
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [bans, setBans] = useState<IpReputation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);

  // Filters & detail views
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Check session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("admin_token");
    if (saved) {
      setToken(saved);
    }
  }, []);

  // Fetch data when authenticated or when activeTab changes
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let url = "/api/admin";
        if (activeTab === "logs") url += "?type=logs";
        else if (activeTab === "bans") url += "?type=banned";

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            handleLogout();
            setAuthError("Session expired. Please log in again.");
          } else {
            const data = await res.json() as { error?: string };
            alert(data.error ?? "Failed to fetch data");
          }
          return;
        }

        const data = await res.json();
        if (activeTab === "messages") {
          setSubmissions(data.submissions || []);
        } else if (activeTab === "logs") {
          setLogs(data.logs || []);
        } else if (activeTab === "bans") {
          setBans(data.bannedIps || []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    if (!password) return;

    try {
      // Test the password by doing a quick fetch
      const res = await fetch("/api/admin", {
        headers: {
          Authorization: `Bearer ${password}`,
        },
      });

      if (res.ok) {
        setToken(password);
        sessionStorage.setItem("admin_token", password);
      } else {
        setAuthError("Invalid admin password. Try again.");
      }
    } catch {
      setAuthError("Connection error.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setPassword("");
    sessionStorage.removeItem("admin_token");
    setSubmissions([]);
    setLogs([]);
    setBans([]);
  };

  const executeAction = async (action: "approve" | "mark_spam" | "delete" | "unban", param: number | string) => {
    if (!token) return;
    setActionLoading(param);

    try {
      const payload: { action: string; id?: number; ip?: string } = { action };
      if (typeof param === "number") payload.id = param;
      else payload.ip = param;

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        alert(data.error ?? "Operation failed");
        return;
      }

      // Refresh corresponding state locally or refetch
      if (action === "delete") {
        setSubmissions((prev) => prev.filter((s) => s.id !== param));
        if (selectedSub?.id === param) setSelectedSub(null);
      } else if (action === "approve") {
        setSubmissions((prev) => 
          prev.map((s) => s.id === param ? { ...s, status: "approved" as const } : s)
        );
        if (selectedSub?.id === param) {
          setSelectedSub((prev) => prev ? { ...prev, status: "approved" as const } : null);
        }
      } else if (action === "mark_spam") {
        setSubmissions((prev) => 
          prev.map((s) => s.id === param ? { ...s, status: "spam" as const } : s)
        );
        if (selectedSub?.id === param) {
          setSelectedSub((prev) => prev ? { ...prev, status: "spam" as const } : null);
        }
      } else if (action === "unban") {
        setBans((prev) => prev.filter((b) => b.ip !== param));
      }
    } catch (err) {
      console.error("Action execution failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper stats
  const totalSubmissions = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const spamCount = submissions.filter((s) => s.status === "spam").length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;

  const filteredSubmissions = submissions.filter((s) => {
    if (statusFilter === "all") return true;
    return s.status === statusFilter;
  });

  // Render Login Panel
  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-zinc-800 selection:text-white font-[family-name:var(--font-jetbrains-mono)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(24,24,27,0.8)_0%,rgba(0,0,0,1)_80%)] z-0" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 w-full max-w-sm border border-zinc-800 bg-zinc-950/60 backdrop-blur-md p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
        >
          <div className="text-center mb-6">
            <h1 className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-2">forge // security</h1>
            <p className="text-[10px] text-zinc-600 uppercase">Authorized administrator access only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1.5">
                Admin Credentials
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••"
                className="w-full bg-black border border-zinc-800 px-3 py-2 text-[12px] text-white outline-none focus:border-zinc-500 placeholder:text-zinc-800 font-sans"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-[11px] text-red-500 font-mono text-center">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-white text-black py-2 text-[11px] uppercase tracking-wider font-semibold border border-white hover:bg-zinc-200 transition"
            >
              Access Console
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-[family-name:var(--font-jetbrains-mono)] selection:bg-zinc-800 selection:text-white flex flex-col">
      {/* Top Banner */}
      <header className="border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="font-[family-name:var(--font-pixelify)] text-lg tracking-wider text-white">
              FORGE <span className="text-zinc-600">//</span> ADMIN
            </span>
            <span className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gradient-to-r from-white to-transparent" />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-zinc-500 uppercase border border-zinc-850 px-2 py-0.5 rounded-full bg-zinc-950">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
            Secure Node Session
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="text-[10px] uppercase border border-zinc-800 hover:border-zinc-600 hover:text-white px-3 py-1.5 transition text-zinc-500"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Navigation / Control panel */}
        <aside className="w-full md:w-60 border-r border-zinc-900 bg-zinc-950/20 p-4 space-y-6">
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2 px-2">Console Navigation</div>
            
            <button
              onClick={() => { setActiveTab("messages"); setSelectedSub(null); }}
              className={`w-full text-left px-3 py-2 text-[11px] uppercase tracking-wide transition flex items-center justify-between ${
                activeTab === "messages"
                  ? "bg-zinc-900 text-white font-medium border-l border-white"
                  : "text-zinc-500 hover:bg-zinc-950 hover:text-zinc-300"
              }`}
            >
              <span>Submissions</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab("logs"); setSelectedSub(null); }}
              className={`w-full text-left px-3 py-2 text-[11px] uppercase tracking-wide transition ${
                activeTab === "logs"
                  ? "bg-zinc-900 text-white font-medium border-l border-white"
                  : "text-zinc-500 hover:bg-zinc-950 hover:text-zinc-300"
              }`}
            >
              System Logs
            </button>

            <button
              onClick={() => { setActiveTab("bans"); setSelectedSub(null); }}
              className={`w-full text-left px-3 py-2 text-[11px] uppercase tracking-wide transition ${
                activeTab === "bans"
                  ? "bg-zinc-900 text-white font-medium border-l border-white"
                  : "text-zinc-500 hover:bg-zinc-950 hover:text-zinc-300"
              }`}
            >
              IP Reputation
            </button>
          </div>

          <hr className="border-zinc-900" />

          {/* Quick Metrics */}
          {activeTab === "messages" && (
            <div className="space-y-3">
              <div className="text-[9px] uppercase tracking-wider text-zinc-600 px-2">Database Stats</div>
              <div className="grid grid-cols-2 gap-2 px-2 text-[10px]">
                <div>
                  <div className="text-zinc-500 uppercase text-[9px]">Total</div>
                  <div className="text-white text-sm font-semibold">{totalSubmissions}</div>
                </div>
                <div>
                  <div className="text-emerald-500 uppercase text-[9px]">Approved</div>
                  <div className="text-white text-sm font-semibold">{approvedCount}</div>
                </div>
                <div>
                  <div className="text-amber-500 uppercase text-[9px]">Pending</div>
                  <div className="text-white text-sm font-semibold">{pendingCount}</div>
                </div>
                <div>
                  <div className="text-red-500 uppercase text-[9px]">Spam</div>
                  <div className="text-white text-sm font-semibold">{spamCount}</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Dashboard Panels */}
        <main className="flex-1 p-6 overflow-x-hidden flex flex-col">
          
          {/* loading indicator */}
          {loading && (
            <div className="py-12 flex items-center justify-center gap-2 text-zinc-500 text-[11px] uppercase">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
              Loading console records...
            </div>
          )}

          {!loading && activeTab === "messages" && (
            <div className="flex-1 flex flex-col lg:flex-row gap-6">
              {/* Message table section */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Filters */}
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                  <span className="text-[10px] text-zinc-650 uppercase tracking-wider mr-2">Filter:</span>
                  {(["all", "approved", "pending", "spam", "archived"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`text-[9px] uppercase px-2.5 py-1 tracking-wider transition ${
                        statusFilter === status
                          ? "bg-zinc-800 text-white font-medium border border-zinc-700"
                          : "text-zinc-500 hover:text-zinc-350 bg-zinc-950/40 border border-zinc-900/60"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Submissions table */}
                <div className="flex-1 border border-zinc-900 bg-zinc-950/10 overflow-x-auto min-h-[300px]">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-950/60 text-[9px] uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-3 font-semibold">Sender</th>
                        <th className="px-4 py-3 font-semibold">Subject</th>
                        <th className="px-4 py-3 font-semibold text-center">Spam Score</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40">
                      {filteredSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-zinc-600 uppercase text-[10px]">
                            No inquiries found matching filter
                          </td>
                        </tr>
                      ) : (
                        filteredSubmissions.map((sub) => {
                          const isSelected = selectedSub?.id === sub.id;
                          return (
                            <tr
                              key={sub.id}
                              onClick={() => setSelectedSub(sub)}
                              className={`cursor-pointer hover:bg-zinc-950 transition ${
                                isSelected ? "bg-zinc-900/40 text-white" : ""
                              }`}
                            >
                              <td className="px-4 py-3 font-medium">
                                <div className="font-semibold">{sub.name}</div>
                                <div className="text-[9px] text-zinc-500">{sub.email}</div>
                              </td>
                              <td className="px-4 py-3 truncate max-w-[200px] text-zinc-350">
                                {sub.subject}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${
                                  sub.spam_score >= 70
                                    ? "bg-red-500/10 text-red-500 border border-red-550/20"
                                    : sub.spam_score >= 40
                                    ? "bg-amber-500/10 text-amber-500 border border-amber-550/20"
                                    : "bg-emerald-500/10 text-emerald-500 border border-emerald-550/20"
                                }`}>
                                  {sub.spam_score}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[9px] uppercase tracking-wide px-2 py-0.5 inline-block ${
                                  sub.status === "approved"
                                    ? "text-emerald-400 bg-emerald-950/30 border border-emerald-900/50"
                                    : sub.status === "pending"
                                    ? "text-amber-400 bg-amber-950/30 border border-amber-900/50"
                                    : "text-red-400 bg-red-950/30 border border-red-900/50"
                                }`}>
                                  {sub.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-zinc-500 text-[10px]">
                                {new Date(sub.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Message Details overlay/sidebar */}
              <AnimatePresence>
                {selectedSub && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="w-full lg:w-[420px] border border-zinc-900 bg-zinc-950/80 p-5 space-y-5 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Header details */}
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                        <div className="text-[10px] uppercase text-zinc-500">Inquiry Telemetry</div>
                        <button
                          onClick={() => setSelectedSub(null)}
                          className="text-[10px] hover:text-white uppercase text-zinc-600"
                        >
                          [Close]
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[11px] border-b border-zinc-900 pb-3">
                        <div>
                          <div className="text-[9px] text-zinc-500 uppercase">From</div>
                          <div className="text-white font-semibold truncate">{selectedSub.name}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-zinc-500 uppercase">Email</div>
                          <div className="text-zinc-350 truncate hover:text-white transition">
                            <a href={`mailto:${selectedSub.email}`}>{selectedSub.email}</a>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-zinc-550 uppercase">Sender IP</div>
                          <div className="text-zinc-400 font-mono">{selectedSub.ip}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-zinc-550 uppercase">Inquiry ID</div>
                          <div className="text-zinc-400 font-mono">#{selectedSub.id}</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[9px] text-zinc-550 uppercase">Subject</div>
                        <div className="text-white font-medium">{selectedSub.subject}</div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[9px] text-zinc-550 uppercase">Message Body</div>
                        <div className="bg-black/80 border border-zinc-900 p-3 text-[11.5px] leading-relaxed text-zinc-300 font-sans whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {selectedSub.message}
                        </div>
                      </div>

                      {/* Spam telemetry summary */}
                      <div className="bg-zinc-950 border border-zinc-900 p-3 space-y-2 text-[10px]">
                        <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                          <span className="uppercase text-zinc-500 font-semibold">Spam Scoring System</span>
                          <span className={`font-mono px-1 rounded ${
                            selectedSub.spam_score >= 70
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : selectedSub.spam_score >= 40
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}>
                            Score: {selectedSub.spam_score}/100
                          </span>
                        </div>

                        {selectedSub.reason && (
                          <div>
                            <span className="text-zinc-600 block mb-0.5">Scoring Flags:</span>
                            <span className="text-zinc-400 block font-mono">{selectedSub.reason}</span>
                          </div>
                        )}

                        {selectedSub.raw_behavior && (
                          <div className="pt-1.5 border-t border-zinc-900/60">
                            <span className="text-zinc-650 block mb-1">Interaction Data:</span>
                            <div className="grid grid-cols-2 gap-y-1 font-mono text-[9px] text-zinc-400">
                              {(() => {
                                try {
                                  const behavior = JSON.parse(selectedSub.raw_behavior);
                                  const opened = behavior.openedAt || 0;
                                  const firstKey = behavior.firstKeystrokeAt || 0;
                                  const telemetrySeconds = opened && firstKey ? ((firstKey - opened) / 1000).toFixed(1) + "s" : "N/A";
                                  const avgInterval = behavior.typingIntervals && behavior.typingIntervals.length > 0
                                    ? (behavior.typingIntervals.reduce((a: number, b: number) => a + b, 0) / behavior.typingIntervals.length).toFixed(1) + "ms"
                                    : "N/A";

                                  return (
                                    <>
                                      <div>Keys Pressed: <span className="text-white">{behavior.keystrokesCount ?? 0}</span></div>
                                      <div>Mouse Move: <span className="text-white">{behavior.mouseMovements ?? 0}</span></div>
                                      <div>Focus/Blur: <span className="text-white">{behavior.focusBlurCount ?? 0}</span></div>
                                      <div>Avg Interval: <span className="text-white">{avgInterval}</span></div>
                                      <div>Start Typing: <span className="text-white">{telemetrySeconds}</span></div>
                                    </>
                                  );
                                } catch {
                                  return <div className="col-span-2 text-zinc-600">Corrupted JSON metadata</div>;
                                }
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="border-t border-zinc-900 pt-4 flex gap-2">
                      {selectedSub.status !== "approved" && (
                        <button
                          onClick={() => executeAction("approve", selectedSub.id)}
                          disabled={actionLoading === selectedSub.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-semibold py-2 transition disabled:opacity-50"
                        >
                          {actionLoading === selectedSub.id ? "Approving..." : "Approve"}
                        </button>
                      )}
                      
                      {selectedSub.status !== "spam" && (
                        <button
                          onClick={() => executeAction("mark_spam", selectedSub.id)}
                          disabled={actionLoading === selectedSub.id}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] uppercase font-semibold py-2 transition disabled:opacity-50"
                        >
                          {actionLoading === selectedSub.id ? "Marking Spam..." : "Mark Spam"}
                        </button>
                      )}

                      <button
                        onClick={() => executeAction("delete", selectedSub.id)}
                        disabled={actionLoading === selectedSub.id}
                        className="bg-red-650 hover:bg-red-750 text-white text-[10px] uppercase px-3 py-2 transition disabled:opacity-50"
                        title="Delete Inquiry"
                      >
                        Delete
                      </button>

                      <a
                        href={`mailto:${selectedSub.email}?subject=Re: ${encodeURIComponent(selectedSub.subject)}`}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] uppercase px-3 py-2 flex items-center justify-center transition"
                        title="Reply via Mail"
                      >
                        Reply
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* System logs view */}
          {!loading && activeTab === "logs" && (
            <div className="flex-1 border border-zinc-900 bg-zinc-950/10 overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/60 text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Security Action</th>
                    <th className="px-4 py-3">Reason / Details</th>
                    <th className="px-4 py-3 text-center">Trigger Score</th>
                    <th className="px-4 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-600 uppercase text-[10px]">
                        No system audit logs recorded
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-950/60 transition">
                        <td className="px-4 py-3 font-mono text-white">{log.ip}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-semibold ${
                            log.action === "ip_ban"
                              ? "bg-red-950 text-red-400 border border-red-900/40"
                              : log.action === "rate_limit"
                              ? "bg-amber-950 text-amber-400 border border-amber-900/40"
                              : log.action === "spam_rejected"
                              ? "bg-orange-950 text-orange-400 border border-orange-900/40"
                              : "bg-zinc-900 text-zinc-400"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-350 font-mono text-[10.5px]">
                          {log.reason}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold">
                          {log.spam_score > 0 ? log.spam_score : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-550 text-[10px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Banned IPs view */}
          {!loading && activeTab === "bans" && (
            <div className="flex-1 border border-zinc-900 bg-zinc-950/10 overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/60 text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                    <th className="px-4 py-3">Banned IP</th>
                    <th className="px-4 py-3 text-center">Legit count</th>
                    <th className="px-4 py-3 text-center">Spam count</th>
                    <th className="px-4 py-3 text-center">Reputation Score</th>
                    <th className="px-4 py-3">Ban Remaining</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {bans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 uppercase text-[10px]">
                        No active IP bans on record
                      </td>
                    </tr>
                  ) : (
                    bans.map((ban) => {
                      const msLeft = ban.ban_expires_at - Date.now();
                      const hoursLeft = Math.max(0, msLeft / (1000 * 60 * 60));
                      
                      return (
                        <tr key={ban.ip} className="hover:bg-zinc-950/60 transition">
                          <td className="px-4 py-3 font-mono font-bold text-white">{ban.ip}</td>
                          <td className="px-4 py-3 text-center font-mono text-emerald-450">
                            {ban.legitimate_count}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-red-450">
                            {ban.spam_count}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            <span className={ban.score < 0 ? "text-red-450" : "text-emerald-450"}>
                              {ban.score}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-red-400 font-semibold font-mono text-[10px]">
                            {hoursLeft > 24 
                              ? `${(hoursLeft / 24).toFixed(1)} days remaining`
                              : `${hoursLeft.toFixed(1)} hours remaining`
                            }
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => executeAction("unban", ban.ip)}
                              disabled={actionLoading === ban.ip}
                              className="text-[9px] uppercase border border-zinc-800 hover:border-zinc-550 hover:bg-zinc-900 hover:text-white px-2.5 py-1 transition disabled:opacity-50 text-zinc-400"
                            >
                              {actionLoading === ban.ip ? "Revoking..." : "Revoke Ban"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

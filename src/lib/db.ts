import { createClient } from "@supabase/supabase-js";

export interface Submission {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  timestamp: number;
  ip: string;
  spam_score: number;
  status: 'approved' | 'pending' | 'spam' | 'archived';
  reason?: string;
  raw_behavior?: string;
}

export interface SystemLog {
  id: number;
  timestamp: number;
  ip: string;
  action: string;
  reason: string;
  spam_score: number;
}

export interface IpReputation {
  ip: string;
  legitimate_count: number;
  spam_count: number;
  score: number;
  ban_expires_at: number;
  ban_count: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Supabase credentials missing from process.env");
}

// Create Supabase client using the service role key to bypass RLS for secure server actions
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

export async function checkRateLimit(ip: string): Promise<{ limitExceeded: boolean; errorMsg?: string }> {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  try {
    // Count submissions in last hour
    const { count: hourCount, error: hourErr } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .gt("timestamp", oneHourAgo);

    if (hourErr) throw hourErr;

    // Count submissions in last day
    const { count: dayCount, error: dayErr } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .gt("timestamp", oneDayAgo);

    if (dayErr) throw dayErr;

    const hc = hourCount ?? 0;
    const dc = dayCount ?? 0;

    if (hc >= 3) {
      return { limitExceeded: true, errorMsg: "Too many submissions. Maximum 3 submissions per hour." };
    }
    if (dc >= 10) {
      return { limitExceeded: true, errorMsg: "Too many submissions. Maximum 10 submissions per day." };
    }
  } catch (err) {
    console.error("Rate limit check failed:", err);
  }

  return { limitExceeded: false };
}

export async function getIpReputation(ip: string): Promise<IpReputation> {
  try {
    const { data, error } = await supabase
      .from("ip_reputation")
      .select("*")
      .eq("ip", ip)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as IpReputation;
  } catch (err) {
    console.error("Failed to fetch IP reputation:", err);
  }

  return {
    ip,
    legitimate_count: 0,
    spam_count: 0,
    score: 0,
    ban_expires_at: 0,
    ban_count: 0
  };
}

export async function isIpBanned(ip: string): Promise<{ banned: boolean; expiresAt: number }> {
  const rep = await getIpReputation(ip);
  const now = Date.now();
  if (rep.ban_expires_at > now) {
    return { banned: true, expiresAt: rep.ban_expires_at };
  }
  return { banned: false, expiresAt: 0 };
}

export async function updateIpReputation(ip: string, isSpam: boolean): Promise<IpReputation> {
  const rep = await getIpReputation(ip);

  let legitimateCount = rep.legitimate_count;
  let spamCount = rep.spam_count;
  let score = rep.score;
  let banExpiresAt = rep.ban_expires_at;
  let banCount = rep.ban_count;

  if (isSpam) {
    spamCount += 1;
    score -= 20;
    
    // Auto-ban on every 5 spam attempts
    if (spamCount >= 5 && spamCount % 5 === 0) {
      banCount += 1;
      const banDurationMs = 24 * 60 * 60 * 1000 * banCount;
      banExpiresAt = Date.now() + banDurationMs;
    }
  } else {
    legitimateCount += 1;
    score += 5;
    if (score > 100) score = 100;
  }

  const updatedRep = {
    ip,
    legitimate_count: legitimateCount,
    spam_count: spamCount,
    score,
    ban_expires_at: banExpiresAt,
    ban_count: banCount
  };

  try {
    const { error } = await supabase
      .from("ip_reputation")
      .upsert(updatedRep);

    if (error) throw error;
  } catch (err) {
    console.error("Failed to upsert IP reputation:", err);
  }

  return updatedRep;
}

export async function unbanIp(ip: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("ip_reputation")
      .update({ ban_expires_at: 0 })
      .eq("ip", ip);

    if (error) throw error;
  } catch (err) {
    console.error("Failed to unban IP:", err);
  }
}

export async function insertSubmission(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  ip: string;
  spamScore: number;
  status: 'approved' | 'pending' | 'spam' | 'archived';
  reason?: string;
  rawBehavior?: string;
}): Promise<number> {
  try {
    const { data: inserted, error } = await supabase
      .from("submissions")
      .insert({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        timestamp: Date.now(),
        ip: data.ip,
        spam_score: data.spamScore,
        status: data.status,
        reason: data.reason ?? null,
        raw_behavior: data.rawBehavior ?? null
      })
      .select("id")
      .single();

    if (error) throw error;
    return inserted ? Number(inserted.id) : 0;
  } catch (err) {
    console.error("Failed to insert submission:", err);
    return 0;
  }
}

export async function insertLog(data: {
  ip: string;
  action: string;
  reason: string;
  spamScore: number;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from("logs")
      .insert({
        timestamp: Date.now(),
        ip: data.ip,
        action: data.action,
        reason: data.reason,
        spam_score: data.spamScore
      });

    if (error) throw error;
  } catch (err) {
    console.error("Failed to insert log:", err);
  }
}

export async function getRecentSubmissions(sinceMs: number): Promise<Submission[]> {
  try {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .gt("timestamp", sinceMs)
      .order("timestamp", { ascending: false });

    if (error) throw error;
    return (data || []) as Submission[];
  } catch (err) {
    console.error("Failed to fetch recent submissions:", err);
    return [];
  }
}

export async function getAllSubmissions(): Promise<Submission[]> {
  try {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) throw error;
    return (data || []) as Submission[];
  } catch (err) {
    console.error("Failed to fetch all submissions:", err);
    return [];
  }
}

export async function getLogs(): Promise<SystemLog[]> {
  try {
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(500);

    if (error) throw error;
    return (data || []) as SystemLog[];
  } catch (err) {
    console.error("Failed to fetch logs:", err);
    return [];
  }
}

export async function getBannedIps(): Promise<IpReputation[]> {
  const now = Date.now();
  try {
    const { data, error } = await supabase
      .from("ip_reputation")
      .select("*")
      .gt("ban_expires_at", now)
      .order("ban_expires_at", { ascending: false });

    if (error) throw error;
    return (data || []) as IpReputation[];
  } catch (err) {
    console.error("Failed to fetch banned IPs:", err);
    return [];
  }
}

export async function updateSubmissionStatus(id: number, status: 'approved' | 'pending' | 'spam' | 'archived'): Promise<void> {
  try {
    const { error } = await supabase
      .from("submissions")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
  } catch (err) {
    console.error("Failed to update submission status:", err);
  }
}

export async function deleteSubmission(id: number): Promise<void> {
  try {
    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (err) {
    console.error("Failed to delete submission:", err);
  }
}

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { 
  supabase,
  getAllSubmissions, 
  getLogs, 
  getBannedIps, 
  updateSubmissionStatus, 
  deleteSubmission, 
  updateIpReputation,
  unbanIp,
  Submission
} from "@/lib/db";

export const runtime = "nodejs";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

function authenticate(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") || req.headers.get("x-admin-password");
  if (!authHeader) return false;
  
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
  return token === ADMIN_PASSWORD;
}

export async function GET(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "logs") {
      const logs = await getLogs();
      return NextResponse.json({ logs });
    }
    
    if (type === "banned") {
      const bannedIps = await getBannedIps();
      return NextResponse.json({ bannedIps });
    }

    const submissions = await getAllSubmissions();
    return NextResponse.json({ submissions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch admin data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, id, ip } = body;

  try {
    if (action === "approve") {
      if (typeof id !== "number") {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      // Fetch submission details first from Supabase
      const { data: sub, error: getErr } = await supabase
        .from("submissions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (getErr) throw getErr;
      if (!sub) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      // If it wasn't approved, send the email notification now
      if (sub.status !== "approved") {
        const apiKey = process.env.RESEND_API_KEY;
        if (apiKey && apiKey !== "re_your_key_here") {
          try {
            const resend = new Resend(apiKey);
            await resend.emails.send({
              from: "FORGE Contact <onboarding@resend.dev>",
              to: "ggambhir1919@gmail.com",
              replyTo: sub.email,
              subject: `FORGE — ${sub.subject} (from ${sub.name}) [ADMIN APPROVED]`,
              html: `
                <div style="font-family:monospace;font-size:14px;color:#111;max-width:560px">
                  <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#10b981">
                    New message via FORGE (Approved by Admin)
                  </p>
                  <table style="border-collapse:collapse;width:100%">
                    <tr>
                      <td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap">Name</td>
                      <td style="padding:6px 0">${sub.name}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap">Email</td>
                      <td style="padding:6px 0">
                        <a href="mailto:${sub.email}" style="color:#111">${sub.email}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap">Subject</td>
                      <td style="padding:6px 0">${sub.subject}</td>
                    </tr>
                  </table>
                  <hr style="border:none;border-top:1px solid #e4e4e4;margin:16px 0"/>
                  <p style="white-space:pre-wrap;margin:0">${sub.message}</p>
                </div>
              `,
            });
          } catch (err) {
            console.error("Resend email failed:", err);
          }
        }
      }

      // Update status on Supabase
      await updateSubmissionStatus(id, "approved");
      
      // Improve sender IP reputation
      await updateIpReputation(sub.ip, false);

      return NextResponse.json({ ok: true });
    }

    if (action === "mark_spam") {
      if (typeof id !== "number") {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }

      const { data: sub } = await supabase
        .from("submissions")
        .select("ip")
        .eq("id", id)
        .maybeSingle();

      await updateSubmissionStatus(id, "spam");

      if (sub) {
        // Decrease reputation as it's spam
        await updateIpReputation(sub.ip, true);
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      if (typeof id !== "number") {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
      }
      await deleteSubmission(id);
      return NextResponse.json({ ok: true });
    }

    if (action === "unban") {
      if (typeof ip !== "string") {
        return NextResponse.json({ error: "Invalid IP" }, { status: 400 });
      }
      await unbanIp(ip);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Action execution failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

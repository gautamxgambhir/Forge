import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing RESEND_API_KEY" },
      { status: 500 },
    );
  }

  // Lazy-init inside the handler so the module loads fine at build time
  const resend = new Resend(apiKey);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, message } = body as {
    name?: string;
    email?: string;
    message?: string;
  };

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "name, email and message are required" },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "FORGE Contact <onboarding@resend.dev>",
      to:   "ggambhir1919@gmail.com",
      replyTo: email.trim(),
      subject: `FORGE — message from ${name.trim()}`,
      html: `
        <div style="font-family:monospace;font-size:14px;color:#111;max-width:560px">
          <p style="margin:0 0 16px;font-size:18px;font-weight:bold">
            New message via FORGE
          </p>
          <table style="border-collapse:collapse;width:100%">
            <tr>
              <td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap">Name</td>
              <td style="padding:6px 0">${name.trim()}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap">Email</td>
              <td style="padding:6px 0">
                <a href="mailto:${email.trim()}" style="color:#111">${email.trim()}</a>
              </td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #e4e4e4;margin:16px 0"/>
          <p style="white-space:pre-wrap;margin:0">${message.trim()}</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

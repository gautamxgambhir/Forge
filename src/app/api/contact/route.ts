import { NextResponse } from "next/server";
import { SenderKit } from "@senderkit/sdk";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = process.env.SENDERKIT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: missing SENDERKIT_API_KEY" },
      { status: 500 },
    );
  }

  // Lazy-init inside the handler so the module loads fine with no env var at build time
  const senderkit = new SenderKit({ apiKey });

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

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  try {
    const result = await senderkit.send({
      template: "contact",          // template name on SenderKit dashboard
      to: "ggambhir1919@gmail.com", // your inbox
      vars: {
        sender_name:    name.trim(),
        sender_email:   email.trim(),
        sender_message: message.trim(),
      },
    });

    return NextResponse.json({ ok: true, id: result.id }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

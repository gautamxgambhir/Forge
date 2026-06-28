import { NextResponse } from "next/server";
import { Resend } from "resend";
import { 
  checkRateLimit, 
  isIpBanned, 
  insertSubmission, 
  insertLog, 
  updateIpReputation 
} from "@/lib/db";
import { isDisposableEmail } from "@/lib/disposable-emails";
import { detectSpam } from "@/lib/spam-detector";

export const runtime = "nodejs";

// RFC-compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export async function POST(req: Request) {
  // Extract client IP address
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
             req.headers.get("x-real-ip")?.trim() || 
             "127.0.0.1";

  // 1. IP Ban Check (Silent Spam Trap)
  const banStatus = await isIpBanned(ip);
  if (banStatus.banned) {
    return NextResponse.json(
      { 
        ok: true, 
        message: "Thanks for reaching out! I've received your message and will get back to you as soon as possible." 
      }, 
      { status: 200 }
    );
  }

  // 2. Rate Limiting Check
  const rateLimitStatus = await checkRateLimit(ip);
  if (rateLimitStatus.limitExceeded) {
    await insertLog({
      ip,
      action: "rate_limit",
      reason: rateLimitStatus.errorMsg ?? "Rate limit exceeded",
      spamScore: 0
    });
    return NextResponse.json(
      { error: rateLimitStatus.errorMsg ?? "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, email, subject, message, website, behavior } = body;

  // 3. Basic Validation Checks
  if (
    typeof name !== "string" || 
    typeof email !== "string" || 
    typeof subject !== "string" || 
    typeof message !== "string"
  ) {
    return NextResponse.json({ error: "All fields must be strings." }, { status: 400 });
  }

  const nameVal = name.trim();
  const emailVal = email.trim();
  const subjectVal = subject.trim();
  const messageVal = message.trim();
  const websiteVal = (website || "").trim();

  // Name validation
  if (nameVal.length < 2 || nameVal.length > 80) {
    return NextResponse.json({ error: "Name must be between 2 and 80 characters." }, { status: 400 });
  }

  // Email validation
  if (!EMAIL_REGEX.test(emailVal)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  // Subject validation
  if (subjectVal.length < 5 || subjectVal.length > 120) {
    return NextResponse.json({ error: "Subject must be between 5 and 120 characters." }, { status: 400 });
  }

  // Message validation
  if (messageVal.length < 30 || messageVal.length > 3000) {
    return NextResponse.json({ error: "Message must be between 30 and 3000 characters." }, { status: 400 });
  }

  // 4. Disposable Email Check (Immediate Reject with helpful message)
  if (isDisposableEmail(emailVal)) {
    // Store in DB as spam first
    await insertSubmission({
      name: nameVal,
      email: emailVal,
      subject: subjectVal,
      message: messageVal,
      ip,
      spamScore: 60,
      status: "spam",
      reason: "Disposable email address rejected",
      rawBehavior: JSON.stringify(behavior || {})
    });

    await updateIpReputation(ip, true);

    await insertLog({
      ip,
      action: "disposable_email_blocked",
      reason: `Blocked disposable domain for email: ${emailVal}`,
      spamScore: 60
    });

    return NextResponse.json(
      { error: "Temporary email addresses aren't supported. Please use your personal email, or contact me directly at ggambhir1919@gmail.com" },
      { status: 400 }
    );
  }

  // 5. Run Spam Scoring Engine
  const detection = await detectSpam({
    name: nameVal,
    email: emailVal,
    subject: subjectVal,
    message: messageVal,
    website: websiteVal,
    behavior,
    ip
  });

  // 6. Save Submission to Database
  await insertSubmission({
    name: nameVal,
    email: emailVal,
    subject: subjectVal,
    message: messageVal,
    ip,
    spamScore: detection.score,
    status: detection.status,
    reason: detection.reasonDetails,
    rawBehavior: JSON.stringify(behavior || {})
  });

  // 7. Update IP Reputation and Handle Action
  if (detection.status === "approved") {
    // Build reputation for legit user
    await updateIpReputation(ip, false);

    // Send email notification
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey !== "re_your_key_here") {
      try {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: "FORGE Contact <onboarding@resend.dev>",
          to: "ggambhir1919@gmail.com",
          replyTo: emailVal,
          subject: `FORGE — ${subjectVal} (from ${nameVal})`,
          html: `
            <div style="font-family:monospace;font-size:14px;color:#111;max-width:560px">
              <p style="margin:0 0 16px;font-size:18px;font-weight:bold">
                New message via FORGE
              </p>
              <table style="border-collapse:collapse;width:100%">
                <tr>
                  <td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap">Name</td>
                  <td style="padding:6px 0">${nameVal}</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap">Email</td>
                  <td style="padding:6px 0">
                    <a href="mailto:${emailVal}" style="color:#111">${emailVal}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 12px 6px 0;color:#555;white-space:nowrap">Subject</td>
                  <td style="padding:6px 0">${subjectVal}</td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #e4e4e4;margin:16px 0"/>
              <p style="white-space:pre-wrap;margin:0">${messageVal}</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Resend email failed:", err);
      }
    } else {
      console.warn("Resend API key is missing or default. Skipped email notification.");
    }

    return NextResponse.json(
      { 
        ok: true, 
        message: "Thanks for reaching out! I've received your message and will get back to you as soon as possible." 
      }, 
      { status: 200 }
    );
  } else {
    // Decrease reputation for spammer/suspicious user
    const updatedRep = await updateIpReputation(ip, true);

    // Log the rejected spam attempt
    await insertLog({
      ip,
      action: detection.status === "spam" ? "spam_rejected" : "spam_review",
      reason: detection.reasonDetails || `Flagged with score ${detection.score}`,
      spamScore: detection.score
    });

    // Check if they got banned
    if (updatedRep.ban_expires_at > Date.now()) {
      await insertLog({
        ip,
        action: "ip_ban",
        reason: `IP temporarily banned for 24h * ${updatedRep.ban_count} due to repeated spam.`,
        spamScore: detection.score
      });
    }

    // 8. Return helpful error message for blocked submissions
    return NextResponse.json(
      { 
        error: "Your message couldn't be sent due to spam filters. Please email me directly at ggambhir1919@gmail.com if you'd like to get in touch.",
        score: detection.score,
        reasons: detection.reasons.slice(0, 2) // Show first 2 reasons for transparency
      }, 
      { status: 400 }
    );
  }
}

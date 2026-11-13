/**
 * Email dispatch via Resend's HTTP API (no SDK dependency).
 * No-ops gracefully when RESEND_API_KEY is unset (local dev).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; detail?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Upstay <noreply@example.com>";
  if (!apiKey) {
    console.log(`[email:dry-run] to=${opts.to} subject="${opts.subject}"`);
    return { ok: true, detail: "dry-run (RESEND_API_KEY unset)" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, detail: `Resend HTTP ${res.status}: ${detail.slice(0, 300)}` };
  }
  return { ok: true };
}

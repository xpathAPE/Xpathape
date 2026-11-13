/**
 * SMS dispatch via Twilio's REST API (no SDK dependency).
 * No-ops gracefully when Twilio credentials are unset (local dev).
 */
export async function sendSms(opts: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; detail?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.log(`[sms:dry-run] to=${opts.to} body="${opts.body.slice(0, 80)}..."`);
    return { ok: true, detail: "dry-run (Twilio env unset)" };
  }
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: opts.to, From: from, Body: opts.body }),
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, detail: `Twilio HTTP ${res.status}: ${detail.slice(0, 300)}` };
  }
  return { ok: true };
}

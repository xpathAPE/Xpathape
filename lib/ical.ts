/**
 * Minimal iCalendar (RFC 5545) parser for Airbnb/VRBO reservation feeds.
 * Airbnb iCal exports use VALUE=DATE for DTSTART/DTEND and put the
 * reservation URL + phone last digits in DESCRIPTION. Blocked/unavailable
 * ranges are exported with summaries like "Airbnb (Not available)".
 */

export interface IcalEvent {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
}

/** Unfold folded lines (continuation lines start with space or tab). */
function unfold(text: string): string[] {
  const raw = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseIcsDate(value: string): Date | null {
  // 20250101 (VALUE=DATE)
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  // 20250101T120000Z or 20250101T120000
  m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  }
  return null;
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

export function parseIcs(text: string): IcalEvent[] {
  const lines = unfold(text);
  const events: IcalEvent[] = [];
  let current: Partial<IcalEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.uid && current.start && current.end) {
        events.push({
          uid: current.uid,
          summary: current.summary ?? "",
          description: current.description ?? "",
          start: current.start,
          end: current.end,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const keyPart = line.slice(0, colon); // e.g. DTSTART;VALUE=DATE
    const value = line.slice(colon + 1);
    const key = keyPart.split(";")[0].toUpperCase();

    switch (key) {
      case "UID":
        current.uid = value.trim();
        break;
      case "SUMMARY":
        current.summary = unescapeText(value.trim());
        break;
      case "DESCRIPTION":
        current.description = unescapeText(value.trim());
        break;
      case "DTSTART": {
        const d = parseIcsDate(value.trim());
        if (d) current.start = d;
        break;
      }
      case "DTEND": {
        const d = parseIcsDate(value.trim());
        if (d) current.end = d;
        break;
      }
    }
  }
  return events;
}

const BLOCKED_SUMMARIES = [/not available/i, /blocked/i, /unavailable/i];

/** True when the event represents a real guest reservation (not a calendar block). */
export function isReservationEvent(event: IcalEvent): boolean {
  return !BLOCKED_SUMMARIES.some((re) => re.test(event.summary));
}

/** Extract a guest display name from an Airbnb summary like "Reserved - John (HMABCDE123)". */
export function guestNameFromSummary(summary: string): string | null {
  const m = /^(?:Reserved|Booking)\s*-\s*([^(]+)/i.exec(summary);
  if (m) return m[1].trim();
  if (/^reserved$/i.test(summary.trim())) return null;
  return null;
}

export async function fetchIcs(url: string): Promise<IcalEvent[]> {
  const res = await fetch(url, {
    headers: { Accept: "text/calendar, text/plain, */*" },
    // Avoid Next.js fetch caching for calendar feeds
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`iCal fetch failed: HTTP ${res.status}`);
  return parseIcs(await res.text());
}

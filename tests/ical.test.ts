import { describe, expect, it } from "vitest";
import { guestNameFromSummary, isReservationEvent, parseIcs } from "../lib/ical";

const SAMPLE_ICS = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTSTAMP:20260101T000000Z",
  "DTSTART;VALUE=DATE:20260210",
  "DTEND;VALUE=DATE:20260214",
  "UID:1404805a-res1@airbnb.com",
  "SUMMARY:Reserved - Alex (HMABCDE123)",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/de",
  " tails/HMABCDE123\\nPhone Number (Last 4 Digits): 1234",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTAMP:20260101T000000Z",
  "DTSTART;VALUE=DATE:20260220",
  "DTEND;VALUE=DATE:20260228",
  "UID:1404805a-block@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcs", () => {
  it("parses events with folded lines and VALUE=DATE dates", () => {
    const events = parseIcs(SAMPLE_ICS);
    expect(events).toHaveLength(2);
    expect(events[0].uid).toBe("1404805a-res1@airbnb.com");
    expect(events[0].start.toISOString()).toBe("2026-02-10T00:00:00.000Z");
    expect(events[0].end.toISOString()).toBe("2026-02-14T00:00:00.000Z");
    expect(events[0].description).toContain("details/HMABCDE123");
  });

  it("parses datetime format", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:x@y",
      "SUMMARY:Reserved",
      "DTSTART:20260301T140000Z",
      "DTEND:20260305T100000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    const events = parseIcs(ics);
    expect(events).toHaveLength(1);
    expect(events[0].start.toISOString()).toBe("2026-03-01T14:00:00.000Z");
  });
});

describe("isReservationEvent", () => {
  it("keeps real reservations and drops blocks", () => {
    const events = parseIcs(SAMPLE_ICS);
    expect(isReservationEvent(events[0])).toBe(true);
    expect(isReservationEvent(events[1])).toBe(false);
  });
});

describe("guestNameFromSummary", () => {
  it("extracts the first name from Airbnb summaries", () => {
    expect(guestNameFromSummary("Reserved - Alex (HMABCDE123)")).toBe("Alex");
  });
  it("returns null for bare summaries", () => {
    expect(guestNameFromSummary("Reserved")).toBeNull();
  });
});

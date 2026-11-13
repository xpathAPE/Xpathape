import { describe, expect, it } from "vitest";
import {
  computeApplicationFeeCents,
  computeItemTotalCents,
  nightsBetween,
  withinLeadTime,
} from "../lib/pricing";

describe("nightsBetween", () => {
  it("counts whole nights", () => {
    expect(
      nightsBetween(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-05T00:00:00Z"))
    ).toBe(4);
  });
  it("never returns less than 1", () => {
    expect(
      nightsBetween(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T06:00:00Z"))
    ).toBe(1);
  });
});

describe("computeItemTotalCents", () => {
  const ctx = { nights: 4, guests: 3 };
  it("flat fee is per stay", () => {
    expect(computeItemTotalCents("FLAT", 5000, ctx)).toBe(5000);
  });
  it("per-night multiplies nights", () => {
    expect(computeItemTotalCents("PER_NIGHT", 3000, ctx)).toBe(12000);
  });
  it("per-guest multiplies guests", () => {
    expect(computeItemTotalCents("PER_GUEST", 1500, ctx)).toBe(4500);
  });
  it("quantity multiplies all pricing types", () => {
    expect(computeItemTotalCents("FLAT", 4000, { ...ctx, quantity: 2 })).toBe(8000);
    expect(computeItemTotalCents("PER_NIGHT", 1000, { ...ctx, quantity: 2 })).toBe(8000);
  });
});

describe("computeApplicationFeeCents", () => {
  it("applies the given percent", () => {
    expect(computeApplicationFeeCents(10000, 4)).toBe(400);
  });
  it("rounds to nearest cent", () => {
    expect(computeApplicationFeeCents(999, 3)).toBe(30);
  });
});

describe("withinLeadTime", () => {
  const checkIn = new Date("2026-06-01T16:00:00Z");
  it("allows purchase with no cutoff", () => {
    expect(withinLeadTime(null, checkIn, new Date("2026-06-01T15:59:00Z"))).toBe(true);
  });
  it("blocks purchase inside the cutoff window", () => {
    expect(withinLeadTime(12, checkIn, new Date("2026-06-01T05:00:00Z"))).toBe(false);
  });
  it("allows purchase outside the cutoff window", () => {
    expect(withinLeadTime(12, checkIn, new Date("2026-05-31T12:00:00Z"))).toBe(true);
  });
});

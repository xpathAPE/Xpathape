import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/stripe";
import { sendEmail } from "@/lib/messaging/email";
import { sendSms } from "@/lib/messaging/sms";
import { renderTemplate } from "@/lib/messaging/templates";
import { sendPmsMessage } from "@/lib/pms";
import type { MessageChannel, TriggerType } from "@prisma/client";

const HOURS = 60 * 60 * 1000;

/**
 * Evaluate all enabled message triggers against upcoming reservations and
 * dispatch any that are due. Idempotent: MessageLog has a unique constraint
 * per (reservation, triggerType, channel), so each message sends at most once.
 *
 * Trigger semantics (from the product spec):
 *  - BOOKING_CONFIRMED: as soon as a reservation is created/synced.
 *  - PRE_CHECKIN_72H: within 72h of check-in.
 *  - CHECKOUT_MORNING: on the checkout date, only when the calendar shows no
 *    same-day turnover for that listing (late-checkout gap detection).
 */
export async function dispatchDueMessages(now: Date = new Date()) {
  const results: Array<{
    reservationId: string;
    trigger: TriggerType;
    channel: MessageChannel;
    status: string;
  }> = [];

  const triggers = await prisma.messageTrigger.findMany({
    where: { enabled: true },
    include: { host: true },
  });
  if (triggers.length === 0) return results;

  // Group triggers by host for one reservation scan per host.
  const byHost = new Map<string, typeof triggers>();
  for (const t of triggers) {
    const list = byHost.get(t.hostId) ?? [];
    list.push(t);
    byHost.set(t.hostId, list);
  }

  for (const [hostId, hostTriggers] of byHost) {
    const host = hostTriggers[0].host;
    // Reservations that could still need any message: checkout today or later.
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const reservations = await prisma.reservation.findMany({
      where: {
        listing: { hostId, active: true },
        checkOut: { gte: startOfToday },
      },
      include: { listing: true, messageLogs: true },
    });

    for (const reservation of reservations) {
      for (const trigger of hostTriggers) {
        const alreadySent = reservation.messageLogs.some(
          (l) => l.triggerType === trigger.type && l.channel === trigger.channel
        );
        if (alreadySent) continue;
        if (!(await isTriggerDue(trigger.type, reservation, now))) continue;

        const storefrontUrl = appUrl(`/s/${reservation.storefrontToken}`);
        const { subject, body } = renderTemplate(
          trigger.type,
          {
            guestName: reservation.guestName ?? "there",
            listingName: reservation.listing.name,
            storefrontUrl,
            hostName: host.name,
            checkIn: reservation.checkIn.toISOString().slice(0, 10),
            checkOut: reservation.checkOut.toISOString().slice(0, 10),
          },
          trigger.template
        );

        let status = "skipped";
        let detail: string | undefined;

        if (trigger.channel === "EMAIL") {
          if (reservation.guestEmail) {
            const r = await sendEmail({ to: reservation.guestEmail, subject, text: body });
            status = r.ok ? "sent" : "failed";
            detail = r.detail;
          } else {
            detail = "no guest email on reservation";
          }
        } else if (trigger.channel === "SMS") {
          if (reservation.guestPhone) {
            const r = await sendSms({ to: reservation.guestPhone, body });
            status = r.ok ? "sent" : "failed";
            detail = r.detail;
          } else {
            detail = "no guest phone on reservation";
          }
        } else if (trigger.channel === "PMS") {
          const r = await sendPmsMessage(hostId, reservation, body);
          status = r.ok ? "sent" : "failed";
          detail = r.detail;
        }

        await prisma.messageLog.create({
          data: {
            reservationId: reservation.id,
            triggerType: trigger.type,
            channel: trigger.channel,
            status,
            detail,
          },
        });
        results.push({
          reservationId: reservation.id,
          trigger: trigger.type,
          channel: trigger.channel,
          status,
        });
      }
    }
  }
  return results;
}

async function isTriggerDue(
  type: TriggerType,
  reservation: {
    id: string;
    listingId: string;
    checkIn: Date;
    checkOut: Date;
    createdAt: Date;
  },
  now: Date
): Promise<boolean> {
  switch (type) {
    case "BOOKING_CONFIRMED":
      // Send once the reservation exists, while the stay is still ahead.
      return now < reservation.checkOut;
    case "PRE_CHECKIN_72H": {
      const windowStart = new Date(reservation.checkIn.getTime() - 72 * HOURS);
      return now >= windowStart && now < reservation.checkIn;
    }
    case "CHECKOUT_MORNING": {
      // Same UTC date as checkout, before checkout time (date-only feeds → midnight UTC,
      // so compare by calendar day).
      const sameDay = now.toISOString().slice(0, 10) === reservation.checkOut.toISOString().slice(0, 10);
      if (!sameDay) return false;
      // Gap detection: skip when another reservation checks in the same day (turnover).
      const turnover = await prisma.reservation.findFirst({
        where: {
          listingId: reservation.listingId,
          id: { not: reservation.id },
          checkIn: {
            gte: new Date(reservation.checkOut.toISOString().slice(0, 10) + "T00:00:00.000Z"),
            lt: new Date(reservation.checkOut.getTime() + 24 * HOURS),
          },
        },
      });
      return !turnover;
    }
  }
}

/// <reference lib="deno.unstable" />

const kv = await Deno.openKv("./lucas/lucas.db");

const PRICES: Record<number, number> = { 3: 100, 6: 180, 9: 225, 12: 275 };
const DEPOSIT_AMOUNT = 20;
const RADICALE_DIR = "/var/lib/radicale/collections/collection-root/lucas/studio";
const STUDIO_EMAIL = "lucasweolopez@gmail.com";
const ZELLE_RECIPIENT = "lucasweolopez@gmail.com";
const TIMEZONE = "America/New_York";
const SITE_URL = "https://lucas.weolopez.com";

const LUCAS_RESEND_API_KEY = Deno.env.get("LUCAS_RESEND_API_KEY") || "";
const RESEND_FROM = "Weo's Studio <studio@weolopez.com>";

interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  date: string;          // YYYY-MM-DD
  startTime: string;     // HH:MM (24h)
  durationHours: number;
  status: string;        // "pending_deposit" | "confirmed" | "paid" | "cancelled"
  depositToken: string;
  paymentToken?: string; // set when artist triggers full-payment notification
  createdAt: number;
}

const JSON_H = { "Content-Type": "application/json" };

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function offsetDate(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function addHoursToTime(startTime: string, hours: number): { time: string; dayOffset: number } {
  const totalMins = timeToMinutes(startTime) + hours * 60;
  const dayOffset = Math.floor(totalMins / 1440);
  const rem = totalMins % 1440;
  const h = Math.floor(rem / 60);
  const m = rem % 60;
  return {
    time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    dayOffset,
  };
}

async function getBookingsByDate(date: string): Promise<Booking[]> {
  const results: Booking[] = [];
  for await (const r of kv.list<Booking>({ prefix: ["lucas_booking_date", date] })) {
    results.push(r.value);
  }
  return results;
}

async function getAllBookings(): Promise<Booking[]> {
  const results: Booking[] = [];
  for await (const r of kv.list<Booking>({ prefix: ["lucas_booking"] })) {
    results.push(r.value);
  }
  return results;
}

function parseIcalBlock(ics: string, date: string): Array<{ start: number; end: number }> {
  const blocks: Array<{ start: number; end: number }> = [];
  const events = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  for (const ev of events) {
    const dtstart = ev.match(/DTSTART(?:;[^\r\n:]*)?:([^\r\n]+)/)?.[1]?.trim();
    const dtend = ev.match(/DTEND(?:;[^\r\n:]*)?:([^\r\n]+)/)?.[1]?.trim();
    if (!dtstart || !dtend) continue;

    const parseVal = (val: string): { date: string; mins: number | null } | null => {
      if (/^\d{8}$/.test(val)) {
        return { date: `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`, mins: null };
      }
      const m = val.match(/^(\d{8})T(\d{2})(\d{2})/);
      if (m) return { date: `${m[1].slice(0,4)}-${m[1].slice(4,6)}-${m[1].slice(6,8)}`, mins: parseInt(m[2]) * 60 + parseInt(m[3]) };
      return null;
    };

    const start = parseVal(dtstart);
    const end = parseVal(dtend);
    if (!start || !end) continue;

    if (start.mins === null) {
      if (date >= start.date && date < end.date) {
        blocks.push({ start: 0, end: 1440 });
      }
    } else {
      if (start.date === date && end.date === date) {
        blocks.push({ start: start.mins, end: end.mins ?? 1440 });
      } else if (start.date === date && end.date > date) {
        blocks.push({ start: start.mins, end: 1440 });
      } else if (start.date < date && end.date === date) {
        blocks.push({ start: 0, end: end.mins ?? 0 });
      } else if (start.date < date && end.date > date) {
        blocks.push({ start: 0, end: 1440 });
      }
    }
  }
  return blocks;
}

async function getCalendarBlocks(date: string): Promise<Array<{ start: number; end: number }>> {
  const blocks: Array<{ start: number; end: number }> = [];
  try {
    for await (const entry of Deno.readDir(RADICALE_DIR)) {
      if (!entry.name.endsWith(".ics")) continue;
      const content = await Deno.readTextFile(`${RADICALE_DIR}/${entry.name}`);
      blocks.push(...parseIcalBlock(content, date));
    }
  } catch { /* collection not yet created — no blocks */ }
  return blocks;
}

async function hasOverlap(date: string, startTime: string, durationHours: number): Promise<boolean> {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + durationHours * 60;

  for (const b of await getCalendarBlocks(date)) {
    if (newStart < b.end && b.start < newEnd) return true;
  }

  // pending_deposit bookings block time just like confirmed ones
  for (const b of await getBookingsByDate(date)) {
    if (b.status === "cancelled") continue;
    const bStart = timeToMinutes(b.startTime);
    const bEnd = bStart + b.durationHours * 60;
    if (newStart < bEnd && bStart < newEnd) return true;
  }

  for (const b of await getBookingsByDate(offsetDate(date, -1))) {
    if (b.status === "cancelled") continue;
    const bStart = timeToMinutes(b.startTime);
    const bEnd = bStart + b.durationHours * 60;
    if (bEnd > 1440 && newStart < bEnd - 1440) return true;
  }

  if (newEnd > 1440) {
    const spillEnd = newEnd - 1440;
    for (const b of await getBookingsByDate(offsetDate(date, 1))) {
      if (b.status === "cancelled") continue;
      if (timeToMinutes(b.startTime) < spillEnd) return true;
    }
  }

  return false;
}

function icalDatetime(date: string, time: string): string {
  const [y, mo, d] = date.split("-");
  const [h, m] = time.split(":");
  return `${y}${mo}${d}T${h}${m}00`;
}

function generateIcal(bookings: Booking[]): string {
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Weo's Studio//Booking System//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Weo's Studio Sessions",
    `X-WR-TIMEZONE:${TIMEZONE}`,
  ];

  for (const b of bookings) {
    const { time: endTime, dayOffset } = addHoursToTime(b.startTime, b.durationHours);
    const endDate = dayOffset > 0 ? offsetDate(b.date, dayOffset) : b.date;
    const price = PRICES[b.durationHours] ?? "?";
    const isPending = b.status === "pending_deposit";
    const isPaid = b.status === "paid";
    const summaryPrefix = isPending ? "[PENDING] " : isPaid ? "[PAID] " : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@lucas.weolopez.com`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${TIMEZONE}:${icalDatetime(b.date, b.startTime)}`,
      `DTEND;TZID=${TIMEZONE}:${icalDatetime(endDate, endTime)}`,
      `SUMMARY:${summaryPrefix}Studio Session — ${b.clientName}`,
      `DESCRIPTION:Client: ${b.clientEmail}\\nDuration: ${b.durationHours}hrs\\nTotal: $${price}\\nStatus: ${b.status}`,
      `STATUS:${isPending ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function formatDateLong(date: string): string {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!LUCAS_RESEND_API_KEY) {
    console.log(`[Lucas Email] Resend not configured — logging\nTo: ${to}\nSubject: ${subject}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LUCAS_RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[Lucas Email] Resend failed:", JSON.stringify(data));
    } else {
      console.log(`[Lucas Email] Sent via Resend to ${to} (id: ${data.id})`);
    }
  } catch (err) {
    console.error("[Lucas Email] Resend error:", err);
  }
}

async function sendDepositEmails(booking: Booking): Promise<void> {
  const price = PRICES[booking.durationHours] ?? 0;
  const balance = price - DEPOSIT_AMOUNT;
  const dateStr = formatDateLong(booking.date);
  const { time: endTime } = addHoursToTime(booking.startTime, booking.durationHours);
  const startFmt = formatTime12h(booking.startTime);
  const endFmt = formatTime12h(endTime);
  const confirmUrl = `${SITE_URL}/lucas/api/bookings/${booking.id}/confirm?token=${booking.depositToken}`;

  const studioHtml = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
<h2 style="color:#c4481a;margin-bottom:8px">Deposit Request — ${booking.clientName}</h2>
<p style="color:#666;margin-bottom:24px">An artist has requested a session and will be sending a $${DEPOSIT_AMOUNT} deposit via Zelle to hold the slot.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:10px 0;color:#888;width:130px;border-bottom:1px solid #eee">Client</td><td style="padding:10px 0;font-weight:600;border-bottom:1px solid #eee">${booking.clientName}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Email</td><td style="padding:10px 0;border-bottom:1px solid #eee">${booking.clientEmail}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Date</td><td style="padding:10px 0;border-bottom:1px solid #eee">${dateStr}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee">${startFmt} – ${endFmt}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Duration</td><td style="padding:10px 0;border-bottom:1px solid #eee">${booking.durationHours} hours</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Session Total</td><td style="padding:10px 0;font-weight:600;border-bottom:1px solid #eee">$${price}</td></tr>
<tr><td style="padding:10px 0;color:#888">Deposit</td><td style="padding:10px 0;font-weight:700;color:#c4481a;font-size:18px">$${DEPOSIT_AMOUNT}</td></tr>
</table>
<div style="margin-top:32px;text-align:center">
<p style="color:#666;font-size:14px;margin-bottom:20px">Once you've received $${DEPOSIT_AMOUNT} from <strong>${booking.clientName}</strong> via Zelle, click the button below to confirm and lock the session:</p>
<a href="${confirmUrl}" style="display:inline-block;background:#c4481a;color:#fff;text-decoration:none;padding:18px 40px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.05em">✓ Confirm $${DEPOSIT_AMOUNT} Deposit Received</a>
</div>
<p style="margin-top:20px;color:#999;font-size:11px;text-align:center">Only click after you've confirmed the $${DEPOSIT_AMOUNT} Zelle payment from ${booking.clientName}.</p>
</div>`;

  const clientHtml = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
<h2 style="color:#c4481a;margin-bottom:8px">Your Session is Pending — Send $${DEPOSIT_AMOUNT} Deposit</h2>
<p style="color:#666;margin-bottom:24px">Hey ${booking.clientName}, your slot is held! Send your $${DEPOSIT_AMOUNT} deposit via Zelle to lock it in. The studio will confirm within 24 hours.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:10px 0;color:#888;width:130px;border-bottom:1px solid #eee">Date</td><td style="padding:10px 0;font-weight:600;border-bottom:1px solid #eee">${dateStr}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee">${startFmt} – ${endFmt}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Duration</td><td style="padding:10px 0;border-bottom:1px solid #eee">${booking.durationHours} hours</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Session Total</td><td style="padding:10px 0;border-bottom:1px solid #eee">$${price}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Deposit Due Now</td><td style="padding:10px 0;font-weight:700;color:#c4481a;font-size:18px">$${DEPOSIT_AMOUNT}</td></tr>
<tr><td style="padding:10px 0;color:#888">Balance on Session Day</td><td style="padding:10px 0;font-weight:600">$${balance}</td></tr>
</table>
<div style="margin-top:32px;padding:24px;background:#f9f7f4;border-left:4px solid #c4481a">
<h3 style="margin:0 0 12px;font-size:16px">Send $${DEPOSIT_AMOUNT} via Zelle</h3>
<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#c4481a">${ZELLE_RECIPIENT}</p>
<p style="margin:0 0 8px;color:#666;font-size:13px">Memo: <strong>Deposit ${booking.date} ${booking.startTime}</strong></p>
<p style="margin:0;color:#999;font-size:12px">The studio will confirm your deposit and lock in your session. Track your status at <a href="${SITE_URL}/#my-sessions" style="color:#c4481a">${SITE_URL}</a> using this email.</p>
</div>
<p style="margin-top:24px;color:#999;font-size:12px">Questions? Reach us at ${STUDIO_EMAIL}</p>
</div>`;

  await Promise.all([
    sendEmail(STUDIO_EMAIL, `Deposit Request — ${booking.clientName} (${dateStr})`, studioHtml),
    sendEmail(booking.clientEmail, "Your Weo's Studio Session — $20 Deposit Required", clientHtml),
  ]);
}

async function sendConfirmedEmail(booking: Booking): Promise<void> {
  const price = PRICES[booking.durationHours] ?? 0;
  const balance = price - DEPOSIT_AMOUNT;
  const dateStr = formatDateLong(booking.date);
  const { time: endTime } = addHoursToTime(booking.startTime, booking.durationHours);
  const startFmt = formatTime12h(booking.startTime);
  const endFmt = formatTime12h(endTime);

  const clientHtml = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
<h2 style="color:#28a745;margin-bottom:8px">✓ Your Session is CONFIRMED!</h2>
<p style="color:#666;margin-bottom:24px">Hey ${booking.clientName}, your $${DEPOSIT_AMOUNT} deposit was received — your session is locked in!</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:10px 0;color:#888;width:130px;border-bottom:1px solid #eee">Date</td><td style="padding:10px 0;font-weight:600;border-bottom:1px solid #eee">${dateStr}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee">${startFmt} – ${endFmt}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Duration</td><td style="padding:10px 0;border-bottom:1px solid #eee">${booking.durationHours} hours</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Session Total</td><td style="padding:10px 0;border-bottom:1px solid #eee">$${price}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Deposit Paid</td><td style="padding:10px 0;color:#28a745;border-bottom:1px solid #eee">−$${DEPOSIT_AMOUNT} ✓</td></tr>
<tr><td style="padding:10px 0;color:#888">Balance Due</td><td style="padding:10px 0;font-weight:700;color:#c4481a;font-size:18px">$${balance}</td></tr>
</table>
<div style="margin-top:32px;padding:24px;background:#f9f7f4;border-left:4px solid #28a745">
<h3 style="margin:0 0 12px;font-size:16px">Pay $${balance} Balance on Session Day</h3>
<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#c4481a">${ZELLE_RECIPIENT}</p>
<p style="margin:0 0 8px;color:#666;font-size:13px">Memo: <strong>Balance ${booking.date} ${booking.startTime}</strong></p>
<p style="margin:0;color:#999;font-size:12px">Send the remaining $${balance} via Zelle on or before your session day.</p>
</div>
<p style="margin-top:24px;color:#999;font-size:12px">Questions? Reach us at ${STUDIO_EMAIL}</p>
</div>`;

  await sendEmail(booking.clientEmail, "✓ Your Weo's Studio Session is CONFIRMED", clientHtml);
}

async function sendPaymentNotificationEmail(booking: Booking): Promise<void> {
  const price = PRICES[booking.durationHours] ?? 0;
  const balance = price - DEPOSIT_AMOUNT;
  const dateStr = formatDateLong(booking.date);
  const { time: endTime } = addHoursToTime(booking.startTime, booking.durationHours);
  const startFmt = formatTime12h(booking.startTime);
  const endFmt = formatTime12h(endTime);
  const confirmUrl = `${SITE_URL}/lucas/api/bookings/${booking.id}/confirm-payment?token=${booking.paymentToken}`;

  const studioHtml = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
<h2 style="color:#c4481a;margin-bottom:8px">Full Payment Claim — ${booking.clientName}</h2>
<p style="color:#666;margin-bottom:24px">This artist says they've sent the remaining balance of <strong>$${balance}</strong> via Zelle. Confirm once you see it in your account.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:10px 0;color:#888;width:130px;border-bottom:1px solid #eee">Client</td><td style="padding:10px 0;font-weight:600;border-bottom:1px solid #eee">${booking.clientName}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Email</td><td style="padding:10px 0;border-bottom:1px solid #eee">${booking.clientEmail}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Date</td><td style="padding:10px 0;border-bottom:1px solid #eee">${dateStr}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee">${startFmt} – ${endFmt}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Session Total</td><td style="padding:10px 0;border-bottom:1px solid #eee">$${price}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Deposit Already Paid</td><td style="padding:10px 0;color:#28a745;border-bottom:1px solid #eee">$${DEPOSIT_AMOUNT} ✓</td></tr>
<tr><td style="padding:10px 0;color:#888">Balance Claimed</td><td style="padding:10px 0;font-weight:700;color:#c4481a;font-size:18px">$${balance}</td></tr>
</table>
<div style="margin-top:32px;text-align:center">
<p style="color:#666;font-size:14px;margin-bottom:20px">Check your Zelle. Once you see the $${balance} from <strong>${booking.clientName}</strong>, click to confirm:</p>
<a href="${confirmUrl}" style="display:inline-block;background:#c4481a;color:#fff;text-decoration:none;padding:18px 40px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.05em">✓ Confirm $${balance} Payment Received</a>
</div>
<p style="margin-top:20px;color:#999;font-size:11px;text-align:center">Only click after you've confirmed the $${balance} Zelle payment from ${booking.clientName}.</p>
</div>`;

  await sendEmail(STUDIO_EMAIL, `Full Payment Claim — ${booking.clientName} (${dateStr})`, studioHtml);
}

async function sendPaidConfirmationEmail(booking: Booking): Promise<void> {
  const price = PRICES[booking.durationHours] ?? 0;
  const dateStr = formatDateLong(booking.date);
  const { time: endTime } = addHoursToTime(booking.startTime, booking.durationHours);
  const startFmt = formatTime12h(booking.startTime);
  const endFmt = formatTime12h(endTime);

  const clientHtml = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
<h2 style="color:#28a745;margin-bottom:8px">✓ Fully Paid — You're All Set!</h2>
<p style="color:#666;margin-bottom:24px">Hey ${booking.clientName}, your full payment was received and your session is completely booked. See you there!</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:10px 0;color:#888;width:130px;border-bottom:1px solid #eee">Date</td><td style="padding:10px 0;font-weight:600;border-bottom:1px solid #eee">${dateStr}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee">${startFmt} – ${endFmt}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Duration</td><td style="padding:10px 0;border-bottom:1px solid #eee">${booking.durationHours} hours</td></tr>
<tr><td style="padding:10px 0;color:#888">Total Paid</td><td style="padding:10px 0;font-weight:700;color:#28a745;font-size:18px">$${price} ✓</td></tr>
</table>
<div style="margin-top:32px;padding:24px;background:#f9f7f4;border-left:4px solid #28a745">
<p style="margin:0;font-size:15px;color:#444">You're fully booked. Address will be shared closer to your session date. Questions? Reach us at ${STUDIO_EMAIL}</p>
</div>
</div>`;

  await sendEmail(booking.clientEmail, "✓ Weo's Studio — Fully Paid & Booked!", clientHtml);
}

function confirmPageHtml(title: string, message: string, color: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Weo's Studio</title>
<style>
  body{font-family:sans-serif;background:#0a0805;color:#f0ead8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#2a2520;border-radius:12px;padding:48px 40px;max-width:480px;width:90%;text-align:center}
  h1{color:${color};font-size:26px;margin:0 0 16px}
  p{color:#d4c9b0;line-height:1.6;margin:0;font-size:15px}
  a{display:inline-block;margin-top:28px;color:#c4481a;text-decoration:none;font-size:13px;letter-spacing:0.1em}
</style>
</head>
<body>
<div class="card">
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="${SITE_URL}">← Back to Weo's Studio</a>
</div>
</body>
</html>`;
}

export async function handleLucasApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const p = url.pathname;

  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  // GET /lucas/api/availability?date=YYYY-MM-DD
  if (p === "/lucas/api/availability" && req.method === "GET") {
    const date = url.searchParams.get("date") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: "date must be YYYY-MM-DD" }), { status: 400, headers: JSON_H });
    }

    const sameDayBookings = await getBookingsByDate(date);
    const prevDayBookings = await getBookingsByDate(offsetDate(date, -1));

    const bookedRanges: Array<{ start: number; end: number }> = [];
    bookedRanges.push(...await getCalendarBlocks(date));

    for (const b of sameDayBookings) {
      if (b.status === "cancelled") continue;
      const s = timeToMinutes(b.startTime);
      bookedRanges.push({ start: s, end: s + b.durationHours * 60 });
    }

    for (const b of prevDayBookings) {
      if (b.status === "cancelled") continue;
      const s = timeToMinutes(b.startTime);
      const e = s + b.durationHours * 60;
      if (e > 1440) bookedRanges.push({ start: 0, end: e - 1440 });
    }

    return new Response(JSON.stringify({ date, bookedRanges }), { headers: JSON_H });
  }

  // GET /lucas/api/availability/month?year=YYYY&month=M
  if (p === "/lucas/api/availability/month" && req.method === "GET") {
    const year = parseInt(url.searchParams.get("year") ?? "");
    const month = parseInt(url.searchParams.get("month") ?? "");
    if (!year || month < 1 || month > 12) {
      return new Response(JSON.stringify({ error: "year and month (1-12) required" }), { status: 400, headers: JSON_H });
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const result: Record<string, Array<{ start: number; end: number }>> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const [calBlocks, sameDay, prevDay] = await Promise.all([
        getCalendarBlocks(date),
        getBookingsByDate(date),
        getBookingsByDate(offsetDate(date, -1)),
      ]);

      const ranges: Array<{ start: number; end: number }> = [...calBlocks];
      for (const b of sameDay) {
        if (b.status === "cancelled") continue;
        const s = timeToMinutes(b.startTime);
        ranges.push({ start: s, end: s + b.durationHours * 60 });
      }
      for (const b of prevDay) {
        if (b.status === "cancelled") continue;
        const s = timeToMinutes(b.startTime);
        const e = s + b.durationHours * 60;
        if (e > 1440) ranges.push({ start: 0, end: e - 1440 });
      }
      if (ranges.length > 0) result[date] = ranges;
    }

    return new Response(JSON.stringify(result), { headers: JSON_H });
  }

  // POST /lucas/api/bookings — creates as pending_deposit, blocks slot, sends deposit emails
  if (p === "/lucas/api/bookings" && req.method === "POST") {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: JSON_H });
    }

    const { clientName, clientEmail, date, startTime, durationHours } = body;
    if (!clientName || !clientEmail || !date || !startTime || !durationHours) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: JSON_H });
    }

    const dur = Number(durationHours);
    if (![3, 6, 9, 12].includes(dur)) {
      return new Response(JSON.stringify({ error: "Duration must be 3, 6, 9, or 12" }), { status: 400, headers: JSON_H });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return new Response(JSON.stringify({ error: "Invalid date format (YYYY-MM-DD)" }), { status: 400, headers: JSON_H });
    }
    if (!/^\d{2}:\d{2}$/.test(String(startTime))) {
      return new Response(JSON.stringify({ error: "Invalid startTime format (HH:MM)" }), { status: 400, headers: JSON_H });
    }

    const overlap = await hasOverlap(String(date), String(startTime), dur);
    if (overlap) {
      return new Response(
        JSON.stringify({ error: "That time slot is already booked. Please choose another." }),
        { status: 409, headers: JSON_H },
      );
    }

    const booking: Booking = {
      id: crypto.randomUUID(),
      clientName: String(clientName).trim(),
      clientEmail: String(clientEmail).trim().toLowerCase(),
      date: String(date),
      startTime: String(startTime),
      durationHours: dur,
      status: "pending_deposit",
      depositToken: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    await kv.set(["lucas_booking", booking.id], booking);
    await kv.set(["lucas_booking_date", booking.date, booking.id], booking);
    await kv.set(["lucas_booking_email", booking.clientEmail, booking.id], booking);

    sendDepositEmails(booking).catch(err => console.error("[Lucas] Email error:", err));

    return new Response(JSON.stringify({
      ok: true,
      bookingId: booking.id,
      depositAmount: DEPOSIT_AMOUNT,
      price: PRICES[dur],
      balance: PRICES[dur] - DEPOSIT_AMOUNT,
      zelleRecipient: ZELLE_RECIPIENT,
      memo: `Deposit ${booking.date} ${booking.startTime}`,
    }), { status: 201, headers: JSON_H });
  }

  // GET /lucas/api/bookings/:id/confirm?token=TOKEN — Lucas confirms deposit from email link
  const confirmMatch = p.match(/^\/lucas\/api\/bookings\/([0-9a-f-]+)\/confirm$/);
  if (confirmMatch && req.method === "GET") {
    const bookingId = confirmMatch[1];
    const token = url.searchParams.get("token") ?? "";
    const HTML_H = { "Content-Type": "text/html; charset=utf-8" };

    const entry = await kv.get<Booking>(["lucas_booking", bookingId]);
    if (!entry.value) {
      return new Response(confirmPageHtml("Not Found", "Booking not found.", "#c4481a"), { status: 404, headers: HTML_H });
    }

    const booking = entry.value;
    if (!booking.depositToken || booking.depositToken !== token) {
      return new Response(confirmPageHtml("Invalid Link", "This confirmation link is invalid or has expired.", "#c4481a"), { status: 403, headers: HTML_H });
    }

    if (booking.status === "confirmed") {
      return new Response(confirmPageHtml("Already Confirmed",
        `${booking.clientName}'s session on ${formatDateLong(booking.date)} at ${formatTime12h(booking.startTime)} is already confirmed.`,
        "#28a745"), { headers: HTML_H });
    }

    if (booking.status === "cancelled") {
      return new Response(confirmPageHtml("Booking Cancelled", "This booking has been cancelled and cannot be confirmed.", "#c4481a"), { status: 410, headers: HTML_H });
    }

    const updated: Booking = { ...booking, status: "confirmed" };
    await kv.set(["lucas_booking", booking.id], updated);
    await kv.set(["lucas_booking_date", booking.date, booking.id], updated);
    await kv.set(["lucas_booking_email", booking.clientEmail, booking.id], updated);

    sendConfirmedEmail(updated).catch(err => console.error("[Lucas] Email error:", err));

    return new Response(confirmPageHtml("✓ Deposit Confirmed!",
      `${updated.clientName}'s session on ${formatDateLong(updated.date)} at ${formatTime12h(updated.startTime)} is now confirmed. A confirmation email has been sent to ${updated.clientEmail} with balance details.`,
      "#28a745"), { headers: HTML_H });
  }

  // POST /lucas/api/bookings/:id/notify-payment — artist notifies they've sent the full balance
  const notifyPaymentMatch = p.match(/^\/lucas\/api\/bookings\/([0-9a-f-]+)\/notify-payment$/);
  if (notifyPaymentMatch && req.method === "POST") {
    const bookingId = notifyPaymentMatch[1];

    const entry = await kv.get<Booking>(["lucas_booking", bookingId]);
    if (!entry.value) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: JSON_H });
    }

    const booking = entry.value;
    if (booking.status !== "confirmed") {
      return new Response(JSON.stringify({ error: "Only confirmed sessions can submit a full payment." }), { status: 400, headers: JSON_H });
    }

    const paymentToken = crypto.randomUUID();
    const updated: Booking = { ...booking, paymentToken };
    await kv.set(["lucas_booking", booking.id], updated);
    await kv.set(["lucas_booking_date", booking.date, booking.id], updated);
    await kv.set(["lucas_booking_email", booking.clientEmail, booking.id], updated);

    sendPaymentNotificationEmail(updated).catch(err => console.error("[Lucas] Email error:", err));

    return new Response(JSON.stringify({ ok: true }), { headers: JSON_H });
  }

  // GET /lucas/api/bookings/:id/confirm-payment?token=TOKEN — Lucas confirms full payment from email link
  const confirmPaymentMatch = p.match(/^\/lucas\/api\/bookings\/([0-9a-f-]+)\/confirm-payment$/);
  if (confirmPaymentMatch && req.method === "GET") {
    const bookingId = confirmPaymentMatch[1];
    const token = url.searchParams.get("token") ?? "";
    const HTML_H = { "Content-Type": "text/html; charset=utf-8" };

    const entry = await kv.get<Booking>(["lucas_booking", bookingId]);
    if (!entry.value) {
      return new Response(confirmPageHtml("Not Found", "Booking not found.", "#c4481a"), { status: 404, headers: HTML_H });
    }

    const booking = entry.value;

    // Check status first so a re-click on a paid booking shows a friendly message
    if (booking.status === "paid") {
      return new Response(confirmPageHtml("Already Confirmed",
        `${booking.clientName}'s session on ${formatDateLong(booking.date)} at ${formatTime12h(booking.startTime)} is already fully paid.`,
        "#28a745"), { headers: HTML_H });
    }

    if (!booking.paymentToken || booking.paymentToken !== token) {
      return new Response(confirmPageHtml("Invalid Link", "This confirmation link is invalid or has already been used.", "#c4481a"), { status: 403, headers: HTML_H });
    }

    if (booking.status !== "confirmed") {
      return new Response(confirmPageHtml("Error", "This booking is not in the right state to confirm payment.", "#c4481a"), { status: 400, headers: HTML_H });
    }

    const price = PRICES[booking.durationHours] ?? 0;
    const balance = price - DEPOSIT_AMOUNT;
    const updated: Booking = { ...booking, status: "paid", paymentToken: undefined };
    await kv.set(["lucas_booking", booking.id], updated);
    await kv.set(["lucas_booking_date", booking.date, booking.id], updated);
    await kv.set(["lucas_booking_email", booking.clientEmail, booking.id], updated);

    sendPaidConfirmationEmail(updated).catch(err => console.error("[Lucas] Email error:", err));

    return new Response(confirmPageHtml("✓ Payment Confirmed!",
      `${updated.clientName}'s $${balance} balance has been confirmed. Their session on ${formatDateLong(updated.date)} at ${formatTime12h(updated.startTime)} is fully booked. A confirmation email has been sent to ${updated.clientEmail}.`,
      "#28a745"), { headers: HTML_H });
  }

  // GET /lucas/api/sessions?email=EMAIL — look up an artist's sessions by email
  if (p === "/lucas/api/sessions" && req.method === "GET") {
    const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email required" }), { status: 400, headers: JSON_H });
    }

    const sessions: Booking[] = [];
    for await (const r of kv.list<Booking>({ prefix: ["lucas_booking_email", email] })) {
      if (r.value.status !== "cancelled") sessions.push(r.value);
    }
    sessions.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const result = sessions.map(s => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      durationHours: s.durationHours,
      status: s.status,
      price: PRICES[s.durationHours] ?? 0,
      deposit: DEPOSIT_AMOUNT,
      balance: (PRICES[s.durationHours] ?? 0) - DEPOSIT_AMOUNT,
      paymentNotified: !!s.paymentToken,
      createdAt: s.createdAt,
    }));

    return new Response(JSON.stringify({ sessions: result }), { headers: JSON_H });
  }

  // GET /lucas/api/calendar.ics
  if (p === "/lucas/api/calendar.ics" && req.method === "GET") {
    const bookings = await getAllBookings();
    const active = bookings.filter(b => b.status !== "cancelled");
    active.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    return new Response(generateIcal(active), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="weos-studio.ics"',
        "Cache-Control": "no-cache, no-store",
      },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: JSON_H });
}

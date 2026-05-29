/// <reference lib="deno.unstable" />

const kv = await Deno.openKv("/root/weolopez.github.io/lucas/lucas.db");

const PRICES: Record<number, number> = { 3: 100, 6: 180, 9: 225, 12: 275 };
const STUDIO_EMAIL = "lucasweolopez@gmail.com";
const ZELLE_RECIPIENT = "lucasweolopez@gmail.com";
const TIMEZONE = "America/New_York";

const SMTP_HOST = Deno.env.get("SMTP_HOST") || "";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "587");
const SMTP_USER = Deno.env.get("SMTP_USER") || "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";

interface Booking {
  id: string;
  clientName: string;
  clientEmail: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM (24h)
  durationHours: number;
  status: string;      // "confirmed" | "cancelled"
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

async function hasOverlap(date: string, startTime: string, durationHours: number): Promise<boolean> {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + durationHours * 60;

  // Check same-day bookings
  for (const b of await getBookingsByDate(date)) {
    if (b.status === "cancelled") continue;
    const bStart = timeToMinutes(b.startTime);
    const bEnd = bStart + b.durationHours * 60;
    if (newStart < bEnd && bStart < newEnd) return true;
  }

  // Check previous day's bookings that spill into this date
  for (const b of await getBookingsByDate(offsetDate(date, -1))) {
    if (b.status === "cancelled") continue;
    const bStart = timeToMinutes(b.startTime);
    const bEnd = bStart + b.durationHours * 60;
    if (bEnd > 1440 && newStart < bEnd - 1440) return true;
  }

  // If new booking spills into next day, check next day's early bookings
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
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@lucas.weolopez.com`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${TIMEZONE}:${icalDatetime(b.date, b.startTime)}`,
      `DTEND;TZID=${TIMEZONE}:${icalDatetime(endDate, endTime)}`,
      `SUMMARY:Studio Session — ${b.clientName}`,
      `DESCRIPTION:Client: ${b.clientEmail}\\nDuration: ${b.durationHours}hrs\\nTotal: $${price}`,
      "STATUS:CONFIRMED",
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
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[Lucas Email] SMTP not configured — logging\nTo: ${to}\nSubject: ${subject}`);
    return;
  }
  try {
    const { default: nodemailer } = await import("npm:nodemailer@6");
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"Weo's Studio" <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Lucas Email] Sent to ${to}`);
  } catch (err) {
    console.error("[Lucas Email] Failed:", err);
  }
}

async function sendBookingEmails(booking: Booking): Promise<void> {
  const price = PRICES[booking.durationHours] ?? 0;
  const dateStr = formatDateLong(booking.date);
  const { time: endTime } = addHoursToTime(booking.startTime, booking.durationHours);
  const startFmt = formatTime12h(booking.startTime);
  const endFmt = formatTime12h(endTime);

  const studioHtml = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
<h2 style="color:#c4481a;margin-bottom:24px">New Studio Booking</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:10px 0;color:#888;width:130px;border-bottom:1px solid #eee">Client</td><td style="padding:10px 0;font-weight:600;border-bottom:1px solid #eee">${booking.clientName}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Email</td><td style="padding:10px 0;border-bottom:1px solid #eee">${booking.clientEmail}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Date</td><td style="padding:10px 0;border-bottom:1px solid #eee">${dateStr}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee">${startFmt} – ${endFmt}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Duration</td><td style="padding:10px 0;border-bottom:1px solid #eee">${booking.durationHours} hours</td></tr>
<tr><td style="padding:10px 0;color:#888">Total</td><td style="padding:10px 0;font-weight:700;color:#c4481a;font-size:18px">$${price}</td></tr>
</table>
</div>`;

  const clientHtml = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
<h2 style="color:#c4481a;margin-bottom:8px">Your Session is Reserved</h2>
<p style="color:#666;margin-bottom:24px">Hey ${booking.clientName}, here are your session details:</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:10px 0;color:#888;width:130px;border-bottom:1px solid #eee">Date</td><td style="padding:10px 0;font-weight:600;border-bottom:1px solid #eee">${dateStr}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Time</td><td style="padding:10px 0;border-bottom:1px solid #eee">${startFmt} – ${endFmt}</td></tr>
<tr><td style="padding:10px 0;color:#888;border-bottom:1px solid #eee">Duration</td><td style="padding:10px 0;border-bottom:1px solid #eee">${booking.durationHours} hours</td></tr>
<tr><td style="padding:10px 0;color:#888">Total Due</td><td style="padding:10px 0;font-weight:700;color:#c4481a;font-size:18px">$${price}</td></tr>
</table>
<div style="margin-top:32px;padding:24px;background:#f9f7f4;border-left:4px solid #c4481a">
<h3 style="margin:0 0 12px;font-size:16px">Pay via Zelle to confirm your slot</h3>
<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#c4481a">${ZELLE_RECIPIENT}</p>
<p style="margin:0 0 8px;color:#666;font-size:13px">Memo: <strong>Studio ${booking.date} ${booking.startTime}</strong></p>
<p style="margin:0;color:#999;font-size:12px">Your slot is held for 24 hours pending payment.</p>
</div>
<p style="margin-top:24px;color:#999;font-size:12px">Questions? Reply to this email or reach us at ${STUDIO_EMAIL}</p>
</div>`;

  await Promise.all([
    sendEmail(STUDIO_EMAIL, `New Booking — ${booking.clientName} (${dateStr})`, studioHtml),
    sendEmail(booking.clientEmail, "Your Weo's Studio Session — Reserved", clientHtml),
  ]);
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

    for (const b of sameDayBookings) {
      if (b.status === "cancelled") continue;
      const s = timeToMinutes(b.startTime);
      bookedRanges.push({ start: s, end: s + b.durationHours * 60 });
    }

    // Include previous day's spillover
    for (const b of prevDayBookings) {
      if (b.status === "cancelled") continue;
      const s = timeToMinutes(b.startTime);
      const e = s + b.durationHours * 60;
      if (e > 1440) bookedRanges.push({ start: 0, end: e - 1440 });
    }

    return new Response(JSON.stringify({ date, bookedRanges }), { headers: JSON_H });
  }

  // POST /lucas/api/bookings
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
      status: "confirmed",
      createdAt: Date.now(),
    };

    await kv.set(["lucas_booking", booking.id], booking);
    await kv.set(["lucas_booking_date", booking.date, booking.id], booking);

    sendBookingEmails(booking).catch(err => console.error("[Lucas] Email error:", err));

    return new Response(JSON.stringify({
      ok: true,
      bookingId: booking.id,
      price: PRICES[dur],
      zelleRecipient: ZELLE_RECIPIENT,
      memo: `Studio ${booking.date} ${booking.startTime}`,
    }), { status: 201, headers: JSON_H });
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

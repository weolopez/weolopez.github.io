// wc-events.js — Singleton Server-Sent-Events bus for the World Cup hub.
//
// ES modules are evaluated once per page, so importing this anywhere yields ONE
// shared EventSource no matter how many <wc-chat> widgets (or other consumers)
// subscribe. That keeps /api/presence (open-connection count) honest and avoids
// N reconnect storms. Subscribe with:
//
//   import { wcEvents } from '/social/wc-events.js';
//   wcEvents().addEventListener('chat_message', e => { e.detail … });
//
// Each server event { type, … } is re-dispatched as a CustomEvent named `type`
// whose `detail` is the full payload.

const API = '/worldcup';
const bus = new EventTarget();

let es = null;
let retries = 0;
let started = false;

function connect() {
  try {
    es = new EventSource(`${API}/api/events`);
    es.onopen = () => { retries = 0; };
    es.onmessage = (e) => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      if (!data || !data.type) return;
      bus.dispatchEvent(new CustomEvent(data.type, { detail: data }));
    };
    es.onerror = () => {
      es?.close();
      es = null;
      const delay = Math.min(30000, 2000 * 2 ** retries++);
      setTimeout(connect, delay);
    };
  } catch { /* SSE unsupported — consumers just won't get live updates */ }
}

// Returns the shared bus, opening the connection lazily on first use.
export function wcEvents() {
  if (!started) { started = true; connect(); }
  return bus;
}

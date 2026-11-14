#!/usr/bin/env node
// Pre-renders narration for <asn-news-reel>: one MP3 per post, named {post id}.mp3.
// Upload the output folder to the site and point the component's audio-base at it.
//
//   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node generate-narration.mjs [outDir] [count]
//
// Requires Node 18+. Skips posts that already have a file, so it is safe to run on a schedule.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const FEED = process.env.ASN_FEED || 'https://atlantasoccer.news/wp-json/wp/v2/posts';
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const outDir = process.argv[2] || 'reel';
const count = Number(process.argv[3]) || 8;

if (!KEY || !VOICE) {
  console.error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.');
  process.exit(1);
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };
const toText = (html) => String(html || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m)
  .replace(/\s+/g, ' ').trim();

// Same rules as the component, so the audio matches the on-screen text.
const cleanExcerpt = (text, max = 280) => {
  let t = text.replace(/\s*(continue reading|read more).*$/i, '').trim();
  const cut = /(\[\s*…\s*\]|\[\.\.\.\]|…|\.\.\.)\s*$/.test(t) || t.length > max;
  t = t.replace(/\s*(\[\s*…\s*\]|\[\.\.\.\]|…|\.\.\.)\s*$/, '').slice(0, max);
  if (!cut) return t;
  const m = t.match(/^[\s\S]*[.!?]["”’)]?(?=\s|$)/);
  const r = m && m[0].length > 40 ? m[0].trim() : t.replace(/\s+\S*$/, '') + '.';
  // Drop a dangling fragment such as a dateline ("CHATTANOOGA, Tenn.").
  const tail = r.match(/^([\s\S]*[.!?]["”’)]?)\s+\S+(?:\s+\S+){0,2}$/);
  return tail ? tail[1] : r;
};
const narrationFor = (title, excerpt) => (title.replace(/[.!?:\s]+$/, '') + '. ' + excerpt).trim();

const exists = (p) => access(p).then(() => true, () => false);

const posts = await (await fetch(`${FEED}?per_page=${count}`)).json();
await mkdir(outDir, { recursive: true });

for (const p of posts) {
  const file = join(outDir, `${p.id}.mp3`);
  if (await exists(file)) { console.log('skip', p.id); continue; }
  const text = narrationFor(toText(p.title?.rendered), cleanExcerpt(toText(p.excerpt?.rendered)));
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL }),
  });
  if (!res.ok) { console.error('fail', p.id, res.status, await res.text()); process.exitCode = 1; continue; }
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log('wrote', file, `(${text.length} chars)`);
}

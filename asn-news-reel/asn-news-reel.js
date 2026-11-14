/*!
 * <asn-news-reel> - narrated, animated news reel for atlantasoccer.news
 * Standalone custom element. No dependencies, no build step.
 *
 *   <script src="asn-news-reel.js" defer></script>
 *   <asn-news-reel count="8" audio-base="/wp-content/uploads/reel/"></asn-news-reel>
 *
 * Attributes
 *   feed        WordPress posts endpoint (default: atlantasoccer.news REST API)
 *   count       number of stories (default 8)
 *   audio-base  folder holding pre-rendered narration, one file per post: {post id}.mp3
 *               If a file is missing, the browser's best built-in voice is used instead.
 *   seconds     seconds per story while muted (default 7)
 *   voice       name of a preferred built-in voice for the fallback
 */
(() => {
  if (customElements.get('asn-news-reel')) return;

  const DEFAULT_FEED = 'https://atlantasoccer.news/wp-json/wp/v2/posts';

  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4.5v15H6zM13.5 4.5H18v15h-4.5z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5 7 12l8.5 7.5z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 4.5 17 12l-8.5 7.5z"/></svg>',
    on: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5v5h4l5 4.5v-14L7 9.5zM15 8.2a5 5 0 0 1 0 7.6l1.3 1.4a7 7 0 0 0 0-10.4zM17.8 5.4l-1.3 1.4a9 9 0 0 1 0 10.4l1.3 1.4a11 11 0 0 0 0-13.2z"/></svg>',
    off: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5v5h4l5 4.5v-14L7 9.5zM21 9.4 19.6 8 17.5 10.1 15.4 8 14 9.4l2.1 2.1L14 13.6l1.4 1.4 2.1-2.1 2.1 2.1 1.4-1.4-2.1-2.1z"/></svg>',
  };

  const CSS = `
    :host { display:block; container-type:inline-size; --red:#c8102e; --gold:#f2b632; --ink:#0b0b0d;
      font-family: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif; }
    :host([hidden]) { display:none; }
    * { box-sizing:border-box; }
    .stage { position:relative; aspect-ratio:16/9; overflow:hidden; background:var(--ink); color:#fff;
      border-radius:10px; isolation:isolate; }
    .slide { position:absolute; inset:0; animation:in .7s ease both; }
    .slide.leave { animation:out .7s ease both; }
    .slide img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
      animation:kb 14s ease-out both; transform-origin:var(--ox,30%) var(--oy,40%); }
    .paused .slide img, .paused .word, .paused .rise { animation-play-state:paused; }
    .shade { position:absolute; inset:0;
      background:linear-gradient(180deg, rgba(11,11,13,.55) 0%, rgba(11,11,13,0) 26%, rgba(11,11,13,.35) 48%, rgba(11,11,13,.94) 100%); }
    .copy { position:absolute; left:0; right:0; bottom:0; padding:0 5cqw 9.5cqw; }
    .chip { display:inline-block; background:var(--red); color:#fff; font-weight:700; letter-spacing:.08em;
      text-transform:uppercase; font-size:clamp(10px,1.5cqw,14px); padding:.45em .8em; border-radius:3px; }
    h2 { margin:.45em 0 .3em; font-size:clamp(18px,4.3cqw,44px); line-height:1.08; font-weight:800;
      letter-spacing:-.01em; text-wrap:balance; text-shadow:0 2px 18px rgba(0,0,0,.5); }
    h2 a { color:inherit; text-decoration:none; }
    h2 a:hover, h2 a:focus-visible { text-decoration:underline; text-decoration-color:var(--gold); }
    .word { display:inline-block; animation:word .5s cubic-bezier(.2,.7,.2,1) both; animation-delay:calc(var(--n) * 55ms + 250ms); }
    .rise { animation:word .6s ease both; }
    .meta { margin:0; font-size:clamp(11px,1.5cqw,15px); color:var(--gold); font-weight:600; animation-delay:.9s; }
    .ex { margin:.6em 0 0; max-width:62ch; font-size:clamp(12px,1.75cqw,17px); line-height:1.45; color:#e9e9ee;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; animation-delay:1.1s; }
    .bars { position:absolute; z-index:3; top:1.6cqw; left:2cqw; right:2cqw; display:flex; gap:4px; }
    .bars i { flex:1; height:3px; border-radius:2px; background:rgba(255,255,255,.3); overflow:hidden; }
    .bars b { display:block; height:100%; width:100%; background:var(--gold); transform-origin:left; transform:scaleX(0); }
    .brand { position:absolute; z-index:3; top:3.6cqw; left:2.2cqw; display:flex; align-items:center; gap:.6em;
      font-size:clamp(10px,1.4cqw,13px); font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
    .brand::before { content:""; width:.7em; height:.7em; border-radius:50%; background:var(--red); animation:pulse 1.6s ease-in-out infinite; }
    .ctrl { position:absolute; z-index:3; left:4cqw; right:4cqw; bottom:2.6cqw; display:flex; align-items:center; gap:8px; }
    button { all:unset; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:.5em;
      min-width:36px; height:36px; border-radius:18px; background:rgba(255,255,255,.14); color:#fff;
      backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); font-size:13px; font-weight:700; }
    button:hover { background:rgba(255,255,255,.26); }
    button:focus-visible { outline:2px solid var(--gold); outline-offset:2px; }
    button svg { width:18px; height:18px; fill:currentColor; }
    .sound { margin-left:auto; padding:0 14px 0 10px; }
    .sound[aria-pressed="false"] { background:var(--gold); color:var(--ink); }
    .count { font-size:12px; font-variant-numeric:tabular-nums; opacity:.8; margin-left:4px; }
    .msg { position:absolute; inset:0; display:grid; place-items:center; text-align:center; padding:2em; color:#cfcfd6; font-size:14px; }
    .msg a { color:var(--gold); }
    .sr { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
    @container (max-width:520px) {
      .stage { aspect-ratio:4/5; }
      .copy { padding:0 5cqw 17cqw; }
      h2 { font-size:clamp(20px,6.6cqw,34px); }
      .ex { -webkit-line-clamp:3; font-size:13px; }
      .bars { top:3cqw; } .brand { top:6.4cqw; left:3cqw; } .ctrl { bottom:4cqw; }
      .sound span { display:none; } .sound { padding:0; }
    }
    @keyframes in { from { opacity:0 } to { opacity:1 } }
    @keyframes out { from { opacity:1 } to { opacity:0 } }
    @keyframes kb { from { transform:scale(1.02) } to { transform:scale(1.16) } }
    @keyframes word { from { opacity:0; transform:translateY(.5em) } to { opacity:1; transform:none } }
    @keyframes pulse { 50% { opacity:.35 } }
    @media (prefers-reduced-motion:reduce) {
      .slide img, .word, .rise, .brand::before { animation:none; }
      .slide, .slide.leave { animation-duration:.01s; }
    }
  `;

  const toText = (html) => {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  };

  // Keep whole sentences only: WordPress cuts excerpts mid-sentence. (\u2026 is the ellipsis character.)
  // (generate-narration.mjs uses the same two functions so audio and captions match.)
  const cleanExcerpt = (text, max = 280) => {
    let t = text.replace(/\s*(continue reading|read more).*$/i, '').trim();
    const cut = /(\[\s*\u2026\s*\]|\[\.\.\.\]|\u2026|\.\.\.)\s*$/.test(t) || t.length > max;
    t = t.replace(/\s*(\[\s*\u2026\s*\]|\[\.\.\.\]|\u2026|\.\.\.)\s*$/, '').slice(0, max);
    if (!cut) return t;
    const m = t.match(/^[\s\S]*[.!?]["\u201d\u2019)]?(?=\s|$)/);
    const r = m && m[0].length > 40 ? m[0].trim() : t.replace(/\s+\S*$/, '') + '.';
    // Drop a dangling fragment such as a dateline ("CHATTANOOGA, Tenn.").
    const tail = r.match(/^([\s\S]*[.!?]["\u201d\u2019)]?)\s+\S+(?:\s+\S+){0,2}$/);
    return tail ? tail[1] : r;
  };
  const narrationFor = (title, excerpt) =>
    (title.replace(/[.!?:\s]+$/, '') + '. ' + excerpt).trim();

  const voiceScore = (v, want) => {
    let s = 0;
    const n = v.name.toLowerCase();
    if (want && n.includes(want.toLowerCase())) s += 100;
    if (/^en[-_]us/i.test(v.lang)) s += 20; else if (/^en/i.test(v.lang)) s += 10; else s -= 100;
    if (/natural|neural/.test(n)) s += 30;
    if (/premium|enhanced|siri/.test(n)) s += 25;
    if (/google us english|samantha|ava|aria|jenny|guy/.test(n)) s += 12;
    if (/compact|espeak|novelty/.test(n)) s -= 20;
    return s;
  };

  class AsnNewsReel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._posts = [];
      this._i = 0;
      this._token = 0;
      this._playing = true;
      this._sound = false;
      this._inView = true;
      this._elapsed = 0;
      this._audio = new Audio();
      this._audio.preload = 'auto';
      this._frame = this._frame.bind(this);
      this._sync = this._sync.bind(this);
    }

    connectedCallback() {
      this.shadowRoot.innerHTML = `<style>${CSS}</style>
        <section class="stage" aria-roledescription="carousel" aria-label="Atlanta Soccer News reel">
          <div class="bars"></div>
          <div class="brand">Atlanta Soccer News</div>
          <div class="slides"><div class="msg">Loading the latest stories\u2026</div></div>
          <div class="ctrl" hidden>
            <button class="prev" aria-label="Previous story">${ICON.prev}</button>
            <button class="play" aria-label="Pause">${ICON.pause}</button>
            <button class="next" aria-label="Next story">${ICON.next}</button>
            <span class="count"></span>
            <button class="sound" aria-pressed="false">${ICON.off}<span>Tap for narration</span></button>
          </div>
          <div class="sr" aria-live="polite"></div>
        </section>`;
      const $ = (s) => this.shadowRoot.querySelector(s);
      this._el = { stage: $('.stage'), bars: $('.bars'), slides: $('.slides'), ctrl: $('.ctrl'),
        play: $('.play'), sound: $('.sound'), count: $('.count'), live: $('.sr') };
      $('.prev').addEventListener('click', () => this._show(this._i - 1));
      $('.next').addEventListener('click', () => this._show(this._i + 1));
      this._el.play.addEventListener('click', () => { this._playing = !this._playing; this._sync(); });
      this._el.sound.addEventListener('click', () => { this._sound = !this._sound; this._show(this._i); });
      this._io = new IntersectionObserver(([e]) => { this._inView = e.isIntersecting; this._sync(); }, { threshold: 0.35 });
      this._io.observe(this);
      document.addEventListener('visibilitychange', this._sync);
      this._load();
    }

    disconnectedCallback() {
      this._token++;
      this._stopNarration();
      cancelAnimationFrame(this._raf);
      this._io && this._io.disconnect();
      document.removeEventListener('visibilitychange', this._sync);
    }

    async _load() {
      try {
        const url = new URL(this.getAttribute('feed') || DEFAULT_FEED, location.href);
        url.searchParams.set('per_page', String(Math.min(20, Math.max(1, parseInt(this.getAttribute('count'), 10) || 8))));
        url.searchParams.set('_embed', 'wp:featuredmedia,author,wp:term');
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const posts = (await res.json()).map((p) => {
          const emb = p._embedded || {};
          const media = (emb['wp:featuredmedia'] || [])[0] || {};
          const sizes = (media.media_details || {}).sizes || {};
          const cats = (emb['wp:term'] || []).flat().filter((t) => t && t.taxonomy === 'category').map((t) => t.name);
          const title = toText(p.title && p.title.rendered);
          const excerpt = cleanExcerpt(toText(p.excerpt && p.excerpt.rendered));
          return {
            id: p.id, link: p.link, title, excerpt,
            image: (sizes.large || sizes.medium_large || {}).source_url || media.source_url || '',
            alt: media.alt_text || '',
            category: cats.find((c) => !/^latest news$/i.test(c)) || cats[0] || 'News',
            author: ((emb.author || [])[0] || {}).name || '',
            date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            narration: narrationFor(title, excerpt),
          };
        }).filter((p) => p.title);
        if (!posts.length) throw new Error('No stories');
        this._posts = posts;
        this._el.bars.innerHTML = posts.map(() => '<i><b></b></i>').join('');
        this._el.ctrl.hidden = false;
        this._show(0);
        this._raf = requestAnimationFrame(this._frame);
      } catch (err) {
        this._el.slides.innerHTML = '<div class="msg"><span>The reel could not load right now. <a href="https://atlantasoccer.news/latest-news/">Read the latest news</a></span></div>';
        this.dispatchEvent(new CustomEvent('reel-error', { detail: String(err) }));
      }
    }

    get _active() { return this._playing && this._inView && !document.hidden; }

    _show(i) {
      const n = this._posts.length;
      if (!n) return;
      this._i = ((i % n) + n) % n;
      const token = ++this._token;
      const post = this._posts[this._i];
      this._stopNarration();

      const slide = document.createElement('article');
      slide.className = 'slide';
      slide.setAttribute('aria-roledescription', 'slide');
      if (post.image) {
        const img = document.createElement('img');
        img.src = post.image; img.alt = post.alt; img.decoding = 'async';
        img.style.setProperty('--ox', (this._i % 2 ? 72 : 28) + '%');
        img.style.setProperty('--oy', (this._i % 3 ? 35 : 60) + '%');
        slide.append(img);
      }
      const shade = Object.assign(document.createElement('div'), { className: 'shade' });
      const copy = Object.assign(document.createElement('div'), { className: 'copy' });
      const chip = Object.assign(document.createElement('span'), { className: 'chip rise', textContent: post.category });
      const h2 = document.createElement('h2');
      const a = Object.assign(document.createElement('a'), { href: post.link });
      a.setAttribute('aria-label', post.title);
      post.title.split(' ').forEach((w, k) => {
        const s = Object.assign(document.createElement('span'), { className: 'word', textContent: w });
        s.style.setProperty('--n', k);
        a.append(s, ' ');
      });
      h2.append(a);
      const meta = Object.assign(document.createElement('p'), { className: 'meta rise',
        textContent: [post.date, post.author].filter(Boolean).join(' \u00b7 ') });
      const ex = Object.assign(document.createElement('p'), { className: 'ex rise', textContent: post.excerpt });
      copy.append(chip, h2, meta, ex);
      slide.append(shade, copy);

      this._el.slides.querySelectorAll('.msg').forEach((m) => m.remove());
      this._el.slides.querySelectorAll('.slide').forEach((old) => {
        old.classList.add('leave');
        setTimeout(() => old.remove(), 750);
      });
      this._el.slides.append(slide);

      [...this._el.bars.children].forEach((bar, k) => {
        bar.firstChild.style.transform = `scaleX(${k < this._i ? 1 : 0})`;
      });
      this._el.count.textContent = `${this._i + 1} / ${n}`;
      this._el.live.textContent = this._sound ? '' : post.title;
      const nextImg = this._posts[(this._i + 1) % n].image;
      if (nextImg) new Image().src = nextImg;

      this._elapsed = 0;
      this._doneAt = 0;
      this._mode = 'timer';
      this._dur = (parseFloat(this.getAttribute('seconds')) || 7) * 1000;
      if (this._sound) this._narrate(post, token);
      this._sync();
    }

    _narrate(post, token) {
      // Estimated length drives the progress bar until the real audio reports its duration.
      this._dur = Math.max(5000, post.narration.split(/\s+/).length * 400);
      this._mode = 'speech';
      const done = () => { if (token === this._token && !this._doneAt) this._doneAt = this._elapsed + 900; };
      let fellBack = false;
      const speak = () => {
        if (fellBack || token !== this._token) return;
        fellBack = true;
        this._speak(post.narration, done, token);
      };
      const base = this.getAttribute('audio-base');
      if (!base) return speak();
      const a = this._audio;
      a.onended = done;
      a.onerror = speak;
      a.src = base.replace(/\/?$/, '/') + post.id + '.mp3';
      a.play().then(() => { if (token === this._token && !fellBack) this._mode = 'audio'; }, speak);
    }

    _speak(text, done, token) {
      const synth = window.speechSynthesis;
      if (!synth) { this._mode = 'timer'; return; }
      synth.cancel();
      const voice = synth.getVoices().slice()
        .sort((x, y) => voiceScore(y, this.getAttribute('voice')) - voiceScore(x, this.getAttribute('voice')))[0];
      // One utterance per sentence: Chrome cuts off long single utterances.
      const parts = text.match(/[^.!?]+[.!?]+["\u201d\u2019)]?|[^.!?]+$/g) || [text];
      this._utts = parts.map((part, k) => {
        const u = new SpeechSynthesisUtterance(part.trim());
        if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
        u.rate = 1; u.pitch = 1;
        if (k === parts.length - 1) u.onend = done;
        u.onerror = (e) => { if (e.error !== 'interrupted' && e.error !== 'canceled' && token === this._token) { this._mode = 'timer'; } };
        return u;
      });
      this._utts.forEach((u) => synth.speak(u));
      if (!this._active) synth.pause();
    }

    _stopNarration() {
      const a = this._audio;
      a.onended = a.onerror = null;
      a.pause();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      this._utts = [];
    }

    // Reconcile UI and narration with play / visibility / sound state.
    _sync() {
      if (!this._el) return;
      const active = this._active;
      this._el.stage.classList.toggle('paused', !active);
      this._el.play.innerHTML = this._playing ? ICON.pause : ICON.play;
      this._el.play.setAttribute('aria-label', this._playing ? 'Pause' : 'Play');
      this._el.sound.setAttribute('aria-pressed', String(this._sound));
      this._el.sound.innerHTML = (this._sound ? ICON.on : ICON.off) + `<span>${this._sound ? 'Narration on' : 'Tap for narration'}</span>`;
      if (this._mode === 'audio') { active ? this._audio.play().catch(() => {}) : this._audio.pause(); }
      if (this._mode === 'speech' && window.speechSynthesis) { active ? window.speechSynthesis.resume() : window.speechSynthesis.pause(); }
      this._last = 0;
    }

    _frame(now) {
      this._raf = requestAnimationFrame(this._frame);
      const dt = this._last ? Math.min(now - this._last, 100) : 0;
      this._last = now;
      if (!this._active || !this._posts.length) return;
      this._elapsed += dt;
      let progress, finished;
      if (this._mode === 'timer') {
        progress = this._elapsed / this._dur;
        finished = progress >= 1;
      } else {
        const a = this._audio;
        progress = this._mode === 'audio' && a.duration ? a.currentTime / a.duration : Math.min(this._elapsed / this._dur, 0.97);
        if (this._doneAt) progress = 1;
        // Safety net: never hang if a voice fails to report that it finished.
        finished = (this._doneAt && this._elapsed >= this._doneAt) || this._elapsed > this._dur * 2.5 + 8000;
      }
      const bar = this._el.bars.children[this._i];
      if (bar) bar.firstChild.style.transform = `scaleX(${Math.min(1, progress)})`;
      if (finished) this._show(this._i + 1);
    }
  }

  customElements.define('asn-news-reel', AsnNewsReel);
})();

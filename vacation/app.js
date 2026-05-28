/* ─── Countdown ───────────────────────────────────────── */
const DEPARTURE = new Date('2026-06-06T00:00:00');
const RETURN    = new Date('2026-06-19T23:59:59');

function pad(n) { return String(n).padStart(2, '0'); }

function updateCountdown() {
  const now  = new Date();
  const diff = DEPARTURE - now;

  if (now >= DEPARTURE && now <= RETURN) {
    document.getElementById('countdown').innerHTML =
      '<div class="cd-unit" style="min-width:auto;padding:1rem 2rem">' +
      '<span style="font-size:2rem">🌴</span>' +
      '<small style="font-size:0.85rem;letter-spacing:0">We\'re on vacation!</small></div>';
    return;
  }

  if (now > RETURN) {
    document.getElementById('countdown').innerHTML =
      '<div class="cd-unit" style="min-width:auto;padding:1rem 2rem">' +
      '<span style="font-size:2rem">🏠</span>' +
      '<small style="font-size:0.85rem;letter-spacing:0">What a trip!</small></div>';
    return;
  }

  const days  = Math.floor(diff / 864e5);
  const hours = Math.floor((diff % 864e5) / 36e5);
  const mins  = Math.floor((diff % 36e5)  / 6e4);
  const secs  = Math.floor((diff % 6e4)   / 1e3);

  document.getElementById('cd-days').textContent  = pad(days);
  document.getElementById('cd-hours').textContent = pad(hours);
  document.getElementById('cd-mins').textContent  = pad(mins);
  document.getElementById('cd-secs').textContent  = pad(secs);
}

updateCountdown();
setInterval(updateCountdown, 1000);

/* ─── Auth state ─────────────────────────────────────── */
let currentUser = null;

async function loadCurrentUser() {
  try {
    const r = await fetch('/vacation/api/me');
    const { user } = await r.json();
    currentUser = user;
  } catch {
    currentUser = null;
  }
  renderAuthUI();
}

function renderAuthUI() {
  const chip      = document.getElementById('user-chip');
  const signinBtn = document.getElementById('signin-btn');
  const avatarImg = document.getElementById('user-avatar-img');
  const nameEl    = document.getElementById('user-display-name');

  if (currentUser) {
    chip.hidden      = false;
    signinBtn.hidden = true;
    if (currentUser.avatar) {
      avatarImg.src     = currentUser.avatar;
      avatarImg.hidden  = false;
    }
    nameEl.textContent = currentUser.name.split(' ')[0];
  } else {
    chip.hidden      = true;
    signinBtn.hidden = false;
  }
}

/* ─── Google Sign-In ─────────────────────────────────── */
let googleClientId = '';

async function initGoogleSignIn() {
  try {
    const cfg = await fetch('/vacation/api/config').then(r => r.json());
    googleClientId = cfg.googleClientId;
  } catch {
    return;
  }
  if (!googleClientId || !window.google?.accounts?.id) return;

  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredential,
    auto_select: true,
  });

  // Render button inside the modal container
  window.google.accounts.id.renderButton(
    document.getElementById('g-signin-btn-container'),
    { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with' }
  );
}

async function handleGoogleCredential(response) {
  try {
    const r = await fetch('/vacation/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential }),
    });
    if (!r.ok) throw new Error('Auth failed');
    const { user } = await r.json();
    currentUser = user;
    renderAuthUI();
    closeSignInModal();
    showToast(`Welcome, ${user.name.split(' ')[0]}! 🌴`);
    await loadMyVotes();
  } catch {
    showToast('Sign-in failed. Please try again.');
  }
}

async function signOut() {
  await fetch('/vacation/auth/logout', { method: 'POST' });
  currentUser = null;
  renderAuthUI();
  clearMyVoteHighlights();
  showToast('Signed out.');
}

/* ─── Sign-in modal ──────────────────────────────────── */
function openSignInModal() {
  document.getElementById('signin-modal').hidden    = false;
  document.getElementById('signin-backdrop').hidden = false;
}

function closeSignInModal() {
  document.getElementById('signin-modal').hidden    = true;
  document.getElementById('signin-backdrop').hidden = true;
}

document.getElementById('signin-btn').addEventListener('click', openSignInModal);
document.getElementById('signin-modal-close').addEventListener('click', closeSignInModal);
document.getElementById('signin-backdrop').addEventListener('click', closeSignInModal);
document.getElementById('logout-btn').addEventListener('click', signOut);

/* ─── Toast ──────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ─── Vote counts + SSE ──────────────────────────────── */
let voteCounts     = {};   // { activityKey: number }
let voteVoters     = {};   // { activityKey: string[] }
let myVoteKeys     = new Set();
let prevVoteCounts = null; // null = not yet initialized (suppress initial toasts)

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderVoteCounts() {
  document.querySelectorAll('.vote-badge').forEach(badge => {
    const key   = badge.dataset.voteKey;
    const count = voteCounts[key] || 0;
    badge.textContent = count > 0 ? `${count} 👍` : '';
    badge.classList.toggle('has-votes', count > 0);
  });
  document.querySelectorAll('.voter-names').forEach(el => {
    const key   = el.dataset.voteKey;
    const names = (voteVoters[key] || []).map(n => n.split(' ')[0]);
    el.classList.toggle('has-voters', names.length > 0);
    el.textContent = names.length > 0 ? '👥 ' + names.join(', ') : '';
  });
  renderResultsPanel();
}

function buildActivityMap() {
  const map = {};
  document.querySelectorAll('input[type="checkbox"][data-key]').forEach(cb => {
    if (!isActivityKey(cb.dataset.key)) return;
    const span = cb.closest('label')?.querySelector('span:not(.vote-badge)');
    map[cb.dataset.key] = span ? span.textContent.trim() : cb.dataset.key;
  });
  return map;
}

function renderResultsPanel() {
  const panel = document.getElementById('results-content');
  if (!panel) return;
  const actMap  = buildActivityMap();
  const entries = Object.entries(voteCounts)
    .filter(([k, v]) => isActivityKey(k) && v > 0)
    .sort(([, a], [, b]) => b - a);
  if (entries.length === 0) {
    panel.innerHTML = '<div class="no-votes-msg">No votes yet — sign in and pick your favorites! 🏖</div>';
    return;
  }
  const maxVotes = entries[0][1];
  const medals   = ['🥇', '🥈', '🥉'];
  panel.innerHTML = '<h3 class="results-title">Family Top Picks</h3>' +
    entries.map(([key, count], i) => {
      const label    = escHtml(actMap[key] || key);
      const names    = (voteVoters[key] || []).map(n => escHtml(n.split(' ')[0])).join(', ');
      const pct      = Math.round(count / maxVotes * 100);
      const medal    = medals[i] !== undefined ? medals[i] : `${i + 1}.`;
      const loc      = key.startsWith('irb-') ? '🌊 IRB' : '🦜 KW';
      const barClass = key.startsWith('kw-') ? 'kw-result-bar' : 'irb-result-bar';
      return `<div class="result-row">
        <div class="result-rank">${medal}</div>
        <div class="result-body">
          <div class="result-label">${label}</div>
          <div class="result-bar-wrap"><div class="result-bar ${barClass}" style="width:${pct}%"></div></div>
          <div class="result-voters"><span class="result-loc">${loc}</span> · ${count} vote${count !== 1 ? 's' : ''} · <span class="result-names">👥 ${names}</span></div>
        </div>
      </div>`;
    }).join('');
}

function detectNewVotes(newCounts, newVoters) {
  if (prevVoteCounts === null) {
    prevVoteCounts = { ...newCounts };
    return;
  }
  const actMap = buildActivityMap();
  for (const [key, count] of Object.entries(newCounts)) {
    if ((prevVoteCounts[key] || 0) < count) {
      const names     = newVoters[key] || [];
      const rawLabel  = actMap[key] || key;
      const label     = rawLabel.replace(/^[^a-zA-Z]+/, '').substring(0, 42);
      const voter     = (names[names.length - 1] || 'Someone').split(' ')[0];
      showToast(`${voter} voted: ${label}`);
      break; // one toast per SSE batch
    }
  }
}

function renderMyVotes() {
  document.querySelectorAll('input[type="checkbox"][data-key]').forEach(cb => {
    if (isActivityKey(cb.dataset.key)) {
      cb.checked = myVoteKeys.has(cb.dataset.key);
      cb.closest('.activity-item')?.classList.toggle('my-vote', myVoteKeys.has(cb.dataset.key));
    }
  });
  updateActivityProgress();
}

function clearMyVoteHighlights() {
  myVoteKeys = new Set();
  renderMyVotes();
}

function isActivityKey(key) {
  return key && (key.startsWith('irb-') || key.startsWith('kw-'));
}

function connectSSE() {
  const es = new EventSource('/vacation/api/events');
  es.onmessage = e => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'vote_update') {
        detectNewVotes(data.counts, data.voters);
        voteCounts     = data.counts  || {};
        voteVoters     = data.voters  || {};
        prevVoteCounts = { ...voteCounts };
        renderVoteCounts();
      }
    } catch { /* ignore */ }
  };
  es.onerror = () => {
    es.close();
    setTimeout(connectSSE, 5000);
  };
}

async function loadMyVotes() {
  if (!currentUser) return;
  try {
    const keys = await fetch('/vacation/api/my-votes').then(r => r.json());
    myVoteKeys = new Set(keys);
    renderMyVotes();
  } catch { /* ignore */ }
}

/* ─── Inject vote badges + voter names into activity items ── */
function injectVoteBadges() {
  document.querySelectorAll('input[type="checkbox"][data-key]').forEach(cb => {
    if (!isActivityKey(cb.dataset.key)) return;
    const lbl = cb.closest('label');
    if (!lbl) return;
    if (!lbl.querySelector('.vote-badge')) {
      const badge = document.createElement('span');
      badge.className = 'vote-badge';
      badge.dataset.voteKey = cb.dataset.key;
      lbl.appendChild(badge);
    }
    if (!lbl.querySelector('.voter-names')) {
      const voterEl = document.createElement('div');
      voterEl.className = 'voter-names';
      voterEl.dataset.voteKey = cb.dataset.key;
      lbl.appendChild(voterEl);
    }
  });
}

/* ─── Wire up activity checkboxes ────────────────────── */
async function handleActivityVote(cb) {
  const key = cb.dataset.key;

  if (!currentUser) {
    cb.checked = myVoteKeys.has(key); // revert
    openSignInModal();
    return;
  }

  const voted = cb.checked;
  if (voted) myVoteKeys.add(key); else myVoteKeys.delete(key);
  cb.closest('.activity-item')?.classList.toggle('my-vote', voted);
  updateActivityProgress();

  try {
    const r = await fetch('/vacation/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityKey: key, voted }),
    });
    if (r.status === 401) {
      // session expired
      myVoteKeys.delete(key);
      cb.checked = false;
      currentUser = null;
      renderAuthUI();
      openSignInModal();
      return;
    }
    const data = await r.json();
    voteCounts     = data.counts  || voteCounts;
    voteVoters     = data.voters  || voteVoters;
    prevVoteCounts = { ...voteCounts }; // prevent SSE echo from re-toasting my own vote
    renderVoteCounts();
  } catch {
    showToast('Could not save vote. Check your connection.');
  }
}

/* ─── localStorage helpers (packing only) ────────────── */
const NS = 'fl26-';
function save(key, val) { localStorage.setItem(NS + key, val ? '1' : '0'); }
function load(key)      { return localStorage.getItem(NS + key) === '1'; }

/* ─── Progress bars ──────────────────────────────────── */
function updateActivityProgress() {
  const groups = [
    { panel: 'irb-activities', countEl: 'irb-count', totalEl: 'irb-total', fillEl: 'irb-fill' },
    { panel: 'kw-activities',  countEl: 'kw-count',  totalEl: 'kw-total',  fillEl: 'kw-fill'  },
  ];

  groups.forEach(({ panel, countEl, totalEl, fillEl }) => {
    const boxes   = document.querySelectorAll(`#${panel} input[type="checkbox"]`);
    const checked = [...boxes].filter(cb => cb.checked).length;
    document.getElementById(countEl).textContent = checked;
    document.getElementById(totalEl).textContent = boxes.length;
    document.getElementById(fillEl).style.width  = boxes.length ? (checked / boxes.length * 100) + '%' : '0%';
  });
}

function updatePackingProgress() {
  const packBoxes   = document.querySelectorAll('#packing input[type="checkbox"]');
  const packChecked = [...packBoxes].filter(cb => cb.checked).length;
  document.getElementById('pack-count').textContent = packChecked;
  document.getElementById('pack-total').textContent = packBoxes.length;
  document.getElementById('pack-fill').style.width  = packBoxes.length ? (packChecked / packBoxes.length * 100) + '%' : '0%';
  document.getElementById('pack-done').hidden = packChecked < packBoxes.length;
}

/* ─── Wire up all checkboxes ─────────────────────────── */
function initCheckboxes() {
  document.querySelectorAll('input[type="checkbox"][data-key]').forEach(cb => {
    const key = cb.dataset.key;

    if (isActivityKey(key)) {
      // Activity votes are server-side
      cb.addEventListener('change', () => handleActivityVote(cb));
    } else {
      // Packing list stays localStorage
      cb.checked = load(key);
      cb.addEventListener('change', () => {
        save(key, cb.checked);
        updatePackingProgress();
      });
    }
  });
  updatePackingProgress();
  updateActivityProgress();
}

/* ─── Activity tab switching ─────────────────────────── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

/* ─── Drive tab switching ────────────────────────────── */
document.querySelectorAll('.drive-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.dtab;
    document.querySelectorAll('.drive-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.drive-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

/* ─── Reset packing ──────────────────────────────────── */
document.getElementById('reset-packing').addEventListener('click', () => {
  if (!confirm('Reset your entire packing list?')) return;
  document.querySelectorAll('#packing input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    save(cb.dataset.key, false);
  });
  updatePackingProgress();
});

/* ─── Active nav on scroll ───────────────────────────── */
const navLinks = document.querySelectorAll('#main-nav a');
const targets  = ['hero', 'destinations', 'itinerary', 'activities', 'packing', 'drive']
  .map(id => document.getElementById(id))
  .filter(Boolean);

const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + id);
    });
  });
}, { threshold: 0.35 });

targets.forEach(t => io.observe(t));

/* ─── iOS Add to Home Screen prompt ─────────────────── */
(function () {
  const params      = new URLSearchParams(location.search);
  const forceTest   = params.has('a2hs');

  if (params.get('a2hs') === 'reset') localStorage.removeItem('fl26-a2hs');

  const isIOS        = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;
  const dismissed    = localStorage.getItem('fl26-a2hs');

  if (!forceTest && (!isIOS || isStandalone || dismissed)) return;

  const banner = document.getElementById('a2hs');
  setTimeout(() => banner.classList.add('show'), 1000);

  document.getElementById('a2hs-close').addEventListener('click', () => {
    banner.classList.remove('show');
    if (!forceTest) localStorage.setItem('fl26-a2hs', '1');
  });
})();

document.getElementById('reset-a2hs').addEventListener('click', () => {
  localStorage.removeItem('fl26-a2hs');
  location.reload();
});

/* ─── Boot ───────────────────────────────────────────── */
injectVoteBadges();
initCheckboxes();
connectSSE();

// Wait for Google GSI script before initializing sign-in
if (window.google?.accounts?.id) {
  initGoogleSignIn();
} else {
  window.addEventListener('load', initGoogleSignIn);
}

loadCurrentUser().then(loadMyVotes);

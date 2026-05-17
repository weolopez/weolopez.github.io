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

/* ─── localStorage helpers ───────────────────────────── */
const NS = 'fl26-';
function save(key, val) { localStorage.setItem(NS + key, val ? '1' : '0'); }
function load(key)      { return localStorage.getItem(NS + key) === '1'; }

/* ─── Progress bars ──────────────────────────────────── */
function updateProgress() {
  const groups = [
    { panel: 'irb-activities', countEl: 'irb-count', totalEl: 'irb-total', fillEl: 'irb-fill' },
    { panel: 'kw-activities',  countEl: 'kw-count',  totalEl: 'kw-total',  fillEl: 'kw-fill'  },
  ];

  groups.forEach(({ panel, countEl, totalEl, fillEl }) => {
    const boxes   = document.querySelectorAll(`#${panel} input[type="checkbox"]`);
    const checked = [...boxes].filter(cb => cb.checked).length;
    document.getElementById(countEl).textContent = checked;
    document.getElementById(totalEl).textContent = boxes.length;
    document.getElementById(fillEl).style.width  = (checked / boxes.length * 100) + '%';
  });

  const packBoxes   = document.querySelectorAll('#packing input[type="checkbox"]');
  const packChecked = [...packBoxes].filter(cb => cb.checked).length;
  document.getElementById('pack-count').textContent = packChecked;
  document.getElementById('pack-total').textContent = packBoxes.length;
  document.getElementById('pack-fill').style.width  = (packChecked / packBoxes.length * 100) + '%';

  const doneEl = document.getElementById('pack-done');
  doneEl.hidden = packChecked < packBoxes.length;
}

/* ─── Wire up all checkboxes ─────────────────────────── */
function initCheckboxes() {
  document.querySelectorAll('input[type="checkbox"][data-key]').forEach(cb => {
    cb.checked = load(cb.dataset.key);
    cb.addEventListener('change', () => {
      save(cb.dataset.key, cb.checked);
      updateProgress();
    });
  });
  updateProgress();
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
  updateProgress();
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

/* ─── Boot ───────────────────────────────────────────── */
initCheckboxes();

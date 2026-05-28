# Fan Token Integration Plan — index.html (Main PTS App)

The fan token system was prototyped in `friendlies.html` and proven with real API
endpoints and reusable web components. This document is the step-by-step plan to
port it into the main Predict the Score app (`worldcup/index.html`).

---

## What Already Exists (From Prototype)

| Artifact | Location | Status |
|---|---|---|
| Web components | `/wc/fan-tokens.js` | ✅ Done |
| Email sign-in component | `/wc/email-signin.js` | ✅ Done |
| KV helpers (wallet, offers, coupons, checkins, settlement) | `world_cup/api.ts` | ✅ Done |
| User API routes | `/api/tokens/*`, `/api/matches/rsvp`, `/api/matches/checkin` | ✅ Done |
| Admin API routes | `/admin/sponsors`, `/admin/sponsors/offers`, `/admin/sponsors/sponsorship`, `/admin/sponsors/verify-voucher` | ✅ Done |
| Token settlement on score finalization | `_settleTokensForFriendly()` | ✅ Done (friendlies only) |

The friendlies settlement hook must be replicated for **world cup matches** when
`/admin/matches` is updated with a final score.

---

## Step 1 — Load the Components

Add to `<head>` in `index.html` alongside the existing `email-signin.js` import:

```html
<script type="module" src="/wc/fan-tokens.js"></script>
```

The `email-signin.js` import is already present. No other head changes needed.

---

## Step 2 — Extend State

In `index.html` around line 883, add four new keys to the existing `state` object:

```js
const state = {
    user: null,
    matches: [],
    predictions: {},
    leaderboard: [],
    leagues: [],
    mdFilter: 'all',
    dateFilter: 'all',
    groupFilter: 'all',
    currentView: 'schedule',
    // ── Fan Tokens (new) ──
    wallet: { balance: 0 },
    offers: [],
    coupons: [],
    sponsorships: {},   // matchId (number) → MatchSponsorship
    checkins: {},       // matchId (number) → { status: 'rsvp' | 'checked_in' }
};
```

---

## Step 3 — Add the "Tokens" View

### 3a. Nav tab

The nav tabs live around line 665. Add between `Bracket` and `My Picks`:

```html
<div class="nav-tab" data-view="tokens">🪙 Tokens</div>
```

### 3b. VALID_VIEWS guard

Around line 1667, add `'tokens'` to the array:

```js
const VALID_VIEWS = ['schedule', 'groups', 'leaderboard', 'leagues', 'bracket', 'predictions', 'tokens'];
```

### 3c. View panel HTML

Add before the closing `</div>` of the views section (after the `bracket` view):

```html
<!-- TOKENS VIEW -->
<div class="view" id="view-tokens">
    <wc-token-wallet id="wallet-component"></wc-token-wallet>

    <div style="margin-top:24px">
        <div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted);margin-bottom:12px">Sponsor Offers</div>
        <div id="tokens-offers-container"></div>
    </div>

    <div style="margin-top:24px">
        <div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted);margin-bottom:12px">My Vouchers</div>
        <div id="tokens-vouchers-container"></div>
    </div>
</div>
```

---

## Step 4 — Load Token Data on Init

The main `init()` / boot sequence runs around line 2280 (`DOMContentLoaded` IIFE).
Add a parallel fetch for sponsorships alongside the existing `loadMatches()` and
`tryRestoreSession()` calls:

```js
// After existing parallel loads:
const [sponsorshipsRes, offersRes] = await Promise.all([
    api('/api/tokens/sponsorships'),
    api('/api/tokens/offers'),
]);
if (sponsorshipsRes.ok) {
    const list = await sponsorshipsRes.json();
    for (const s of list) state.sponsorships[s.matchId] = s;
}
if (offersRes.ok) state.offers = await offersRes.json();
```

When user is confirmed signed in (after `tryRestoreSession()`), load wallet +
coupons:

```js
async function loadTokenData() {
    const [walletRes, couponsRes] = await Promise.all([
        api('/api/tokens/wallet'),
        api('/api/tokens/my-coupons'),
    ]);
    if (walletRes.ok) { const d = await walletRes.json(); state.wallet = d.wallet; }
    if (couponsRes.ok) state.coupons = await couponsRes.json();
}

// Call after setUserFromResponse():
if (state.user) await loadTokenData();
```

---

## Step 5 — Sponsor Banners on Match Cards

`matchCardHTML(m)` builds each match card string (around line 1101). Inject the
`<wc-sponsor-banner>` at the top of the card when a sponsorship exists:

```js
function matchCardHTML(m) {
    // ... existing code ...

    const sp = state.sponsorships[m.id];
    const cin = state.checkins[m.id];
    const sponsorBanner = sp ? `
        <wc-sponsor-banner
            match-id="${m.id}"
            sponsor-id="${sp.sponsorId}"
            sponsor-name="${sp.sponsorName}"
            sponsor-logo="${sp.sponsorLogo || ''}"
            prize-pool="${sp.prizePoolTokens}"
            rsvp-bonus="${sp.rsvpBonusTokens}"
            checkin-status="${cin?.status || ''}"
            signed-in="${!!state.user}"
            style="display:block;margin-bottom:10px">
        </wc-sponsor-banner>` : '';

    // Prepend sponsorBanner inside the returned card HTML
}
```

Wire the banner events once after the schedule renders (or via event delegation on
the schedule container):

```js
document.getElementById('view-schedule').addEventListener('wc-rsvp-done', e => {
    state.checkins[e.detail.matchId] = { status: 'rsvp' };
    toast('RSVP confirmed! See you at the venue. 🎉');
});
document.getElementById('view-schedule').addEventListener('wc-checkin-done', e => {
    state.checkins[e.detail.matchId] = { status: 'checked_in' };
    state.wallet.balance = e.detail.newBalance;
    toast(`✅ Checked in! +${e.detail.tokensEarned} Fan Tokens`);
});
document.getElementById('view-schedule').addEventListener('wc-need-signin', () => openSignInModal());
```

---

## Step 6 — Tokens Panel Renderer

Add `renderTokensPanel()` alongside the other `render*` functions and call it from
`switchView`:

```js
function renderTokensPanel() {
    if (!state.user) {
        // Show sign-in prompt in wallet area
        document.getElementById('wallet-component').innerHTML = `
            <div style="background:var(--primary);color:white;border-radius:14px;padding:24px;text-align:center">
                <div style="font-size:1.8rem;margin-bottom:8px">🪙</div>
                <div style="font-weight:800;color:var(--gold);font-size:1.1rem">Fan Tokens</div>
                <p style="font-size:0.8rem;opacity:0.7;margin-top:6px">Sign in to earn tokens.</p>
                <button onclick="openSignInModal()" style="margin-top:12px;background:var(--gold);color:var(--primary);border:none;border-radius:8px;padding:9px 18px;font-weight:800;cursor:pointer">Sign In</button>
            </div>`;
        document.getElementById('tokens-offers-container').innerHTML = '';
        document.getElementById('tokens-vouchers-container').innerHTML = '';
        return;
    }

    // Refresh wallet component
    document.getElementById('wallet-component').refresh?.();

    // Render offers
    const offersEl = document.getElementById('tokens-offers-container');
    offersEl.innerHTML = state.offers.length ? state.offers.map(o => {
        const rem = o.maxRedemptions > 0 ? o.maxRedemptions - o.currentRedemptions : -1;
        return `<wc-offer-card
            offer-id="${o.id}" title="${o.title}" description="${o.description}"
            token-cost="${o.tokenCost}" remaining="${rem}" balance="${state.wallet.balance}"
            style="display:block;margin-bottom:10px">
        </wc-offer-card>`;
    }).join('') : '<div style="font-size:0.82rem;color:var(--muted)">No offers yet.</div>';

    offersEl.querySelectorAll('wc-offer-card').forEach(el => {
        el.addEventListener('wc-redeem-done', e => {
            state.wallet.balance = e.detail.balance;
            state.coupons.unshift(e.detail.coupon);
            toast('🎟️ Voucher created!');
            renderTokensPanel();
        });
    });

    // Render vouchers
    const unredeemed = state.coupons.filter(c => c.status === 'unredeemed');
    document.getElementById('tokens-vouchers-container').innerHTML = unredeemed.length
        ? unredeemed.map(c => `<wc-voucher-display voucher-code="${c.voucherCode}" offer-title="${c.offerTitle}" style="display:block;margin-bottom:14px"></wc-voucher-display>`).join('')
        : '<div style="font-size:0.82rem;color:var(--muted);text-align:center;padding:20px 0">No active vouchers.</div>';
}
```

In `switchView()`, add:

```js
if (view === 'tokens') renderTokensPanel();
```

---

## Step 7 — Token Settlement for World Cup Matches

The prototype settles tokens via `_settleTokensForFriendly()`. World Cup match scores
are set via `PUT /admin/matches`. Find that handler in `api.ts` and add the same hook:

```ts
// Inside PUT /admin/matches handler, after saving the match:
if (match.status === 'finished' && match.homeScore !== undefined && match.awayScore !== undefined) {
    _settleTokensForWCMatch(match.id, match.homeScore, match.awayScore).catch(() => {});
}
```

Add `_settleTokensForWCMatch()` — identical logic to `_settleTokensForFriendly()`
but reads from `["predictions", userId, matchId]` instead of `["friendly_preds", ...]`.
The KV settlement guard key becomes `["token_settled_wc", matchId]`.

---

## Step 8 — Admin Panel: Sponsor Management

Add a "Sponsors" tab to `worldcup/admin.html` with three sub-sections:

1. **Create Sponsor** — name, logo URL → `POST /admin/sponsors`
2. **Create Offer** — pick sponsor, title, description, token cost, max redemptions → `POST /admin/sponsors/offers`
3. **Attach to Match** — pick match ID + sponsor, set prize pool + RSVP bonus + optional passcode → `POST /admin/sponsors/sponsorship`
4. **Verify Voucher** — paste voucher code → `POST /admin/sponsors/verify-voucher`

---

## Step 9 — QR Deep Link Check-In

When a venue scans a fan's QR code (the `wc-sponsor-banner` in RSVP state shows a
QR), the link format is:

```
https://predict.atlantasoccer.news/worldcup/?action=checkin&matchId=42&sponsorId=<uuid>
```

In the `DOMContentLoaded` init block, handle this alongside the existing `?magic=`
handling:

```js
const _action = _params.get('action');
const _actionMatchId = _params.get('matchId');
const _actionSponsorId = _params.get('sponsorId');
if (_action === 'checkin' && _actionMatchId && state.user) {
    history.replaceState(null, '', location.pathname + location.hash);
    const r = await api('/api/matches/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: Number(_actionMatchId), sponsorId: _actionSponsorId }),
    });
    if (r.ok) {
        const { tokensEarned, newBalance } = await r.json();
        state.wallet.balance = newBalance;
        state.checkins[Number(_actionMatchId)] = { status: 'checked_in' };
        toast(`✅ Checked in! +${tokensEarned} Fan Tokens`);
    }
}
```

---

## Implementation Order

| # | Task | Effort |
|---|---|---|
| 1 | Add `fan-tokens.js` script tag to `<head>` | Trivial |
| 2 | Extend `state` object | Trivial |
| 3 | Add "Tokens" nav tab + view panel HTML | Small |
| 4 | Load sponsorships + offers in init, `loadTokenData()` on sign-in | Small |
| 5 | Inject `<wc-sponsor-banner>` in `matchCardHTML()` + event delegation | Medium |
| 6 | `renderTokensPanel()` + `switchView` hook | Medium |
| 7 | `_settleTokensForWCMatch()` in `api.ts` | Medium |
| 8 | Admin panel sponsor management tab | Medium |
| 9 | QR deep link check-in handler in init | Small |

**Total estimate: ~4–6 hours focused implementation**

---

## Notes

- All components use `api-base="/world_cup"` by default — no attribute needed.
- Token balances are per-user across **both** friendlies and world cup (same KV wallet).
- The `wc-sponsor-banner` RSVP button generates a QR deep link automatically from its `match-id` and `sponsor-id` attributes — no extra code needed on the frontend.
- Passcode check-in (for physical venue verification) is optional — omit `passCode` from the `checkin` POST body and the server accepts any check-in if no passcode is configured on the sponsorship.

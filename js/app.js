import * as W from './wiezen.js';
import * as P from './poepen.js';
import * as H from './harten.js';

// ---------- persistence ----------
const KEY = 'kaartscores.v1';
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { current: null, archive: [], lastNames: {}, theme: null, ...JSON.parse(raw) };
  } catch {}
  return { current: null, archive: [], lastNames: {}, theme: null };
}
const data = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

// ---------- helpers ----------
const GAMES = {
  wiezen: { name: 'Kleurenwiezen', icon: '♠', blurb: '4 spelers · vragen, meegaan, alleen, miserie…' },
  poepen: { name: 'Chinees poepen', icon: '♦', red: true, blurb: '2+ spelers · voorspel je slagen' },
  // lowWins: scores are penalty points, the lowest total wins
  harten: { name: 'Hartenjagen', icon: '♥', red: true, lowWins: true, blurb: '4 spelers · zo weinig mogelijk strafpunten' },
};
const app = document.getElementById('app');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + -n : '0');
const num = (n) => (n < 0 ? '−' + -n : String(n));
const cls = (n) => (n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero');
// Colour class for a score: for penalty games more points is bad.
const tone = (g, n) => cls(GAMES[g.type].lowWins ? -n : n);
const best = (g, t) => (GAMES[g.type].lowWins ? Math.min(...t) : Math.max(...t));
const unit = (g) => (GAMES[g.type].lowWins ? 'strafpunten' : 'punten');

function deltas(g) {
  if (g.type === 'wiezen') return W.scoreRounds(g.rounds);
  if (g.type === 'harten') return H.scoreRounds(g.rounds);
  return P.scoreRounds(g.rounds);
}
function cumulative(g) {
  let acc = g.players.map(() => 0);
  return deltas(g).map((d) => (acc = acc.map((a, i) => a + d[i])));
}
function totals(g) {
  const c = cumulative(g);
  return c.length ? c[c.length - 1] : g.players.map(() => 0);
}
// null for harten: that game runs until someone reaches the point limit
function totalRounds(g) {
  if (g.type === 'harten') return null;
  return g.type === 'wiezen' ? g.targetRounds : P.roundPlan(g.players.length).length;
}
function doneRounds(g) {
  return g.type === 'wiezen' ? W.playedCount(g.rounds) : g.rounds.length;
}
function isOver(g) {
  if (g.ended) return true;
  if (g.type === 'harten') return H.isOver(totals(g), g.limit);
  return doneRounds(g) >= totalRounds(g);
}
function dealerAt(g, i) {
  if (g.type === 'wiezen') return W.dealerFor(g.rounds, i);
  if (g.type === 'harten') return H.dealerFor(i);
  return P.dealerFor(g.players.length, i);
}
// "ronde 3 / 16", or "ronde 3 · tot 100" for harten
function progress(g) {
  const next = doneRounds(g) + 1;
  return g.type === 'harten' ? `ronde ${next} · tot ${g.limit}` : `ronde ${next} / ${totalRounds(g)}`;
}
function passLabel(i) {
  const dir = H.passFor(i);
  return dir === 'geen' ? 'geen doorgifte' : `doorgeven: <strong>${dir}</strong>`;
}
function winners(g) {
  const t = totals(g);
  const top = best(g, t);
  return t.map((v, i) => (v === top ? i : -1)).filter((i) => i >= 0);
}
function archiveCurrent() {
  const g = data.current;
  if (g && g.rounds.length) {
    data.archive.unshift({
      type: g.type, players: g.players, totals: totals(g), winners: winners(g),
      rounds: doneRounds(g), date: g.createdAt,
    });
    data.archive = data.archive.slice(0, 15);
  }
  data.current = null;
}

// ---------- navigation ----------
let view = 'home';
let setup = null;
let draft = null; // round being entered/edited
let afterSave = false;

function go(v, replace = false) {
  view = v;
  history[replace ? 'replaceState' : 'pushState']({ view: v }, '');
  render(true);
}
function back() {
  history.back();
}
window.addEventListener('popstate', (e) => {
  view = e.state?.view ?? 'home';
  if (afterSave) {
    afterSave = false;
    if (view === 'game' && data.current && isOver(data.current)) return go('end');
  }
  render(true);
});

// ---------- theme ----------
const media = matchMedia('(prefers-color-scheme: dark)');
function effectiveTheme() {
  return data.theme ?? (media.matches ? 'dark' : 'light');
}
function applyTheme() {
  if (data.theme) document.documentElement.dataset.theme = data.theme;
  else delete document.documentElement.dataset.theme;
  const dark = effectiveTheme() === 'dark';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0f1714' : '#1f6f50';
  document.getElementById('theme-btn').textContent = dark ? '☀' : '☾';
}
media.addEventListener?.('change', applyTheme);

// ---------- render ----------
function render(scrollTop = false) {
  // guard views that need state
  if ((view === 'game' || view === 'end') && !data.current) view = 'home';
  if (view === 'entry' && (!draft || !data.current)) view = data.current ? 'game' : 'home';
  if (view === 'setup' && !setup) view = 'home';

  const titles = {
    home: 'Kaartscores',
    setup: setup ? GAMES[setup.type].name : '',
    game: data.current ? GAMES[data.current.type].name : '',
    entry: draft ? (draft.editIndex != null ? `Ronde ${draft.editIndex + 1} bewerken` : `Ronde ${data.current.rounds.length + 1}`) : '',
    end: 'Uitslag',
  };
  document.getElementById('title').textContent = titles[view];
  document.getElementById('back-btn').hidden = view === 'home';
  document.body.dataset.view = view;

  app.innerHTML = { home: renderHome, setup: renderSetup, game: renderGame, entry: renderEntry, end: renderEnd }[view]();
  if (view === 'setup') updateSetupValidity();
  if (scrollTop) window.scrollTo(0, 0);
}

// ---------- home ----------
function renderHome() {
  const g = data.current;
  let resume = '';
  if (g) {
    const over = isOver(g);
    resume = `
      <button class="btn btn-primary btn-xl resume" data-act="resume">
        <span>${over ? 'Laatste spel bekijken' : 'Verder spelen'}</span>
        <small>${GAMES[g.type].name} · ${over ? 'afgelopen' : progress(g)}</small>
      </button>`;
  }
  const games = Object.entries(GAMES).map(([id, m]) => `
    <button class="btn game-pick" data-act="new" data-type="${id}">
      <span class="game-icon ${m.red ? 'red' : ''}">${m.icon}</span>
      <span class="game-text"><strong>${m.name}</strong><small>${m.blurb}</small></span>
    </button>`).join('');
  const archive = data.archive.length ? `
    <h2>Vorige spellen</h2>
    <ul class="archive">${data.archive.map((a) => `
      <li><span><strong>${GAMES[a.type].name}</strong><small>${new Date(a.date).toLocaleDateString('nl-BE')} · ${a.rounds} rondes</small></span>
      <span class="arch-win">🏆 ${a.winners.map((i) => esc(a.players[i])).join(', ')} <b>${a.totals[a.winners[0]]}</b></span></li>`).join('')}
    </ul>` : '';
  return `${resume}<h2>Nieuw spel</h2><div class="stack">${games}</div>${archive}`;
}

// ---------- setup ----------
// wiezen and harten are always played with exactly 4
const fixed4 = (type) => type !== 'poepen';

function startSetup(type, players) {
  const prev = players ?? data.lastNames[type] ?? [];
  const count = fixed4(type) ? 4 : Math.max(prev.length, 4);
  const names = Array.from({ length: count }, (_, i) => prev[i] ?? '');
  setup = { type, names, targetRounds: data.current?.targetRounds ?? 16, limit: data.current?.limit ?? 100 };
  go('setup');
}

function setupError() {
  const names = setup.names.map((n) => n.trim());
  if (fixed4(setup.type) && names.length !== 4) return `${GAMES[setup.type].name} speel je met precies 4 spelers`;
  if (names.length < P.MIN_PLAYERS) return 'Minstens 2 spelers';
  if (names.some((n) => !n)) return 'Vul alle namen in';
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return 'Elke naam moet uniek zijn';
  return null;
}
function updateSetupValidity() {
  const err = setupError();
  const btn = document.getElementById('start-btn');
  if (btn) btn.disabled = !!err;
  const msg = document.getElementById('setup-msg');
  if (msg) msg.textContent = err ?? '';
}

function renderSetup() {
  const s = setup;
  const fixed = fixed4(s.type);
  const rows = s.names.map((n, i) => `
    <div class="name-row">
      <span class="seat">${i + 1}</span>
      <input type="text" inputmode="text" autocomplete="off" autocapitalize="words" maxlength="16"
        placeholder="Speler ${i + 1}" value="${esc(n)}" data-name="${i}" enterkeyhint="next">
      ${!fixed && s.names.length > P.MIN_PLAYERS ? `<button class="btn btn-icon" data-act="setup-remove" data-i="${i}" aria-label="Verwijder speler">✕</button>` : ''}
    </div>`).join('');
  let extra = '';
  if (s.type === 'wiezen') {
    extra = `
      <h2>Aantal rondes</h2>
      <div class="seg">${[8, 12, 16, 20, 24].map((r) => `
        <button class="btn chip" aria-pressed="${s.targetRounds === r}" data-act="setup-rounds" data-n="${r}">${r}</button>`).join('')}
      </div>`;
  } else if (s.type === 'harten') {
    extra = `
      <h2>Spelen tot</h2>
      <div class="seg seg-${H.LIMITS.length}">${H.LIMITS.map((l) => `
        <button class="btn chip" aria-pressed="${s.limit === l}" data-act="setup-limit" data-n="${l}">${l} <small>strafpunten</small></button>`).join('')}
      </div>
      <p class="note">Het spel stopt zodra iemand de limiet bereikt. Minste strafpunten wint.</p>`;
  } else {
    const n = s.names.length;
    extra = `<p class="note">Max ${P.maxCards(n)} kaarten per speler · ${P.roundPlan(n).length} rondes (1 → ${P.maxCards(n)} → 1)</p>`;
  }
  return `
    <h2>Spelers</h2>
    <p class="note">${fixed ? 'Precies 4 spelers. ' : ''}Vul in volgens zitvolgorde (met de klok mee). Speler 1 deelt eerst.</p>
    <div class="stack">${rows}</div>
    ${!fixed && s.names.length < P.MAX_PLAYERS ? `<button class="btn btn-ghost" data-act="setup-add">+ Speler toevoegen</button>` : ''}
    ${extra}
    <div class="bottom-bar">
      <p id="setup-msg" class="msg"></p>
      <button id="start-btn" class="btn btn-primary btn-xl" data-act="setup-start">Start spel</button>
    </div>`;
}

// ---------- game ----------
function renderGame() {
  const g = data.current;
  const t = totals(g);
  const over = isOver(g);
  const n = g.players.length;
  const nextIdx = g.rounds.length;
  const dealer = over ? -1 : dealerAt(g, nextIdx);
  const lead = g.rounds.length ? best(g, t) : null;

  const board = g.players.map((p, i) => `
    <div class="score-card ${t[i] === lead ? 'leader' : ''}">
      <div class="sc-name">${t[i] === lead ? '<span aria-label="leider">👑</span> ' : ''}${esc(p)}</div>
      <div class="sc-total ${tone(g, t[i])}">${num(t[i])}</div>
      ${i === dealer ? '<div class="badge">deler</div>' : ''}
    </div>`).join('');

  let status;
  if (over) {
    const w = winners(g).map((i) => esc(g.players[i])).join(' & ');
    status = `
      <div class="banner">🏆 <strong>${w}</strong> ${winners(g).length > 1 ? 'winnen' : 'wint'} met ${t[winners(g)[0]]} ${unit(g)}</div>
      <button class="btn btn-primary btn-xl" data-act="show-end">Uitslag bekijken</button>`;
  } else {
    let info = progress(g).replace(/^r/, 'R');
    if (g.type === 'harten') info += ` · ${passLabel(nextIdx)}`;
    if (g.type === 'poepen') info += ` · <strong>${P.roundPlan(n)[nextIdx]} kaart${P.roundPlan(n)[nextIdx] > 1 ? 'en' : ''}</strong>`;
    if (g.type === 'wiezen' && nextIdx > 0 && g.rounds[nextIdx - 1].kind === 'pas') info += ' · <span class="badge badge-warn">×2 na rondje pas</span>';
    status = `
      <p class="round-info">${info}</p>
      <button class="btn btn-primary btn-xl" data-act="add-round">+ Ronde invoeren</button>`;
  }

  const tools = g.rounds.length ? `
    <div class="row">
      <button class="btn" data-act="undo">↶ Ongedaan</button>
      <button class="btn" data-act="edit-round" data-i="${g.rounds.length - 1}">✎ Bewerken</button>
    </div>` : '';

  return `
    <div class="scoreboard" style="--cols:${Math.min(n, 4)}">${board}</div>
    ${status}
    ${tools}
    ${renderHistory(g)}
    <div class="row footer-actions">
      ${over ? '' : '<button class="btn btn-ghost" data-act="end-game">Spel beëindigen</button>'}
      <button class="btn btn-ghost" data-act="home">Menu</button>
    </div>`;
}

function renderHistory(g) {
  if (!g.rounds.length) return '<p class="empty">Nog geen rondes gespeeld.</p>';
  const d = deltas(g);
  const c = cumulative(g);
  const n = g.players.length;
  const plan = g.type === 'poepen' ? P.roundPlan(n) : null;
  let played = 0;
  const labels = g.rounds.map((r) => (g.type === 'wiezen' && r.kind === 'pas' ? '–' : ++played));
  const bodies = g.rounds.map((r, i) => {
    let desc;
    if (g.type === 'wiezen') {
      desc = esc(W.describe(r, g.players));
      if (W.isDoubled(g.rounds, i)) desc += ' · <span class="badge badge-warn">×2</span>';
      if (r.kind !== 'pas' && r.kind !== 'miserie') desc += W.isMade(r) ? ' <span class="ok">✓</span>' : ' <span class="ko">✗</span>';
    } else if (g.type === 'harten') {
      const moon = H.shooter(r);
      desc = moon != null
        ? `🌙 <strong>${esc(g.players[moon])}</strong> haalt alles`
        : `${passLabel(i)} · ♠V ${esc(g.players[r.queen])}`;
    } else {
      desc = `${plan[i]} kaart${plan[i] > 1 ? 'en' : ''} · deler ${esc(g.players[dealerAt(g, i)])}`;
    }
    const cells = g.players.map((_, p) => `
      <td>
        ${g.type === 'poepen' ? `<span class="bidgot ${r.bids[p] === r.got[p] ? 'hit' : ''}">${r.bids[p]}/${r.got[p]}</span>` : ''}
        ${g.type === 'harten' ? `<span class="bidgot">♥${r.hearts[p]}${r.queen === p ? ' ♠V' : ''}</span>` : ''}
        <span class="delta ${tone(g, d[i][p])}">${fmt(d[i][p])}</span>
        <span class="cum">${num(c[i][p])}</span>
      </td>`).join('');
    return `
      <tbody class="hist-round" data-act="edit-round" data-i="${i}">
        <tr class="hist-desc"><td colspan="${n}"><b>${labels[i] === '–' ? '–' : '#' + labels[i]}</b> ${desc}</td></tr>
        <tr class="hist-nums">${cells}</tr>
      </tbody>`;
  }).reverse().join('');
  return `
    <h2>Rondes <small>tik om te bewerken</small></h2>
    <div class="table-wrap">
      <table class="history" style="--n:${n}">
        <thead><tr>${g.players.map((p) => `<th>${esc(p)}</th>`).join('')}</tr></thead>
        ${bodies}
      </table>
    </div>`;
}

// ---------- round entry ----------
function openEntry(editIndex = null) {
  const g = data.current;
  const idx = editIndex ?? g.rounds.length;
  const existing = editIndex != null ? structuredClone(g.rounds[editIndex]) : null;
  if (g.type === 'wiezen') {
    draft = { kind: null, players: [], level: null, trump: null, tricks: null, troelChanged: false, miserie: [], ...existing };
  } else if (g.type === 'harten') {
    draft = existing ?? { hearts: Array(H.PLAYERS).fill(0), queen: null };
    draft.cards = H.HEARTS; // stepper max
  } else {
    const n = g.players.length;
    draft = existing ?? { bids: Array(n).fill(0), got: Array(n).fill(0) };
    draft.cards = P.roundPlan(n)[idx];
  }
  draft.editIndex = editIndex;
  draft.index = idx;
  go('entry');
}

function cleanWiezen(d) {
  if (d.kind === 'pas') return { kind: 'pas' };
  if (d.kind === 'miserie') return { kind: 'miserie', miserie: d.miserie.map((m) => ({ ...m })) };
  const c = W.CONTRACTS[d.kind];
  const r = { kind: d.kind, players: [...d.players], tricks: d.tricks, trump: d.trump };
  if (c?.levels) r.level = d.level;
  if (d.kind === 'troel') r.troelChanged = !!d.troelChanged;
  return r;
}

function renderEntry() {
  return { wiezen: renderWiezenEntry, poepen: renderPoepenEntry, harten: renderHartenEntry }[data.current.type]();
}

function renderWiezenEntry() {
  const g = data.current;
  const d = draft;
  const names = g.players;
  const c = W.CONTRACTS[d.kind];
  const doubled = d.index > 0 && g.rounds[d.index - 1]?.kind === 'pas' && d.kind !== 'pas';

  const kinds = Object.entries(W.CONTRACTS).map(([k, m]) => `
    <button class="btn chip contract ${k === 'pas' ? 'pas' : ''}" aria-pressed="${d.kind === k}" data-act="w-kind" data-k="${k}">
      <strong>${m.label}</strong><small>${m.hint}</small>
    </button>`).join('');

  let html = `
    ${doubled ? '<div class="banner warn">Vorige ronde was een rondje pas: deze ronde telt <strong>×2</strong></div>' : ''}
    <h2>Contract</h2>
    <div class="grid-2">${kinds}</div>`;

  if (c && d.kind !== 'pas') {
    // players
    if (d.kind === 'miserie') {
      const mis = (p) => d.miserie.find((m) => m.player === p);
      html += `<h2>Wie speelt miserie? <small>1 of meer</small></h2>
        <div class="grid-2">${names.map((p, i) => `
          <button class="btn chip" aria-pressed="${!!mis(i)}" data-act="w-mis-player" data-p="${i}">${esc(p)}</button>`).join('')}
        </div>`;
      html += d.miserie.map((m) => `
        <div class="mis-row">
          <div class="mis-name">${esc(names[m.player])}</div>
          <div class="seg seg-4">${Object.entries(W.MISERIE).map(([t, mm]) => `
            <button class="btn chip small" aria-pressed="${m.type === t}" data-act="w-mis-type" data-p="${m.player}" data-t="${t}">${mm.short}<small>${mm.value}</small></button>`).join('')}
          </div>
          <div class="seg seg-2">
            <button class="btn chip good" aria-pressed="${m.ok === true}" data-act="w-mis-ok" data-p="${m.player}" data-ok="1">✓ Gelukt</button>
            <button class="btn chip bad" aria-pressed="${m.ok === false}" data-act="w-mis-ok" data-p="${m.player}" data-ok="0">✗ Mislukt</button>
          </div>
        </div>`).join('');
    } else {
      const need = c.players;
      const title = need === 2 ? (d.kind === 'troel' ? 'Wie speelt troel? <small>kies 2</small>' : 'Wie vraagt en wie gaat mee? <small>kies 2</small>') : 'Wie speelt? <small>kies 1</small>';
      html += `<h2>${title}</h2>
        <div class="grid-2">${names.map((p, i) => {
          const pos = d.players.indexOf(i);
          const tag = need === 2 && pos >= 0 && d.kind === 'samen' ? `<small>${pos === 0 ? 'vraagt' : 'gaat mee'}</small>` : '';
          return `<button class="btn chip" aria-pressed="${pos >= 0}" data-act="w-player" data-p="${i}">${esc(p)}${tag}</button>`;
        }).join('')}
        </div>`;

      if (c.levels) {
        html += `<h2>Aantal slagen geboden</h2>
          <div class="seg seg-${c.levels.length}">${c.levels.map((l) => `
            <button class="btn chip" aria-pressed="${d.level === l}" data-act="w-level" data-n="${l}">${l}</button>`).join('')}
          </div>`;
      }
      if (d.kind === 'troel') {
        html += `<h2>Troef</h2>
          <div class="seg seg-2">
            <button class="btn chip" aria-pressed="${!d.troelChanged}" data-act="w-troel" data-v="0">Behouden <small>8 slagen</small></button>
            <button class="btn chip" aria-pressed="${!!d.troelChanged}" data-act="w-troel" data-v="1">Veranderd <small>9 slagen</small></button>
          </div>`;
      }
      html += `<h2>Troefkleur <small>optioneel</small></h2>
        <div class="seg seg-4">${W.SUITS.map((s) => `
          <button class="btn chip suit ${s.red ? 'red' : ''}" aria-pressed="${d.trump === s.id}" data-act="w-trump" data-s="${s.id}" aria-label="${s.name}">${s.sym}</button>`).join('')}
        </div>`;

      const need2 = W.required(cleanWiezen(d));
      html += `<h2>Slagen gehaald ${need === 2 ? 'door het team' : ''} <small>nodig: ${need2}</small></h2>
        <div class="tricks">${Array.from({ length: 14 }, (_, t) => `
          <button class="btn chip ${t >= need2 ? 'made' : 'down'}" aria-pressed="${d.tricks === t}" data-act="w-tricks" data-n="${t}">${t}</button>`).join('')}
        </div>`;
    }
  }

  const round = d.kind ? cleanWiezen(d) : { kind: null };
  const err = W.validate(round);
  let preview = '';
  if (!err) {
    if (round.kind === 'pas') {
      preview = '<div class="preview"><p>Niemand krijgt punten. Dezelfde deler deelt opnieuw en de volgende ronde telt <strong>×2</strong>.</p></div>';
    } else {
      const s = W.scoreRound(round).map((x) => (doubled ? 2 * x : x));
      const made = W.isMade(round);
      preview = `<div class="preview">
        ${made == null ? '' : `<p class="${made ? 'ok' : 'ko'}">${made ? '✓ Contract gehaald' : '✗ Contract niet gehaald'}</p>`}
        <div class="preview-grid">${names.map((p, i) => `<span>${esc(p)}</span><b class="${cls(s[i])}">${fmt(s[i])}</b>`).join('')}</div>
      </div>`;
    }
  }
  return html + preview + entryBar(err);
}

function renderPoepenEntry() {
  const g = data.current;
  const d = draft;
  const n = g.players.length;
  const dealer = dealerAt(g, d.index);
  const order = Array.from({ length: n }, (_, k) => (dealer + 1 + k) % n);
  const sumBid = d.bids.reduce((a, b) => a + b, 0);
  const sumGot = d.got.reduce((a, b) => a + b, 0);
  const forbidden = d.cards - (sumBid - d.bids[dealer]);

  const rows = order.map((p) => {
    const hit = d.bids[p] === d.got[p];
    const pts = P.scorePlayer(d.bids[p], d.got[p]);
    const warn = p === dealer && forbidden >= 0 && forbidden <= d.cards
      ? `<p class="hint ${d.bids[p] === forbidden ? 'bad' : ''}">Deler mag geen ${forbidden} vragen</p>` : '';
    return `
      <div class="p-row ${p === dealer ? 'dealer' : ''}">
        <div class="p-head">
          <strong>${esc(g.players[p])}</strong>${p === dealer ? ' <span class="badge">deler</span>' : ''}
          <span class="p-pts ${cls(pts)}">${fmt(pts)} ${hit ? '✓' : ''}</span>
        </div>
        <div class="p-steps">
          ${stepper('Gevraagd', 'bids', p, d.bids[p], d.cards)}
          ${stepper('Gehaald', 'got', p, d.got[p], d.cards)}
        </div>
        ${warn}
      </div>`;
  }).join('');

  const err = sumGot !== d.cards ? `Totaal gehaald moet ${d.cards} zijn (nu ${sumGot})` : null;
  return `
    <p class="round-info big">${d.cards} kaart${d.cards > 1 ? 'en' : ''} per speler${d.cards === 1 && d.index === 0 ? ' · kaart voor je hoofd!' : ''}</p>
    <div class="sums">
      <span class="${sumBid === d.cards ? 'warn-text' : ''}">Gevraagd: <b>${sumBid}</b> / ${d.cards}</span>
      <span class="${sumGot === d.cards ? 'ok' : 'ko'}">Gehaald: <b>${sumGot}</b> / ${d.cards}</span>
    </div>
    <div class="stack">${rows}</div>
    ${entryBar(err)}`;
}

function renderHartenEntry() {
  const g = data.current;
  const d = draft;
  const round = { hearts: d.hearts, queen: d.queen };
  const sum = d.hearts.reduce((a, b) => a + b, 0);
  const err = H.validate(round);

  const rows = g.players.map((name, p) => `
    <div class="p-row">
      <div class="p-head"><strong>${esc(name)}</strong></div>
      <div class="p-steps">
        ${stepper('Harten ♥', 'hearts', p, d.hearts[p], d.cards)}
        <div class="stepper">
          <span class="st-label">Schoppenvrouw</span>
          <button class="btn chip suit" aria-pressed="${d.queen === p}" data-act="h-queen" data-p="${p}">♠V</button>
        </div>
      </div>
    </div>`).join('');

  let preview = '';
  if (!err) {
    const s = H.scoreRound(round);
    const moon = H.shooter(round);
    preview = `<div class="preview">
      ${moon != null ? `<p class="ok">🌙 ${esc(g.players[moon])} haalt alles: de anderen krijgen elk ${H.TOTAL}</p>` : ''}
      <div class="preview-grid">${g.players.map((p, i) => `<span>${esc(p)}</span><b class="${tone(g, s[i])}">${fmt(s[i])}</b>`).join('')}</div>
    </div>`;
  }
  return `
    <p class="round-info big">${passLabel(d.index)}</p>
    <div class="sums">
      <span class="${sum === H.HEARTS ? 'ok' : 'ko'}">Harten: <b>${sum}</b> / ${H.HEARTS}</span>
      <span class="${d.queen != null ? 'ok' : 'ko'}">♠V: <b>${d.queen != null ? esc(g.players[d.queen]) : '?'}</b></span>
    </div>
    <div class="stack">${rows}</div>
    ${preview}
    ${entryBar(err)}`;
}

function stepper(label, field, p, val, max) {
  return `
    <div class="stepper">
      <span class="st-label">${label}</span>
      <div class="st-ctrl">
        <button class="btn st-btn" data-act="p-step" data-f="${field}" data-p="${p}" data-d="-1" ${val <= 0 ? 'disabled' : ''} aria-label="${label} min">−</button>
        <span class="st-val">${val}</span>
        <button class="btn st-btn" data-act="p-step" data-f="${field}" data-p="${p}" data-d="1" ${val >= max ? 'disabled' : ''} aria-label="${label} plus">+</button>
      </div>
    </div>`;
}

function entryBar(err) {
  return `
    <div class="bottom-bar">
      <p class="msg">${err ? esc(err) : ''}</p>
      <div class="row">
        <button class="btn" data-act="back">Annuleren</button>
        <button class="btn btn-primary grow" data-act="entry-save" ${err ? 'disabled' : ''}>${draft.editIndex != null ? 'Opslaan' : 'Ronde opslaan'}</button>
      </div>
    </div>`;
}

// ---------- end ----------
function renderEnd() {
  const g = data.current;
  const t = totals(g);
  const dir = GAMES[g.type].lowWins ? 1 : -1;
  const order = g.players.map((_, i) => i).sort((a, b) => dir * (t[a] - t[b]));
  const w = winners(g);
  let rank = 0;
  const list = order.map((i, k) => {
    if (k === 0 || t[i] !== t[order[k - 1]]) rank = k + 1;
    return `<li class="${w.includes(i) ? 'win' : ''}"><span class="rank">${rank}</span><span class="rk-name">${esc(g.players[i])}</span><b class="${tone(g, t[i])}">${num(t[i])}</b></li>`;
  }).join('');
  return `
    <div class="trophy">🏆</div>
    <p class="winner-name">${w.map((i) => esc(g.players[i])).join(' & ')}</p>
    <p class="winner-sub">${w.length > 1 ? 'Gedeelde winst' : 'wint'} · ${doneRounds(g)} rondes ${GAMES[g.type].name.toLowerCase()}</p>
    <ol class="ranking">${list}</ol>
    <div class="stack">
      <button class="btn btn-primary btn-xl" data-act="rematch">Zelfde spelers opnieuw</button>
      <button class="btn" data-act="back">Scoreblad bekijken</button>
      <button class="btn btn-ghost" data-act="new-game">Nieuw spel</button>
    </div>`;
}

// ---------- actions ----------
const actions = {
  back,
  theme() {
    data.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    save();
    applyTheme();
  },
  home() {
    go('home');
  },
  resume() {
    go('game');
  },
  new({ type }) {
    const g = data.current;
    if (g && g.rounds.length && !isOver(g) && !confirm('Er loopt nog een spel. Toch een nieuw spel starten?')) return;
    startSetup(type);
  },
  'setup-limit'({ n }) {
    setup.limit = +n;
    render();
  },
  'setup-rounds'({ n }) {
    setup.targetRounds = +n;
    render();
  },
  'setup-add'() {
    setup.names.push('');
    render();
    app.querySelector(`[data-name="${setup.names.length - 1}"]`)?.focus();
  },
  'setup-remove'({ i }) {
    setup.names.splice(+i, 1);
    render();
  },
  'setup-start'() {
    if (setupError()) return;
    const players = setup.names.map((n) => n.trim());
    archiveCurrent();
    data.lastNames[setup.type] = players;
    data.current = {
      id: Date.now(), type: setup.type, players, rounds: [],
      targetRounds: setup.type === 'wiezen' ? setup.targetRounds : null,
      limit: setup.type === 'harten' ? setup.limit : null,
      createdAt: new Date().toISOString(), ended: false,
    };
    save();
    setup = null;
    go('game', true);
  },
  'add-round'() {
    openEntry();
  },
  'edit-round'({ i }) {
    openEntry(+i);
  },
  undo() {
    const g = data.current;
    if (!g.rounds.length || !confirm(`Ronde ${g.rounds.length} ongedaan maken?`)) return;
    g.rounds.pop();
    g.ended = false;
    save();
    render();
  },
  'end-game'() {
    if (!confirm('Spel nu beëindigen? De huidige leider wint.')) return;
    data.current.ended = true;
    save();
    go('end');
  },
  'show-end'() {
    go('end');
  },
  rematch() {
    const g = data.current;
    startSetup(g.type, g.players);
  },
  'new-game'() {
    archiveCurrent();
    save();
    go('home', true);
  },

  // wiezen entry
  'w-kind'({ k }) {
    const c = W.CONTRACTS[k];
    draft.kind = k;
    if (typeof c.players === 'number') draft.players = draft.players.slice(0, c.players);
    draft.level = c.levels ? (c.levels.includes(draft.level) ? draft.level : c.levels[0]) : null;
    render();
  },
  'w-player'({ p }) {
    const c = W.CONTRACTS[draft.kind];
    const i = +p;
    const pos = draft.players.indexOf(i);
    if (pos >= 0) draft.players.splice(pos, 1);
    else {
      draft.players.push(i);
      if (draft.players.length > c.players) draft.players.shift();
    }
    render();
  },
  'w-level'({ n }) {
    draft.level = +n;
    render();
  },
  'w-troel'({ v }) {
    draft.troelChanged = v === '1';
    render();
  },
  'w-trump'({ s }) {
    draft.trump = draft.trump === s ? null : s;
    render();
  },
  'w-tricks'({ n }) {
    draft.tricks = +n;
    render();
  },
  'w-mis-player'({ p }) {
    const i = +p;
    const idx = draft.miserie.findIndex((m) => m.player === i);
    if (idx >= 0) draft.miserie.splice(idx, 1);
    else {
      const type = draft.miserie[0]?.type ?? 'klein';
      draft.miserie.push({ player: i, type, ok: undefined });
      draft.miserie.sort((a, b) => a.player - b.player);
    }
    render();
  },
  'w-mis-type'({ p, t }) {
    draft.miserie.find((m) => m.player === +p).type = t;
    render();
  },
  'w-mis-ok'({ p, ok }) {
    draft.miserie.find((m) => m.player === +p).ok = ok === '1';
    render();
  },

  // harten entry
  'h-queen'({ p }) {
    draft.queen = draft.queen === +p ? null : +p;
    render();
  },

  // poepen entry (also used for the harten steppers)
  'p-step'({ f, p, d }) {
    const arr = draft[f];
    arr[+p] = Math.max(0, Math.min(draft.cards, arr[+p] + +d));
    render();
  },

  'entry-save'() {
    const g = data.current;
    let round;
    if (g.type === 'wiezen') {
      round = cleanWiezen(draft);
      if (W.validate(round)) return;
    } else if (g.type === 'harten') {
      round = { hearts: [...draft.hearts], queen: draft.queen };
      if (H.validate(round)) return;
    } else {
      if (draft.got.reduce((a, b) => a + b, 0) !== draft.cards) return;
      round = { bids: [...draft.bids], got: [...draft.got] };
    }
    if (draft.editIndex != null) g.rounds[draft.editIndex] = round;
    else g.rounds.push(round);
    save();
    draft = null;
    afterSave = true;
    back();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el.dataset, el);
});
document.getElementById('back-btn').addEventListener('click', () => {
  if (view === 'game') go('home');
  else back();
});
document.getElementById('theme-btn').addEventListener('click', actions.theme);
app.addEventListener('input', (e) => {
  const i = e.target.dataset.name;
  if (i != null && setup) {
    setup.names[+i] = e.target.value;
    updateSetupValidity();
  }
});
app.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.target.dataset.name == null) return;
  const next = app.querySelector(`[data-name="${+e.target.dataset.name + 1}"]`);
  if (next) next.focus();
  else e.target.blur();
});

// ---------- boot ----------
applyTheme();
view = data.current ? 'game' : 'home';
history.replaceState({ view }, '');
render();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

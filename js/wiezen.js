// Kleurenwiezen scoring (Whisthub rules). Pure functions, no DOM.
// All results are zero-sum over the 4 players.

export const SUITS = [
  { id: 'H', sym: '♥', name: 'Harten', red: true },
  { id: 'D', sym: '♦', name: 'Ruiten', red: true },
  { id: 'C', sym: '♣', name: 'Klaveren', red: false },
  { id: 'S', sym: '♠', name: 'Schoppen', red: false },
];

// kind -> metadata used by both UI and scorer
export const CONTRACTS = {
  samen:     { label: 'Samen',      players: 2, levels: [8, 9, 10, 11, 12, 13], trump: true,  hint: 'Vragen en meegaan' },
  alleen:    { label: 'Alleen',     players: 1, levels: [5, 6, 7, 8],           trump: true,  hint: 'Eén speler tegen drie' },
  abondance: { label: 'Abondance',  players: 1, levels: [9, 10, 11, 12],        trump: true,  hint: 'Min. 9 slagen alleen' },
  troel:     { label: 'Troel',      players: 2, levels: null,                   trump: true,  hint: '3 of 4 azen' },
  miserie:   { label: 'Miserie',    players: [1, 4], levels: null,              trump: false, hint: 'Klein, Piccolo, Groot, Open' },
  solo:      { label: 'Solo slim',  players: 1, levels: null,                   trump: true,  hint: 'Alle 13 slagen' },
  pas:       { label: 'Rondje pas', players: 0, levels: null,                   trump: false, hint: 'Iedereen past: volgende ronde ×2' },
};

export const MISERIE = {
  klein:   { label: 'Kleine miserie', short: 'Klein',   value: 6 },
  piccolo: { label: 'Piccolo',        short: 'Piccolo', value: 8 },
  groot:   { label: 'Grote miserie',  short: 'Groot',   value: 12 },
  open:    { label: 'Open miserie',   short: 'Open',    value: 24 },
};

const SAMEN_WIN = [8, 11, 14, 17, 20, 30]; // indexed by tricks - 8
const ABONDANCE = [10, 15, 20, 30];         // indexed by tricks/level - 9

// Tricks the playing side needs to make the contract.
export function required(round) {
  switch (round.kind) {
    case 'samen':
    case 'alleen':
    case 'abondance': return round.level;
    case 'troel': return round.troelChanged ? 9 : 8;
    case 'solo': return 13;
    default: return null;
  }
}

export function isMade(round) {
  const need = required(round);
  return need == null ? null : round.tricks >= need;
}

// Points per opponent (solo contracts) or per team member (team contracts), signed for the playing side.
function sideValue(round) {
  const t = round.tricks;
  const N = required(round);
  const made = t >= N;
  switch (round.kind) {
    case 'samen':
      return made ? SAMEN_WIN[t - 8] : -(11 + 3 * (N - 8) + 3 * (N - t - 1));
    case 'alleen':
      if (made) return N === 8 ? 7 : Math.min(t, 8) - 2;
      return -((N === 8 ? 8 : N - 1) + (N - t - 1));
    case 'abondance':
      return made ? ABONDANCE[Math.min(t, 12) - 9] : -ABONDANCE[N - 9];
    case 'solo':
      return made ? 60 : -60;
    case 'troel':
      return made ? (t === 13 ? 30 : 16) : -16;
  }
  return 0;
}

// Raw score of one round (without rondje-pas doubling) -> array of 4 deltas.
export function scoreRound(round) {
  const out = [0, 0, 0, 0];
  switch (round.kind) {
    case 'samen':
    case 'troel': {
      const v = sideValue(round);
      for (let p = 0; p < 4; p++) out[p] = round.players.includes(p) ? v : -v;
      break;
    }
    case 'alleen':
    case 'abondance':
    case 'solo': {
      const v = sideValue(round);
      const me = round.players[0];
      for (let p = 0; p < 4; p++) out[p] = p === me ? 3 * v : -v;
      break;
    }
    case 'miserie':
      for (const m of round.miserie) {
        const v = MISERIE[m.type].value * (m.ok ? 1 : -1);
        for (let p = 0; p < 4; p++) out[p] += p === m.player ? 3 * v : -v;
      }
      break;
  }
  return out.map((x) => x + 0); // normalise -0
}

// Scores for a whole list of rounds, applying the rondje-pas doubling.
// Several passes in a row still only double once.
export function scoreRounds(rounds) {
  return rounds.map((r, i) => {
    const doubled = isDoubled(rounds, i);
    return scoreRound(r).map((x) => (doubled ? x * 2 : x));
  });
}

export function isDoubled(rounds, i) {
  return i > 0 && rounds[i].kind !== 'pas' && rounds[i - 1].kind === 'pas';
}

// The dealer stays the same after a rondje pas.
export function dealerFor(rounds, i) {
  let d = 0;
  for (let k = 0; k < i; k++) if (rounds[k].kind !== 'pas') d++;
  return d % 4;
}

// Number of rounds that count towards the game length.
export function playedCount(rounds) {
  return rounds.filter((r) => r.kind !== 'pas').length;
}

export function suitSym(id) {
  return SUITS.find((s) => s.id === id)?.sym ?? '';
}

// Short Dutch description of a round for the history list.
export function describe(round, names) {
  const n = (i) => names[i];
  const suit = round.trump ? ' ' + suitSym(round.trump) : '';
  switch (round.kind) {
    case 'pas': return 'Rondje pas';
    case 'samen':
      return `${n(round.players[0])} + ${n(round.players[1])} · Samen ${round.level}${suit} · ${round.tricks} sl.`;
    case 'troel':
      return `${n(round.players[0])} + ${n(round.players[1])} · Troel${round.troelChanged ? ' (9)' : ''}${suit} · ${round.tricks} sl.`;
    case 'alleen':
      return `${n(round.players[0])} · Alleen ${round.level}${suit} · ${round.tricks} sl.`;
    case 'abondance':
      return `${n(round.players[0])} · Abondance ${round.level}${suit} · ${round.tricks} sl.`;
    case 'solo':
      return `${n(round.players[0])} · Solo slim${suit} · ${round.tricks} sl.`;
    case 'miserie':
      return round.miserie
        .map((m) => `${n(m.player)} ${MISERIE[m.type].short} ${m.ok ? '✓' : '✗'}`)
        .join(' · ');
  }
  return '';
}

// Is the round complete enough to be scored/saved?
export function validate(round) {
  const c = CONTRACTS[round.kind];
  if (!c) return 'Kies een contract';
  if (round.kind === 'pas') return null;
  if (round.kind === 'miserie') {
    if (!round.miserie?.length) return 'Kies minstens één miseriespeler';
    if (round.miserie.some((m) => typeof m.ok !== 'boolean')) return 'Gelukt of niet? Duid aan per speler';
    return null;
  }
  if ((round.players?.length ?? 0) !== c.players)
    return c.players === 2 ? 'Kies 2 spelers' : 'Kies 1 speler';
  if (c.levels && !c.levels.includes(round.level)) return 'Kies het aantal slagen';
  if (!(round.tricks >= 0 && round.tricks <= 13)) return 'Hoeveel slagen gehaald?';
  return null;
}

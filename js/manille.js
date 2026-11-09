// Manillen scoring (Whisthub rules for 4 players; same 30-rule as house rule
// for 2 and 3 players). Pure functions, no DOM.
//
// 60 card points per deal (10 = 5, A = 4, K = 3, Q = 2, J = 1). The side with
// more than 30 scores the excess times the multiplier; the other side gets 0.
// 30-30 is a draw: nobody scores and the next deal counts double.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const TOTAL = 60;
export const HALF = 30;
export const MAX_MULT = 4;
export const TARGETS = [61, 101, 121, 151];
export const DOUBLES = {
  none: { label: 'Niet', mult: 1 },
  mee: { label: 'Mee', mult: 2 },
  tegen: { label: 'Tegen', mult: 4 },
};
// Trump ids follow wiezen's SUITS plus 'zt' (zonder troef).
const SUIT_SYM = { H: '♥', D: '♦', C: '♣', S: '♠' };
export const NO_TRUMP = 'zt';

export function dealerFor(n, i) {
  return i % n;
}

// Players on the dealer's side: 4p partners sit across, otherwise the dealer is alone.
export function dealerSide(n, dealer) {
  return n === 4 ? [dealer, (dealer + 2) % 4] : [dealer];
}

export function isDraw(round) {
  return round.points === HALF;
}

// A deal right after a 30-30 draw counts double (consecutive draws: still once).
export function isDoubled(rounds, i) {
  return i > 0 && isDraw(rounds[i - 1]);
}

export function multiplier(round, afterDraw = false) {
  const m = (round.trump === NO_TRUMP ? 2 : 1) * (DOUBLES[round.double ?? 'none'].mult) * (afterDraw ? 2 : 1);
  return Math.min(MAX_MULT, m);
}

// round = { trump, double, points } where points = dealer side's card points.
export function scoreRound(round, { n, dealer, afterDraw = false }) {
  const out = Array(n).fill(0);
  if (isDraw(round)) return out;
  const mine = dealerSide(n, dealer);
  const dealerWins = round.points > HALF;
  const pts = (Math.max(round.points, TOTAL - round.points) - HALF) * multiplier(round, afterDraw);
  for (let p = 0; p < n; p++) if (mine.includes(p) === dealerWins) out[p] = pts;
  return out;
}

export function scoreRounds(rounds, n) {
  return rounds.map((r, i) => scoreRound(r, { n, dealer: dealerFor(n, i), afterDraw: isDoubled(rounds, i) }));
}

export function isOver(totals, target) {
  return target != null && totals.some((t) => t >= target);
}

export function trumpLabel(trump) {
  return trump === NO_TRUMP ? 'zonder troef' : SUIT_SYM[trump] ?? '';
}

export function describe(round, names, dealer, afterDraw = false) {
  const n = names.length;
  const side = dealerSide(n, dealer).map((i) => names[i]).join(' & ');
  const parts = [`${trumpLabel(round.trump)} · deler ${names[dealer]}`];
  if (round.double && round.double !== 'none') parts.push(DOUBLES[round.double].label.toLowerCase());
  const m = multiplier(round, afterDraw);
  if (m > 1) parts.push(`×${m}`);
  parts.push(isDraw(round) ? 'gelijk 30-30' : `${side}: ${round.points}`);
  return parts.join(' · ');
}

export function validate(round) {
  if (!round.trump) return 'Kies de troef';
  if (!Number.isInteger(round.points) || round.points < 0 || round.points > TOTAL) return `Punten moeten tussen 0 en ${TOTAL} liggen`;
  return null;
}

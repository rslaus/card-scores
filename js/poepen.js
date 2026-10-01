// Chinees poepen scoring. Pure functions, no DOM.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 17; // 17 * 3 = 51 cards + 1 trump card

// Max cards per player: one card of the 52 is turned up for trump.
export function maxCards(n) {
  return Math.floor(51 / n);
}

// Cards per round: 1, 2, ..., max, ..., 2, 1
export function roundPlan(n) {
  const max = maxCards(n);
  const up = Array.from({ length: max }, (_, i) => i + 1);
  return up.concat(up.slice(0, -1).reverse());
}

export function scorePlayer(bid, got) {
  return bid === got ? 6 + 2 * got : -2 * Math.abs(bid - got);
}

// round = { bids: [..], got: [..] } -> deltas per player
export function scoreRound(round) {
  return round.bids.map((b, i) => scorePlayer(b, round.got[i]));
}

export function scoreRounds(rounds) {
  return rounds.map(scoreRound);
}

export function dealerFor(n, i) {
  return i % n;
}

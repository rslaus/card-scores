// Hartenjagen scoring (Whisthub rules). Pure functions, no DOM.
// Scores are penalty points: lower is better.

export const PLAYERS = 4;
export const HEARTS = 13; // 1 point each
export const QUEEN = 13;  // ♠Q
export const TOTAL = HEARTS + QUEEN;
export const LIMITS = [50, 100, 200];
export const PASS = ['links', 'rechts', 'tegenover', 'geen'];

export function passFor(i) {
  return PASS[i % 4];
}

export function dealerFor(i) {
  return i % PLAYERS;
}

// Player who took all hearts and the ♠Q ("alles halen"), or null.
export function shooter(round) {
  const p = round.queen;
  return p != null && round.hearts[p] === HEARTS ? p : null;
}

// round = { hearts: [4 counts], queen: playerIdx } -> penalty points per player
export function scoreRound(round) {
  const moon = shooter(round);
  if (moon != null) return round.hearts.map((_, i) => (i === moon ? 0 : TOTAL));
  return round.hearts.map((h, i) => h + (i === round.queen ? QUEEN : 0));
}

export function scoreRounds(rounds) {
  return rounds.map(scoreRound);
}

export function isOver(totals, limit) {
  return totals.some((t) => t >= limit);
}

// Is the round complete enough to be scored/saved?
export function validate(round) {
  const sum = round.hearts.reduce((a, b) => a + b, 0);
  if (sum !== HEARTS) return `Totaal harten moet ${HEARTS} zijn (nu ${sum})`;
  if (round.queen == null) return 'Wie haalde de schoppenvrouw?';
  return null;
}

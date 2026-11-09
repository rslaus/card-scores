import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../js/wiezen.js';
import * as P from '../js/poepen.js';
import * as H from '../js/harten.js';
import * as M from '../js/manille.js';

const sum = (a) => a.reduce((x, y) => x + y, 0);

test('Alleen 6, haalt 7: +15 / -5', () => {
  assert.deepEqual(W.scoreRound({ kind: 'alleen', players: [0], level: 6, tricks: 7 }), [15, -5, -5, -5]);
});

test('Samen 12, haalt 10: -26 each, opponents +26', () => {
  assert.deepEqual(W.scoreRound({ kind: 'samen', players: [0, 1], level: 12, tricks: 10 }), [-26, -26, 26, 26]);
});

test('Alleen 7, haalt 10: +18 / -6 (no overtricks above 8)', () => {
  assert.deepEqual(W.scoreRound({ kind: 'alleen', players: [2], level: 7, tricks: 10 }), [-6, -6, 18, -6]);
});

test('Abondance 9, haalt 11: +60 / -20', () => {
  assert.deepEqual(W.scoreRound({ kind: 'abondance', players: [1], level: 9, tricks: 11 }), [-20, 60, -20, -20]);
});

test('Abondance 11, haalt 9: -60 / +20', () => {
  assert.deepEqual(W.scoreRound({ kind: 'abondance', players: [1], level: 11, tricks: 9 }), [20, -60, 20, 20]);
});

test('Double grote miserie: one wins, one loses -> 48 / -48 / 0 / 0', () => {
  const r = { kind: 'miserie', miserie: [{ player: 0, type: 'groot', ok: true }, { player: 1, type: 'groot', ok: false }] };
  assert.deepEqual(W.scoreRound(r), [48, -48, 0, 0]);
});

test('Troel with changed trump, 8 tricks: fails, -16', () => {
  assert.deepEqual(W.scoreRound({ kind: 'troel', players: [0, 3], troelChanged: true, tricks: 8 }), [-16, 16, 16, -16]);
});

test('Troel, all 13 tricks: +30', () => {
  assert.deepEqual(W.scoreRound({ kind: 'troel', players: [0, 3], tricks: 13 }), [30, -30, -30, 30]);
});

test('Samen table values', () => {
  const s = (level, tricks) => W.scoreRound({ kind: 'samen', players: [0, 1], level, tricks })[0];
  assert.deepEqual([8, 9, 10, 11, 12, 13].map((t) => s(8, t)), [8, 11, 14, 17, 20, 30]);
  assert.deepEqual([7, 6, 5].map((t) => s(8, t)), [-11, -14, -17]);
  assert.equal(s(9, 9), 11);
  assert.equal(s(9, 8), -14);
  assert.equal(s(13, 12), -26);
  assert.equal(s(13, 13), 30);
});

test('Alleen table values', () => {
  const a = (level, tricks) => W.scoreRound({ kind: 'alleen', players: [0], level, tricks })[1];
  assert.deepEqual([5, 6, 7, 8].map((t) => -a(5, t)), [3, 4, 5, 6]);
  assert.deepEqual([4, 3].map((t) => a(5, t)), [4, 5]);
  assert.equal(-a(8, 8), 7);
  assert.equal(a(8, 7), 8);
  assert.equal(a(8, 6), 9);
  assert.equal(a(7, 6), 6);
});

test('Solo slim ±60 per opponent', () => {
  assert.deepEqual(W.scoreRound({ kind: 'solo', players: [0], tricks: 13 }), [180, -60, -60, -60]);
  assert.deepEqual(W.scoreRound({ kind: 'solo', players: [0], tricks: 12 }), [-180, 60, 60, 60]);
});

test('every contract is zero-sum', () => {
  for (const kind of ['samen', 'alleen', 'abondance', 'troel', 'solo']) {
    const levels = W.CONTRACTS[kind].levels ?? [null];
    for (const level of levels) for (let t = 0; t <= 13; t++) for (const troelChanged of [false, true]) {
      const players = W.CONTRACTS[kind].players === 2 ? [1, 2] : [3];
      assert.equal(sum(W.scoreRound({ kind, players, level, tricks: t, troelChanged })), 0, `${kind} ${level} ${t}`);
    }
  }
  for (const type of Object.keys(W.MISERIE)) {
    const r = { kind: 'miserie', miserie: [{ player: 0, type, ok: true }, { player: 2, type: 'klein', ok: false }] };
    assert.equal(sum(W.scoreRound(r)), 0);
  }
});

test('rondje pas doubles next round only once, dealer stays', () => {
  const rounds = [
    { kind: 'alleen', players: [0], level: 5, tricks: 5 },
    { kind: 'pas' },
    { kind: 'pas' },
    { kind: 'alleen', players: [0], level: 5, tricks: 5 },
    { kind: 'alleen', players: [0], level: 5, tricks: 5 },
  ];
  const s = W.scoreRounds(rounds);
  assert.deepEqual(s[1], [0, 0, 0, 0]);
  assert.deepEqual(s[3], [18, -6, -6, -6]);
  assert.deepEqual(s[4], [9, -3, -3, -3]);
  assert.deepEqual(rounds.map((_, i) => W.dealerFor(rounds, i)), [0, 1, 1, 1, 2]);
  assert.equal(W.playedCount(rounds), 3);
});

test('poepen scoring examples', () => {
  assert.equal(P.scorePlayer(2, 2), 10);
  assert.equal(P.scorePlayer(0, 0), 6);
  assert.equal(P.scorePlayer(3, 4), -2);
  assert.equal(P.scorePlayer(0, 4), -8);
});

test('poepen round plan', () => {
  assert.equal(P.maxCards(5), 10);
  const plan = P.roundPlan(5);
  assert.equal(plan.length, 19);
  assert.deepEqual(plan.slice(8, 11), [9, 10, 9]);
  assert.equal(plan[0], 1);
  assert.equal(plan.at(-1), 1);
  assert.equal(P.maxCards(4), 12);
});

test('harten: hearts plus queen of spades', () => {
  assert.deepEqual(H.scoreRound({ hearts: [3, 5, 0, 5], queen: 1 }), [3, 18, 0, 5]);
  assert.deepEqual(H.scoreRound({ hearts: [0, 0, 13, 0], queen: 3 }), [0, 0, 13, 13]);
});

test('harten: every normal round hands out 26 points', () => {
  for (let h = 0; h <= 13; h++) for (let q = 0; q < 4; q++) {
    const r = { hearts: [h, 13 - h, 0, 0], queen: q };
    if (H.shooter(r) == null) assert.equal(sum(H.scoreRound(r)), 26);
  }
});

test('harten: alles halen gives the others 26 each', () => {
  assert.deepEqual(H.scoreRound({ hearts: [13, 0, 0, 0], queen: 0 }), [0, 26, 26, 26]);
  assert.equal(H.shooter({ hearts: [0, 0, 13, 0], queen: 2 }), 2);
  assert.equal(H.shooter({ hearts: [13, 0, 0, 0], queen: 1 }), null);
});

test('harten: validate', () => {
  assert.ok(H.validate({ hearts: [3, 3, 3, 3], queen: 0 }));
  assert.ok(H.validate({ hearts: [4, 3, 3, 3], queen: null }));
  assert.equal(H.validate({ hearts: [4, 3, 3, 3], queen: 2 }), null);
});

test('harten: pass cycle and game end', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(H.passFor), ['links', 'rechts', 'tegenover', 'geen', 'links']);
  assert.equal(H.isOver([99, 0, 50, 20], 100), false);
  assert.equal(H.isOver([100, 0, 50, 20], 100), true);
  assert.equal(H.isOver([12, 0, 130, 20], 100), true);
});

// ---------- manille ----------
const m = (trump, double, points) => ({ trump, double, points });

test('Manille 4p: dealer team 39 -> partners +9', () => {
  assert.deepEqual(M.scoreRound(m('H', 'none', 39), { n: 4, dealer: 0 }), [9, 0, 9, 0]);
});

test('Manille 4p: dealer team 21 -> other team +9', () => {
  assert.deepEqual(M.scoreRound(m('S', 'none', 21), { n: 4, dealer: 1 }), [9, 0, 9, 0]);
});

test('Manille multipliers: zonder ×2, mee ×2, tegen ×4, capped at ×4', () => {
  assert.equal(M.multiplier(m('zt', 'none', 40)), 2);
  assert.equal(M.multiplier(m('H', 'mee', 40)), 2);
  assert.equal(M.multiplier(m('H', 'tegen', 40)), 4);
  assert.equal(M.multiplier(m('zt', 'mee', 40)), 4);
  assert.equal(M.multiplier(m('zt', 'tegen', 40)), 4);
  assert.equal(M.multiplier(m('H', 'mee', 40), true), 4);
  assert.deepEqual(M.scoreRound(m('zt', 'mee', 60), { n: 4, dealer: 2 }), [120, 0, 120, 0]);
});

test('Manille draw: 30-30 scores nothing and doubles the next deal once', () => {
  const rounds = [m('H', 'none', 30), m('D', 'none', 30), m('C', 'none', 40)];
  const s = M.scoreRounds(rounds, 4);
  assert.deepEqual(s[0], [0, 0, 0, 0]);
  assert.deepEqual(s[1], [0, 0, 0, 0]);
  // round 2 dealt by player 2, doubled once after the draw: (40-30)*2
  assert.deepEqual(s[2], [20, 0, 20, 0]);
});

test('Manille 3p: dealer alone; duo win scores for both defenders', () => {
  assert.deepEqual(M.scoreRound(m('H', 'none', 25), { n: 3, dealer: 1 }), [5, 0, 5]);
  assert.deepEqual(M.scoreRound(m('H', 'none', 45), { n: 3, dealer: 1 }), [0, 15, 0]);
});

test('Manille 2p: each for themselves', () => {
  assert.deepEqual(M.scoreRound(m('C', 'tegen', 33), { n: 2, dealer: 1 }), [0, 12]);
  assert.deepEqual(M.scoreRound(m('C', 'none', 10), { n: 2, dealer: 1 }), [20, 0]);
});

test('Manille dealer rotates every deal, game ends at target, null = open-ended', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => M.dealerFor(4, i)), [0, 1, 2, 3, 0]);
  assert.equal(M.isOver([101, 0, 101, 0], 101), true);
  assert.equal(M.isOver([100, 0, 100, 0], 101), false);
  assert.equal(M.isOver([500, 0, 500, 0], null), false);
});

test('Manille validate', () => {
  assert.match(M.validate(m(null, 'none', 30)), /troef/);
  assert.match(M.validate(m('H', 'none', 61)), /tussen/);
  assert.equal(M.validate(m('zt', 'none', 0)), null);
});

// ---------- open-ended games ----------
test('Harten without limit never ends', () => {
  assert.equal(H.isOver([999, 0, 0, 0], null), false);
  assert.equal(H.isOver([100, 0, 0, 0], 100), true);
});

test('Poepen endless repeats the 1 -> max -> 1 series', () => {
  const plan = P.roundPlan(4); // 1..12..1, 23 rounds
  assert.equal(P.cardsFor(4, plan.length, false), undefined);
  assert.equal(P.cardsFor(4, plan.length, true), 1);
  assert.equal(P.cardsFor(4, plan.length + 11, true), 12);
});

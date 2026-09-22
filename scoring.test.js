import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreFor, roundComplete, totals, createGame, validGame, schedule, dealerFor, playerOrder, bidSummary, forbiddenBid, nextBid, roundReady, migrateGame, maxCardsForPlayers, smokeBreakDefault } from './scoring.js';

test('exacte voorspelling geeft 10 bonus en 5 per slag, ook bij nul', () => {
  assert.equal(scoreFor({ bid: 0, outcome: 'correct', manual: null }), 10);
  assert.equal(scoreFor({ bid: 3, outcome: 'correct', manual: null }), 25);
});

test('handmatige negatieve scores verschillen van openstaande scores', () => {
  const game = createGame(['Sam', 'Noor'], 2, 5);
  assert.equal(roundComplete(game.rounds[0]), false);
  game.rounds[0][0] = { bid: 2, outcome: 'wrong', manual: -5 };
  game.rounds[0][1] = { bid: 1, outcome: 'wrong', manual: -15 };
  assert.equal(roundComplete(game.rounds[0]), true);
  assert.deepEqual(totals(game), [-5, -15]);
  game.rounds[1][0] = { bid: 3, outcome: 'correct', manual: -5 };
  assert.deepEqual(totals(game), [20, -15]);
  game.rounds[0][1].manual = -10;
  assert.deepEqual(totals(game), [20, -10]);
});

test('opslagvalidatie beschermt tegen onvolledige en ongeldige speldata', () => {
  const game = createGame(['Sam', 'Noor'], 10, 5);
  assert.ok(validGame(JSON.parse(JSON.stringify(game))));
  assert.equal(validGame(null), false);
  assert.equal(validGame({ ...game, active: 20 }), false);
  assert.equal(validGame({ ...game, step: 0 }), false);
  assert.equal(validGame({ ...game, finished: true }), false);
  game.rounds[0][0].outcome = 'correct';
  assert.equal(validGame(game), false);
  game.rounds[0][0].bid = 0;
  assert.ok(validGame(game));
  game.rounds[0][0].manual = '10';
  assert.equal(validGame(game), false);
  game.rounds[0][0].manual = 0;
  assert.equal(validGame(game), false);
});

test('opgeslagen niet-negatieve foute scores worden negatief gemigreerd', () => {
  const game = createGame(['Sam', 'Noor'], 1, 5);
  game.rounds[0][0] = { bid: 1, outcome: 'wrong', manual: 0 };
  game.rounds[1][1] = { bid: 1, outcome: 'wrong', manual: 10 };
  const migrated = migrateGame(game);
  assert.equal(migrated.rounds[0][0].manual, -5);
  assert.equal(migrated.rounds[1][1].manual, -5);
});

test('rookpauze staat standaard aan voor Luuk of Niels', () => {
  assert.equal(smokeBreakDefault(['Sam', 'Luuk']), true);
  assert.equal(smokeBreakDefault(['NIELS', 'Sam']), true);
  assert.equal(smokeBreakDefault(['Niels de Boer', 'Sam']), false);
  assert.equal(createGame(['Sam', 'Luuk'], 8, 5).smokeBreakShown, false);
});

test('schema bevat beide hoogste rondes en loopt volledig terug', () => {
  assert.deepEqual(schedule(3), [1, 2, 3, 3, 2, 1]);
  assert.deepEqual(schedule(1), [1, 1]);
  assert.equal(schedule(10).length, 20);
});

test('52 kaarten begrenzen het maximum en behouden een symmetrisch rondeschema', () => {
  for (let players = 2; players <= 12; players++) {
    const limit = maxCardsForPlayers(players);
    assert.ok(limit * players <= 52);
    assert.ok((limit + 1) * players > 52);
    const game = createGame(Array.from({ length: players }, (_, i) => `Speler ${i}`), 50, 5);
    assert.equal(game.rounds.length, limit * 2);
    assert.deepEqual(game.tricks, schedule(limit));
  }
  assert.equal(maxCardsForPlayers(6), 8);
  const names = ['A', 'B', 'C', 'D', 'E', 'F'];
  assert.equal(createGame(names, 10, 5).rounds.length, 16);
  assert.equal(createGame(names, 3, 5).rounds.length, 6);
});

test('schudder roteert en begint na de schudder, ook bij de terugweg', () => {
  const game = createGame(['A', 'B', 'C', 'D'], 3, 5, 2);
  assert.equal(dealerFor(game), 2);
  assert.deepEqual(playerOrder(game), [3, 0, 1, 2]);
  assert.equal(dealerFor(game, 1), 3);
  assert.deepEqual(playerOrder(game, 1), [0, 1, 2, 3]);
  assert.equal(dealerFor(game, 4), 2);
});

test('hoger totaal mag, gelijk totaal niet; stapper slaat verboden bod over', () => {
  const game = createGame(['A', 'B', 'C'], 5, 5);
  game.active = 4;
  game.rounds[4][1].bid = 3;
  game.rounds[4][2].bid = 1;
  assert.equal(forbiddenBid(game, 0), 1);
  assert.equal(nextBid(game, 0, 1), 2);
  game.rounds[4][0].bid = 0;
  assert.equal(nextBid(game, 0, 1), 2);
  game.rounds[4][0].bid = 2;
  assert.equal(nextBid(game, 0, -1), 0);
  assert.equal(bidSummary(game).valid, true);
  game.rounds[4][0].bid = 1;
  assert.equal(bidSummary(game).valid, false);
  game.rounds[4][0].bid = null;
  assert.equal(bidSummary(game).valid, false);
});

test('afronddrempel gebruikt slagen op terugweg en vereist alle voorspellingen', () => {
  const game = createGame(['A', 'B'], 3, 5);
  game.active = 4; // Ronde 5 heeft 2 slagen.
  game.rounds[4] = [{ bid: 1, outcome: 'correct', manual: null }, { bid: 1, outcome: 'wrong', manual: 0 }];
  assert.equal(roundReady(game), false);
  game.rounds[4][1].bid = 2;
  assert.equal(roundReady(game), true);
  game.rounds[4][1].bid = 3;
  assert.equal(roundReady(game), false);
  game.rounds[4][1].bid = null;
  assert.equal(roundReady(game), false);
});

test('oude opslag behoudt oorspronkelijke scores en rondes; eerste schudder nog kiezen', () => {
  const old = { version: 1, players: ['A', 'B'], step: 5, active: 0, finished: true, rounds: [[{ bid: 5, outcome: 'correct', manual: null }, { bid: null, outcome: 'wrong', manual: -5 }]] };
  const migrated = migrateGame(old);
  assert.ok(validGame(migrated));
  assert.deepEqual(migrated.tricks, [1]);
  assert.equal(migrated.firstDealer, null);
  assert.deepEqual(totals(migrated), [35, -5]);
  assert.deepEqual(migrated.rounds, old.rounds);
  assert.equal(old.version, 1);
  assert.equal(migrateGame({ version: 1, rounds: [] }), null);
  assert.equal(validGame({ ...migrated, firstDealer: 2 }), false);
});

test('spelcellen en rondes zijn onafhankelijk', () => {
  const game = createGame(['Sam', 'Noor'], 2, 5);
  game.rounds[0][0].bid = 4;
  assert.equal(game.rounds[0][1].bid, null);
  assert.equal(game.rounds[1][0].bid, null);
});

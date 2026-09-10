export const MAX_BID = 52;
export const MAX_SCORE = 100000;

export function maxCardsForPlayers(playerCount) {
  return Math.floor(52 / playerCount);
}

export function scoreFor(cell) {
  if (cell.outcome === 'correct' && cell.bid !== null) return 10 + 5 * cell.bid;
  if (cell.outcome === 'wrong') return cell.manual;
  return null;
}

export function roundComplete(round) {
  return round.every(cell => scoreFor(cell) !== null);
}

export function totals(game) {
  return game.players.map((_, index) => game.rounds.reduce((sum, round) => sum + (scoreFor(round[index]) ?? 0), 0));
}

export function schedule(maximum) {
  return [...Array.from({ length: maximum }, (_, i) => i + 1), ...Array.from({ length: maximum }, (_, i) => maximum - i)];
}

export function createGame(players, maximum, step, firstDealer = 0) {
  const tricks = schedule(Math.min(maximum, maxCardsForPlayers(players.length)));
  return { version: 2, players, step, firstDealer, tricks, active: 0, finished: false, rounds: tricks.map(() => players.map(() => ({ bid: null, outcome: null, manual: null }))) };
}

export function dealerFor(game, round = game.active) {
  return game.firstDealer === null ? null : (game.firstDealer + round) % game.players.length;
}

export function playerOrder(game, round = game.active) {
  const dealer = dealerFor(game, round);
  return game.players.map((_, i) => dealer === null ? i : (dealer + 1 + i) % game.players.length);
}

export function bidSummary(game, round = game.active) {
  const cells = game.rounds[round];
  const total = cells.reduce((sum, cell) => sum + (cell.bid ?? 0), 0);
  const filled = cells.filter(cell => cell.bid !== null).length;
  const tricks = game.tricks[round];
  const inRange = cells.every(cell => cell.bid === null || (cell.bid >= 0 && cell.bid <= tricks));
  return { total, filled, tricks, valid: filled === cells.length && total !== tricks && inRange, inRange };
}

export function forbiddenBid(game, player, round = game.active) {
  const others = game.rounds[round].filter((_, i) => i !== player);
  if (others.some(cell => cell.bid === null)) return null;
  const forbidden = game.tricks[round] - others.reduce((sum, cell) => sum + cell.bid, 0);
  return forbidden >= 0 && forbidden <= game.tricks[round] ? forbidden : null;
}

export function nextBid(game, player, direction) {
  const current = game.rounds[game.active][player].bid;
  const max = game.tricks[game.active];
  const forbidden = forbiddenBid(game, player);
  let value = current === null ? (direction > 0 ? 1 : 0) : current + direction;
  if (value === forbidden) value += direction;
  return value >= 0 && value <= max ? value : current;
}

export function roundReady(game, index = game.active) {
  return game.firstDealer !== null && bidSummary(game, index).valid && roundComplete(game.rounds[index]);
}

export function migrateGame(saved) {
  if (saved?.version === 1) {
    const migrated = { ...saved, version: 2, firstDealer: null, tricks: saved.rounds?.map((_, i) => i + 1) };
    return validGame(migrated) ? migrated : null;
  }
  return validGame(saved) ? saved : null;
}

export function validGame(game) {
  return Boolean(game && game.version === 2 && Array.isArray(game.players) && game.players.length >= 2 && game.players.length <= 12
    && game.players.every(name => typeof name === 'string' && name.trim().length > 0 && name.length <= 40)
    && Number.isInteger(game.step) && game.step >= 1 && game.step <= 100
    && (game.firstDealer === null || (Number.isInteger(game.firstDealer) && game.firstDealer >= 0 && game.firstDealer < game.players.length))
    && Array.isArray(game.rounds) && game.rounds.length >= 1 && game.rounds.length <= 100
    && Array.isArray(game.tricks) && game.tricks.length === game.rounds.length && game.tricks.every(n => Number.isInteger(n) && n >= 1 && n <= MAX_BID)
    && Number.isInteger(game.active) && game.active >= 0 && game.active < game.rounds.length && typeof game.finished === 'boolean'
    && game.rounds.every(round => Array.isArray(round) && round.length === game.players.length && round.every(cell => cell
      && (cell.bid === null || (Number.isInteger(cell.bid) && cell.bid >= 0 && cell.bid <= MAX_BID))
      && [null, 'correct', 'wrong'].includes(cell.outcome)
      && (cell.outcome !== 'correct' || cell.bid !== null)
      && (cell.manual === null || (Number.isInteger(cell.manual) && Math.abs(cell.manual) <= MAX_SCORE))))
    && (!game.finished || game.rounds.every(roundComplete)));
}

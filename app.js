import { MAX_SCORE, scoreFor, totals, createGame, migrateGame, dealerFor, playerOrder, bidSummary, forbiddenBid, nextBid, roundReady, maxCardsForPlayers } from './scoring.js';
import { initSetup } from './setup.js';
import { animate, animateScoreChanges } from './motion.js';

const $ = selector => document.querySelector(selector);
const key = 'rondje.boerenbridge.v1';
const setup = initSetup(updateSchedule);
let game = null;
let storageAvailable = true;
try {
  const saved = localStorage.getItem(key);
  if (saved) {
    game = migrateGame(JSON.parse(saved));
    if (!game) throw new Error('Ongeldig opgeslagen spel');
  }
} catch {
  storageAvailable = false;
  $('#save-status').textContent = 'Opgeslagen spel niet beschikbaar. Start een nieuw spel.';
}

const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const format = number => new Intl.NumberFormat('nl-NL').format(number);

function save() {
  try {
    localStorage.setItem(key, JSON.stringify(game));
    storageAvailable = true;
    $('#save-status').textContent = '✓ Op dit apparaat bewaard';
  } catch {
    storageAvailable = false;
    $('#save-status').textContent = 'Opslaan lukt niet. Houd deze pagina open.';
  }
}

function renderBoard() {
  const scores = totals(game);
  const highest = Math.max(...scores);
  $('#scoreboard').innerHTML = `<thead><tr><th scope="col">RONDE</th>${game.players.map(name => `<th scope="col">${escape(name)}</th>`).join('')}</tr></thead><tbody>${game.rounds.map((round, index) => `<tr class="${index === game.active ? 'active' : ''}"><th scope="row"><button data-round="${index}" aria-label="Ronde ${index + 1}, ${game.tricks[index]} slagen, bewerken" ${index === game.active ? 'aria-current="step"' : ''}>${index + 1}<small>${game.tricks[index]} ${game.tricks[index] === 1 ? 'slag' : 'slagen'}</small></button></th>${round.map(cell => {
    const score = scoreFor(cell);
    return `<td class="${score === null ? 'pending' : ''}"><span class="score ${cell.outcome === 'correct' ? 'correct' : ''}">${score === null ? '—' : format(score)}</span><span class="prediction">${cell.bid === null ? 'nog geen bod' : `${cell.bid} ${cell.bid === 1 ? 'slag' : 'slagen'}`}</span></td>`;
   }).join('')}</tr>`).join('')}</tbody><tfoot><tr><th scope="row">Totaal</th>${scores.map(score => `<td class="${score === highest ? 'leading' : ''}"><span class="total-number">${format(score)}</span></td>`).join('')}</tr></tfoot>`;
  $('#round-badge').textContent = game.finished ? 'Spel afgerond' : `Ronde ${game.active + 1} / ${game.rounds.length}`;
  const complete = game.rounds[game.active].filter(cell => scoreFor(cell) !== null).length;
  $('#round-progress').textContent = `${complete} van ${game.players.length} scores ingevuld`;
  $('#finish-round').disabled = !roundReady(game);
  $('#finish-round').textContent = game.active === game.rounds.length - 1 ? 'Spel afronden ✓' : 'Ronde afronden →';
  $('#game-result').hidden = !game.finished;
  if (game.finished) {
    const winners = game.players.filter((_, index) => scores[index] === highest);
    $('#game-result').innerHTML = `<p class="eyebrow">ALLE KAARTEN ZIJN GESPEELD</p><h2>${escape(winners.join(' & '))} ${winners.length === 1 ? 'wint' : 'winnen'}!</h2><p>${format(highest)} punten · Tijd voor nog een rondje?</p>`;
  }
  renderBidSummary();
  animateScoreChanges(game);
}

function renderBidSummary() {
  const summary = bidSummary(game);
  const order = playerOrder(game);
  const next = order.find(index => game.rounds[game.active][index].bid === null);
  const focusPlayer = next ?? dealerFor(game);
  const forbidden = focusPlayer === null ? null : forbiddenBid(game, focusPlayer);
  let help = focusPlayer === null ? 'Kies eerst wie de eerste ronde schudde.' : `${escape(game.players[focusPlayer])}${next === undefined ? ' (laatste aan de beurt)' : ' is aan de beurt'}: 0–${summary.tricks} toegestaan${forbidden === null ? '.' : `, behalve ${forbidden}.`}`;
  if (!summary.inRange) help = 'Een bestaande voorspelling is hoger dan de beschikbare slagen. Pas deze aan.';
  else if (summary.filled === game.players.length && !summary.valid) help = `Het totaal mag niet ${summary.tricks} zijn. Pas een voorspelling aan.`;
  else if (summary.valid) help = `Voorspellingen compleet. ${help}`;
  const element = $('#bid-summary');
  element.classList.toggle('invalid', !summary.inRange || (summary.filled === game.players.length && !summary.valid));
  element.innerHTML = `<div class="bid-stats"><span><strong>${summary.tricks}</strong> beschikbaar</span><span><strong>${summary.total}</strong> voorspeld</span><span><strong>${summary.filled}/${game.players.length}</strong> ingevuld</span></div><p>${help}</p><p class="bid-rule">Per speler maximaal ${summary.tricks}. Het gezamenlijke totaal mag hoger zijn; precies ${summary.tricks} is verboden.</p>`;
  for (const index of order) {
    const row = $(`#player-${index}`);
    if (!row) continue;
    const forbidden = forbiddenBid(game, index);
    row.querySelector('.bid-hint').textContent = `0–${summary.tricks}${forbidden === null ? '' : ` · geen ${forbidden}`}`;
    row.querySelector('[data-field="bid"][data-action="decrement"]').disabled = nextBid(game, index, -1) === game.rounds[game.active][index].bid;
    row.querySelector('[data-field="bid"][data-action="increment"]').disabled = nextBid(game, index, 1) === game.rounds[game.active][index].bid;
  }
}

function stepper(index, field, value, name) {
  const bid = field === 'bid';
  return `<div class="stepper"><button type="button" data-action="decrement" data-field="${field}" data-player="${index}" aria-label="${bid ? 'Minder slagen' : 'Minder punten'} voor ${escape(name)}">−</button><input type="number" inputmode="${bid ? 'numeric' : 'decimal'}" min="${bid ? 0 : -MAX_SCORE}" max="${bid ? game.tricks[game.active] : MAX_SCORE}" step="1" value="${value ?? ''}" placeholder="—" data-field="${field}" data-player="${index}" ${bid ? `aria-describedby="bid-hint-${index}"` : ''} aria-label="${bid ? 'Voorspelde slagen' : 'Rondescore'} voor ${escape(name)}"><button type="button" data-action="increment" data-field="${field}" data-player="${index}" aria-label="${bid ? 'Meer slagen' : 'Meer punten'} voor ${escape(name)}">+</button></div>`;
}

function playerMarkup(index) {
  const cell = game.rounds[game.active][index];
  const name = game.players[index];
  const order = playerOrder(game);
  const role = dealerFor(game) === null ? '' : index === order[0] ? 'Begint' : index === dealerFor(game) ? 'Schudt · als laatste' : `${order.indexOf(index) + 1}e aan de beurt`;
  return `<div class="player-name"><span class="avatar" aria-hidden="true">${escape(name.substring(0, 1).toUpperCase())}</span><span>${escape(name)}<small class="player-role">${role}</small></span></div><div class="prediction-control"><span class="control-label">Voorspelde slagen</span>${stepper(index, 'bid', cell.bid, name)}<span class="bid-hint" id="bid-hint-${index}"></span></div><div class="outcome-control"><span class="control-label">Voorspelling gehaald?</span><div class="outcome-buttons"><button data-action="outcome" data-player="${index}" data-value="correct" aria-label="${escape(name)} goed voorspeld" aria-pressed="${cell.outcome === 'correct'}" ${cell.bid === null ? 'disabled' : ''}>✓ Goed</button><button data-action="outcome" data-player="${index}" data-value="wrong" aria-label="${escape(name)} fout voorspeld" aria-pressed="${cell.outcome === 'wrong'}">× Fout</button></div></div><div class="score-control"><span class="control-label">${cell.outcome === 'wrong' ? `Rondescore · stap ${game.step}` : 'Punten deze ronde'}</span>${cell.outcome === 'wrong' ? stepper(index, 'manual', cell.manual, name) : `<div class="auto-score"><span>${cell.outcome === 'correct' ? `10 + 5 × ${cell.bid}` : 'Na de ronde'}</span><strong>${scoreFor(cell) ?? '—'}</strong></div>`}</div>`;
}

function renderRound() {
  $('#round-title').textContent = `Ronde ${game.active + 1} van ${game.rounds.length}`;
  $('#round-phase').textContent = `${game.tricks[game.active]} ${game.tricks[game.active] === 1 ? 'SLAG' : 'SLAGEN'} BESCHIKBAAR`;
  $('#bid-error').textContent = '';
  const dealer = dealerFor(game);
  $('#dealer-summary').textContent = dealer === null ? 'Wie is begonnen met schudden?' : `${game.players[dealer]} schudt · ${game.players[playerOrder(game)[0]]} begint`;
  $('#legacy-dealer').hidden = dealer !== null;
  if (dealer === null) $('#legacy-first-dealer').innerHTML = `<option value="">Kies de eerste schudder</option>${game.players.map((name, i) => `<option value="${i}">${escape(name)}</option>`).join('')}`;
  $('#previous-round').disabled = game.active === 0;
  $('#next-round').disabled = game.active === game.rounds.length - 1;
  $('#player-controls').innerHTML = playerOrder(game).map(index => `<div class="player-control" id="player-${index}">${playerMarkup(index)}</div>`).join('');
  renderBoard();
}

function render() {
  $('#welcome').hidden = Boolean(game);
  $('#game').hidden = !game;
  $('#restart-button').hidden = !game;
  if (game) renderRound();
}

function updatePlayer(index, focus) {
  // Preserve keyboard focus when replacing a player's controls.
  const row = $(`#player-${index}`);
  row.innerHTML = playerMarkup(index);
  if (focus) row.querySelector(focus)?.focus({ preventScroll: true });
  if (!game.rounds.every((_, i) => roundReady(game, i))) game.finished = false;
  save();
  renderBoard();
}

$('#new-game-form').addEventListener('submit', event => {
  event.preventDefault();
  const players = setup.getPlayers();
  updateSchedule(players.length);
  const count = Number($('#rounds').value);
  const error = $('#setup-error');
  if (players.length < 2 || players.length > 12 || players.some(name => !name)) { error.textContent = 'Vul voor elke speler een naam in (2 tot 12 spelers).'; return; }
  if (players.some(name => name.length > 40)) { error.textContent = 'Gebruik maximaal 40 tekens per naam.'; return; }
  if (new Set(players.map(name => name.toLocaleLowerCase('nl'))).size !== players.length) { error.textContent = 'Geef elke speler een unieke naam.'; return; }
  if (!Number.isInteger(count) || count < 1 || count > 50) return;
  if (setup.getDealer() < 0) { error.textContent = 'Kies wie als eerste schudt.'; return; }
  error.textContent = '';
  game = createGame(players, count, Number($('#initial-step').value), setup.getDealer());
  save(); render();
  $('#game').scrollIntoView({ block: 'start' });
});

$('#player-controls').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const index = Number(button.dataset.player);
  const cell = game.rounds[game.active][index];
  const { action, field, value } = button.dataset;
  $('#bid-error').textContent = '';
  if (action === 'outcome') {
    cell.outcome = cell.outcome === value ? null : value;
  } else {
    const delta = (action === 'increment' ? 1 : -1) * (field === 'bid' ? 1 : game.step);
    cell[field] = field === 'bid' ? nextBid(game, index, action === 'increment' ? 1 : -1) : Math.max(-MAX_SCORE, Math.min(MAX_SCORE, (cell[field] ?? 0) + delta));
  }
  updatePlayer(index, `button[data-action="${action}"]${field ? `[data-field="${field}"]` : `[data-value="${value}"]`}`);
});

$('#player-controls').addEventListener('input', event => {
  const input = event.target.closest('input[data-field]');
  if (!input) return;
  const index = Number(input.dataset.player);
  const field = input.dataset.field;
  const value = input.value === '' ? null : Number(input.value);
  const forbidden = field === 'bid' ? forbiddenBid(game, index) : null;
  const invalid = input.validity.badInput || (value !== null && (!Number.isInteger(value) || value < Number(input.min) || value > Number(input.max) || value === forbidden));
  input.setCustomValidity(invalid ? (value !== null && value === forbidden ? `${value} mag niet: dan is het totaal precies ${game.tricks[game.active]}.` : `Vul een geheel getal tussen ${input.min} en ${input.max} in.`) : '');
  input.setAttribute('aria-invalid', String(invalid));
  $('#bid-error').textContent = invalid ? input.validationMessage : '';
  const cell = game.rounds[game.active][index];
  // An invalid visible edit is open in the model, never a silently retained old score.
  cell[field] = invalid ? null : value;
  if (field === 'bid' && cell.bid === null && cell.outcome === 'correct') cell.outcome = null;
  // Update dependent controls without interrupting typing.
  const row = $(`#player-${index}`);
  if (field === 'bid') {
    const good = row.querySelector('[data-value="correct"]');
    good.disabled = cell.bid === null;
    good.setAttribute('aria-pressed', String(cell.outcome === 'correct'));
    if (cell.outcome !== 'wrong') row.querySelector('.auto-score').innerHTML = `<span>${cell.outcome === 'correct' ? `10 + 5 × ${value}` : 'Na de ronde'}</span><strong>${scoreFor(cell) ?? '—'}</strong>`;
  }
  if (!game.rounds.every((_, i) => roundReady(game, i))) game.finished = false;
  save(); renderBoard();
});

$('#player-controls').addEventListener('focusout', event => {
  const input = event.target.closest('input[data-field]');
  if (input && !input.validity.valid) {
    input.value = game.rounds[game.active][Number(input.dataset.player)][input.dataset.field] ?? '';
    input.setCustomValidity('');
    input.removeAttribute('aria-invalid');
  }
});

function goToRound(index) { game.active = index; save(); renderRound(); }
$('#previous-round').addEventListener('click', () => goToRound(game.active - 1));
$('#next-round').addEventListener('click', () => goToRound(game.active + 1));
$('#scoreboard').addEventListener('click', event => {
  const button = event.target.closest('[data-round]');
  if (button) { goToRound(Number(button.dataset.round)); $('#round-title').scrollIntoView({ block: 'center' }); }
});
$('#finish-round').addEventListener('click', () => {
  if (!roundReady(game)) return;
  if (game.active < game.rounds.length - 1) goToRound(game.active + 1);
  else {
    const incomplete = game.rounds.findIndex((_, i) => !roundReady(game, i));
    if (incomplete !== -1) { goToRound(incomplete); $('#round-progress').textContent = 'Vul eerst deze openstaande ronde in.'; }
    else { game.finished = true; save(); renderBoard(); $('#game-result').scrollIntoView({ block: 'center' }); }
  }
});

$('#settings-button').addEventListener('click', () => {
  $('#point-step').value = game?.step ?? $('#initial-step').value;
  $('#settings-dialog').showModal();
});
$('#close-settings').addEventListener('click', () => $('#settings-dialog').close());
$('#settings-form').addEventListener('submit', event => {
  event.preventDefault();
  const step = Number($('#point-step').value);
  if (!Number.isInteger(step) || step < 1 || step > 100) return;
  if (game) { game.step = step; save(); renderRound(); }
  else {
    const select = $('#initial-step');
    if (![...select.options].some(option => Number(option.value) === step)) select.add(new Option(`${step} punten`, String(step)));
    select.value = String(step);
  }
  $('#settings-dialog').close();
});
$('#restart-button').addEventListener('click', () => { $('#settings-dialog').close(); $('#restart-dialog').showModal(); });
$('#cancel-restart').addEventListener('click', () => $('#restart-dialog').close());
$('#confirm-restart').addEventListener('click', () => {
  setup.reset(game.players, game.firstDealer);
  game = null;
  save();
  // A null entry represents an intentionally cleared game.
  try { localStorage.removeItem(key); } catch { /* Save status already communicates unavailable storage. */ }
  $('#restart-dialog').close(); render(); $('#players input').focus();
});

window.addEventListener('beforeunload', event => {
  if (game && !storageAvailable) { event.preventDefault(); event.returnValue = ''; }
});
function updateSchedule(playerCount) {
  const input = $('#rounds');
  const requested = Number(input.value);
  const limit = maxCardsForPlayers(playerCount);
  $('#deck-limit').textContent = `52 kaarten · ${playerCount} spelers · maximaal ${limit} kaarten per speler (${limit * 2} rondes).`;
  if (!Number.isInteger(requested) || requested < 1 || requested > 50) {
    $('#schedule-preview').textContent = 'Kies een maximum van 1 tot 50 kaarten.';
    return;
  }
  const maximum = Math.min(requested, limit);
  if (maximum < requested) {
    input.value = String(maximum);
    const notice = $('#deck-notice');
    notice.hidden = false;
    notice.textContent = `Maximum verlaagd van ${requested} naar ${maximum}: met ${playerCount} spelers passen er anders niet genoeg kaarten in een spel van 52. Je speelt nu ${maximum * 2} rondes in plaats van ${requested * 2}.`;
    animate(notice, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'translateY(0)' }]);
  } else {
    $('#deck-notice').hidden = true;
  }
  $('#schedule-preview').textContent = `${maximum * 2} rondes · 1 → ${maximum} → ${maximum} → 1`;
}
$('#rounds').addEventListener('input', () => updateSchedule(setup.getPlayers().length));
$('#legacy-first-dealer').addEventListener('change', event => {
  if (event.target.value === '') return;
  game.firstDealer = Number(event.target.value); save(); renderRound();
});
render();

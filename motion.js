import { scoreFor, totals } from './scoring.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set();
let previous = null;

export function animate(element, frames, options = {}) {
  if (!element || reducedMotion.matches || !element.animate) return null;
  const animation = element.animate(frames, { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)', ...options });
  running.add(animation);
  const cleanup = () => running.delete(animation);
  animation.addEventListener('finish', cleanup, { once: true });
  animation.addEventListener('cancel', cleanup, { once: true });
  return animation;
}

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) for (const animation of running) animation.cancel();
});

function pulse(element, delta) {
  animate(element, [
    { transform: `translateY(${delta > 0 ? 5 : -5}px) scale(.94)`, color: delta > 0 ? 'var(--green)' : 'var(--red)' },
    { transform: 'translateY(0) scale(1.12)', offset: .45 },
    { transform: 'translateY(0) scale(1)' },
  ], { duration: 380 });
}

export function animateScoreChanges(game) {
  const current = { game, active: game.active, finished: game.finished, scores: game.rounds.map(round => round.map(scoreFor)), totals: totals(game) };
  const last = previous;
  previous = current;
  if (!last || last.game !== game || reducedMotion.matches) return;
  if (last.active !== current.active) {
    const direction = current.active > last.active ? 1 : -1;
    animate(document.querySelector('#player-controls'), [{ opacity: .35, transform: `translateX(${direction * 12}px)` }, { opacity: 1, transform: 'translateX(0)' }]);
    animate(document.querySelector('#dealer-summary'), [{ opacity: 0 }, { opacity: 1 }]);
  }
  current.totals.forEach((total, player) => {
    const difference = total - last.totals[player];
    if (difference) pulse(document.querySelectorAll('tfoot .total-number')[player], difference);
  });
  if (last.active === current.active) {
    current.scores[current.active].forEach((score, player) => {
      const oldScore = last.scores[current.active][player];
      if (score === oldScore) return;
      const delta = (score ?? 0) - (oldScore ?? 0);
      const tableRow = document.querySelectorAll('#scoreboard tbody tr')[current.active];
      pulse(tableRow?.querySelectorAll('td .score')[player], delta);
      const control = document.querySelector(`#player-${player} .score-control`);
      pulse(control?.querySelector('input, strong'), delta);
      if (!delta || !control) return;
      control.querySelectorAll('.score-delta').forEach(element => element.remove());
      const badge = document.createElement('span');
      badge.className = `score-delta ${delta < 0 ? 'negative' : ''}`;
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = `${delta > 0 ? '+' : '−'}${new Intl.NumberFormat('nl-NL').format(Math.abs(delta))}`;
      control.append(badge);
      const animation = animate(badge, [
        { opacity: 0, transform: 'translateY(6px) scale(.8)' },
        { opacity: 1, transform: 'translateY(-3px) scale(1)', offset: .25 },
        { opacity: 0, transform: 'translateY(-24px) scale(.95)' },
      ], { duration: 700 });
      if (animation) {
        animation.addEventListener('finish', () => badge.remove(), { once: true });
        animation.addEventListener('cancel', () => badge.remove(), { once: true });
      } else badge.remove();
    });
  }
  if (current.finished && !last.finished) {
    animate(document.querySelector('#game-result'), [
      { opacity: 0, transform: 'translateY(16px) scale(.95)' },
      { opacity: 1, transform: 'translateY(-3px) scale(1.015)', offset: .7 },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], { duration: 550 });
  }
}

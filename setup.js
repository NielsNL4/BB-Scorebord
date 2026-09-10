// Stable identities keep the selected first dealer attached to a player during reordering.
export function initSetup(onCountChange = () => {}) {
  const list = document.querySelector('#players');
  const dealer = document.querySelector('#first-dealer');
  let serial = 0;
  let rows = [];
  let selected = '';
  let drag = null;
  let previousCount = 0;
  const announce = message => { document.querySelector('#reorder-status').textContent = message; };

  function refreshDealer() {
    dealer.replaceChildren(new Option('Kies de eerste schudder', ''));
    rows.forEach((row, i) => dealer.add(new Option(row.name.trim() || `Speler ${i + 1}`, row.id)));
    dealer.value = selected;
  }
  function render(focusId, action = 'name') {
    list.replaceChildren();
    rows.forEach((row, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'setup-player';
      wrapper.dataset.id = row.id;
      const button = (text, label, action, disabled = false) => {
        const element = document.createElement('button');
        element.type = 'button'; element.className = 'setup-button';
        element.textContent = text; element.dataset.action = action; element.disabled = disabled;
        element.setAttribute('aria-label', label); wrapper.append(element); return element;
      };
      button('⠿', `Versleep speler ${i + 1}; gebruik ook de pijltjestoetsen`, 'drag').classList.add('drag-handle');
      const input = document.createElement('input');
      input.type = 'text'; input.value = row.name; input.maxLength = 40; input.required = true;
      input.autocomplete = 'off'; input.placeholder = `Speler ${i + 1}`; input.dataset.action = 'name';
      input.setAttribute('aria-label', `Naam speler ${i + 1}`); wrapper.append(input);
      button('↑', `Speler ${i + 1} omhoog`, 'up', i === 0);
      button('↓', `Speler ${i + 1} omlaag`, 'down', i === rows.length - 1);
      button('−', `Speler ${i + 1} verwijderen`, 'remove', rows.length <= 2);
      list.append(wrapper);
    });
    document.querySelector('#add-player').disabled = rows.length >= 12;
    refreshDealer();
    if (rows.length !== previousCount) {
      previousCount = rows.length;
      onCountChange(rows.length);
    }
    if (focusId) list.querySelector(`[data-id="${focusId}"] [data-action="${action}"]`)?.focus({ preventScroll: true });
  }
  function move(id, target) {
    const from = rows.findIndex(row => row.id === id);
    if (target < 0 || target >= rows.length || target === from) return;
    const [row] = rows.splice(from, 1); rows.splice(target, 0, row);
    render(id, 'drag');
    announce(`${row.name || 'Speler'} staat nu op plek ${target + 1}.`);
  }
  list.addEventListener('input', event => {
    if (!event.target.matches('input')) return;
    rows.find(row => row.id === event.target.closest('[data-id]').dataset.id).name = event.target.value;
    refreshDealer();
  });
  dealer.addEventListener('change', () => { selected = dealer.value; });
  list.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const id = button.closest('[data-id]').dataset.id;
    const index = rows.findIndex(row => row.id === id);
    if (button.dataset.action === 'up') move(id, index - 1);
    if (button.dataset.action === 'down') move(id, index + 1);
    if (button.dataset.action === 'remove' && rows.length > 2) {
      rows.splice(index, 1);
      if (selected === id) selected = '';
      render(rows[Math.min(index, rows.length - 1)].id);
    }
  });
  list.addEventListener('keydown', event => {
    if (!event.target.matches('.drag-handle') || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const id = event.target.closest('[data-id]').dataset.id;
    move(id, rows.findIndex(row => row.id === id) + (event.key === 'ArrowUp' ? -1 : 1));
  });
  list.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.drag-handle');
    if (!handle || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    const row = handle.closest('[data-id]');
    drag = { id: row.dataset.id, target: rows.findIndex(item => item.id === row.dataset.id), pointer: event.pointerId };
    handle.setPointerCapture(event.pointerId); row.classList.add('dragging');
  });
  list.addEventListener('pointermove', event => {
    if (!drag || drag.pointer !== event.pointerId) return;
    if (event.clientY < 70) window.scrollBy(0, -14);
    if (event.clientY > innerHeight - 70) window.scrollBy(0, 14);
    const elements = [...list.children];
    let target = 0;
    let distance = Infinity;
    elements.forEach((element, i) => {
      const rect = element.getBoundingClientRect();
      const delta = Math.abs(event.clientY - (rect.top + rect.height / 2));
      if (delta < distance) { target = i; distance = delta; }
      element.classList.remove('drop-target');
    });
    drag.target = target; elements[target].classList.add('drop-target');
  });
  function endDrag(event) {
    if (!drag || drag.pointer !== event.pointerId) return;
    const current = drag; drag = null;
    for (const row of list.children) row.classList.remove('dragging', 'drop-target');
    if (event.type === 'pointerup') move(current.id, current.target);
  }
  list.addEventListener('pointerup', endDrag);
  list.addEventListener('pointercancel', endDrag);
  list.addEventListener('lostpointercapture', endDrag);
  document.querySelector('#add-player').addEventListener('click', () => {
    if (rows.length >= 12) return;
    const row = { id: String(++serial), name: '' }; rows.push(row); render(row.id);
  });
  function reset(names = ['', '', '', ''], firstDealer = null) {
    rows = names.map(name => ({ id: String(++serial), name }));
    selected = firstDealer === null ? '' : rows[firstDealer].id;
    render();
  }
  reset();
  return { reset, getPlayers: () => rows.map(row => row.name.trim()), getDealer: () => rows.findIndex(row => row.id === selected) };
}

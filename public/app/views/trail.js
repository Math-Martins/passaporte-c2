import { h, mount, attempt } from '../ui.js';
import { getKV, setKV } from '../db.js';
import { checkAnswer } from '../check.js';
import { mountRecorder } from '../recorder.js';
import { mountWriter } from '../writer.js';
import { completeChallenges } from '../actions.js';
import { state } from '../main.js';

export async function render(el, params) {
  if (params[0] === 'modulo') return renderModule(el, params[1]);
  const done = await getKV('done', {});
  const chdone = await getKV('chdone', {});
  mount(el, h('h1', {}, 'Trilha'), h('p', { class: 'muted' }, 'Painel de partidas: 11 módulos, do B1 ao projeto final.'),
    h('div', { class: 'board' }, h('ul', { class: 'departures' }, state.data.modules.map(m => {
      const n = m.lessons.filter(l => done[l.id]).length;
      const complete = n === m.lessons.length && m.challenges.every(c => chdone[c.id]);
      return h('li', {}, h('span', { class: 'num' }, m.num),
        h('div', {}, h('a', { href: `#/modulo/${m.id}` }, m.title), h('div', { class: 'mono muted' }, `${m.level} · ${n}/${m.lessons.length} aulas`)),
        h('span', { class: complete ? 'stamp' : 'stamp pending' }, complete ? 'carimbado' : `${n}/${m.lessons.length}`));
    }))));
}

function autoChallenge(c, chdone, onDone) {
  const ok = new Array(c.items.length).fill(false);
  const box = h('ol', { class: 'stack' }, c.items.map((it, i) => {
    const input = h('input', { type: 'text', lang: 'en', autocomplete: 'off', 'aria-label': it.p });
    const out = h('span', { 'aria-live': 'polite' });
    return h('li', {}, h('div', {}, it.p), h('form', { class: 'row', onsubmit: e => {
      e.preventDefault();
      ok[i] = checkAnswer(input.value, it.a);
      out.replaceChildren(ok[i] ? h('span', { class: 'ok' }, '✓') : h('span', { class: 'bad' }, '✗ ', h('span', { lang: 'en' }, it.a[0])));
      if (ok.every(Boolean) && !chdone[c.id]) onDone();
    } }, input, h('button', { type: 'submit' }, 'Verificar'), out));
  }));
  return box;
}

function manualChallenge(c, chdone, chitems, onDone) {
  const tmp = h('div', { html: c.expected });
  const items = [...tmp.querySelectorAll('li')].map(li => li.textContent);
  const marks = chitems[c.id] || items.map(() => false);
  const list = h('div', {}, items.map((t, i) => h('label', { class: 'task' },
    h('input', { type: 'checkbox', checked: marks[i], onchange: async e => { marks[i] = e.target.checked; chitems[c.id] = marks; await attempt(() => setKV('chitems', chitems)); } }),
    h('span', {}, t))));
  const rec = h('div'), wr = h('div');
  mountRecorder(rec, { context: 'challenge:' + c.id });
  mountWriter(wr, { context: 'challenge:' + c.id });
  return h('div', {},
    h('div', { class: 'label' }, 'Critérios de entrega'), list,
    h('details', {}, h('summary', {}, 'Gravar'), rec),
    h('details', {}, h('summary', {}, 'Escrever'), wr),
    h('p', {}, h('button', { type: 'button', class: 'amber', disabled: !!chdone[c.id], onclick: e => { e.currentTarget.disabled = true; onDone(); } }, chdone[c.id] ? '✓ Feito' : 'Marcar como feito')));
}

async function renderModule(el, id) {
  const m = state.data.modules.find(x => x.id === id);
  if (!m) { mount(el, h('p', {}, 'Módulo não encontrado.')); return; }
  const [done, chdone, chitems] = await Promise.all([getKV('done', {}), getKV('chdone', {}), getKV('chitems', {})]);
  const markDone = c => async () => {
    chdone[c.id] = true;
    await attempt(() => setKV('chdone', chdone), `Desafio "${c.title}" feito`);
    if (m.challenges.every(x => chdone[x.id])) await attempt(() => completeChallenges(m));
    renderModule(el, id);
  };
  mount(el, 
    h('p', { class: 'label' }, h('a', { href: '#/trilha' }, 'Trilha'), ` · Módulo ${m.num} · ${m.level}`),
    h('h1', {}, m.title), h('p', { class: 'prose' }, m.summary), h('p', { class: 'muted' }, 'Objetivo: ', m.goal),
    h('h2', {}, 'Aulas'),
    h('div', { class: 'board' }, h('ul', { class: 'departures' }, m.lessons.map((l, i) => h('li', {},
      h('span', { class: 'num' }, `${m.num}.${i + 1}`),
      h('div', {}, h('a', { href: `#/aula/${l.id}` }, l.title), h('div', { class: 'mono muted' }, `${l.min} min`)),
      h('span', { class: done[l.id] ? 'stamp' : 'stamp pending' }, done[l.id] ? 'feita' : 'embarque'))))),
    h('h2', {}, 'Desafios'),
    ...m.challenges.map(c => h('section', { class: 'card' },
      h('h3', {}, c.title, chdone[c.id] ? h('span', { class: 'ok' }, '  ✓') : null),
      h('div', { class: 'prose', html: c.task }),
      c.kind === 'auto' ? autoChallenge(c, chdone, markDone(c)) : manualChallenge(c, chdone, chitems, markDone(c)),
      h('details', {}, h('summary', {}, 'Dica'), h('div', { html: c.hint })),
      h('details', {}, h('summary', {}, 'Solução'), h('div', { class: 'prose', html: c.solution })))));
}

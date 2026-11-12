import { h, mount, attempt } from '../ui.js';
import { listEntries, deleteEntry } from '../db.js';
import { normAns } from '../check.js';
import { logError, sendToSRS } from '../actions.js';

export const CATEGORIES = ['tempo verbal', 'preposição', 'collocation', 'pronúncia', 'false friend', 'ordem da frase', 'artigo', 'vocabulário', 'exercício', 'outro'];

export async function render(el) {
  const entries = await listEntries('error');
  let cat = '';
  const wrong = h('input', { type: 'text', lang: 'en', placeholder: 'I have 22 years', 'aria-label': 'Erro' });
  const correct = h('input', { type: 'text', lang: 'en', placeholder: "I'm 22", 'aria-label': 'Correção' });
  const expl = h('input', { type: 'text', placeholder: 'Idade usa to be', 'aria-label': 'Explicação' });
  const category = h('select', { 'aria-label': 'Categoria' }, CATEGORIES.map(c => h('option', {}, c)));
  const form = h('form', { class: 'card', onsubmit: async e => {
    e.preventDefault();
    if (!wrong.value.trim() || !correct.value.trim()) return;
    const ok = await attempt(async () => { await logError({ wrong: wrong.value.trim(), correct: correct.value.trim(), explanation: expl.value.trim(), category: category.value, source: 'manual' }); return true; }, 'Erro anotado');
    if (ok) render(el);
  } }, h('h2', { style: 'margin-top: 0' }, 'Anotar erro'), h('div', { class: 'grid' }, wrong, correct), h('div', { class: 'grid', style: 'margin-top: 8px' }, expl, category),
  h('p', {}, h('button', { type: 'submit' }, 'Anotar')));

  // Top 10: group by the normalized wrong form.
  const groups = new Map();
  for (const e of entries) {
    const k = normAns(e.data.wrong);
    const g = groups.get(k) || { n: 0, e };
    g.n++; groups.set(k, g);
  }
  const top = [...groups.values()].sort((a, b) => b.n - a.n).slice(0, 10);

  const list = h('div');
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrar por categoria' });
  const paint = () => {
    chips.replaceChildren(...['', ...CATEGORIES].map(c => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(c === cat), onclick: () => { cat = c; paint(); } }, c || 'todas')));
    const shown = entries.filter(e => !cat || e.data.category === cat);
    list.replaceChildren(...(shown.length ? shown.map(e => h('div', { class: 'task' },
      h('div', { style: 'flex: 1' }, h('span', { class: 'bad', lang: 'en' }, e.data.wrong), ' → ', h('b', { class: 'ok', lang: 'en' }, e.data.correct),
        h('div', { class: 'muted', style: 'font-size: 14px' }, [e.data.explanation, e.data.category, e.day.split('-').reverse().join('/')].filter(Boolean).join(' · '))),
      h('button', { type: 'button', class: 'icon', title: 'Virar cartão', 'aria-label': `Virar cartão de revisão: ${e.data.wrong}`, onclick: () => attempt(() => sendToSRS({ kind: 'error', source_ref: e.id, front: e.data.wrong, back: `${e.data.correct}${e.data.explanation ? ' — ' + e.data.explanation : ''}` })) }, '+'),
      h('button', { type: 'button', class: 'icon', title: 'Apagar', 'aria-label': `Apagar: ${e.data.wrong}`, onclick: async () => { if (confirm('Apagar este erro?') && await attempt(async () => { await deleteEntry(e.id); return true; })) render(el); } }, '×')))
      : [h('p', { class: 'muted' }, 'Nenhum erro aqui ainda.')]));
  };
  paint();
  mount(el, h('h1', {}, 'Caderno de erros'), form,
    h('h2', {}, 'Top 10'), top.length ? h('ol', {}, top.map(g => h('li', {}, h('span', { lang: 'en' }, g.e.data.wrong), ' → ', h('b', { lang: 'en' }, g.e.data.correct), h('span', { class: 'mono muted' }, `  ×${g.n}`)))) : h('p', { class: 'muted' }, 'Sem erros registrados.'),
    h('h2', {}, 'Todos'), chips, list);
}

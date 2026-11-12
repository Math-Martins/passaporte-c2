import { h, attempt } from '../ui.js';
import { speak } from '../tts.js';
import { sendToSRS } from '../actions.js';
import { state } from '../main.js';

const strip = s => h('div', { html: s }).textContent;

function glossary() {
  const terms = state.data.glossary;
  const cats = [...new Set(terms.map(t => t.c))];
  let cat = '';
  const q = h('input', { type: 'search', placeholder: 'Buscar termo ou tradução', 'aria-label': 'Buscar no glossário' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Categorias' });
  const list = h('div');
  const paint = () => {
    const s = q.value.trim().toLowerCase();
    chips.replaceChildren(...['', ...cats].map(c => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(c === cat), onclick: () => { cat = c; paint(); } }, c || 'todas')));
    const shown = terms.filter(t => (!cat || t.c === cat) && (!s || t.t.toLowerCase().includes(s) || t.pt.toLowerCase().includes(s)));
    list.replaceChildren(...shown.map(t => h('div', { class: 'task' },
      h('div', { style: 'flex: 1' }, h('b', { lang: 'en' }, t.t), h('span', { class: 'muted' }, ` · ${t.pt}`), h('div', { class: 'prose', style: 'font-size: 16px', html: t.d })),
      h('button', { type: 'button', class: 'spk', 'aria-label': `Ouvir: ${t.t}`, onclick: () => speak(t.t) }),
      h('button', { type: 'button', class: 'icon', title: 'Enviar para revisão', 'aria-label': `Enviar para revisão: ${t.t}`, onclick: () => attempt(() => sendToSRS({ kind: 'vocab', source_ref: t.t, front: t.t, back: `${t.pt} — ${strip(t.d)}` })) }, '+'))));
    if (!shown.length) list.replaceChildren(h('p', { class: 'muted' }, 'Nada encontrado.'));
  };
  q.addEventListener('input', paint);
  paint();
  return h('div', {}, q, h('div', { style: 'margin: 10px 0' }, chips), list);
}

function library() {
  const items = state.data.library;
  const levels = ['Todos', 'B1', 'B2', 'C1', 'C2'];
  let lv = 'Todos';
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Nível' });
  const list = h('div');
  const paint = () => {
    chips.replaceChildren(...levels.map(l => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(l === lv), onclick: () => { lv = l; paint(); } }, l)));
    const shown = items.filter(i => lv === 'Todos' || i.lv.includes(lv) || i.lv === 'Todos');
    const cats = [...new Set(shown.map(i => i.cat))];
    list.replaceChildren(...cats.map(c => h('section', {}, h('h3', {}, c), shown.filter(i => i.cat === c).map(i => h('div', { class: 'task' },
      h('div', {}, i.url && i.url !== '-' ? h('a', { href: i.url, target: '_blank', rel: 'noopener' }, i.t) : h('b', {}, i.t),
        h('span', { class: 'mono muted' }, `  ${i.lv}`), h('div', { class: 'muted', style: 'font-size: 14px' }, i.by), h('div', { html: i.d })))))));
  };
  paint();
  return h('div', {}, chips, list);
}

export async function render(el) {
  const g = glossary(), l = library();
  l.hidden = true;
  const tab = (label, show, hide) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(!show.hidden), onclick: e => {
    show.hidden = false; hide.hidden = true;
    e.currentTarget.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b === e.currentTarget)));
  } }, label);
  el.replaceChildren(h('h1', {}, 'Biblioteca'), h('div', { class: 'tabs', role: 'tablist' }, tab('Glossário', g, l), tab('Links', l, g)), g, l);
}

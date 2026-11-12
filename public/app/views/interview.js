import { h, mount } from '../ui.js';
import { listCards } from '../db.js';
import { mountRecorder } from '../recorder.js';
import { speak } from '../tts.js';
import { starChecklist } from './practice.js';
import { state } from '../main.js';

const stateLabel = c => (!c ? '' : c.step >= 4 ? 'dominada' : c.first_reviewed_day ? `revisão em ${c.due.split('-').reverse().join('/')}` : 'nova');

export async function render(el) {
  const srs = Object.fromEntries((await listCards()).filter(c => c.kind === 'interview').map(c => [c.source_ref, c]));
  const cats = [...new Set(state.data.cards.map(c => c.cat))];
  let cat = cats[0];
  const list = h('div');
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Categorias' });
  const paint = () => {
    chips.replaceChildren(...cats.map(c => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(c === cat), onclick: () => { cat = c; paint(); } }, c)));
    list.replaceChildren(...state.data.cards.filter(c => c.cat === cat).map(c => {
      const body = h('div');
      let mounted = false;
      return h('details', { class: 'card', ontoggle: e => {
        if (!e.target.open || mounted) return;
        mounted = true;
        const rec = h('div');
        mountRecorder(rec, { context: 'interview:' + c.id, referenceText: h('div', { html: c.a }).textContent });
        body.append(h('p', { class: 'muted' }, c.pt),
          h('div', { class: 'label' }, 'Resposta modelo'), h('div', { class: 'prose', lang: 'en', html: c.a }),
          h('button', { type: 'button', class: 'ghost', onclick: () => speak(h('div', { html: c.a }).textContent) }, '▶ Ouvir resposta'),
          h('p', { class: 'muted', html: '💡 ' + c.tip }), starChecklist(), rec);
      } },
      h('summary', {}, h('b', { lang: 'en' }, c.q), h('span', { class: 'mono muted' }, `  ${c.lv} · ${stateLabel(srs[c.id])}`)), body);
    }));
  };
  paint();
  mount(el, h('h1', {}, 'Entrevista'), h('p', { class: 'muted' }, `${state.data.cards.length} perguntas. Elas entram na revisão diária sozinhas, 15 novas por dia.`), chips, list);
}

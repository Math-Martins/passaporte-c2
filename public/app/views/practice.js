import { h, mount, attempt } from '../ui.js';
import { listCards, updateCard } from '../db.js';
import { review, buildQueue } from '../srs.js';
import { mountRecorder } from '../recorder.js';
import { logStudy } from '../actions.js';
import { state, today } from '../main.js';
import { speak } from '../tts.js';

export const STAR = ['Abri respondendo a pergunta', 'Situation e Task em 1 ou 2 frases', 'Action em primeira pessoa ("I")', 'Resultado com número', 'Durou de 60 a 120 s'];
export const starChecklist = () => h('div', {}, h('div', { class: 'label' }, 'Checklist da resposta'),
  STAR.map(s => h('label', { class: 'task' }, h('input', { type: 'checkbox' }), h('span', {}, s))));

let keyHandler = null;

export async function render(el) {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  const cards = await listCards();
  const { cards: queue, recovery, dueCount } = buildQueue(cards, today());
  const head = [h('h1', {}, 'Prática'),
    recovery ? h('div', { class: 'banner' }, `Modo recuperação: ${dueCount} revisões vencidas. Hoje vão as 40 mais atrasadas, sem cartões novos.`) : null];
  if (!queue.length) {
    mount(el, ...head, h('div', { class: 'card' }, h('p', {}, 'Nada para revisar hoje. ✓'),
      h('p', { class: 'muted' }, 'Envie exemplos das aulas, termos do glossário ou erros do caderno para a revisão com o botão +.')));
    return;
  }
  let i = 0, revealed = false, currentReveal = () => {};
  const counter = h('p', { class: 'mono muted' });
  const stage = h('div');
  mount(el, ...head, counter, stage,
    h('p', { class: 'muted' }, h('span', { class: 'kbd' }, 'espaço'), ' mostra a resposta · ', h('span', { class: 'kbd' }, '1'), ' errei · ', h('span', { class: 'kbd' }, '2'), ' lembrei'));

  const show = () => {
    revealed = false;
    if (i >= queue.length) {
      stage.replaceChildren(h('div', { class: 'card' }, h('p', {}, `Fim da fila: ${queue.length} cartões. ✓`), h('a', { class: 'btn', href: '#/hoje' }, 'Voltar para Hoje')));
      counter.textContent = '';
      return;
    }
    const c = queue[i];
    counter.textContent = `${i + 1} / ${queue.length} · ${c.first_reviewed_day ? 'revisão' : 'novo'} · ${({ interview: 'entrevista', vocab: 'vocabulário', example: 'exemplo', error: 'erro' })[c.kind]}`;
    const back = h('div', { class: 'back', hidden: true, html: c.kind === 'interview' ? c.back : '' });
    if (c.kind !== 'interview') back.textContent = c.back;
    const extra = h('div', { hidden: true });
    if (c.kind === 'interview') {
      const card = state.data.cards.find(x => x.id === c.source_ref);
      const rec = h('div');
      mountRecorder(rec, { context: 'interview:' + c.source_ref, referenceText: back.textContent });
      extra.append(card ? h('p', { class: 'muted', html: '💡 ' + card.tip }) : null, starChecklist(), rec);
    }
    const revealBtn = h('button', { type: 'button', onclick: reveal }, 'Mostrar resposta');
    const rateRow = h('div', { class: 'row', hidden: true },
      h('button', { type: 'button', class: 'danger', onclick: () => rate('again') }, '1 · Errei'),
      h('button', { type: 'button', class: 'amber', onclick: () => rate('good') }, '2 · Lembrei'));
    currentReveal = reveal;
    function reveal() { revealed = true; back.hidden = false; extra.hidden = false; revealBtn.hidden = true; rateRow.hidden = false; }
    stage.replaceChildren(h('div', { class: 'card' },
      h('div', { class: 'flash' }, h('div', { lang: 'en' }, c.front, ' ',
        h('button', { type: 'button', class: 'icon', 'aria-label': 'Ouvir', onclick: () => speak(c.front) }, '▶')), back),
      extra, h('div', { class: 'row' }, revealBtn, rateRow)));
    revealBtn.focus();
  };
  async function rate(r) {
    const c = queue[i];
    const patch = review(c, r, today());
    if (!(await attempt(async () => { await updateCard(c.id, patch); return true; }))) return;
    attempt(() => logStudy(c.kind === 'interview' ? 'Speaking' : 'Vocabulário', 1, 'srs'));
    i++; show();
  }
  keyHandler = e => {
    if (!document.contains(stage)) { document.removeEventListener('keydown', keyHandler); return; }
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === ' ' && !revealed && i < queue.length) { e.preventDefault(); currentReveal(); }
    else if (revealed && e.key === '1') rate('again');
    else if (revealed && e.key === '2') rate('good');
  };
  document.addEventListener('keydown', keyHandler);
  show();
}

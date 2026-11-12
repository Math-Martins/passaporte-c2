import { h, toast, attempt, mountRubric, wordCount } from './ui.js';
import { addEntry } from './db.js';

const CHECKLIST = [
  'Tempos verbais (since/for, Present Perfect sem data terminada)',
  'Preposições (depend on, discuss sem about)',
  'False friends (actually, pretend, eventually)',
  'Artigos (a, an, the)',
  'Terceira pessoa (-s)',
  'Ordem em perguntas indiretas',
];

export function mountWriter(el, { context, prompt = '', minWords = 0, maxWords = 0, onSaved } = {}) {
  const ta = h('textarea', { 'aria-label': 'Seu texto em inglês', lang: 'en', spellcheck: 'false' });
  const count = h('span', { class: 'mono muted' });
  const updateCount = () => {
    const n = wordCount(ta.value);
    const range = minWords || maxWords ? ` (meta ${minWords || 0}–${maxWords || '∞'})` : '';
    count.textContent = `${n} palavras${range}`;
    count.className = `mono ${minWords && n < minWords ? 'muted' : 'ok'}`;
  };
  ta.addEventListener('input', updateCount); updateCount();
  const external = h('input', { type: 'text', placeholder: 'ex.: Write & Improve B2 alto', 'aria-label': 'Nota externa' });
  const rubricBox = h('div');
  const getRubric = mountRubric(rubricBox, 'writing');
  const send = h('button', { type: 'button', class: 'amber' }, 'Enviar texto');
  send.onclick = async () => {
    const text = ta.value.trim();
    if (!text) return toast('Escreva algo antes de enviar.', 'error');
    send.disabled = true;
    const sa = getRubric();
    const ok = await attempt(() => addEntry('submission', { context, text, word_count: wordCount(text), self_assessment: sa, external_score: external.value.trim() || null }), 'Texto enviado');
    send.disabled = false;
    if (!ok) return;
    ta.value = ''; updateCount(); onSaved?.(ok);
    // Errors are separate so a failure here never makes the user resend (and duplicate) the text.
    attempt(async () => { for (const e of sa.errors) await addEntry('error', { ...e, explanation: '', category: 'outro', source: 'self_review' }); });
  };
  el.append(h('div', { class: 'stack' },
    prompt ? h('p', {}, prompt) : null,
    ta, count,
    h('details', {}, h('summary', {}, 'Checklist antes de enviar'), h('ul', {}, CHECKLIST.map(c => h('li', {}, c)))),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'ghost', onclick: async () => { await navigator.clipboard?.writeText(ta.value).catch(() => {}); window.open('https://writeandimprove.com/', '_blank', 'noopener'); } }, 'Copiar e abrir Write & Improve')),
    h('label', {}, 'Nota externa (opcional)'), external,
    rubricBox, h('p', {}, send)));
}

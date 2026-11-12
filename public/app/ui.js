// Tiny DOM helpers shared by every view.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export function toast(msg, kind = 'ok') {
  const t = h('div', { class: `toast ${kind}`, role: kind === 'error' ? 'alert' : 'status' }, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), kind === 'error' ? 7000 : 3500);
}

// Run an async action; show its error and keep the UI usable.
export async function attempt(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg); return r; }
  catch (e) { console.warn(e); toast(e.message || String(e), 'error'); return undefined; }
}

export const wordCount = s => (s.trim().match(/\S+/g) || []).length;
export const fmtMin = m => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`);

export const RUBRICS = {
  speaking: ['Fluency and Coherence', 'Lexical Resource', 'Grammatical Range and Accuracy', 'Pronunciation'],
  writing: ['Task Response', 'Coherence and Cohesion', 'Lexical Resource', 'Grammatical Range and Accuracy'],
};
const DESCRIPTORS = {
  'Task Response': ['Fugiu do enunciado ou faltam partes', 'Responde tudo, com ideias pouco desenvolvidas', 'Responde tudo, com ideias claras e exemplos'],
  'Coherence and Cohesion': ['Frases soltas, sem conectores', 'Ordem lógica, conectores repetidos', 'Parágrafos claros, conectores variados e precisos'],
  'Fluency and Coherence': ['Pausas longas, ideias soltas', 'Fala contínua com hesitações, conectores repetidos', 'Fala fluida, ideias organizadas com conectores variados'],
  'Lexical Resource': ['Repete palavras, traduções literais', 'Vocabulário adequado, poucas collocations', 'Collocations naturais, registro certo para o público'],
  'Grammatical Range and Accuracy': ['Erros que atrapalham o sentido', 'Estruturas variadas com erros frequentes', 'Estruturas complexas com poucos erros'],
  'Pronunciation': ['Difícil de entender', 'Entendível com esforço; erros de -ed, th ou tônica', 'Entendido na primeira vez, ritmo natural'],
};
const band = n => (n <= 2 ? 0 : n === 3 ? 1 : 2);

// Self-assessment widget. Returns a getter for {scores, notes, errors}.
export function mountRubric(el, type, initial = {}) {
  const scores = { ...(initial.scores || {}) };
  const rows = RUBRICS[type].map(crit => {
    const hint = h('div', { class: 'muted', style: 'grid-column: 1 / -1; font-size: 13px; margin-top: -4px' });
    const setHint = () => { hint.textContent = scores[crit] ? DESCRIPTORS[crit][band(scores[crit])] : ''; };
    const opts = h('div', { class: 'opts', role: 'group', 'aria-label': crit },
      [1, 2, 3, 4, 5].map(n => h('button', {
        type: 'button', 'aria-pressed': String(scores[crit] === n), 'aria-label': `${crit}: ${n}`,
        onclick: e => {
          scores[crit] = n;
          e.currentTarget.parentElement.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i + 1 === n)));
          setHint();
        },
      }, n)));
    setHint();
    return [h('span', {}, crit), opts, hint];
  });
  const notes = h('textarea', { rows: 2, style: 'min-height: 60px; font-size: 15px', placeholder: 'O que você percebeu? (opcional)' }, initial.notes || '');
  const errList = h('div', { class: 'stack' });
  const addErr = (w = '', c = '') => errList.append(h('div', { class: 'row' },
    h('input', { type: 'text', placeholder: 'Eu disse/escrevi…', value: w, style: 'flex: 1 1 160px', 'aria-label': 'Erro' }),
    h('input', { type: 'text', placeholder: 'Correto…', value: c, style: 'flex: 1 1 160px', 'aria-label': 'Correção' })));
  el.append(
    h('div', { class: 'label' }, `Autoavaliação IELTS (${type === 'speaking' ? 'speaking' : 'writing'}), 1 a 5`),
    h('div', { class: 'rubric' }, rows), h('label', {}, 'Notas'), notes,
    h('label', {}, 'Erros percebidos (viram entradas do caderno de erros)'), errList,
    h('button', { type: 'button', class: 'ghost', onclick: () => addErr() }, '+ erro'));
  addErr();
  return () => ({
    scores: { ...scores },
    notes: notes.value.trim(),
    errors: [...errList.children].map(r => { const [a, b] = r.querySelectorAll('input'); return { wrong: a.value.trim(), correct: b.value.trim() }; })
      .filter(e => e.wrong && e.correct),
  });
}

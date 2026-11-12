import { h, mount, attempt } from '../ui.js';
import { addEntry, listEntries, addCards } from '../db.js';
import { currentWeek } from '../plan.js';
import { logError, logStudy } from '../actions.js';
import { state, today } from '../main.js';

const SCRIPTS = [
  ['Small talk', ['How has your week been?', 'Where are you based?', 'What do you do for fun?'], 'How about you? · Pretty good, thanks · I\'m based in…'],
  ['Daily stand-up', ['What did you do yesterday?', 'What are you working on today?', 'Any blockers?'], 'I\'m blocked on… · No blockers on my side'],
  ['Entrevista comportamental', ['Tell me about a time you made a mistake.', 'Tell me about a conflict with a teammate.', 'Tell me about a tight deadline.'], 'STAR · I was responsible for… · As a result…'],
  ['Entrevista técnica de cloud', ['What is high availability?', 'How would you troubleshoot a slow app?', 'IaaS vs PaaS vs SaaS?'], 'In simple terms… · Think of it as… · The trade-off is…'],
  ['Discordar em reunião', ['I think we should launch on Friday. What do you think?', 'Let\'s skip the tests this time.'], 'I see your point, but… · What if we…?'],
  ['Explicar um projeto', ['Walk me through a project you\'re proud of.', 'What would you do differently?'], 'Today I\'ll walk you through… · In hindsight, I should have…'],
];

export async function render(el) {
  const cw = currentWeek(state.cfg.start, today());
  const theme = cw.week ? state.data.plan.weeks[cw.week - 1].theme : '';
  const f = {
    day: h('input', { type: 'date', value: today(), 'aria-label': 'Data' }),
    partner: h('input', { type: 'text', placeholder: 'Nome ou apelido', 'aria-label': 'Parceiro' }),
    platform: h('select', { 'aria-label': 'Plataforma' }, ['Tandem', 'Cambly', 'italki', 'Colega', 'Outro'].map(p => h('option', {}, p))),
    minutes: h('input', { type: 'number', min: 1, max: 300, value: 30, 'aria-label': 'Minutos' }),
    topic: h('input', { type: 'text', value: theme, 'aria-label': 'Tema' }),
  };
  const pairs = n => Array.from({ length: n }, () => [h('input', { type: 'text', lang: 'en', placeholder: 'Eu disse…' }), h('input', { type: 'text', lang: 'en', placeholder: 'Correto…' })]);
  const errs = pairs(3);
  const exprs = Array.from({ length: 3 }, () => [h('input', { type: 'text', lang: 'en', placeholder: 'expressão' }), h('input', { type: 'text', placeholder: 'significado' })]);
  const form = h('form', { class: 'card', onsubmit: async e => {
    e.preventDefault();
    const minutes = Number(f.minutes.value);
    const errors = errs.map(([a, b]) => ({ wrong: a.value.trim(), correct: b.value.trim() })).filter(x => x.wrong && x.correct);
    const expressions = exprs.map(([a, b]) => ({ en: a.value.trim(), pt: b.value.trim() })).filter(x => x.en);
    const ok = await attempt(() => addEntry('conversation', { partner: f.partner.value.trim(), platform: f.platform.value, minutes, topic: f.topic.value.trim(), errors, expressions }, f.day.value), 'Conversa registrada');
    if (!ok) return;
    // Follow-ups run after the conversation is saved, so a failure here never leads to a duplicate conversation.
    await attempt(async () => {
      await logStudy('Speaking', minutes, 'conversation');
      for (const x of errors) await logError({ ...x, category: 'outro', source: 'conversation' });
      if (expressions.length) await addCards(expressions.map(x => ({ kind: 'vocab', source_ref: 'conv:' + x.en.toLowerCase(), front: x.en, back: x.pt || '' })));
    });
    render(el);
  } },
  h('h2', { style: 'margin-top: 0' }, 'Registrar conversa'),
  h('div', { class: 'grid' }, f.day, f.partner, f.platform, h('div', { class: 'row' }, f.minutes, h('span', { class: 'muted' }, 'min'))),
  h('label', {}, 'Tema'), f.topic,
  h('label', {}, '3 erros que você percebeu'), errs.map(p => h('div', { class: 'row', style: 'margin: 4px 0' }, ...p)),
  h('label', {}, '3 expressões novas (viram cartões de revisão)'), exprs.map(p => h('div', { class: 'row', style: 'margin: 4px 0' }, ...p)),
  h('p', {}, h('button', { type: 'submit', class: 'amber' }, 'Salvar')));

  const past = await listEntries('conversation');
  mount(el, h('h1', {}, 'Conversas'), form,
    h('h2', {}, 'Roteiros'), h('div', { class: 'grid' }, SCRIPTS.map(([t, qs, vocab]) => h('div', { class: 'card' }, h('b', {}, t), h('ul', { lang: 'en' }, qs.map(q => h('li', {}, q))), h('p', { class: 'muted', lang: 'en' }, vocab)))),
    h('h2', {}, 'Anteriores'),
    past.length ? past.map(c => h('div', { class: 'task' }, h('span', {}, h('b', {}, c.day.split('-').reverse().join('/')), ` · ${c.data.partner || c.data.platform} · ${c.data.minutes} min · ${c.data.topic}`))) : h('p', { class: 'muted' }, 'Nenhuma conversa registrada.'));
}

import { h, mount, fmtMin } from '../ui.js';
import { getKV, listEntries, listRecordings } from '../db.js';
import { minutesBySkill, streak } from '../stats.js';
import { currentWeek, planWeekRange } from '../plan.js';
import { addDays } from '../dates.js';
import { RUBRICS } from '../ui.js';
import { state, today } from '../main.js';

function bars(title, mins) {
  const max = Math.max(1, ...Object.values(mins));
  return h('section', { class: 'card' }, h('div', { class: 'label' }, title),
    state.data.plan.skills.map(s => h('div', { class: 'hbar' }, h('span', {}, s),
      h('div', { class: 'bar' }, h('i', { style: `width: ${((mins[s] || 0) / max) * 100}%` })), h('span', { class: 'mono' }, fmtMin(mins[s] || 0)))));
}

export async function render(el) {
  const t = today();
  const [logs, done, chdone, recs, ...gates] = await Promise.all([listEntries('study_log'), getKV('done', {}), getKV('chdone', {}), listRecordings('checkpoint:*'),
    ...state.data.plan.phases.map(p => getKV('gate:' + p.id, {}))]);
  const cw = currentWeek(state.cfg.start, t);
  const wr = cw.week ? planWeekRange(state.cfg.start, cw.week) : { from: t, to: t };
  const days = new Set(logs.map(l => l.day));
  const total = Object.values(minutesBySkill(logs, '0000-01-01', '9999-12-31')).reduce((a, b) => a + b, 0);
  const nLessons = state.data.modules.reduce((a, m) => a + m.lessons.length, 0);
  const nCh = state.data.modules.reduce((a, m) => a + m.challenges.length, 0);
  const crit = RUBRICS.speaking;
  const cps = recs.filter(r => r.self_assessment?.scores).reverse();

  mount(el, h('h1', {}, 'Progresso'),
    h('div', { class: 'grid' },
      h('div', { class: 'card' }, h('div', { class: 'label' }, 'Sequência'), h('b', { style: 'font-size: 28px' }, `${streak(days, t)} dias`), h('div', { class: 'muted' }, 'um dia de folga por semana não quebra')),
      h('div', { class: 'card' }, h('div', { class: 'label' }, 'Total estudado'), h('b', { style: 'font-size: 28px' }, fmtMin(total)), h('div', { class: 'muted' }, `meta do plano: ${state.data.plan.totalHours} h`)),
      h('div', { class: 'card' }, h('div', { class: 'label' }, 'Concluído'),
        h('div', {}, `Aulas ${Object.keys(done).length}/${nLessons}`), h('div', {}, `Desafios ${Object.keys(chdone).length}/${nCh}`),
        h('div', {}, `Portões ${gates.filter(g => g.passedAt).length}/3`))),
    bars('Semana do plano', minutesBySkill(logs, wr.from, wr.to)),
    bars('Últimos 30 dias', minutesBySkill(logs, addDays(t, -29), t)),
    bars('Total', minutesBySkill(logs, '0000-01-01', '9999-12-31')),
    h('h2', {}, 'Checkpoints'),
    cps.length ? h('div', { class: 'tbl' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Data'), h('th', {}, 'Semana'), crit.map(c => h('th', {}, c)))),
      h('tbody', {}, cps.map(r => h('tr', {}, h('td', {}, new Date(r.created_at).toLocaleDateString('pt-BR')), h('td', {}, r.context.replace('checkpoint:w', '')),
        crit.map(c => h('td', { class: 'mono' }, r.self_assessment.scores[c] ?? '–')))))))
      : h('p', { class: 'muted' }, 'O primeiro checkpoint aparece no Hoje na semana 4.'));
}

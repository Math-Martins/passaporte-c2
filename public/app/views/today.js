import { h, mount, fmtMin } from '../ui.js';
import { getKV, listCards, listEntries } from '../db.js';
import { buildQueue } from '../srs.js';
import { currentWeek, phaseOf, weekGoalMinutes, planWeekRange } from '../plan.js';
import { minutesBySkill } from '../stats.js';
import { mountRecorder } from '../recorder.js';
import { hoursForm } from './plan.js';
import { allLessons } from '../actions.js';
import { state, today } from '../main.js';

const linkFor = l => (!l || l === 'plano' ? null : /^m\d\d$/.test(l) ? `#/modulo/${l}` : `#/aula/${l}`);

export async function render(el) {
  const t = today();
  const [cards, ptasks, done, logs] = await Promise.all([listCards(), getKV('ptasks', {}), getKV('done', {}), listEntries('study_log')]);
  const q = buildQueue(cards, t);
  const cw = currentWeek(state.cfg.start, t);
  const week = cw.week || 1;
  const W = state.data.plan.weeks[week - 1];
  const phase = phaseOf(week, state.data.plan.phases);
  const range = planWeekRange(state.cfg.start || t, week);
  const weekMin = Object.values(minutesBySkill(logs, range.from, range.to)).reduce((a, b) => a + b, 0);
  const todayMin = Object.values(minutesBySkill(logs, t, t)).reduce((a, b) => a + b, 0);
  const goal = weekGoalMinutes(phase, state.cfg.goalMinutes);
  const next = allLessons().find(l => !done[l.id]);
  const pending = W.tasks.filter(x => !ptasks[x.id]);
  const groups = {};
  for (const x of pending) (groups[x.a] ||= []).push(x);
  const lvl = phase.level.split(' ')[0];
  const media = state.data.library.find(i => i.cat === 'Listening e pronúncia' && i.lv.includes(lvl)) || state.data.library.find(i => i.cat === 'Listening e pronúncia');
  const rerender = () => render(el);

  const checkpoint = week % 4 === 0 ? (() => {
    const box = h('section', { class: 'card' }, h('h2', { style: 'margin-top: 0' }, `Checkpoint da semana ${week}`),
      h('p', {}, 'Grave 2 minutos respondendo: ', h('b', { lang: 'en' }, 'Tell me about yourself and your plans.'), ' Depois avalie com os 4 critérios e compare com o checkpoint anterior.'));
    mountRecorder(box, { context: `checkpoint:w${week}`, referenceText: 'Tell me about yourself and your plans.' });
    return box;
  })() : null;

  mount(el, 
    h('p', { class: 'label' }, cw.status === 'active' ? `Semana ${week} de 156 · Fase ${phase.name} (${phase.level}) · ${W.theme}` : cw.status === 'notStarted' ? 'O plano ainda não começou' : 'Plano concluído'),
    h('h1', {}, 'Hoje'),
    week === phase.end && cw.status === 'active' ? h('a', { class: 'banner', style: 'display: block; text-decoration: none', href: `#/plano/${week}` }, `Semana de portão: ${phase.gate.title} →`) : null,

    h('section', { class: 'card' },
      h('div', { class: 'row', style: 'justify-content: space-between' },
        h('div', {}, h('div', { class: 'label' }, 'Revisões'), h('b', { style: 'font-size: 22px' }, `${q.cards.length} cartões`),
          h('div', { class: 'muted' }, `${q.dueCount} vencidos · ${q.cards.length - Math.min(q.dueCount, q.cards.length)} novos · ~${Math.ceil(q.cards.length * 0.5)} min`)),
        q.cards.length ? h('a', { class: 'btn amber', href: '#/pratica' }, 'Revisar agora') : h('span', { class: 'ok' }, '✓ em dia')),
      q.recovery ? h('div', { class: 'banner' }, `Modo recuperação: hoje vão as 40 mais atrasadas, sem cartões novos.`) : null),

    next ? h('section', { class: 'pass', style: 'margin: 12px 0' },
      h('div', {}, h('div', { class: 'label' }, `Próxima aula · Módulo ${next.mod.num}`), h('h3', {}, next.title), h('div', { class: 'mono' }, `${next.mod.num}.${next.idx + 1} · ${next.min} min · ${next.mod.level}`)),
      h('div', { class: 'stub' }, h('a', { class: 'btn', href: `#/aula/${next.id}` }, 'Embarcar'))) : h('p', { class: 'ok' }, 'Todas as aulas concluídas. ✓'),

    h('section', { class: 'card' },
      h('div', { class: 'row', style: 'justify-content: space-between' }, h('b', {}, 'Horas'), h('span', { class: 'mono' }, `hoje ${fmtMin(todayMin)} · semana ${fmtMin(weekMin)} / ${fmtMin(goal)}`)),
      h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Horas da semana', 'aria-valuemin': 0, 'aria-valuemax': goal, 'aria-valuenow': weekMin }, h('i', { style: `width: ${Math.min(100, (weekMin / goal) * 100)}%` })),
      h('details', { style: 'margin-top: 8px' }, h('summary', {}, 'Registrar horas (leitura, série, podcast…)'), hoursForm(rerender))),

    checkpoint,

    h('h2', {}, `Tarefas da semana ${week}`, h('span', { class: 'mono muted' }, `  ${W.tasks.length - pending.length}/${W.tasks.length}`)),
    pending.length ? Object.entries(groups).map(([a, ts]) => h('div', {}, h('div', { class: 'label', style: 'margin-top: 10px' }, a),
      ts.map(x => h('div', { class: 'task' }, h('span', {}, x.t, linkFor(x.l) ? h('a', { href: linkFor(x.l), style: 'margin-left: 6px' }, 'abrir →') : null)))))
      : h('p', { class: 'ok' }, 'Semana completa. ✓'),
    h('p', {}, h('a', { href: `#/plano/${week}` }, 'Marcar tarefas no plano →')),

    media ? h('section', { class: 'card' }, h('div', { class: 'label' }, 'Para ouvir hoje'),
      h('a', { href: media.url, target: '_blank', rel: 'noopener' }, media.t), h('span', { class: 'mono muted' }, `  ${media.lv}`), h('div', { class: 'muted', html: media.d })) : null);
}

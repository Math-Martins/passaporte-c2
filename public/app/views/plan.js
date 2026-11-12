import { h, mount, attempt, fmtMin } from '../ui.js';
import { getKV, setKV, updateKV, addEntry, listEntries } from '../db.js';
import { currentWeek, phaseOf, weekGoalMinutes, repeatWeeks, planWeekRange, TOTAL_WEEKS } from '../plan.js';
import { diffDays } from '../dates.js';
import { minutesBySkill } from '../stats.js';
import { state, today, go } from '../main.js';

const linkFor = l => (!l ? null : l === 'plano' ? null : /^m\d\d$/.test(l) ? `#/modulo/${l}` : `#/aula/${l}`);

export function hoursForm(onSaved) {
  const skill = h('select', { 'aria-label': 'Habilidade' }, state.data.plan.skills.map(s => h('option', {}, s)));
  const minutes = h('input', { type: 'number', min: 1, max: 600, value: 30, style: 'width: 90px', 'aria-label': 'Minutos' });
  const day = h('input', { type: 'date', value: today(), 'aria-label': 'Dia' });
  return h('form', { class: 'row', onsubmit: async e => {
    e.preventDefault();
    const m = Number(minutes.value);
    if (!(m > 0)) return;
    if (await attempt(async () => { await addEntry('study_log', { skill: skill.value, minutes: m, source: 'manual' }, day.value); return true; }, 'Horas registradas')) onSaved?.();
  } }, skill, minutes, h('span', { class: 'muted' }, 'min'), day, h('button', { type: 'submit' }, 'Registrar'));
}

function gateView(phase, gate, saved, onChange) {
  const g = { checklist: phase.gate.checklist.map(() => false), exam: '', project: '', passedAt: null, ...saved };
  const save = () => attempt(() => updateKV('gate:' + phase.id, {}, o => Object.assign(o, g)));
  const exam = h('textarea', { style: 'min-height: 70px; font-family: var(--f-ui); font-size: 15px', 'aria-label': 'Notas do simulado' }, g.exam);
  const project = h('textarea', { style: 'min-height: 90px; font-family: var(--f-ui); font-size: 15px', 'aria-label': 'Projeto da fase' }, g.project);
  exam.onchange = () => { g.exam = exam.value; save(); };
  project.onchange = () => { g.project = project.value; save(); };
  return h('section', { class: 'card', id: 'portao' },
    h('h2', {}, phase.gate.title, g.passedAt ? h('span', { class: 'stamp', style: 'margin-left: 10px' }, 'aprovado') : null),
    h('div', { class: 'label' }, 'Checklist'),
    phase.gate.checklist.map((c, i) => h('label', { class: 'task' }, h('input', { type: 'checkbox', checked: g.checklist[i], onchange: e => { g.checklist[i] = e.target.checked; save(); } }), h('span', {}, c))),
    h('div', { class: 'label', style: 'margin-top: 12px' }, 'Simulado'), h('p', { class: 'muted' }, phase.gate.exam), exam,
    h('div', { class: 'label', style: 'margin-top: 12px' }, 'Projeto'), h('p', { class: 'muted' }, phase.gate.project), project,
    h('div', { class: 'row', style: 'margin-top: 12px' },
      h('button', { type: 'button', class: 'amber', disabled: !!g.passedAt, onclick: async () => { g.passedAt = today(); await save(); onChange(); } }, g.passedAt ? `Aprovado em ${g.passedAt.split('-').reverse().join('/')}` : 'Marcar aprovado'),
      h('button', { type: 'button', class: 'ghost', onclick: async () => {
        if (!confirm('Isso adia o plano em 4 semanas e desmarca as tarefas das 4 últimas semanas desta fase para você refazê-las. Continuar?')) return;
        const cfg = { ...state.cfg, start: repeatWeeks(state.cfg.start, phase.end, {}).start };
        if (await attempt(async () => {
          await updateKV('ptasks', {}, o => { const kept = repeatWeeks(state.cfg.start, phase.end, o).ptasks; for (const k of Object.keys(o)) if (!(k in kept)) delete o[k]; });
          await setKV('plancfg', cfg); return true; }, 'Plano adiado em 4 semanas')) { state.cfg = cfg; onChange(); }
      } }, 'Repetir 4 semanas de consolidação')));
}

export async function render(el, [n]) {
  const cw = currentWeek(state.cfg.start, today());
  if (!n) {
    if (cw.status === 'unset') { mount(el, h('p', {}, 'Defina a data de início em ', h('a', { href: '#/config' }, 'Config'), '.')); return; }
    return go(`#/plano/${cw.week}`);
  }
  const week = Math.min(TOTAL_WEEKS, Math.max(1, Number(n) || 1));
  const plan = state.data.plan;
  const W = plan.weeks[week - 1];
  const phase = phaseOf(week, plan.phases);
  const [ptasks, gateSaved, logs] = await Promise.all([getKV('ptasks', {}), getKV('gate:' + phase.id, {}), listEntries('study_log')]);
  const range = planWeekRange(state.cfg.start, week);
  const weekStart = range.from;
  const mins = minutesBySkill(logs, range.from, range.to);
  const total = Object.values(mins).reduce((a, b) => a + b, 0);
  const goal = weekGoalMinutes(phase, state.cfg.goalMinutes);
  const rerender = () => render(el, [String(week)]);

  const notice = cw.status === 'notStarted' ? h('div', { class: 'banner' }, `O plano começa em ${diffDays(today(), state.cfg.start)} dias.`)
    : cw.status === 'finished' ? h('div', { class: 'banner' }, 'Você chegou ao fim das 156 semanas.') : null;

  const groups = {};
  for (const t of W.tasks) (groups[t.a] ||= []).push(t);
  mount(el, 
    notice,
    h('p', { class: 'label' }, `Fase ${phase.name} · ${phase.level}${week === cw.week ? ' · semana atual' : ''}`),
    h('h1', {}, `Semana ${week}`), h('p', { class: 'muted' }, `Tema: ${W.theme} · ${weekStart.split('-').reverse().join('/')} a ${range.to.split('-').reverse().join('/')}`),
    h('div', { class: 'row' },
      week > 1 ? h('a', { class: 'btn ghost', href: `#/plano/${week - 1}` }, '← anterior') : null,
      cw.week && week !== cw.week ? h('a', { class: 'btn ghost', href: `#/plano/${cw.week}` }, 'semana atual') : null,
      week < TOTAL_WEEKS ? h('a', { class: 'btn ghost', href: `#/plano/${week + 1}` }, 'próxima →') : null),
    h('section', { class: 'card' },
      h('div', { class: 'row', style: 'justify-content: space-between' }, h('b', {}, 'Horas da semana'), h('span', { class: 'mono' }, `${fmtMin(total)} / ${fmtMin(goal)}`)),
      h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': goal, 'aria-valuenow': total }, h('i', { style: `width: ${Math.min(100, (total / goal) * 100)}%` })),
      h('div', { class: 'stack', style: 'margin-top: 10px' }, hoursForm(rerender))),
    ...Object.entries(groups).map(([area, ts]) => h('section', {}, h('h3', {}, area), ts.map(t => {
      const href = linkFor(t.l);
      return h('label', { class: `task${ptasks[t.id] ? ' done' : ''}` },
        h('input', { type: 'checkbox', checked: !!ptasks[t.id], onchange: async e => {
          const on = e.target.checked;
          e.target.closest('.task').classList.toggle('done', on);
          const ok = await attempt(async () => { await updateKV('ptasks', {}, o => { if (on) o[t.id] = true; else delete o[t.id]; }); return true; });
          if (!ok) { e.target.checked = !on; e.target.closest('.task').classList.toggle('done', !on); }
        } }),
        h('span', {}, t.t, href ? h('a', { href, style: 'margin-left: 6px' }, 'abrir →') : t.l === 'plano' ? h('a', { href: '#portao', onclick: e => { e.preventDefault(); document.getElementById('portao')?.scrollIntoView(); }, style: 'margin-left: 6px' }, 'ver portão ↓') : null));
    }))),
    h('details', { class: 'card' }, h('summary', {}, 'Rotina e materiais da fase'),
      h('p', {}, phase.goal),
      h('div', { class: 'tbl' }, h('table', {}, h('tbody', {}, phase.routine.map(([d, r]) => h('tr', {}, h('th', {}, d), h('td', {}, r)))))),
      h('ul', {}, phase.materials.map(m => h('li', {}, m)))),
    week === phase.end ? gateView(phase, null, gateSaved, rerender)
      : h('p', {}, h('a', { href: `#/plano/${phase.end}` }, `${phase.gate.title} → semana ${phase.end}`)));
}

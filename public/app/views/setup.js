import { h, mount, attempt } from '../ui.js';
import { setKV } from '../db.js';
import { state, today, rerender } from '../main.js';

// First-run (and settings) form for plancfg.
export function cfgForm(cfg, submitLabel, onSaved) {
  const start = h('input', { type: 'date', id: 'start', value: cfg.start || today(), required: true });
  const goal = h('input', { type: 'number', id: 'goal', min: 1, max: 40, step: 0.5, value: cfg.goalMinutes ? cfg.goalMinutes / 60 : '', placeholder: 'padrão da fase (10 ou 11)' });
  const accent = h('select', { id: 'accent' },
    h('option', { value: 'en-US', selected: cfg.accent === 'en-US' }, 'Americano (en-US)'),
    h('option', { value: 'en-GB', selected: cfg.accent === 'en-GB' }, 'Britânico (en-GB)'));
  return h('form', {
    onsubmit: async e => {
      e.preventDefault();
      const next = { ...cfg, start: start.value, goalMinutes: goal.value ? Math.round(Number(goal.value) * 60) : null, accent: accent.value, setupDone: true };
      const ok = await attempt(async () => { await setKV('plancfg', next); return true; }, 'Configuração salva');
      if (ok) { state.cfg = next; onSaved?.(); }
    },
  },
  h('label', { for: 'start' }, 'Data de início do plano (semana 1)'), start,
  h('label', { for: 'goal' }, 'Meta semanal em horas (vazio = padrão da fase)'), goal,
  h('label', { for: 'accent' }, 'Sotaque da voz dos exemplos'), accent,
  h('p', {}, h('button', { type: 'submit', class: 'amber' }, submitLabel)));
}

export async function render(el) {
  mount(el, h('div', { class: 'login card' },
    h('h1', {}, 'Antes de embarcar'),
    h('p', { class: 'muted' }, '156 semanas, três fases e três portões. Escolha quando começa a semana 1.'),
    cfgForm(state.cfg, 'Começar', () => { location.hash = '#/hoje'; rerender(); })));
}

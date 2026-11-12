import { addDays, diffDays } from './dates.js';

export const TOTAL_WEEKS = 156;

export function currentWeek(startISO, today) {
  if (!startISO) return { week: null, status: 'unset' };
  const d = diffDays(startISO, today);
  if (d < 0) return { week: 1, status: 'notStarted' };
  const w = Math.floor(d / 7) + 1;
  if (w > TOTAL_WEEKS) return { week: TOTAL_WEEKS, status: 'finished' };
  return { week: w, status: 'active' };
}

export const phaseOf = (week, phases) => phases.find(p => p.start <= week && week <= p.end);

export const weekGoalMinutes = (phase, override) => override ?? phase.hours * 60;

export function repeatWeeks(startISO, gateWeek, ptasks) {
  const cleared = new Set([0, 1, 2, 3].map(i => `w${gateWeek - i}-`));
  const kept = Object.fromEntries(Object.entries(ptasks).filter(([k]) => ![...cleared].some(p => k.startsWith(p))));
  return { start: addDays(startISO, 28), ptasks: kept };
}

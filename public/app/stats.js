import { addDays, weekday } from './dates.js';

export function weekRange(today) {
  const from = addDays(today, -weekday(today));
  return { from, to: addDays(from, 6) };
}

export function minutesBySkill(entries, from, to) {
  const out = {};
  for (const e of entries) {
    if (e.kind !== 'study_log' || e.day < from || e.day > to) continue;
    out[e.data.skill] = (out[e.data.skill] || 0) + Number(e.data.minutes || 0);
  }
  return out;
}

// Consecutive study days back from today; one missed day per Mon–Sun week is forgiven.
export function streak(days, today) {
  let d = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  const missesPerWeek = {};
  for (let guard = 0; guard < 4000; guard++, d = addDays(d, -1)) {
    if (days.has(d)) { count++; continue; }
    const wk = weekRange(d).from;
    missesPerWeek[wk] = (missesPerWeek[wk] || 0) + 1;
    if (missesPerWeek[wk] > 1 || count === 0) break;
  }
  return count;
}

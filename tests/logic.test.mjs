import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, addDays, diffDays } from '../public/app/dates.js';
import { review, buildQueue, INTERVALS } from '../public/app/srs.js';
import { currentWeek, repeatWeeks, weekGoalMinutes, phaseOf } from '../public/app/plan.js';
import { weekRange, minutesBySkill, streak } from '../public/app/stats.js';

test('localDate uses local time, not UTC (23:30 stays on the same day)', () => {
  assert.equal(localDate(new Date(2026, 10, 12, 23, 30)), '2026-11-12');
});

test('addDays and diffDays', () => {
  assert.equal(diffDays('2026-03-01', '2026-03-08'), 7);
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
});

test('SRS intervals', () => assert.deepEqual(INTERVALS, [1, 3, 7, 14]));

test('review good from new card', () => {
  assert.deepEqual(review({ step: 0, first_reviewed_day: null }, 'good', '2026-11-12'),
    { step: 1, due: '2026-11-13', first_reviewed_day: '2026-11-12' });
});

test('review good on step 3 masters the card', () => {
  const r = review({ step: 3, first_reviewed_day: '2026-10-01' }, 'good', '2026-11-12');
  assert.equal(r.step, 4);
  assert.equal(r.due, '9999-12-31');
  assert.equal(r.first_reviewed_day, '2026-10-01');
});

test('review again resets to step 0 due tomorrow', () => {
  const r = review({ step: 2, first_reviewed_day: '2026-10-01' }, 'again', '2026-11-12');
  assert.equal(r.step, 0);
  assert.equal(r.due, '2026-11-13');
});

const T = '2026-11-12';
const due = (n, d) => ({ id: 'd' + n, step: 1, due: d, first_reviewed_day: '2026-10-01', created_at: '2026-10-01' });
const fresh = n => ({ id: 'n' + n, step: 0, due: T, first_reviewed_day: null, created_at: `2026-10-${String(n + 1).padStart(2, '0')}` });

test('buildQueue: recovery mode with more than 40 due', () => {
  const cards = [...Array.from({ length: 50 }, (_, i) => due(i, addDays('2026-11-01', i % 12))), ...Array.from({ length: 10 }, (_, i) => fresh(i))];
  const q = buildQueue(cards, T);
  assert.equal(q.cards.length, 40);
  assert.equal(q.recovery, true);
  assert.ok(q.cards.every(c => c.first_reviewed_day));
  for (let i = 1; i < q.cards.length; i++) assert.ok(q.cards[i - 1].due <= q.cards[i].due);
});

test('buildQueue: new quota discounts cards introduced today', () => {
  const introducedToday = Array.from({ length: 5 }, (_, i) => ({ id: 't' + i, step: 1, due: '2026-11-13', first_reviewed_day: T, created_at: '2026-10-01' }));
  const cards = [...Array.from({ length: 3 }, (_, i) => due(i, '2026-11-10')), ...Array.from({ length: 20 }, (_, i) => fresh(i)), ...introducedToday];
  const q = buildQueue(cards, T);
  assert.equal(q.recovery, false);
  assert.equal(q.dueCount, 3);
  assert.equal(q.cards.length, 13);
});

test('currentWeek states', () => {
  assert.equal(currentWeek(null, T).status, 'unset');
  assert.deepEqual(currentWeek('2026-11-20', T), { week: 1, status: 'notStarted' });
  assert.equal(currentWeek(T, T).week, 1);
  assert.equal(currentWeek(T, '2026-11-19').week, 2);
  assert.deepEqual(currentWeek('2020-01-01', T), { week: 156, status: 'finished' });
});

test('repeatWeeks moves start 28 days and clears the 4 gate weeks', () => {
  const r = repeatWeeks('2026-01-05', 30, { 'w26-1': true, 'w27-1': true, 'w30-11': true });
  assert.deepEqual(r.ptasks, { 'w26-1': true });
  assert.equal(r.start, '2026-02-02');
});

test('weekGoalMinutes and phaseOf', () => {
  const phases = [{ id: 'f1', start: 1, end: 30, hours: 10 }, { id: 'f2', start: 31, end: 78, hours: 11 }];
  assert.equal(phaseOf(31, phases).id, 'f2');
  assert.equal(weekGoalMinutes(phases[0], null), 600);
  assert.equal(weekGoalMinutes(phases[0], 300), 300);
});

test('weekRange is Monday to Sunday', () => {
  assert.deepEqual(weekRange('2026-11-12'), { from: '2026-11-09', to: '2026-11-15' });
  assert.deepEqual(weekRange('2026-11-15'), { from: '2026-11-09', to: '2026-11-15' });
});

test('minutesBySkill sums study_log in range', () => {
  const e = [
    { kind: 'study_log', day: '2026-11-10', data: { skill: 'Leitura', minutes: 30 } },
    { kind: 'study_log', day: '2026-11-11', data: { skill: 'Leitura', minutes: 15 } },
    { kind: 'study_log', day: '2026-11-01', data: { skill: 'Leitura', minutes: 99 } },
    { kind: 'error', day: '2026-11-10', data: {} },
  ];
  assert.deepEqual(minutesBySkill(e, '2026-11-09', '2026-11-15'), { Leitura: 45 });
});

test('streak tolerates one missing day per week', () => {
  const s = new Set(['2026-11-08', '2026-11-09', '2026-11-11', '2026-11-12']);
  assert.equal(streak(s, T), 4);
  const s2 = new Set(['2026-11-08', '2026-11-09', '2026-11-12']);
  assert.equal(streak(s2, T), 1);
});

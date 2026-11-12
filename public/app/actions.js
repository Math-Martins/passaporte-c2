// Cross-view side effects: marking plan tasks, logging study time, sending cards to SRS.
import { getKV, updateKV, addEntry, addCards } from './db.js';
import { state, today } from './main.js';
import { toast } from './ui.js';

export const allLessons = () => state.data.modules.flatMap(m => m.lessons.map((l, i) => ({ ...l, mod: m, idx: i })));
export const findLesson = id => allLessons().find(l => l.id === id);

export async function logStudy(skill, minutes, source) {
  if (minutes > 0) await addEntry('study_log', { skill, minutes: Math.round(minutes), source });
}

// Mark every plan task linked (task.l) to this lesson/module id.
export async function markLinkedTasks(linkId) {
  await updateKV('ptasks', {}, ptasks => {
    for (const w of state.data.plan.weeks) for (const t of w.tasks) if (t.l === linkId) ptasks[t.id] = true;
  });
}

// `done` is written last: if an earlier step fails, a retry redoes the whole completion.
export async function completeLesson(lesson) {
  if ((await getKV('done', {}))[lesson.id]) return;
  await markLinkedTasks(lesson.id);
  await logStudy('Curso e gramática', lesson.min, 'lesson:' + lesson.id);
  await updateKV('done', {}, done => { done[lesson.id] ??= today(); });
}

export async function completeChallenges(mod) {
  await markLinkedTasks(mod.id);
}

export async function sendToSRS(card) {
  await addCards([card]);
  toast('Enviado para a revisão');
}

export async function logError(e) {
  await addEntry('error', { wrong: e.wrong, correct: e.correct, explanation: e.explanation || '', category: e.category || 'outro', source: e.source || 'manual' });
}

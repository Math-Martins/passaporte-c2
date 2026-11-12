import { addDays } from './dates.js';

export const INTERVALS = [1, 3, 7, 14];
export const MASTERED_DUE = '9999-12-31';

export function review(card, rating, today) {
  const first_reviewed_day = card.first_reviewed_day ?? today;
  if (rating === 'again') return { step: 0, due: addDays(today, 1), first_reviewed_day };
  const step = card.step + 1;
  const due = step >= INTERVALS.length ? MASTERED_DUE : addDays(today, INTERVALS[card.step]);
  return { step: Math.min(step, INTERVALS.length), due, first_reviewed_day };
}

export function buildQueue(cards, today, { newLimit = 15, maxDue = 40 } = {}) {
  const dueCards = cards
    .filter(c => c.first_reviewed_day != null && c.step < INTERVALS.length && c.due <= today)
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  const dueCount = dueCards.length;
  if (dueCount > maxDue) return { cards: dueCards.slice(0, maxDue), recovery: true, dueCount };
  const introducedToday = cards.filter(c => c.first_reviewed_day === today).length;
  const quota = Math.max(0, newLimit - introducedToday);
  const fresh = cards
    .filter(c => c.first_reviewed_day == null)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
    .slice(0, quota);
  return { cards: [...dueCards, ...fresh], recovery: false, dueCount };
}

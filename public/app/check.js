/* Answer checking shared by the app and the Node tests. Same rules as the original HTML version. */
export function normAns(s) {
  s = String(s == null ? '' : s).toLowerCase();
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[‘’`´]/g, "'").replace(/[“”"]/g, '');
  s = s.replace(/\bwon't\b/g, 'will not').replace(/\bcan't\b/g, 'can not').replace(/\bcannot\b/g, 'can not').replace(/\bshan't\b/g, 'shall not');
  s = s.replace(/n't\b/g, ' not');
  s = s.replace(/'m\b/g, ' am').replace(/'re\b/g, ' are').replace(/'ve\b/g, ' have').replace(/'ll\b/g, ' will');
  s = s.replace(/[.,!?;:()…]+/g, ' ').replace(/-/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

export function checkAnswer(given, accepted) {
  const g = normAns(given);
  if (!g) return false;
  return accepted.some(a => normAns(a) === g);
}

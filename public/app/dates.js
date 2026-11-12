// Dates are local calendar days as 'YYYY-MM-DD' strings. Never derive them from toISOString (UTC).
const pad = n => String(n).padStart(2, '0');

export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const toUTC = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };

export function addDays(iso, n) {
  const d = new Date(toUTC(iso) + n * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function diffDays(a, b) {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

// 0 = Monday … 6 = Sunday
export function weekday(iso) {
  return (new Date(toUTC(iso)).getUTCDay() + 6) % 7;
}

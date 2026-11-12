import { getSession, getKV, setKV, addCards, supabase } from './db.js';
import { h } from './ui.js';
import { localDate } from './dates.js';

export const state = { data: null, cfg: null };
export const today = () => localDate();
export const go = hash => { location.hash = hash; };

const DEFAULT_CFG = { start: null, goalMinutes: null, accent: 'en-US', setupDone: false };

const ROUTES = {
  hoje: 'today', trilha: 'trail', modulo: 'trail', aula: 'lesson', pratica: 'practice',
  entrevista: 'interview', plano: 'plan', erros: 'errors', conversas: 'conversations',
  biblioteca: 'library', progresso: 'progress', config: 'settings',
};

const view = document.getElementById('view');
const nav = document.getElementById('nav');

function serverDown(err) {
  view.replaceChildren(h('div', { class: 'login card' },
    h('h1', {}, 'Sem conexão'),
    h('p', {}, 'Não consegui falar com o servidor. Se o projeto do Supabase estiver pausado, reative no painel (supabase.com/dashboard) e recarregue.'),
    h('p', { class: 'muted mono' }, String(err.message || err)),
    h('button', { onclick: () => location.reload() }, 'Tentar de novo')));
}

// The 68 interview questions enter the SRS once, as new cards (released 15 per day by buildQueue).
async function seedInterview() {
  if (await getKV('seeded_interview', false)) return;
  await addCards(state.data.cards.map(c => ({ kind: 'interview', source_ref: c.id, front: c.q, back: c.a })));
  await setKV('seeded_interview', true);
}

export async function reloadCfg() {
  state.cfg = { ...DEFAULT_CFG, ...(await getKV('plancfg', {})) };
  return state.cfg;
}

async function render() {
  let session;
  try { session = await getSession(); } catch (e) { return serverDown(e); }
  if (!session) {
    nav.hidden = true;
    return (await import('./views/login.js')).render(view);
  }
  try {
    if (!state.data) state.data = await (await fetch('data.json')).json();
    if (!state.cfg) await reloadCfg();
  } catch (e) { return serverDown(e); }
  if (!state.seeded) {
    state.seeded = true;
    seedInterview().catch(e => { state.seeded = false; console.warn(e); });
  }
  if (!state.cfg.setupDone) {
    nav.hidden = true;
    return (await import('./views/setup.js')).render(view);
  }
  nav.hidden = false;
  const [name = 'hoje', ...params] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const mod = ROUTES[name] || 'today';
  const section = Object.keys(ROUTES).find(k => ROUTES[k] === mod);
  nav.querySelectorAll('a').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === `#/${section}`));
  if (nav.querySelector('[aria-current]')) nav.querySelector('[aria-current]').setAttribute('aria-current', 'page');
  view.replaceChildren(h('p', { class: 'muted' }, 'Carregando…'));
  try {
    await (await import(`./views/${mod}.js`)).render(view, name === 'modulo' ? ['modulo', ...params] : params);
  } catch (e) {
    console.error(e);
    view.replaceChildren(h('div', { class: 'card' }, h('h2', {}, 'Algo deu errado'), h('p', { class: 'muted' }, e.message)));
  }
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

export const rerender = render;
window.addEventListener('hashchange', render);
supabase.auth.onAuthStateChange(evt => { if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') { state.cfg = null; render(); } });
render();

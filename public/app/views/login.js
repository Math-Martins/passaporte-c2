import { h, mount, attempt } from '../ui.js';
import { signIn } from '../db.js';

export async function render(el) {
  const email = h('input', { type: 'email', id: 'email', autocomplete: 'username', required: true });
  const pw = h('input', { type: 'password', id: 'pw', autocomplete: 'current-password', required: true });
  const btn = h('button', { type: 'submit', class: 'amber' }, 'Embarcar');
  mount(el, h('form', {
    class: 'login card',
    onsubmit: async e => {
      e.preventDefault(); btn.disabled = true;
      await attempt(() => signIn(email.value.trim(), pw.value));
      btn.disabled = false;
    },
  },
  h('h1', {}, 'Passaporte C2'),
  h('p', { class: 'muted' }, 'B1 → C2, um dia de cada vez.'),
  h('label', { for: 'email' }, 'E-mail'), email,
  h('label', { for: 'pw' }, 'Senha'), pw,
  h('p', {}, btn)));
  email.focus();
}

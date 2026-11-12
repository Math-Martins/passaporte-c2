import { h, mount, attempt, toast } from '../ui.js';
import { dumpAll, recordingUrl, signOut } from '../db.js';
import { cfgForm } from './setup.js';
import { state, today } from '../main.js';

async function exportAll(btn, status) {
  btn.disabled = true;
  await attempt(async () => {
    const { default: JSZip } = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
    status.textContent = 'Lendo dados…';
    const data = await dumpAll();
    const zip = new JSZip();
    zip.file('dados.json', JSON.stringify(data, null, 1));
    const folder = zip.folder('recordings');
    for (const [i, r] of data.recording.entries()) {
      status.textContent = `Baixando gravações ${i + 1}/${data.recording.length}…`;
      const res = await fetch(await recordingUrl(r.path));
      if (!res.ok) throw new Error(`Falha ao baixar ${r.path}`);
      folder.file(r.path.split('/').pop(), await res.blob());
    }
    status.textContent = 'Compactando…';
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `passaporte-c2-${today()}.zip` });
    document.body.append(a); a.click(); a.remove();
    status.textContent = `Exportado: ${data.recording.length} gravações.`;
    return true;
  });
  btn.disabled = false;
}

export async function render(el) {
  const status = h('span', { class: 'muted', 'aria-live': 'polite' });
  const exportBtn = h('button', { type: 'button', onclick: () => exportAll(exportBtn, status) }, 'Exportar tudo (.zip)');
  mount(el, h('h1', {}, 'Configurações'),
    h('section', { class: 'card' }, cfgForm(state.cfg, 'Salvar', () => toast('Pronto'))),
    h('section', { class: 'card' }, h('h2', { style: 'margin-top: 0' }, 'Seus dados'),
      h('p', { class: 'muted' }, 'Baixa um .zip com todos os registros (dados.json) e todas as gravações.'), h('div', { class: 'row' }, exportBtn, status)),
    h('p', {}, h('button', { type: 'button', class: 'ghost', onclick: () => signOut() }, 'Sair')));
}

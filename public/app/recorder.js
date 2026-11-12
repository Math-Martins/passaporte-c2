import { h, toast, attempt, mountRubric } from './ui.js';
import { saveRecording, listRecordings, recordingUrl, updateRecording, addEntry } from './db.js';
import { speak } from './tts.js';

const MAX_SEC = 180;

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || '';
}

const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Saves self-assessment on a recording and turns the noted errors into error-log entries.
export async function saveAssessment(recId, assessment) {
  await updateRecording(recId, { self_assessment: assessment });
  for (const e of assessment.errors) await addEntry('error', { ...e, explanation: '', category: 'outro', source: 'self_review' });
}

export function mountRecorder(el, { context, referenceText = '', onSaved } = {}) {
  const box = h('div', { class: 'rec' });
  el.append(box);
  const status = h('span', { class: 'mono', 'aria-live': 'polite' });
  const recBtn = h('button', { type: 'button' }, '● Gravar');
  const modelBtn = referenceText ? h('button', { type: 'button', class: 'ghost', onclick: () => speak(referenceText) }, '▶ Ouvir modelo') : null;
  const preview = h('div');
  const history = h('div', { class: 'stack' });
  box.append(h('div', { class: 'row' }, recBtn, modelBtn, status), preview,
    h('details', { ontoggle: e => e.target.open && loadHistory() }, h('summary', {}, 'Gravações anteriores'), history));

  const mime = pickMime();
  if (mime === null || !navigator.mediaDevices?.getUserMedia) {
    recBtn.disabled = true;
    status.textContent = 'Microfone indisponível neste navegador ou permissão negada.';
    return;
  }

  let rec = null, chunks = [], timer = null, secs = 0, stream = null;

  async function start() {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { status.textContent = 'Microfone indisponível neste navegador ou permissão negada.'; return; }
    chunks = []; secs = 0;
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = finish;
    rec.start();
    recBtn.textContent = '■ Parar';
    status.replaceChildren(h('span', { class: 'dot' }), ' 0:00');
    timer = setInterval(() => {
      secs++;
      status.replaceChildren(h('span', { class: 'dot' }), ` ${fmt(secs)} / ${fmt(MAX_SEC)}`);
      if (secs >= MAX_SEC) stop();
    }, 1000);
  }
  function stop() { clearInterval(timer); rec?.state === 'recording' && rec.stop(); stream?.getTracks().forEach(t => t.stop()); recBtn.textContent = '● Gravar de novo'; }
  recBtn.onclick = () => (rec?.state === 'recording' ? stop() : start());

  function finish() {
    const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' });
    const duration = secs;
    status.textContent = `${fmt(duration)} gravados`;
    const saveBtn = h('button', { type: 'button', class: 'amber' }, 'Salvar gravação');
    preview.replaceChildren(h('div', { class: 'row' }, h('audio', { controls: true, src: URL.createObjectURL(blob) }), saveBtn));
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      const row = await attempt(() => saveRecording(blob, { context, referenceText, durationSec: duration }));
      if (!row) { saveBtn.disabled = false; saveBtn.textContent = 'Tentar salvar de novo'; return; }
      toast('Gravação salva');
      const assess = h('div', { class: 'card' });
      const get = mountRubric(assess, 'speaking');
      assess.append(h('p', {}, h('button', {
        type: 'button', onclick: async e => {
          e.currentTarget.disabled = true;
          if (await attempt(async () => { await saveAssessment(row.id, get()); return true; }, 'Autoavaliação salva')) assess.remove();
          else e.currentTarget.disabled = false;
        },
      }, 'Salvar autoavaliação')));
      preview.replaceChildren(h('p', { class: 'ok' }, '✓ Salva.'), assess);
      onSaved?.(row);
    };
  }

  async function loadHistory() {
    const rows = await attempt(() => listRecordings(context));
    if (!rows) return;
    history.replaceChildren(...(rows.length ? rows : []).map(r => {
      const audio = h('audio', { controls: true, preload: 'none' });
      const btn = h('button', { type: 'button', class: 'ghost', onclick: async () => { audio.src = await recordingUrl(r.path); audio.play(); btn.remove(); } }, '▶');
      const s = r.self_assessment?.scores;
      return h('div', { class: 'row' }, h('span', { class: 'mono' }, new Date(r.created_at).toLocaleDateString('pt-BR')),
        btn, audio, s ? h('span', { class: 'muted mono' }, Object.values(s).join('·')) : null);
    }));
    if (!rows.length) history.replaceChildren(h('p', { class: 'muted' }, 'Nenhuma ainda.'));
  }
}

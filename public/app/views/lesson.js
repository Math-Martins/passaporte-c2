import { h, mount, toast, attempt } from '../ui.js';
import { getKV, setKV, listRecordings, listEntries } from '../db.js';
import { checkAnswer } from '../check.js';
import { speak } from '../tts.js';
import { mountRecorder } from '../recorder.js';
import { mountWriter } from '../writer.js';
import { findLesson, completeLesson, logError, logStudy, sendToSRS } from '../actions.js';
import { today } from '../main.js';

let ytReady;
function loadYT() {
  ytReady ??= new Promise(res => {
    window.onYouTubeIframeAPIReady = res;
    document.head.append(h('script', { src: 'https://www.youtube.com/iframe_api' }));
  });
  return ytReady;
}

function mountVideo(el, v) {
  const holder = h('div');
  const fallback = h('p', { class: 'muted', hidden: true }, 'Vídeo indisponível aqui. ', h('a', { href: `https://youtu.be/${v.id}`, target: '_blank', rel: 'noopener' }, 'Abrir no YouTube'));
  const rates = h('div', { class: 'row' }, h('span', { class: 'label' }, 'Velocidade'));
  el.append(h('div', { class: 'video' }, holder), rates, fallback);
  let watchedFrom = null, player;
  const flush = () => { if (watchedFrom != null) { const s = (Date.now() - watchedFrom) / 1000; watchedFrom = null; if (s >= 30) logStudy('Listening', s / 60, 'video:' + v.id); } };
  loadYT().then(() => {
    player = new YT.Player(holder, {
      videoId: v.id,
      playerVars: { start: v.start || 0, end: v.end || undefined, rel: 0, hl: 'en', cc_lang_pref: 'en' },
      events: {
        onError: () => { fallback.hidden = false; },
        onStateChange: e => { if (e.data === YT.PlayerState.PLAYING) watchedFrom = Date.now(); else flush(); },
      },
    });
  });
  for (const r of [0.75, 1, 1.25]) rates.append(h('button', { type: 'button', class: 'ghost', onclick: () => player?.setPlaybackRate(r) }, `${r}x`));
  window.addEventListener('hashchange', flush, { once: true });
}

function mountExercise(el, ex, exok) {
  const input = h('input', { type: 'text', lang: 'en', autocomplete: 'off', 'aria-label': ex.p });
  const out = h('div', { 'aria-live': 'polite' });
  const btn = h('button', { type: 'submit' }, 'Verificar');
  mount(el, h('form', {
    onsubmit: async e => {
      e.preventDefault();
      if (!input.value.trim()) return;
      if (checkAnswer(input.value, ex.a)) {
        out.replaceChildren(h('p', { class: 'ok' }, '✓ Certo. ', h('span', { class: 'muted' }, ex.why)));
        if (!exok[ex.id]) { exok[ex.id] = true; attempt(() => setKV('exok', exok)); }
      } else {
        out.replaceChildren(h('p', { class: 'bad' }, '✗ Resposta esperada: ', h('b', { lang: 'en' }, ex.a[0])), h('p', { class: 'muted' }, ex.why));
        attempt(() => logError({ wrong: input.value.trim(), correct: ex.a[0], explanation: ex.why, category: 'exercício', source: 'exercise:' + ex.id }));
      }
    },
  }, h('div', { class: 'prompt' }, ex.p, exok[ex.id] ? h('span', { class: 'ok' }, '  ✓') : null), h('div', { class: 'row' }, input, btn), out));
}

function mountQuiz(el, lesson, saved, onAnswered) {
  const answers = saved[lesson.id] ? [...saved[lesson.id]] : [];
  lesson.quiz.forEach((q, qi) => {
    const list = h('ul');
    const paint = () => list.querySelectorAll('li').forEach((li, oi) => {
      const b = li.querySelector('button'), o = q.o[oi], picked = answers[qi] === oi;
      b.className = picked ? (o.ok ? 'picked-ok' : 'picked-bad') : '';
      b.setAttribute('aria-pressed', String(picked));
      li.querySelector('.why').hidden = answers[qi] == null || !(picked || o.ok);
    });
    q.o.forEach((o, oi) => list.append(h('li', {},
      h('button', { type: 'button', onclick: async () => {
        answers[qi] = oi; paint();
        if (answers.filter(a => a != null).length === lesson.quiz.length) {
          saved[lesson.id] = answers;
          await attempt(() => setKV('quiz', saved));
          onAnswered();
        }
      } }, o.t),
      h('div', { class: 'why', hidden: true }, (o.ok ? '✓ ' : '✗ ') + o.why))));
    el.append(h('div', { class: 'quiz-q' }, h('b', {}, `${qi + 1}. ${q.q}`), list));
    paint();
  });
  return () => answers.filter(a => a != null).length === lesson.quiz.length;
}

export async function render(el, [id]) {
  const lesson = findLesson(id);
  if (!lesson) { mount(el, h('p', {}, 'Aula não encontrada.')); return; }
  const [done, quizSaved, exok, videos, recs, subs] = await Promise.all([
    getKV('done', {}), getKV('quiz', {}), getKV('exok', {}),
    fetch('videos.json').then(r => r.json()).catch(() => ({})),
    listRecordings('lesson:' + id), listEntries('submission'),
  ]);
  let productions = recs.length + subs.filter(s => s.data.context === 'lesson:' + id).length;

  const prose = h('div', { class: 'prose', html: lesson.html });
  const toc = h('nav', { class: 'toc', 'aria-label': 'Nesta aula' }, h('div', { class: 'label' }, 'Nesta aula'),
    lesson.toc.map(t => h('a', { href: `#/aula/${id}`, onclick: e => { e.preventDefault(); document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' }); } }, t.t)),
    h('a', { href: `#/aula/${id}`, onclick: e => { e.preventDefault(); document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' }); } }, 'Quiz'));

  // examples: listen, slow, send to SRS
  prose.querySelectorAll('.says li').forEach((li, i) => {
    const spk = li.querySelector('.spk'); const say = spk.dataset.say; const pt = li.querySelector('.pt')?.textContent || '';
    spk.onclick = () => speak(say);
    li.prepend(h('div', { class: 'tools' }, spk,
      h('button', { type: 'button', class: 'icon', 'aria-label': `Ouvir devagar: ${say}`, title: 'Devagar', onclick: () => speak(say, { slow: true }) }, '½'),
      h('button', { type: 'button', class: 'icon', 'aria-label': `Enviar para revisão: ${say}`, title: 'Enviar para revisão', onclick: () => attempt(() => sendToSRS({ kind: 'example', source_ref: `ex:${id}:${i}`, front: say, back: pt })) }, '+')));
  });
  prose.querySelectorAll('.ex[data-ex]').forEach(div => { const ex = lesson.ex.find(e => e.id === div.dataset.ex); if (ex) mountExercise(div, ex, exok); });

  const completeBtn = h('button', { type: 'button', class: 'amber' }, 'Concluir aula');
  const why = h('p', { class: 'muted' });
  let quizDone = () => false;
  const refresh = () => {
    if (done[id]) { completeBtn.disabled = true; completeBtn.textContent = `✓ Concluída em ${done[id].split('-').reverse().join('/')}`; why.textContent = ''; return; }
    const missing = [!quizDone() && 'responder o quiz', !productions && 'gravar ou enviar um texto no bloco "Fale em voz alta"'].filter(Boolean);
    completeBtn.disabled = missing.length > 0;
    why.textContent = missing.length ? `Para concluir: ${missing.join(' e ')}.` : '';
  };
  const onProduced = () => { productions++; refresh(); };

  prose.querySelectorAll('.speak').forEach(sp => {
    const recPane = h('div'), writePane = h('div', { hidden: true });
    const tab = (label, show) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(show === recPane), onclick: e => {
      recPane.hidden = show !== recPane; writePane.hidden = show !== writePane;
      e.currentTarget.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b === e.currentTarget)));
    } }, label);
    sp.append(h('div', { class: 'tabs', role: 'tablist' }, tab('Gravar', recPane), tab('Escrever', writePane)), recPane, writePane);
    mountRecorder(recPane, { context: 'lesson:' + id, referenceText: lesson.speakRef, onSaved: onProduced });
    mountWriter(writePane, { context: 'lesson:' + id, onSaved: onProduced });
  });

  const quizBox = h('section', { id: 'quiz' }, h('h2', {}, 'Quiz'));
  quizDone = mountQuiz(quizBox, lesson, quizSaved, refresh);
  completeBtn.onclick = async () => {
    completeBtn.disabled = true;
    if (await attempt(async () => { await completeLesson(lesson); return true; }, 'Aula concluída. Boa viagem!')) done[id] = today();
    refresh();
  };
  refresh();

  const ix = lesson.idx, mod = lesson.mod;
  const prev = mod.lessons[ix - 1], next = mod.lessons[ix + 1];
  const videoBox = h('div');
  if (videos[id]) mountVideo(videoBox, videos[id]);
  mount(el, 
    h('p', { class: 'label' }, h('a', { href: `#/modulo/${mod.id}` }, `Módulo ${mod.num} · ${mod.title}`), ` · ${lesson.min} min`),
    h('h1', {}, lesson.title),
    h('div', { class: 'lesson' }, toc, h('div', {}, videoBox, prose, quizBox, h('div', { class: 'card' }, completeBtn, why),
      h('div', { class: 'row', style: 'justify-content: space-between' },
        prev ? h('a', { href: `#/aula/${prev.id}` }, '← ' + prev.title) : h('span'),
        next ? h('a', { href: `#/aula/${next.id}` }, next.title + ' →') : h('a', { href: `#/modulo/${mod.id}` }, 'Desafios do módulo →')))));
}

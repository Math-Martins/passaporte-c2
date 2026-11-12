// Runs every exercise and auto challenge solution through the same checker the app uses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkAnswer, normAns } from '../public/app/check.js';

const data = JSON.parse(readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));
const CH = {};
data.modules.forEach(m => m.challenges.forEach(c => { CH[c.id] = c; }));

test('every exercise accepts its own answers and rejects junk', () => {
  for (const m of data.modules) for (const l of m.lessons) for (const e of l.ex) {
    for (const a of e.a) assert.ok(checkAnswer(a, e.a), `${e.id} accepts "${a}"`);
    assert.ok(!checkAnswer('', e.a), `${e.id} rejects empty`);
    assert.ok(!checkAnswer('xyz', e.a), `${e.id} rejects xyz`);
  }
});

test('auto challenges: solution passes, original wrong sentence fails', () => {
  for (const c of Object.values(CH)) if (c.kind === 'auto') {
    c.items.forEach((it, k) => {
      assert.ok(checkAnswer(it.a[0], it.a), `${c.id}#${k + 1} solution passes`);
      const orig = (it.p.match(/"([^"]+)"/) || [])[1];
      if (orig) assert.ok(!checkAnswer(orig, it.a), `${c.id}#${k + 1} prompt sentence fails: "${orig}"`);
    });
  }
});

test('lenient variations are accepted', () => {
  const lenient = [
    ['m01-c1', 4, 'can i ask a question'],
    ['m01-c1', 0, 'I am 25 and I am a developer'],
    ['m03-c1', 0, 'Could you tell me where the staging server is'],
    ['m04-c1', 1, 'The configuration has been changed.'],
    ['m06-c1', 5, 'I don’t know.'],
    ['m08-c1', 7, 'trade off'],
    ['m11-c1', 1, "I've been working here for two years"],
  ];
  for (const [id, k, v] of lenient) assert.ok(checkAnswer(v, CH[id].items[k].a), `${id}#${k + 1} accepts "${v}"`);
});

test('common wrong answers are rejected', () => {
  const strict = [
    ['m02-c1', 1, 'have built'],
    ['m03-c1', 0, 'Could you tell me where is the staging server?'],
    ['m04-c1', 0, 'The database backs up every night.'],
    ['m11-c1', 9, 'hear'],
  ];
  for (const [id, k, v] of strict) assert.ok(!checkAnswer(v, CH[id].items[k].a), `${id}#${k + 1} rejects "${v}"`);
});

test('normAns expands contractions', () => {
  assert.equal(normAns("I'm"), normAns('I am'));
});

test('every lesson has a speak block and a speakRef string', () => {
  const lessons = data.modules.flatMap(m => m.lessons);
  assert.equal(lessons.length, 43);
  for (const l of lessons) {
    assert.ok(l.html.includes('class="speak"'), `${l.id} has speak block`);
    assert.equal(typeof l.speakRef, 'string', `${l.id} has speakRef`);
  }
});

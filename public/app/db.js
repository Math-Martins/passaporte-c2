import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { localDate } from './dates.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function check({ data, error }, what) {
  if (error) throw new Error(`Não foi possível ${what}: ${error.message}`);
  return data;
}

async function uid() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sessão expirada. Entre de novo.');
  return data.session.user.id;
}

// ---------- auth ----------
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}
export async function signIn(email, password) {
  check(await supabase.auth.signInWithPassword({ email, password }), 'entrar');
}
export async function signOut() { await supabase.auth.signOut(); }

// ---------- kv ----------
export async function getKV(key, fallback) {
  const data = check(await supabase.from('kv').select('value').eq('key', key).maybeSingle(), 'ler dados');
  return data ? data.value : fallback;
}
export async function setKV(key, value) {
  check(await supabase.from('kv').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' }), 'salvar');
}

// Read-modify-write on a fresh copy, one write at a time per key, so another device's
// changes and quick successive clicks are never overwritten by a stale object.
const kvQueue = {};
export function updateKV(key, fallback, mutate) {
  const run = async () => {
    const value = await getKV(key, fallback);
    mutate(value);
    await setKV(key, value);
    return value;
  };
  const p = (kvQueue[key] || Promise.resolve()).then(run, run);
  kvQueue[key] = p.catch(() => {});
  return p;
}

// ---------- SRS ----------
export async function listCards() {
  return check(await supabase.from('srs_card').select('*').order('created_at'), 'ler cartões');
}
export async function addCards(cards) {
  if (!cards.length) return;
  check(await supabase.from('srs_card').upsert(cards, { onConflict: 'user_id,kind,source_ref', ignoreDuplicates: true }), 'criar cartões');
}
export async function updateCard(id, patch) {
  check(await supabase.from('srs_card').update(patch).eq('id', id), 'salvar revisão');
}

// ---------- entries ----------
export async function addEntry(kind, data, day = localDate()) {
  return check(await supabase.from('entry').insert({ kind, data, day }).select().single(), 'salvar registro');
}
export async function listEntries(kind, { from, to } = {}) {
  let q = supabase.from('entry').select('*').order('day', { ascending: false }).order('created_at', { ascending: false });
  if (kind) q = q.eq('kind', kind);
  if (from) q = q.gte('day', from);
  if (to) q = q.lte('day', to);
  return check(await q, 'ler registros');
}
export async function updateEntry(id, data) {
  check(await supabase.from('entry').update({ data }).eq('id', id), 'atualizar registro');
}
export async function deleteEntry(id) {
  check(await supabase.from('entry').delete().eq('id', id), 'apagar registro');
}

// ---------- recordings ----------
export async function saveRecording(blob, { context, referenceText = null, durationSec = null }) {
  const user = await uid();
  const mime = blob.type.split(';')[0] || 'audio/webm';
  const ext = mime === 'audio/mp4' ? 'm4a' : mime === 'audio/ogg' ? 'ogg' : 'webm';
  const path = `${user}/${crypto.randomUUID()}.${ext}`;
  check(await supabase.storage.from('recordings').upload(path, blob, { contentType: mime }), 'enviar a gravação');
  const res = await supabase.from('recording')
    .insert({ context, reference_text: referenceText, path, mime, duration_sec: durationSec })
    .select().single();
  if (res.error) {
    await supabase.storage.from('recordings').remove([path]);
    throw new Error(`Não foi possível salvar a gravação: ${res.error.message}`);
  }
  return res.data;
}
export async function recordingUrl(path) {
  return check(await supabase.storage.from('recordings').createSignedUrl(path, 600), 'abrir a gravação').signedUrl;
}
export async function listRecordings(context) {
  let q = supabase.from('recording').select('*').order('created_at', { ascending: false });
  if (context) q = context.endsWith('*') ? q.like('context', context.slice(0, -1) + '%') : q.eq('context', context);
  return check(await q, 'ler gravações');
}
export async function updateRecording(id, patch) {
  check(await supabase.from('recording').update(patch).eq('id', id), 'salvar autoavaliação');
}

// ---------- export ----------
export async function dumpAll() {
  const [kv, srs_card, entry, recording] = await Promise.all(
    ['kv', 'srs_card', 'entry', 'recording'].map(async t => check(await supabase.from(t).select('*'), 'exportar')));
  return { kv, srs_card, entry, recording };
}

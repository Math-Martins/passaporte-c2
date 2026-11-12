# Passaporte C2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plataforma web pessoal de estudo de inglês (B1 → C2) com aulas, exercícios, gravação de voz, SRS, plano de 156 semanas e sincronização celular/PC.

**Architecture:** Front estático em JavaScript puro (ES modules, sem bundler) servido pelo GitHub Pages. Conteúdo fixo em `public/data.json`, gerado pelo `build.py` a partir de `content/*.txt`. Estado, login e gravações no Supabase (Postgres com RLS, Auth por e-mail e senha, Storage privado). A lógica pura (SRS, semana do plano, estatísticas) fica em módulos testados com `node --test`.

**Tech Stack:** HTML/CSS/JS (ES2022 modules), `@supabase/supabase-js@2.45.4` via `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm`, `jszip@3.10.1` via `https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm`, YouTube IFrame Player API, Web Speech API, MediaRecorder, Python 3.14 (build), Node 24 (`node --test`), Supabase (plano gratuito), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-12-passaporte-c2-design.md`

## Global Constraints

- Um único usuário. O cadastro público fica desativado no Supabase. Todas as tabelas têm RLS `user_id = auth.uid()`.
- O bucket `recordings` é privado. O áudio só é tocado por signed URL de 600 s.
- Sem npm, sem bundler e sem `package.json`. Bibliotecas só por CDN, com versão exata (as duas URLs acima).
- Sem IA e sem serviço pago por uso.
- A correção de respostas usa `normAns` e `checkAnswer` de `public/app/check.js`, idênticos ao `check.js` original.
- "Hoje" sempre usa a data **local** (`America/Sao_Paulo` pelo relógio do aparelho) no formato `YYYY-MM-DD`. Nunca usar `toISOString().slice(0,10)`.
- Habilidades (texto exato, vem de `plan.skills`): `Curso e gramática`, `Vocabulário`, `Listening`, `Leitura`, `Speaking`, `Writing`.
- Intervalos do SRS: `[1, 3, 7, 14]` dias. `step` 4 = dominado. Até 15 cartões novos por dia. Com mais de 40 vencidos, a fila mostra os 40 mais atrasados e nenhum novo.
- A gravação aceita no máximo 180 s. O mime é `audio/webm;codecs=opus`, com fallback `audio/mp4`.
- Identidade visual: tokens `--paper #272727`, `--sheet #2F2F2F`, `--board #1C1C1C`, `--ink #EDEAE3`, `--muted #ABA79F`, `--amber #F3C64F`, `--red #EC7360`, `--blue #86A9F3`, `--ok #86D69D`. Fontes Big Shoulders Display, Newsreader, Instrument Sans e IBM Plex Mono (Google Fonts). Destaques: entrevista = vermelho, atenção = âmbar, dica = azul.
- Sem rolagem horizontal da página em 390 px. Foco visível. Botões só com ícone têm `aria-label`. Respeitar `prefers-reduced-motion`.
- Interface em português e conteúdo de estudo em inglês. O código, os comentários e as mensagens de commit vão em inglês, sem estilo telegráfico.
- Todo commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Data local × UTC:** depois das 21h no Brasil, `toISOString` cai no dia seguinte. A data de vencimento do SRS, a semana atual e o `study_log` precisam usar a data local. O teste fica na Task 2 (`localDate`).
2. **Data de início no futuro ou plano terminado:** a semana atual fica presa entre 1 e 156 e a tela informa a situação, sem quebrar. O teste fica na Task 2 (`currentWeek`).
3. **Microfone negado ou sem suporte:** sem `getUserMedia`, ou com o mime não suportado (Safari), o app mostra uma mensagem clara e o resto da aula continua funcionando. A verificação fica na Task 6.
4. **Falha de rede ou Supabase pausado ao salvar:** a ação mostra erro visível e o texto digitado continua no campo, sem se perder. Na gravação, a linha em `recording` só é criada depois do upload dar certo. A verificação fica nas Tasks 3 e 6.
5. **Revisões acumuladas após dias sem estudar:** a fila respeita o limite de 40 e não inclui cartões novos. O teste fica na Task 2 (`buildQueue`).

---

## File Structure

```
content/            m01.txt … m11.txt, glossario.txt, biblioteca.txt, entrevista.txt, plano.py  (fonte, verbatim)
build.py            gera public/data.json; injeta bloco de fala padrão
public/
  index.html        shell: <nav>, <main id="view">, carrega app/main.js
  style.css         tokens + componentes
  data.json         gerado (commitado)
  videos.json       {lessonId: {id, start, end}} — começa "{}"
  app/
    config.js       SUPABASE_URL, SUPABASE_ANON_KEY
    check.js        normAns, checkAnswer (ES module)
    dates.js        localDate, addDays, diffDays
    srs.js          review, buildQueue, INTERVALS
    plan.js         currentWeek, phaseOf, repeatWeeks, weekGoalMinutes
    stats.js        minutesBySkill, weekRange, streak
    db.js           Supabase client + data access
    ui.js           h(), toast(), formatação, rubrica IELTS, componente de texto
    tts.js          speak(text, {slow})
    recorder.js     mountRecorder(el, {context, referenceText})
    main.js         router por hash, guarda de login, carrega data.json
    views/          login.js setup.js today.js trail.js lesson.js practice.js interview.js plan.js errors.js conversations.js library.js progress.js settings.js
supabase/migrations/001_init.sql
tests/              answers.test.mjs dates.test.mjs srs.test.mjs plan.test.mjs stats.test.mjs
.github/workflows/pages.yml
```

---

### Task 1: Repositório, conteúdo e build

**Files:**
- Create: `content/m01.txt` … `content/m11.txt`, `content/glossario.txt`, `content/biblioteca.txt`, `content/entrevista.txt`, `content/plano.py`. São cópias **verbatim** dos arquivos que o usuário colou na conversa.
- Create: `build.py` (adaptado), `public/app/check.js`, `public/videos.json` (`{}`), `tests/answers.test.mjs`, `.gitignore` (`__pycache__/`, `.DS_Store`)

**Interfaces:**
- Produces: `public/data.json` com `{plan:{phases,weeks,skills,totalHours}, modules[], glossary[], library[], cards[]}`. É o mesmo formato do `passaporte-data.json`. Cada aula: `{id,title,min,html,toc,ex[{id,p,a[],why}],quiz[{q,o[{t,ok,why}]}]}`.
- Produces: `export function normAns(s: string): string` e `export function checkAnswer(given: string, accepted: string[]): boolean` em `public/app/check.js`.

- [ ] **Step 1:** `git init`, criar `.gitignore` e os arquivos de `content/` copiados verbatim.
- [ ] **Step 2:** Copiar o `build.py` original com estas mudanças:
  1. remover a montagem de `dist/index.html` (shell, style, app);
  2. gravar `public/data.json` compacto (`ensure_ascii=False`);
  3. em `parse_module`, se o `html` da aula não contiver `class="speak"`, anexar ao final `<div class="speak"><b>Fale em voz alta</b><p>Leia em voz alta os exemplos da aula e grave.</p></div>`. Antes de mudar o `html`, colocar os exemplos (`data-say`, em ordem) em `lesson["speakRef"]`, unidos por `\n`. Toda aula ganha `speakRef`.
- [ ] **Step 3:** Rodar `python build.py`. Esperado: a linha `ok: 11 módulos, 43 aulas, 24 desafios, … termos, … itens de biblioteca, 68 cartões` e `plano: 156 semanas`.
- [ ] **Step 4:** Criar `public/app/check.js` com o corpo idêntico ao `check.js` original, trocando o `module.exports` por `export`.
- [ ] **Step 5:** Escrever `tests/answers.test.mjs`. É o porte do `test_answers.js` (mesmas listas `lenient` e `strict`, mesmos asserts), lendo `public/data.json` com `fs`. Acrescentar dois testes: `toda aula tem bloco speak` (`html.includes('class="speak"')` em todas as 43) e `toda aula tem speakRef string`.
- [ ] **Step 6:** Rodar `node --test tests/`. Esperado: todos os testes passam (0 fail).
- [ ] **Step 7:** Commit `feat: add course content, build script and answer checker`.

### Task 2: Lógica pura (datas, SRS, plano, estatísticas)

**Files:**
- Create: `public/app/dates.js`, `public/app/srs.js`, `public/app/plan.js`, `public/app/stats.js`
- Test: `tests/dates.test.mjs`, `tests/srs.test.mjs`, `tests/plan.test.mjs`, `tests/stats.test.mjs`

**Interfaces (Produces):**
- `dates.js`:
  - `localDate(d = new Date()): string`: `YYYY-MM-DD` com `getFullYear/getMonth/getDate`.
  - `addDays(iso: string, n: number): string`
  - `diffDays(a: string, b: string): number`: retorna `b - a` em dias. Usa `Date.UTC` nos componentes para não sofrer com horário de verão.
- `srs.js`:
  - `INTERVALS = [1, 3, 7, 14]`
  - `review(card, rating: 'again'|'good', today: string): {step, due, first_reviewed_day}`. `good`: `due = addDays(today, INTERVALS[step])`, `step + 1`; se o step chegar a 4, `due = '9999-12-31'`. `again`: `step 0`, `due = addDays(today, 1)`. `first_reviewed_day = card.first_reviewed_day ?? today`.
  - `buildQueue(cards, today, {newLimit = 15, maxDue = 40} = {}): {cards, recovery: boolean, dueCount: number}`. Vencidos são os cartões com `first_reviewed_day != null && step < 4 && due <= today`, ordenados por `due` ascendente. Novos são os cartões com `first_reviewed_day == null`, em ordem de `created_at`. A quota é `newLimit - (quantidade de cartões com first_reviewed_day === today)`. Se `dueCount > maxDue`, a fila tem só os primeiros 40 vencidos e `recovery = true`.
- `plan.js`:
  - `currentWeek(startISO: string|null, today: string): {week: number|null, status: 'unset'|'notStarted'|'active'|'finished'}`. `week = floor(diffDays(start, today) / 7) + 1`, presa entre 1 e 156.
  - `phaseOf(week, phases)`
  - `weekGoalMinutes(phase, override: number|null): number`: `override ?? phase.hours * 60`.
  - `repeatWeeks(startISO, gateWeek, ptasks): {start, ptasks}`. Retorna `start + 28` e `ptasks` sem as chaves `w{gateWeek-3}-*` … `w{gateWeek}-*`.
- `stats.js`:
  - `weekRange(today): {from, to}`: segunda a domingo.
  - `minutesBySkill(entries, from, to): Record<skill, number>`: considera só entradas `kind === 'study_log'` com `day` entre `from` e `to`.
  - `streak(days: Set<string>, today): number`. Conta dias consecutivos de estudo voltando a partir de hoje. Se hoje ainda não tem estudo, começa de ontem. Tolera **uma** falta por semana (seg–dom); a segunda falta na mesma semana encerra a contagem.

- [ ] **Step 1:** Escrever os testes com estes asserts:
  - `localDate(new Date(2026, 10, 12, 23, 30)) === '2026-11-12'` (o caso das 23h30 que o UTC quebraria)
  - `diffDays('2026-03-01','2026-03-08') === 7`
  - `review({step:0,first_reviewed_day:null},'good','2026-11-12')` → `{step:1, due:'2026-11-13', first_reviewed_day:'2026-11-12'}`
  - `review({step:3,…},'good',t).due === '9999-12-31'` e `step === 4`
  - `review({step:2,…},'again','2026-11-12')` → `{step:0, due:'2026-11-13'}`
  - `buildQueue`: com 50 vencidos e 10 novos, retorna 40 cartões, todos vencidos, ordenados por `due`, e `recovery === true`
  - `buildQueue`: com 3 vencidos, 20 novos e 5 já introduzidos hoje, retorna 3 + 10 cartões
  - `currentWeek(null, t).status === 'unset'`
  - `currentWeek('2026-11-20','2026-11-12')` → `{week:1, status:'notStarted'}`
  - `currentWeek('2026-11-12','2026-11-12').week === 1`
  - `currentWeek('2026-11-12','2026-11-19').week === 2`
  - `currentWeek('2020-01-01','2026-11-12')` → `{week:156, status:'finished'}`
  - `repeatWeeks('2026-01-05', 30, {'w26-1':true,'w27-1':true,'w30-11':true}).ptasks` deve ser `{'w26-1':true}`, e `start` deve ser `'2026-02-02'`
  - `weekRange('2026-11-12')` (quinta) → `{from:'2026-11-09', to:'2026-11-15'}`
  - `streak` com estudo de 2026-11-08 a 11-12, faltando só 11-10 → 4; faltando 11-10 e 11-11 → 1
- [ ] **Step 2:** Rodar `node --test tests/`. Esperado: FAIL (módulos inexistentes).
- [ ] **Step 3:** Implementar os quatro módulos com as assinaturas acima.
- [ ] **Step 4:** Rodar `node --test tests/`. Esperado: tudo passa.
- [ ] **Step 5:** Commit `feat: add pure logic for dates, SRS, plan and stats`.

### Task 3: Supabase (projeto, schema, acesso a dados)

**Files:**
- Create: `supabase/migrations/001_init.sql`, `public/app/config.js`, `public/app/db.js`

**Interfaces:**
- Produces (`db.js`, todas as funções `async` e lançando `Error` com mensagem em português em caso de falha):
  - `supabase` (cliente), `getSession()`, `signIn(email, password)`, `signOut()`
  - `getKV(key, fallback)`, `setKV(key, value)`: upsert por `(user_id, key)`.
  - `listCards()`, `addCards(cards)` (`upsert` com `onConflict: 'user_id,kind,source_ref'` e `ignoreDuplicates: true`), `updateCard(id, patch)`
  - `addEntry(kind, data, day = localDate())`, `listEntries(kind?, {from, to}?)`, `updateEntry(id, data)`, `deleteEntry(id)`
  - `saveRecording(blob, {context, referenceText, durationSec})`: primeiro faz o upload para `recordings/{uid}/{uuid}.{webm|m4a}` e **só depois** insere a linha. Se o insert falhar, remove o arquivo enviado. Retorna a linha criada.
  - `recordingUrl(path)`: signed URL de 600 s.
  - `listRecordings(context?)`, `updateRecording(id, patch)`

- [ ] **Step 1:** Escrever `001_init.sql` com as tabelas `kv`, `srs_card`, `entry` e `recording` exatamente como na spec §5.2, com duas mudanças em `srs_card`: trocar `created_at` para ser usado na ordenação e adicionar `first_reviewed_day date`. Incluir:
  - `alter table … enable row level security` nas quatro tabelas;
  - uma policy `for all using (user_id = auth.uid()) with check (user_id = auth.uid())` em cada tabela;
  - o bucket `insert into storage.buckets (id, name, public) values ('recordings','recordings', false)`;
  - as policies de `storage.objects` com `bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text` para select, insert e delete;
  - os índices `entry(user_id, kind, day)` e `srs_card(user_id, due)`.
- [ ] **Step 2:** **Confirmar com o usuário** antes de criar o projeto. Depois: criar o projeto no Supabase (`mcp__claude_ai_Supabase__create_project`, região `sa-east-1`, plano gratuito), aplicar a migração (`apply_migration`) e pegar a URL e a publishable key (`get_project_url`, `get_publishable_keys`) para colocar em `config.js`. A anon/publishable key é pública por design; a service key nunca entra no repositório.
- [ ] **Step 3:** O usuário desativa "Allow new users to sign up" em Auth → Providers e cria o próprio usuário em Auth → Users. Senha forte, nunca no repositório nem na conversa.
- [ ] **Step 4:** Verificar com `execute_sql`: `select relname, relrowsecurity from pg_class where relname in ('kv','srs_card','entry','recording')`. Esperado: 4 linhas `true`. Rodar `get_advisors` (security). Esperado: nenhum alerta de RLS.
- [ ] **Step 5:** Implementar `db.js`.
- [ ] **Step 6:** Commit `feat: add Supabase schema and data access layer`.

### Task 4: Shell, login e configuração inicial

**Files:**
- Create: `public/index.html`, `public/style.css`, `public/app/main.js`, `public/app/ui.js`, `public/app/views/login.js`, `public/app/views/setup.js`

**Interfaces:**
- Consumes: `db.js` (sessão, `getKV`, `setKV`), `data.json`.
- Produces:
  - `main.js` exporta `state = {data, cfg}` e `go(hash)`.
  - Rotas: `#/hoje`, `#/trilha`, `#/modulo/:id`, `#/aula/:id`, `#/pratica`, `#/entrevista`, `#/plano`, `#/plano/:n`, `#/erros`, `#/conversas`, `#/biblioteca`, `#/progresso`, `#/config`.
  - Cada view exporta `render(el: HTMLElement, params: string[]): Promise<void>`.
  - `ui.js`: `h(tag, attrs, ...children)`, `toast(msg, kind)`, `mountRubric(el, 'speaking'|'writing', initial): () => scores`, `mountWriter(el, {context, prompt, minWords, maxWords})`.
  - O `kv` `plancfg` guarda `{start: string|null, goalMinutes: number|null, accent: 'en-US'|'en-GB', setupDone: boolean}`.

- [ ] **Step 1:** `index.html` com `<nav>` (Hoje, Trilha, Prática, Entrevista, Plano, Erros, Conversas, Biblioteca, Progresso, Config) e `<main id="view">`. Listra airmail no topo. `style.css` com os tokens. A navegação vira barra rolável no próprio contêiner abaixo de 720 px. Tabelas (`.tbl`) rolam dentro do próprio contêiner. Classes `.call.entrevista`, `.call.atencao`, `.call.dica`, `.says`, `.ex`, `.speak` estilizadas para o HTML legado das aulas.
- [ ] **Step 2:** Implementar `main.js`: sem sessão, mostra o login; com sessão e sem `setupDone`, mostra a configuração inicial; nos demais casos, renderiza a rota. Se a API não responder, a tela de login mostra: "Não consegui falar com o servidor. Se o projeto do Supabase estiver pausado, reative no painel."
- [ ] **Step 3:** Implementar `login.js` (e-mail e senha) e `setup.js` (data de início, padrão hoje; meta semanal em horas, padrão vazio = meta da fase; sotaque).
- [ ] **Step 4:** Verificar com o servidor `python -m http.server 8000 -d public` e o Playwright MCP, em 390×844 e 1280×800: o login entra, a configuração salva e recarregar leva a `#/hoje`. `document.documentElement.scrollWidth <= innerWidth`. O console fica sem erros.
- [ ] **Step 5:** Commit `feat: add app shell, login and initial setup`.

### Task 5: Trilha e aula

**Files:**
- Create: `public/app/tts.js`, `public/app/views/trail.js`, `public/app/views/lesson.js`

**Interfaces:**
- Consumes: `check.js`, `db.js`, `ui.js`, `plan.js`, `dates.js`, `mountRecorder` (Task 6; até lá, o bloco speak mostra só o texto).
- Produces:
  - `speak(text, {slow = false} = {})` usa `speechSynthesis`, com `lang` igual a `cfg.accent` e `rate` de 0.8 se `slow`, senão 1.
  - Chaves `kv`:
    - `done: {lessonId: 'YYYY-MM-DD'}`
    - `quiz: {lessonId: number[]}` (índice da opção escolhida por pergunta)
    - `exok: {exId: true}`
    - `chdone: {challengeId: true}`
    - `chitems: {challengeId: {expected checklist: boolean[]}}`
    - `ptasks: {taskId: true}`
  - `completeLesson(lessonId)` e `completeChallenges(moduleId)` (exportadas de `lesson.js`) marcam no `ptasks` toda tarefa cujo `l` é o id, e gravam o `study_log` `{skill:'Curso e gramática', minutes: lesson.min, source: 'lesson:'+id}`.

- [ ] **Step 1:** `trail.js`: "painel de partidas" com os 11 módulos (num, título, nível, progresso x/4) e carimbo no módulo concluído. `#/modulo/:id` lista as aulas e os desafios.
- [ ] **Step 2:** `lesson.js` renderiza:
  - player do YouTube, se `videos.json[id]` existir. O player usa `start` e `end` e tem botões 0.75/1/1.25 (`setPlaybackRate`). Se o player der erro, mostra o link `https://youtu.be/{id}`. O tempo assistido entra como `study_log` de Listening (minutos arredondados, ao pausar ou terminar).
  - o `html` da aula, com índice lateral montado a partir de `toc`;
  - os botões `.spk`, que chamam `speak`, mais um botão "lento";
  - cada `.ex`, que vira input + botão "Verificar". O resultado mostra `why`; no erro, mostra a primeira resposta aceita e cria `entry error` `{wrong, correct: a[0], explanation: why, category: 'exercício', source: 'exercise:'+id}`;
  - o quiz, com a explicação de cada opção;
  - o botão "Concluir aula", desabilitado até existirem o quiz respondido **e** uma gravação ou submissão com `context` `lesson:{id}`. O texto do botão explica o que falta.
- [ ] **Step 3:** Desafios no `#/modulo/:id`. `auto`: itens com input e `checkAnswer`, e "feito" quando todos acertam. `manual`: tarefa, dica e solução recolhíveis, checklist (`expected`) e `mountWriter` / recorder com `context` `challenge:{id}`. Quando todos os desafios do módulo ficam feitos, chama `completeChallenges`.
- [ ] **Step 4:** Verificar com o Playwright: abrir `#/aula/m02-2`; digitar `used` no `m02-2-e1` mostra o acerto; digitar `have used` mostra o erro e cria uma entrada no caderno (conferir com `listEntries('error')`). Responder o quiz. O botão "Concluir" continua desabilitado e explica o motivo.
- [ ] **Step 5:** Commit `feat: add trail, lesson view, exercises and quiz`.

### Task 6: Gravador e escrita com autoavaliação

**Files:**
- Create: `public/app/recorder.js`
- Modify: `public/app/ui.js` (`mountRubric`, `mountWriter`), `public/app/views/lesson.js` (bloco speak)

**Interfaces:**
- Produces:
  - `mountRecorder(el, {context: string, referenceText?: string}): void`
  - Rubrica: chaves `speaking: ['Fluency and Coherence','Lexical Resource','Grammatical Range and Accuracy','Pronunciation']` e `writing: ['Task Response','Coherence and Cohesion','Lexical Resource','Grammatical Range and Accuracy']`, nota de 1 a 5 cada. Os descritores 1–2, 3 e 4–5 são os da tabela 16.4 da spec original.
  - `self_assessment = {scores: {criterio: n}, notes: string, errors: [{wrong, correct}]}`. Cada erro vira `entry error` com `source: 'self_review'`.

- [ ] **Step 1:** `recorder.js`:
  - Botão gravar/parar, cronômetro e parada automática em 180 s.
  - Escolhe o mime com `MediaRecorder.isTypeSupported` (webm/opus, senão mp4).
  - Sem `navigator.mediaDevices` ou com permissão negada, mostra "Microfone indisponível neste navegador ou permissão negada" e não quebra.
  - Depois de parar, mostra o player local. "Salvar" chama `saveRecording`. Se falhar, mostra o erro e **mantém o blob** para tentar de novo.
  - Botão "Ouvir modelo" (`speak(referenceText)`).
  - Lista as gravações anteriores do mesmo `context` (data e player com signed URL).
  - A rubrica de speaking é salva com `updateRecording`.
- [ ] **Step 2:** `mountWriter`:
  - `textarea` com contador de palavras e a faixa `minWords`–`maxWords`.
  - Checklist rápido da spec 16.4.
  - Botão "Copiar e abrir Write & Improve", que copia para a área de transferência e abre `https://writeandimprove.com/`.
  - Campo "nota externa".
  - Rubrica de writing.
  - "Enviar" grava `entry submission` `{context, text, word_count, self_assessment, external_score}`. Se falhar, o texto fica no campo.
- [ ] **Step 3:** No `lesson.js`, o `.speak` ganha o recorder com `context: 'lesson:'+id` e `referenceText: lesson.speakRef`, mais a aba "Escrever" com `mountWriter`.
- [ ] **Step 4:** Verificar com o Playwright (`--use-fake-device-for-media-stream`, ou permissão concedida): gravar 3 s, salvar e recarregar a página. A gravação aparece na lista e toca. Concluir a aula agora é permitido e marca `w3-2` no `ptasks`. Com a rede bloqueada (`browser_route` abortando `*supabase.co*`), salvar mostra o erro e o player local continua lá.
- [ ] **Step 5:** Commit `feat: add voice recorder and writing self-assessment`.

### Task 7: SRS, entrevista e envio para revisão

**Files:**
- Create: `public/app/views/practice.js`, `public/app/views/interview.js`
- Modify: `public/app/main.js` (seed de entrevista após o login)

**Interfaces:**
- Consumes: `srs.js` (`review`, `buildQueue`), `db.js` (`listCards`, `addCards`, `updateCard`).
- Produces:
  - Formato do cartão: `{kind, source_ref, front, back}`.
    - Entrevista: `source_ref = card.id`, `front = q`, `back = a` (HTML).
    - Vocab: `source_ref = term.t`, `front = t`, `back = pt + ' — ' + d`.
    - Erro: `source_ref = entry.id`.
    - Exemplo: `source_ref = 'ex:' + lessonId + ':' + i`.
  - `sendToSRS(card)` (exportada de `practice.js`).

- [ ] **Step 1:** Seed: depois do login, se `getKV('seeded_interview')` for falso, chamar `addCards` com as 68 perguntas e depois `setKV('seeded_interview', true)`.
- [ ] **Step 2:** `practice.js`:
  - Fila com `buildQueue(cards, localDate())`; banner de modo recuperação quando `recovery`.
  - Frente; espaço mostra a resposta; tecla 1 = errei, tecla 2 = lembrei.
  - `updateCard(id, review(...))`.
  - No cartão de entrevista: recorder com `context 'interview:'+source_ref`, checklist STAR (abriu respondendo? Situation/Task/Action/Result? resultado com número? 60–120 s? "I" na Action?) e a dica.
  - Cada revisão registra `study_log` de 1 minuto por cartão, na habilidade Vocabulário (entrevista conta como Speaking).
- [ ] **Step 3:** `interview.js`: banco filtrável por categoria; cada pergunta mostra PT, resposta modelo, dica e recorder; mostra o estado SRS do cartão.
- [ ] **Step 4:** Botão "enviar para SRS": na linha de exemplo da aula (`.says li`), no termo do glossário (Task 9) e na entrada do caderno (Task 9).
- [ ] **Step 5:** Verificar com o Playwright: no primeiro acesso, `listCards()` tem 68 cartões; `#/pratica` mostra 15 novos; tecla 2 no primeiro deixa o cartão com `step 1` e `due` amanhã; recarregar mostra 14.
- [ ] **Step 6:** Commit `feat: add spaced repetition practice and interview bank`.

### Task 8: Plano, horas e portões

**Files:**
- Create: `public/app/views/plan.js`

**Interfaces:**
- Consumes: `plan.js` (lógica), `stats.js`, `db.js`.
- Produces: `kv` `gate:{phaseId}` = `{checklist: boolean[], exam: string, project: string, passedAt: string|null}`.

- [ ] **Step 1:** `#/plano` redireciona para `#/plano/{semana atual}`, ou mostra o aviso de `status` (`unset` → link para a configuração; `notStarted` → "começa em X dias"; `finished`).
- [ ] **Step 2:** `#/plano/:n` mostra:
  - fase e tema; tarefas agrupadas por `a`, com checkbox em `ptasks`; links internos para `l` (aula ou módulo; `plano` leva ao portão);
  - setas de semana anterior e próxima;
  - rotina e materiais da fase (recolhíveis);
  - formulário "registrar horas" (habilidade, minutos, dia; `addEntry('study_log', {skill, minutes, source: 'manual'})`);
  - barra de horas da semana contra `weekGoalMinutes`.
- [ ] **Step 3:** Portão, mostrado na última semana da fase e acessível sempre pelo seletor de fase:
  - título, checklist, `exam` (campo de texto para as notas), `project` (descrição e campo de texto/links);
  - "Marcar aprovado" grava `passedAt`;
  - "Repetir 4 semanas de consolidação" aplica `repeatWeeks` e salva `plancfg.start` e `ptasks`, depois de um `confirm()` que explica o efeito.
- [ ] **Step 4:** Verificar com o Playwright: com início em `localDate()`, `#/plano` abre a semana 1 com 11 tarefas; marcar `w1-1` e recarregar mantém a marcação; registrar 30 min de Leitura faz a barra mostrar 30/600.
- [ ] **Step 5:** Commit `feat: add 156-week plan view, hour log and phase gates`.

### Task 9: Caderno de erros, conversas, glossário e biblioteca

**Files:**
- Create: `public/app/views/errors.js`, `public/app/views/conversations.js`, `public/app/views/library.js`

**Interfaces:**
- Consumes: `db.js`, `sendToSRS` (Task 7).
- Produces: categorias de erro (lista fixa): `tempo verbal`, `preposição`, `collocation`, `pronúncia`, `false friend`, `ordem da frase`, `artigo`, `vocabulário`, `exercício`, `outro`.

- [ ] **Step 1:** `errors.js`:
  - Formulário manual (`wrong`, `correct`, `explanation`, `category`).
  - Lista com filtro por categoria.
  - "Top 10": entradas agrupadas por `normAns(wrong)`, contando ocorrências.
  - "Virar cartão SRS" (`kind error`, `front = wrong`, `back = correct + explicação`).
- [ ] **Step 2:** `conversations.js`:
  - Formulário: data, parceiro, plataforma, minutos, tema (pré-preenchido com o tema da semana atual), 3 erros e 3 expressões.
  - Salvar grava `entry conversation`, mais `study_log` de Speaking com os minutos, um `entry error` por erro preenchido (`source: 'conversation'`) e um cartão `vocab` por expressão.
  - Lista as conversas anteriores.
- [ ] **Step 3:** `library.js`, com duas abas:
  - Glossário: busca por `t`/`pt`, filtro por `c`, botão TTS e "enviar para SRS".
  - Biblioteca: agrupada por `cat`, com filtro de nível. O link abre em nova aba com `rel="noopener"`; `url === '-'` aparece sem link.
- [ ] **Step 4:** Verificar com o Playwright:
  - Adicionar o erro `I have 22 years` → `I'm 22` duas vezes faz o Top 10 mostrar a contagem 2.
  - Registrar uma conversa de 30 min com 1 erro gera +30 min em Speaking e +1 erro.
  - A busca por `trade` no glossário encontra `Trade-off`.
- [ ] **Step 5:** Commit `feat: add error log, conversation log, glossary and library`.

### Task 10: Hoje, progresso e configurações

**Files:**
- Create: `public/app/views/today.js`, `public/app/views/progress.js`, `public/app/views/settings.js`

**Interfaces:**
- Consumes: tudo o que veio antes.

- [ ] **Step 1:** `today.js`, nesta ordem:
  1. revisões: `dueCount` mais novos disponíveis, com estimativa de 0,5 min por cartão, botão "Revisar agora" e banner de modo recuperação;
  2. tarefas não feitas da semana atual, agrupadas por área;
  3. "cartão de embarque" com a próxima aula não concluída, na ordem da trilha;
  4. horas de hoje e horas da semana contra a meta;
  5. sugestão de mídia: o primeiro item da biblioteca da categoria "Listening e pronúncia" cujo `lv` contém o nível da fase.
  Na semana de portão, um banner destaca o portão.
- [ ] **Step 2:** `progress.js`:
  - horas por habilidade (semana, mês e total) como barras horizontais em HTML/CSS, sem biblioteca;
  - sequência (`streak`);
  - notas dos checkpoints, vindas das gravações com `context` iniciando em `checkpoint:` e `self_assessment`, em tabela por mês;
  - aulas x/43, desafios x/24 e portões aprovados.
  - O plano tem tarefas "Checkpoint" a cada 4 semanas. Na semana atual, o Hoje mostra um recorder com `context 'checkpoint:w'+n` e referência "Tell me about yourself and your plans.".
- [ ] **Step 3:** `settings.js`:
  - edição de `plancfg`;
  - "Exportar dados": JSON de `kv`, `srs_card`, `entry` e `recording`, mais um zip (JSZip) com todos os arquivos de áudio baixados por signed URL;
  - "Sair".
- [ ] **Step 4:** Verificar com o Playwright: o Hoje mostra os quatro blocos sem erro no console; exportar baixa um `.zip` com `dados.json` e a pasta `recordings/`; a página de progresso não tem rolagem horizontal em 390 px.
- [ ] **Step 5:** Commit `feat: add today dashboard, progress and settings with export`.

### Task 11: Deploy e aceite

**Files:**
- Create: `.github/workflows/pages.yml` (deploy da pasta `public/` com `actions/upload-pages-artifact@v3` e `actions/deploy-pages@v4`, rodando `node --test tests/` antes)

- [ ] **Step 1:** **Confirmar com o usuário** o nome do repositório e se ele será público. O GitHub Pages gratuito exige repositório público, e o conteúdo inclui textos pessoais de entrevista. A alternativa é um repositório privado com Pages, que exige plano pago. Depois de confirmado, criar com `gh repo create` e fazer o push.
- [ ] **Step 2:** Ativar o Pages (fonte: GitHub Actions) e adicionar a URL do Pages em Supabase → Auth → URL Configuration (Site URL).
- [ ] **Step 3:** Rodar os critérios de aceite da spec §8 no site publicado, com o Playwright em 390 px e 1280 px. Login no PC; concluir uma aula; abrir no celular (ou em outro contexto do navegador) e ver a aula concluída. Registrar o resultado de cada critério.
- [ ] **Step 4:** Commit `ci: deploy to GitHub Pages`.

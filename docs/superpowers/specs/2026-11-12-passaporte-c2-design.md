# Passaporte C2: design da plataforma pessoal de inglês

Data: 2026-11-12
Base: `plataforma-ingles-spec.md` (spec original), `passaporte-data.json`, `content/*.txt`, `build.py`, `plano.py`, `check.js`, `test_answers.js`.

## 1. Intenção

Uma plataforma web de **uso pessoal** (um único usuário) para estudar inglês todo dia, do B1 ao C2, em 156 semanas. Ela centraliza aulas, exercícios, gravação de voz, repetição espaçada, plano semanal, horas e portões de fase.

O motivo é parar de espalhar o estudo entre a versão HTML, Anki, cadernos e links soltos. Também é preciso ter o progresso sincronizado entre o celular e o PC.

## 2. Objetivos, não objetivos e antiobjetivos

**Objetivos**
- Abrir a plataforma e saber o que fazer hoje (revisões, tarefas da semana, próxima aula, horas).
- Estudar as 43 aulas com exercícios e quiz corrigidos na hora, com a mesma normalização da versão HTML.
- Gravar a voz em qualquer prompt de fala, ouvir de novo, comparar com o modelo e se autoavaliar pela rubrica IELTS.
- Fazer revisão espaçada (1-3-7-14) de entrevista, glossário e caderno de erros.
- Acompanhar as 156 semanas do plano, as horas por habilidade e os portões.
- Ter o mesmo estado no celular e no PC.

**Não objetivos (ficam para a v2 ou depois)**
- Portfólio e stack "de vitrine": o projeto **não** precisa usar Angular, Spring ou Postgres próprio.
- IA, TTS em nuvem e avaliação de pronúncia paga.
- Lembretes pelo n8n, teste de inteligibilidade, ditado, loop A-B de shadowing, perguntas no meio do vídeo, FSRS, editor de conteúdo, PWA offline, leitor com glossário pessoal, simulado de entrevista cronometrado.
- Áudio TTS pré-gerado com Piper. No MVP, o áudio dos exemplos usa a Web Speech API do navegador, como a versão HTML já faz.
- Multiusuário e cadastro aberto.

**Antiobjetivos (seria um fracasso mesmo funcionando)**
- O desenvolvimento passar a consumir o tempo de estudo. O MVP precisa ficar utilizável rápido, em poucas sessões de trabalho.
- Perder gravações ou progresso.
- Gravações acessíveis publicamente.
- Uma infraestrutura que exija manutenção (servidor para atualizar, container, cron).

## 3. Restrições

- Custo zero: GitHub Pages e o plano gratuito do Supabase.
- HTTPS é obrigatório, porque o microfone no celular só funciona em contexto seguro.
- Sem passo de build de front-end (sem npm/bundler). O único build é o `build.py` existente, que gera o JSON de conteúdo.
- O conteúdo é fixo e versionado no repositório: os `.txt` de origem e o `data.json` gerado. O conteúdo não vai para o banco.
- Funciona de 360 px até desktop, com foco visível, navegação por teclado e contraste AA.

## 4. Abordagens consideradas

| Opção | Como | Ganha | Perde |
|---|---|---|---|
| A. Estático + armazenamento do navegador | HTML/JS no GitHub Pages; estado em localStorage/IndexedDB | O mais simples, sem dependência externa | Sem sincronização entre aparelhos; limpar o navegador apaga as gravações |
| **B. Estático + Supabase (escolhida)** | Mesmo front estático; Supabase Auth, Postgres (estado) e Storage (gravações) | Sincroniza, funciona de qualquer lugar e quase não exige backend | Depende de um serviço externo; projetos gratuitos pausam após 7 dias sem uso |
| C. Servidor local | Node/Python + SQLite no PC, com túnel para o celular | Controle total e dados locais | PC sempre ligado; túnel para ter HTTPS; mais coisas para manter |

**Escolha do usuário: B.**

## 5. Decisões tomadas

### 5.1 Arquitetura

```
GitHub Pages (HTTPS)
 ├─ index.html + app/*.js + app/style.css   (ES modules, sem bundler)
 ├─ data.json        (gerado pelo build.py a partir de content/*.txt)
 └─ videos.json      (curadoria manual: lessonId → vídeo do YouTube)
        │
        ├── supabase-js (CDN, versão fixa) ──► Supabase Auth  (e-mail + senha)
        │                                   ├─► Postgres      (estado, com RLS)
        │                                   └─► Storage       (bucket privado "recordings")
        ├── YouTube IFrame Player API
        └── Web Speech API (TTS dos exemplos)
```

- Front em JavaScript puro com ES modules, carregados direto pelo navegador.
- `supabase-js` vem de uma CDN com versão fixa.
- `check.js` (normalização e correção) é reaproveitado como está. A correção roda no navegador. Como só existe um usuário, não há risco de trapaça e não é preciso corrigir no servidor.
- `build.py` continua gerando o `data.json`. Ele só deixa de montar o `index.html` monolítico.

### 5.2 Modelo de dados (Postgres no Supabase)

Todas as tabelas têm `user_id uuid default auth.uid()` e RLS `user_id = auth.uid()` para select, insert, update e delete.

```sql
-- estado simples, espelhando as chaves da versão HTML
create table kv (
  user_id uuid not null default auth.uid() references auth.users,
  key text not null,          -- done, chdone, exok, quiz, ptasks, plancfg, gate:f1 ...
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- cartões SRS (entrevista, glossário, erro, exemplo de aula)
create table srs_card (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  kind text not null,         -- interview | vocab | error | example
  source_ref text,            -- id do cartão de entrevista, termo do glossário etc.
  front text not null, back text not null,
  step int not null default 0,          -- 0..3 → intervalos 1,3,7,14; 4 = dominado
  due date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, kind, source_ref)
);

-- registros livres: horas, erros, conversas, textos, checkpoints
create table entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  kind text not null,         -- study_log | error | conversation | submission | checkpoint
  day date not null default current_date,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- metadados das gravações; o arquivo fica no Storage
create table recording (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users,
  context text not null,      -- lesson:m02-2 | interview:ap01 | checkpoint:w4 | challenge:m03-c2 | free
  reference_text text,
  path text not null,         -- {user_id}/{id}.webm
  mime text not null,
  duration_sec int,
  self_assessment jsonb,      -- notas 1..5 por critério IELTS + notas livres
  created_at timestamptz not null default now()
);
```

- O bucket `recordings` é privado. A policy do Storage só deixa o usuário mexer na pasta com o próprio `auth.uid()`. Para tocar um áudio, o app gera uma signed URL de curta duração.
- O formato do `data` em `entry`, por tipo:
  - `study_log`: `{skill, minutes, source}`
  - `error`: `{wrong, correct, explanation, category, source}`
  - `conversation`: `{partner, platform, minutes, topic, errors[], expressions[]}`
  - `submission`: `{context, text, word_count, self_assessment}`
  - `checkpoint`: `{week, recording_id, scores}`

### 5.3 Telas do MVP

1. **Login**: e-mail e senha do Supabase, com o cadastro público desativado no painel. Na primeira entrada, a configuração pede a data de início do plano, a meta semanal e o sotaque (en-US/en-GB) da voz do navegador.
2. **Hoje**: revisões SRS vencidas (com modo recuperação acima de 40), tarefas pendentes da semana atual agrupadas por área, próxima aula, horas da semana contra a meta e destaque do portão quando for semana de portão.
3. **Trilha → Módulo → Aula**:
   - A aula renderiza o `html` do `data.json` com o índice lateral.
   - Se a aula tiver vídeo no `videos.json`, um player do YouTube aparece no topo, com início e fim definidos e velocidade 0.75/1/1.25.
   - Os botões `.spk` dos exemplos falam a frase pela Web Speech API, com a opção de velocidade lenta.
   - O bloco `.ex` vira um campo com correção pelo `check.js`. Erro alimenta o caderno de erros.
   - O quiz mostra a explicação de cada opção.
   - Toda aula tem um bloco "Fale em voz alta": o `[fale]` do conteúdo ou, se faltar, o padrão "leia os exemplos da aula em voz alta e grave".
   - Concluir a aula exige o quiz respondido e pelo menos uma gravação ou texto enviado. Ao concluir, os minutos da aula entram como `study_log` de "Curso e gramática" e a tarefa do plano ligada a ela é marcada.
   - Desafios: os automáticos usam a correção por item; os manuais têm checklist (`expected`), envio de texto e gravação.
4. **Gravador** (componente reutilizado em aula, entrevista, checkpoint e desafio):
   - `MediaRecorder` com `audio/webm;codecs=opus`, ou `audio/mp4` como fallback para Safari. Limite de 3 min.
   - Upload para o Storage e linha em `recording`.
   - Toca a gravação ao lado do modelo (TTS do texto de referência) e mostra as gravações anteriores do mesmo contexto.
   - Autoavaliação com os 4 critérios IELTS de speaking (1 a 5) e campo para erros percebidos, que viram entradas do caderno.
5. **Texto (writing)**: campo de texto com contador de palavras, rubrica IELTS de writing, checklist rápido (anexo 16.4 da spec), botão "copiar e abrir Write & Improve" e campo para registrar a nota externa.
6. **Prática SRS**: fila do dia (vencidos primeiro, novos até 15 por dia). Atalhos: espaço mostra a resposta, 1 = errei (volta ao passo 0, vence amanhã), 2 = lembrei (avança um passo). Cartões de entrevista têm o botão de gravar a resposta e o checklist STAR.
7. **Entrevista**: banco das 68 perguntas por categoria, resposta modelo, dica, gravação e "enviar para SRS".
8. **Plano**: semana atual calculada pela data de início, navegação entre semanas, tarefas marcáveis, rotina e materiais da fase, registro manual de horas por habilidade e portão (checklist, notas do simulado, projeto em texto, botões "aprovado" e "repetir 4 semanas"). Na v2 do plano, "repetir 4 semanas" vira um deslocamento da data de início. No MVP é exatamente isso: a data de início avança 28 dias.
9. **Caderno de erros**: lista com filtro por categoria, top 10 por ocorrência, entrada manual e botão "virar cartão SRS".
10. **Conversas**: registro de conversas (os minutos entram como Speaking; os erros e expressões viram entradas e cartões).
11. **Glossário e Biblioteca**: busca e filtro por categoria; o glossário tem áudio TTS e botão "enviar para SRS".
12. **Progresso**: horas por habilidade (semana, mês e total), sequência de dias (um dia de folga por semana não quebra a sequência), notas dos checkpoints ao longo do tempo e contagem de aulas, desafios e portões concluídos.
13. **Configurações**: data de início, meta, sotaque, exportação de todos os dados (JSON com as linhas das tabelas e um zip das gravações). Não há importação da versão HTML: o progresso começa do zero (decisão do usuário).

### 5.4 Conteúdo

- Os arquivos de origem vão para `content/` (os `m01.txt`–`m11.txt`, `glossario.txt`, `biblioteca.txt`, `entrevista.txt` e `plano.py`). O `build.py` gera `data.json`.
- O `build.py` passa a injetar, em toda aula sem `[fale]`, o bloco de fala padrão com os exemplos da aula como texto de referência.
- `videos.json` começa vazio, no formato `{ "m02-2": {"id": "VIDEO_ID", "start": 95, "end": 240} }`. A curadoria é manual e feita depois; o critério de aceite exige vídeo pelo menos nos módulos 01 a 03.
- `test_answers.js` continua valendo como teste de conteúdo: toda primeira resposta aceita passa no corretor e as respostas erradas comuns falham.

### 5.5 Identidade visual

Mantém a identidade da versão HTML: tema escuro (`--paper #272727`, `--sheet #2F2F2F`, `--board #1C1C1C`, `--ink #EDEAE3`, `--muted #ABA79F`, `--amber #F3C64F`, `--red #EC7360`, `--blue #86A9F3`, `--ok #86D69D`), fontes Big Shoulders Display, Newsreader, Instrument Sans e IBM Plex Mono, metáfora de viagem (painel de partidas, cartão de embarque, carimbos e listra airmail) e destaques entrevista = vermelho, atenção = âmbar, dica = azul.

## 6. Decisões tomadas pelo Claude (o usuário pode revisar)

- A correção roda só no navegador, porque não existe servidor próprio e há um único usuário.
- O áudio do MVP vem do TTS do navegador. Piper fica para depois.
- A tabela `kv` guarda o estado simples (aulas concluídas, quiz, tarefas, portões, configurações) com chaves no estilo da versão HTML.
- Cada escrita vai direto para o Supabase. Não existe fila offline: sem rede, a ação mostra erro e não salva. Uma camada offline fica para a v3.
- Os arquivos `app/shell.html`, `app/style.css` e `app/app.js` da versão HTML não foram fornecidos. O front é escrito do zero, seguindo a identidade acima.

### 6.1 Respostas à revisão do builder

- **Ligação plano ↔ aula:** cada tarefa do `plano.py` tem um id estável `w{semana}-{n}` e, quando aplicável, `l` com o id da aula (`m02-2`), do módulo (`m02`) ou `plano`. Concluir uma aula marca toda tarefa cujo `l` é aquela aula. Concluir os desafios de um módulo marca a tarefa cujo `l` é o módulo. O estado das tarefas fica em `kv` na chave `ptasks`: `{ "w3-1": true, ... }`.
- **Repetir 4 semanas (decisão do Claude):** a data de início avança 28 dias, e as tarefas das 4 semanas anteriores ao portão são desmarcadas para serem refeitas. As horas registradas não mudam.
- **Modo recuperação (decisão do Claude):** quando há mais de 40 cartões vencidos, a fila do dia mostra só os 40 mais atrasados e não inclui cartões novos. O resto continua vencido para os próximos dias.
- **Quem cria os cartões (decisão do Claude):** as 68 perguntas de entrevista entram sozinhas como cartões novos (`step 0`), liberados no máximo 15 por dia. Glossário, exemplos de aula e erros entram só pelo botão "enviar para SRS". Os tipos são `interview`, `vocab`, `example` e `error`.
- **Meta semanal (decisão do Claude):** é em horas totais da semana. O padrão vem de `hours` da fase (10 ou 11 h) e pode ser alterado nas configurações. As horas por habilidade aparecem só como detalhamento.
- **Pausa do Supabase (decisão do Claude):** não há keep-alive. Se o projeto pausar depois de 7 dias sem uso, ele é reativado em um clique no painel e os dados são mantidos. A tela de login mostra uma mensagem clara quando a API não responde.

## 7. O que fica com quem constrói

- A organização interna dos módulos JS e o roteamento (hash routing é suficiente).
- Os detalhes de layout de cada tela, dentro da identidade e da acessibilidade.
- Os testes: manter o `test_answers.js` e adicionar testes pequenos para o SRS, o cálculo de semana, e a regra de conclusão de aula.
- A migração SQL e as policies, aplicadas no projeto Supabase do usuário.

## 8. Critérios de aceite do MVP

- Login funciona no celular e no PC, e o progresso feito em um aparece no outro.
- As 43 aulas, os 24 desafios, os 134 termos, as 68 perguntas e as 156 semanas aparecem e funcionam.
- `test_answers.js` passa.
- Dá para gravar em qualquer bloco de fala, ouvir, comparar com o modelo e salvar a autoavaliação. As gravações não são acessíveis sem login.
- O SRS 1-3-7-14 funciona para entrevista, glossário e erros. As 68 perguntas entram sozinhas, no máximo 15 novas por dia.
- O Hoje mostra revisões, tarefas, próxima aula e horas.
- A exportação gera um JSON e um zip das gravações.
- Não há rolagem horizontal em 390 px, o foco é visível e o console fica sem erros.

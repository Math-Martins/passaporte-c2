"""Plano B1 → C2 em 156 semanas. Gera a estrutura usada pela aba Plano.
As fases, projetos e checklists de aprovação vêm da esteira de estudos do Matheus (Fases 4, 5 e 6)."""
import math

SKILLS = ["Curso e gramática", "Vocabulário", "Listening", "Leitura", "Speaking", "Writing"]

THEMES = [
    "Rotina e trabalho", "Faculdade e estudos", "Tecnologia no dia a dia", "Cloud computing",
    "Dados e decisões", "Viagens e intercâmbio", "Sua cidade e o Brasil", "Notícias de tecnologia",
    "Carreira e mercado", "Saúde, esporte e hábitos", "Filmes, séries e cultura", "Meio ambiente",
    "IA e sociedade", "Economia e dinheiro", "Educação", "Ética e privacidade",
]

PHASES = [
    {
        "id": "f1", "name": "Independência", "level": "B1 → B2", "start": 1, "end": 30, "hours": 10,
        "goal": "Usar o inglês com independência: entender falas em ritmo natural sobre temas conhecidos, conversar vários minutos sem travar e escrever e-mails e textos organizados.",
        "materials": [
            "Módulos 01 a 06 deste curso",
            "English Grammar in Use (Murphy), unidades 1 a 145",
            "English Collocations in Use Intermediate",
            "Livros adaptados (graded readers) dos níveis 4 a 6, depois o primeiro livro original",
            "BBC 6 Minute English, TED Talks, Luke's English Podcast",
            "Write & Improve para correção de textos",
        ],
        "routine": [
            ["Seg", "Curso ou gramática 40 · Listening 30 · Shadowing 10 · Vocabulário 10"],
            ["Ter", "Gramática 30 · Leitura 30 · Writing 20 · Vocabulário 10"],
            ["Qua", "Curso ou gramática 40 · Listening 30 · Shadowing 10 · Vocabulário 10"],
            ["Qui", "Gramática 30 · Leitura 30 · Writing 20 · Vocabulário 10"],
            ["Sex", "Conversa 30 · Listening 30 · Caderno de erros 20 · Vocabulário 10"],
            ["Sáb", "Leitura ou série 60 · Gravação semanal 15 · Banco de entrevista 15"],
            ["Dom", "Descanso, ou 30 min para recuperar o que faltou"],
        ],
        "gate": {
            "title": "Portão B2 (Fase 4 da sua esteira)",
            "checklist": [
                "Domino os principais conteúdos do English Grammar in Use.",
                "Consigo utilizar estruturas gramaticais complexas.",
                "Consigo explicar ideias sem depender constantemente da tradução.",
                "Compreendo podcasts e palestras sobre temas conhecidos.",
                "Consigo acompanhar diferentes sotaques.",
                "Utilizo collocations e phrasal verbs naturalmente.",
                "Consigo participar de reuniões simuladas.",
                "Consigo apresentar ideias de maneira estruturada.",
                "Consigo escrever e-mails e relatórios profissionais.",
                "Consigo defender opiniões com argumentos.",
                "Consigo compreender artigos jornalísticos complexos.",
                "Consigo conversar sobre assuntos profissionais com independência.",
            ],
            "project": "Professional English Simulation: currículo em inglês, apresentação profissional de 3 min, e-mail formal pedindo reunião, relatório de um problema e solução, apresentação de 8 a 10 min, reunião simulada de 15 min, resumo de uma TED Talk ou artigo do The Economist e entrevista de emprego simulada.",
            "exam": "Simulado oficial gratuito do B2 First (site da Cambridge). Meta: 160 pontos ou mais em cada parte.",
        },
    },
    {
        "id": "f2", "name": "Precisão", "level": "B2 → C1", "start": 31, "end": 78, "hours": 11,
        "goal": "Usar o inglês com flexibilidade e precisão: acompanhar debates, argumentar sobre temas abstratos, ajustar o registro e trabalhar em inglês sem esforço consciente.",
        "materials": [
            "Módulos 07 a 11 deste curso",
            "Advanced Grammar in Use (Hewings), unidades 1 a 100",
            "English Collocations in Use Advanced e English Phrasal Verbs in Use",
            "Livros de não ficção em inglês (tecnologia, carreira, negócios)",
            "Podcasts nativos: Luke's English Podcast, All Ears English, Software Engineering Daily",
            "The Economist e documentação da AWS e da Microsoft",
            "IELTS Advantage para speaking e writing",
        ],
        "routine": [
            ["Seg", "Curso ou gramática 40 · Podcast 40 · Shadowing 10 · Vocabulário 15"],
            ["Ter", "Conversa 30 · Leitura 40 · Vocabulário 15 · Caderno de erros 10"],
            ["Qua", "Gramática 30 · Writing 40 · Vocabulário 15 · Shadowing 10"],
            ["Qui", "Conversa 30 · Podcast 40 · Vocabulário 15 · Banco de entrevista 10"],
            ["Sex", "Gramática 30 · Leitura 40 · Vocabulário 15"],
            ["Sáb", "Série sem legenda em português 60 · Writing 30 · Gravação semanal 15"],
            ["Dom", "Descanso, ou leitura por prazer"],
        ],
        "gate": {
            "title": "Portão C1 (Fase 5 da sua esteira)",
            "checklist": [
                "Consigo utilizar estruturas gramaticais avançadas.",
                "Domino os principais conteúdos do Advanced Grammar in Use.",
                "Tenho vocabulário amplo e preciso.",
                "Compreendo conteúdos extensos e complexos.",
                "Consigo acompanhar debates.",
                "Consigo argumentar sobre assuntos abstratos.",
                "Consigo adaptar minha comunicação ao contexto.",
                "Consigo escrever relatórios e textos acadêmicos complexos.",
                "Consigo apresentar ideias com naturalidade.",
                "Consigo interpretar nuances e informações implícitas.",
            ],
            "project": "Advanced English Communication: ensaio argumentativo de 1.000 palavras, relatório profissional de 700 palavras, apresentação de 15 min, debate de 20 min, resumo crítico de um artigo do The Economist, resumo oral de um podcast ou palestra e entrevista simulada com perguntas complexas.",
            "exam": "Simulado oficial gratuito do C1 Advanced ou um simulado de IELTS. Meta: 180 pontos no C1 Advanced ou 7.0 no IELTS.",
        },
    },
    {
        "id": "f3", "name": "Domínio", "level": "C1 → C2", "start": 79, "end": 156, "hours": 11,
        "goal": "Entender praticamente tudo, inclusive ironia, humor e sotaques variados, e se expressar com nuance em situações pouco familiares. Aqui o progresso vem de volume e de uso real, não de aulas novas.",
        "materials": [
            "Revisão do módulo 09 (precisão e nuance) e do seu caderno de erros",
            "Romances em inglês e não ficção longa",
            "The Economist, artigos acadêmicos e relatórios técnicos",
            "Debates, entrevistas e conferências sem legenda, com sotaques variados",
            "Clube de oratória (Toastmasters) ou grupo de discussão",
            "Material oficial do C2 Proficiency",
        ],
        "routine": [
            ["Seg", "Leitura densa 45 · Listening sem legenda 40 · Vocabulário em contexto 15"],
            ["Ter", "Conversa 45 · Writing 45"],
            ["Qua", "Leitura de romance 45 · Listening 40 · Caderno de erros 15"],
            ["Qui", "Conversa 45 · Use of English (C2) 30 · Shadowing 15"],
            ["Sex", "Leitura densa 45 · Writing 45"],
            ["Sáb", "Clube de oratória ou discussão em grupo 60 · Série ou filme 60"],
            ["Dom", "Descanso, ou leitura por prazer"],
        ],
        "gate": {
            "title": "Portão C2 (Fase 6 da sua esteira)",
            "checklist": [
                "Compreendo textos altamente complexos.",
                "Consigo acompanhar conversas rápidas e naturais.",
                "Identifico ironia, humor e nuances.",
                "Utilizo vocabulário preciso e contextualizado.",
                "Consigo adaptar meu registro linguístico.",
                "Consigo produzir textos sofisticados.",
                "Consigo argumentar sobre temas abstratos.",
                "Consigo compreender diferentes variedades do inglês.",
                "Consigo reformular ideias complexas com clareza.",
                "Consigo atuar linguisticamente em situações pouco familiares.",
            ],
            "project": "Advanced English Mastery: ensaio acadêmico de 1.500 palavras, análise crítica de um artigo complexo, apresentação de 20 min, debate de 30 min, discussão com vários interlocutores, relatório executivo e gravação de uma conversa espontânea.",
            "exam": "Simulado oficial gratuito do C2 Proficiency. Meta: 200 pontos ou mais. Se quiser o certificado, faça a prova real depois de dois simulados acima da meta.",
        },
    },
]


def spread(total, first, last, start_week, end_week, week):
    """Divide as unidades first..last igualmente entre start_week..end_week e devolve o intervalo da semana."""
    n = end_week - start_week + 1
    k = week - start_week
    a = first + math.floor(k * total / n)
    b = first + math.floor((k + 1) * total / n) - 1
    return (a, min(b, last)) if b >= a else None


def build(modules):
    def flat(ms):
        return [{"id": l["id"], "title": l["title"], "idx": i, "mod": m} for m in ms for i, l in enumerate(m["lessons"])]
    p1_lessons = flat(modules[:6])   # m01..m06
    p2_lessons = flat(modules[6:])   # m07..m11
    weeks = []
    for w in range(1, 157):
        ph = next(p for p in PHASES if p["start"] <= w <= p["end"])
        theme = THEMES[(w - 1) % len(THEMES)]
        T = []
        def add(area, text, link=None):
            T.append({"id": f"w{w}-{len(T)+1}", "a": area, "t": text, **({"l": link} if link else {})})

        # ---------- Fase 1 ----------
        if ph["id"] == "f1":
            if w == 1:
                add("Diagnóstico", "Grave 2 min respondendo: \"Tell me about yourself and your plans.\" Guarde: é a sua linha de base.")
                add("Diagnóstico", "Faça o teste diagnóstico do English Grammar in Use e marque as unidades que já domina para pular.")
            if w <= 12:
                pair = p1_lessons[(w - 1) * 2:(w - 1) * 2 + 2]
                for l in pair:
                    add("Curso", f"Aula {l['mod']['num']}.{l['idx']+1}: {l['title']}", l["id"])
                last = pair[-1]
                if last["idx"] == len(last["mod"]["lessons"]) - 1:
                    add("Curso", f"Desafios do módulo {last['mod']['num']}", last["mod"]["id"])
            r = spread(145, 1, 145, 1, 29, w) if w <= 29 else None
            if r:
                add("Gramática", f"English Grammar in Use: unidades {r[0]} a {r[1]} (pule as que acertou no diagnóstico, mas faça os exercícios)")
            else:
                add("Gramática", "Revisão: refaça os exercícios das unidades que mais errou no caderno de erros")
            if w >= 13:
                r = spread(60, 1, 60, 13, 30, w)
                if r: add("Vocabulário", f"English Collocations in Use Intermediate: unidades {r[0]} a {r[1]}")
            add("Vocabulário", "10 cartões novos por dia (Anki ou Quizlet) com frases das aulas e das leituras, e revisão diária")
            if w <= 10:
                add("Listening", "5 episódios do 6 Minute English com o método de 6 etapas (módulo 06)")
            elif w <= 20:
                add("Listening", "3 episódios do 6 Minute English e 1 TED Talk com legenda em inglês")
            else:
                add("Listening", "2 episódios de podcast (Luke's English Podcast ou All Ears English) e 1 TED Talk sem legenda")
            if w <= 12:
                add("Leitura", "Livro adaptado nível 4 (Oxford Bookworms ou Penguin Readers): cerca de 1/3 do livro")
            elif w <= 24:
                add("Leitura", "Livro adaptado nível 5 ou 6: cerca de 1/3 do livro")
            else:
                add("Leitura", "Primeiro livro original curto (não ficção de tecnologia ou carreira): 2 capítulos")
            add("Leitura", "1 página de documentação técnica (AWS ou Microsoft Learn): leia e resuma em voz alta")
            add("Speaking", "10 min de shadowing por dia, cinco dias")
            if w >= 3:
                add("Speaking", f"Conversa de 30 min (Tandem, Cambly ou colega) sobre o tema da semana: {theme}")
            add("Writing", f"2 textos de 150 palavras sobre \"{theme}\", corrigidos no Write & Improve; erros para o caderno")
            if w >= 6:
                add("Revisão", "Banco de entrevista: fazer as revisões do dia em pelo menos 4 dias")

        # ---------- Fase 2 ----------
        elif ph["id"] == "f2":
            k = w - 31
            if k < len(p2_lessons):
                l = p2_lessons[k]
                add("Curso", f"Aula {l['mod']['num']}.{l['idx']+1}: {l['title']}", l["id"])
                if l["idx"] == len(l["mod"]["lessons"]) - 1:
                    add("Curso", f"Desafios do módulo {l['mod']['num']}", l["mod"]["id"])
            r = spread(100, 1, 100, 31, 76, w) if w <= 76 else None
            add("Gramática", f"Advanced Grammar in Use: unidades {r[0]} a {r[1]}" if r else "Revisão: refaça as unidades do Advanced Grammar in Use que mais errou")
            if w <= 60:
                r = spread(60, 1, 60, 31, 60, w)
                add("Vocabulário", f"English Collocations in Use Advanced: unidades {r[0]} a {r[1]}")
            else:
                add("Vocabulário", "English Phrasal Verbs in Use: 3 unidades")
            add("Vocabulário", "15 cartões novos por dia, tirados das suas leituras e podcasts, sempre com a frase original")
            add("Listening", "3 horas de podcast nativo (Luke's, All Ears English, Software Engineering Daily ou AWS Podcast)")
            add("Listening", "1 episódio de série sem legenda em português e 1 palestra de um falante não nativo")
            if w < 50:
                add("Leitura", "Livro de não ficção em inglês: cerca de 1/6 do livro (um livro a cada 6 semanas)")
            else:
                add("Leitura", "2 artigos longos do The Economist ou de um blog técnico; resuma cada um em 5 linhas")
            add("Leitura", "1 seção do AWS Well-Architected Framework ou de documentação técnica, com resumo em voz alta")
            add("Speaking", f"2 conversas de 30 min; uma delas sobre \"{theme}\" com opinião e argumentos")
            if (w - 31) % 4 == 3:
                add("Speaking", "Apresentação de 8 a 10 min gravada sobre um tema técnico ou profissional")
            if w >= 60:
                add("Speaking", "Debate de 15 min: escolha um lado sobre o tema da semana e defenda com dados")
            add("Writing", "1 e-mail ou relatório profissional e 1 ensaio de 250 palavras no formato IELTS Task 2")
            add("Revisão", "Banco de entrevista nas revisões do dia e caderno de erros uma vez na semana")
            if w >= 40 and w % 8 == 0:
                add("Carreira", "Candidate-se a pelo menos uma vaga que tenha entrevista em inglês, ou faça uma entrevista simulada com alguém")

        # ---------- Fase 3 ----------
        else:
            add("Gramática", "Use of English: 1 conjunto de exercícios de nível C2 (transformações e word formation)" if w >= 120 else "Caderno de erros: escolha 3 erros recorrentes e escreva 5 frases corretas para cada")
            if w % 4 == 0:
                add("Curso", "Revisão do módulo 09: refaça o desafio de nuance e uma aula à sua escolha", "m09")
            add("Vocabulário", "15 palavras ou expressões por semana com contexto, sinônimos e conotação (positiva, neutra ou negativa)")
            add("Listening", "4 horas de conteúdo nativo sem legenda: debates, entrevistas longas e conferências, com pelo menos 2 sotaques diferentes")
            if w % 4 == 2:
                add("Listening", "Um especial de comédia ou um podcast de humor: anote 3 piadas que dependem de duplo sentido")
            add("Leitura", "Romance em inglês: cerca de 1/6 do livro (um romance a cada 6 semanas)")
            add("Leitura", "3 artigos do The Economist; escreva um parágrafo crítico sobre um deles")
            if w % 4 == 1:
                add("Leitura", "1 artigo acadêmico ou relatório técnico longo; resuma o argumento central")
            add("Speaking", f"3 conversas de 45 min; uma delas sobre \"{theme}\" em registro formal")
            add("Speaking", "Clube de oratória ou discussão em grupo (Toastmasters ou equivalente)")
            if w % 8 == 0:
                add("Speaking", "Apresentação de 20 min gravada, com perguntas no fim")
            add("Writing", "Texto de 500 palavras, alternando gêneros: artigo de opinião, relatório, resenha, carta formal")
            if w % 4 == 3:
                add("Writing", "Ensaio de 1.000 a 1.500 palavras sobre um tema abstrato, revisado por alguém de nível avançado")
            add("Revisão", "Banco de entrevista e caderno de erros")

        # ---------- comuns ----------
        if w % 4 == 0:
            add("Checkpoint", "Checkpoint mensal: grave 2 min respondendo a mesma pergunta da semana 1, avalie com os 4 critérios do IELTS (aula 11.2) e compare com o último checkpoint")
        if w == ph["end"]:
            add("Portão", f"{ph['gate']['title']}: faça o simulado, o projeto da fase e confira o checklist abaixo. Só avance se cumprir a maior parte", "plano")
        weeks.append({"n": w, "ph": ph["id"], "theme": theme, "tasks": T})
    phases = [{k: v for k, v in p.items()} for p in PHASES]
    return {"phases": phases, "weeks": weeks, "skills": SKILLS,
            "totalHours": sum((p["end"] - p["start"] + 1) * p["hours"] for p in PHASES)}

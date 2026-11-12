#!/usr/bin/env python3
"""Generate public/data.json from content/*.txt."""
import json, re, html, sys, pathlib

ROOT = pathlib.Path(__file__).parent
C = ROOT / "content"
OUT = ROOT / "public" / "data.json"
errors = []

DEFAULT_SPEAK = '<div class="speak"><b>Fale em voz alta</b><p>Leia em voz alta os exemplos da aula e grave.</p></div>'

def esc(s): return html.escape(s, quote=True)

def inline(s):
    s = esc(s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", s)
    return s

def slug(s):
    s = s.lower()
    for a, b in zip("áàâãéêíóôõúç", "aaaaeeiooouc"): s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]

CALL = {"entrevista": "Cai em entrevista", "atencao": "Atenção", "dica": "Dica"}

def split_answers(s):
    return [a.strip() for a in s.split(";;") if a.strip()]

def md(lines, ctx, exlist=None, toc=None):
    """mini-markdown -> html"""
    out, i, n = [], 0, len(lines)
    while i < n:
        ln = lines[i].rstrip()
        if not ln.strip():
            i += 1; continue
        if ln.startswith("### "):
            t = ln[4:].strip(); hid = ctx + "-" + slug(t)
            if toc is not None: toc.append({"id": hid, "t": t})
            out.append(f'<h3 id="{hid}">{inline(t)}</h3>'); i += 1; continue
        if ln.startswith("> ["):
            m = re.match(r"> \[(\w+)\]\s*(.*)", ln)
            kind, txt = m.group(1), [m.group(2)]
            if kind not in CALL: errors.append(f"{ctx}: callout desconhecido {kind}")
            i += 1
            while i < n and lines[i].startswith("> ") and not lines[i].startswith("> ["):
                txt.append(lines[i][2:]); i += 1
            out.append(f'<aside class="call {kind}"><b>{CALL.get(kind,kind)}</b> {inline(" ".join(txt))}</aside>'); continue
        if ln.startswith("= "):
            rows = []
            while i < n and lines[i].startswith("= "):
                en, _, pt = lines[i][2:].partition(" | ")
                if not pt: errors.append(f"{ctx}: exemplo sem tradução: {lines[i]}")
                rows.append(f'<li><button type="button" class="spk" data-say="{esc(en.strip())}" aria-label="Ouvir: {esc(en.strip())}"></button><span class="en" lang="en">{inline(en.strip())}</span><span class="pt">{inline(pt.strip())}</span></li>')
                i += 1
            out.append('<ul class="says">' + "".join(rows) + "</ul>"); continue
        if ln.startswith("[fale]"):
            out.append(f'<div class="speak"><b>Fale em voz alta</b><p>{inline(ln[6:].strip())}</p></div>'); i += 1; continue
        if ln.startswith("?? "):
            parts = [p.strip() for p in ln[3:].split(":::")]
            if len(parts) != 3 or exlist is None:
                errors.append(f"{ctx}: exercício mal formado: {ln}"); i += 1; continue
            k = len(exlist); eid = f"{ctx}-e{k+1}"
            exlist.append({"id": eid, "p": parts[0], "a": split_answers(parts[1]), "why": parts[2]})
            out.append(f'<div class="ex" data-ex="{eid}"></div>'); i += 1; continue
        if ln.startswith("| "):
            rows = []
            while i < n and lines[i].startswith("| "):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split(" | ")]); i += 1
            h = "".join(f"<th>{inline(c)}</th>" for c in rows[0])
            b = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows[1:])
            for r in rows[1:]:
                if len(r) != len(rows[0]): errors.append(f"{ctx}: tabela com colunas desiguais: {r}")
            out.append(f'<div class="tbl"><table><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'); continue
        if re.match(r"[-*] ", ln):
            items = []
            while i < n and re.match(r"[-*] ", lines[i]):
                items.append(f"<li>{inline(lines[i][2:].strip())}</li>"); i += 1
            out.append("<ul>" + "".join(items) + "</ul>"); continue
        if re.match(r"\d+\. ", ln):
            items = []
            while i < n and re.match(r"\d+\. ", lines[i]):
                items.append(f"<li>{inline(re.sub(r'^\d+\. ', '', lines[i]).strip())}</li>"); i += 1
            out.append("<ol>" + "".join(items) + "</ol>"); continue
        para = []
        while i < n and lines[i].strip() and not re.match(r"(### |> \[|= |\?\? |\| |[-*] |\d+\. |\[fale\])", lines[i]):
            para.append(lines[i].strip()); i += 1
        out.append(f"<p>{inline(' '.join(para))}</p>")
    return "".join(out)

def parse_quiz(lines, ctx):
    qs = []
    for ln in lines:
        ln = ln.rstrip()
        if not ln.strip(): continue
        if ln.startswith("Q: "):
            qs.append({"q": ln[3:].strip(), "o": []})
        elif ln[:2] in ("+ ", "- "):
            t, _, why = ln[2:].partition(" :: ")
            if not why: errors.append(f"{ctx}: opção sem explicação: {ln}")
            qs[-1]["o"].append({"t": t.strip(), "ok": ln[0] == "+", "why": why.strip()})
        else:
            errors.append(f"{ctx}: linha de quiz inválida: {ln}")
    for q in qs:
        if sum(o["ok"] for o in q["o"]) != 1: errors.append(f"{ctx}: quiz precisa de exatamente 1 certa: {q['q']}")
    if not 2 <= len(qs) <= 3: errors.append(f"{ctx}: quiz com {len(qs)} perguntas")
    return qs

def speak_ref(h):
    """Lesson examples (data-say), in order, used as the reference text for the speaking block."""
    return "\n".join(html.unescape(s) for s in re.findall(r'data-say="([^"]*)"', h))

def parse_module(path):
    lines = path.read_text(encoding="utf8").split("\n")
    mod, cur = None, None
    blocks = []
    for ln in lines:
        if ln.startswith("# MODULE "):
            mod = {"id": ln[9:].strip(), "lessons": [], "challenges": []}; cur = ("meta", [])
            blocks.append(cur)
        elif ln.startswith("## LESSON ") or ln.startswith("## CHALLENGE "):
            cur = (ln, []); blocks.append(cur)
        else:
            cur[1].append(ln)
    for head, body in blocks:
        if head == "meta":
            for ln in body:
                if ":" in ln:
                    k, _, v = ln.partition(":"); mod[k.strip()] = v.strip()
        elif head.startswith("## LESSON "):
            lid, title, mins = [x.strip() for x in head[10:].split("|")]
            q_at = next((k for k, l in enumerate(body) if l.strip() == "#### QUIZ"), None)
            if q_at is None: errors.append(f"{lid}: sem quiz"); q_at = len(body)
            exl, toc = [], []
            h = md(body[:q_at], lid, exl, toc)
            ref = speak_ref(h)
            if 'class="speak"' not in h: h += DEFAULT_SPEAK
            mod["lessons"].append({"id": lid, "title": title, "min": int(mins), "html": h, "toc": toc,
                                   "ex": exl, "quiz": parse_quiz(body[q_at+1:], lid), "speakRef": ref})
            if not exl: errors.append(f"{lid}: sem exercício")
            for need in ("call entrevista", "call atencao", "call dica"):
                if need not in h: errors.append(f"{lid}: falta destaque {need}")
        else:
            cid, title, kind = [x.strip() for x in head[13:].split("|")]
            sec, cur2 = {}, None
            for ln in body:
                if re.fullmatch(r"(TASK|ITEMS|HINT|SOLUTION|EXPECTED):", ln.strip()):
                    cur2 = ln.strip()[:-1]; sec[cur2] = []
                elif cur2: sec[cur2].append(ln)
            ch = {"id": cid, "title": title, "kind": kind,
                  "task": md(sec.get("TASK", []), cid), "hint": md(sec.get("HINT", []), cid),
                  "solution": md(sec.get("SOLUTION", []), cid), "expected": md(sec.get("EXPECTED", []), cid)}
            if kind == "auto":
                items = []
                for ln in sec.get("ITEMS", []):
                    if not ln.strip(): continue
                    p, _, a = ln.partition(":::")
                    items.append({"p": p.strip(), "a": split_answers(a)})
                if not items: errors.append(f"{cid}: auto sem ITEMS")
                ch["items"] = items
            elif not sec.get("EXPECTED"): errors.append(f"{cid}: manual sem EXPECTED")
            for k in ("TASK", "HINT", "SOLUTION"):
                if not sec.get(k): errors.append(f"{cid}: falta {k}")
            mod["challenges"].append(ch)
    return mod

def parse_glossary():
    out = []
    for ln in (C / "glossario.txt").read_text(encoding="utf8").split("\n"):
        if not ln.strip() or ln.startswith("#"): continue
        p = [x.strip() for x in ln.split(" | ")]
        if len(p) != 4: errors.append(f"glossário: {ln}"); continue
        out.append({"t": p[0], "pt": p[1], "d": inline(p[2]), "c": p[3]})
    return sorted(out, key=lambda x: x["t"].lower())

def parse_library():
    out, cat = [], None
    for ln in (C / "biblioteca.txt").read_text(encoding="utf8").split("\n"):
        if ln.startswith("## "): cat = ln[3:].strip()
        elif ln.startswith("- "):
            p = [x.strip() for x in ln[2:].split(" | ")]
            if len(p) != 5: errors.append(f"biblioteca: {ln}"); continue
            out.append({"cat": cat, "t": p[0], "by": p[1], "lv": p[2], "url": p[3], "d": inline(p[4])})
    return out

def parse_cards():
    out, cur, key = [], None, None
    for ln in (C / "entrevista.txt").read_text(encoding="utf8").split("\n"):
        if ln.startswith("@ "):
            cid, cat, lv = [x.strip() for x in ln[2:].split("|")]
            cur = {"id": cid, "cat": cat, "lv": lv, "q": "", "pt": "", "a": [], "tip": ""}; out.append(cur); key = None
        elif ln.startswith("Q: "): cur["q"] = ln[3:].strip()
        elif ln.startswith("PT: "): cur["pt"] = ln[4:].strip()
        elif ln.startswith("TIP: "): cur["tip"] = inline(ln[5:].strip()); key = None
        elif ln.startswith("A:"): key = "a"; rest = ln[2:].strip(); cur["a"] += [rest] if rest else []
        elif key == "a": cur["a"].append(ln)
    for c in out:
        c["a"] = md(c["a"], c["id"])
        for k in ("q", "pt", "a", "tip"):
            if not c[k]: errors.append(f"card {c['id']}: falta {k}")
    ids = [c["id"] for c in out]
    if len(ids) != len(set(ids)): errors.append("cards com id repetido")
    return out

mods = [parse_module(p) for p in sorted(C.glob("m*.txt"))]
sys.path.insert(0, str(C)); import plano
PLAN = plano.build(mods)
data = {"plan": PLAN, "modules": mods, "glossary": parse_glossary(), "library": parse_library(), "cards": parse_cards()}
ids = [l["id"] for m in mods for l in m["lessons"]] + [c["id"] for m in mods for c in m["challenges"]]
if len(ids) != len(set(ids)): errors.append("ids repetidos")
if errors:
    print("\n".join("ERRO: " + e for e in errors)); sys.exit(1)

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(data, ensure_ascii=False), encoding="utf8")
nl = sum(len(m["lessons"]) for m in mods)
print(f"plano: {len(PLAN['weeks'])} semanas, {sum(len(w['tasks']) for w in PLAN['weeks'])} tarefas, {PLAN['totalHours']} h")
print(f"ok: {len(mods)} módulos, {nl} aulas, {sum(len(m['challenges']) for m in mods)} desafios, "
      f"{len(data['glossary'])} termos, {len(data['library'])} itens de biblioteca, {len(data['cards'])} cartões; "
      f"{OUT.stat().st_size // 1024} KB")

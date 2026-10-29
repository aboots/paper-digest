#!/usr/bin/env python3
"""Validate data/*.json against the digest schema. Usage: python3 tools/validate.py  (run from the repo root)"""
import json, re, sys, os, glob
TOPICS = {"prostate_us","steering","sae","interpretability","tabular_fm","tabular_ssl"}
errs = []
def err(m): errs.append(m)
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
def check(path):
    d = json.load(open(path, encoding="utf-8"))
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d.get("date","")): err(f"{path}: bad date")
    if not d.get("generated_at"): err(f"{path}: missing generated_at")
    ids = set()
    for i, p in enumerate(d.get("papers", [])):
        w = f"{path}: paper[{i}] {p.get('id')}"
        for k in ("id","title","url","source","published","why_it_matters"):
            if not isinstance(p.get(k), str) or not p[k].strip(): err(f"{w}: missing {k}")
        if p.get("id") in ids: err(f"{w}: duplicate id")
        ids.add(p.get("id"))
        if not re.match(r"https?://", p.get("url","")): err(f"{w}: url not http(s)")
        if p.get("pdf_url") and not re.match(r"https?://", p["pdf_url"]): err(f"{w}: pdf_url not http(s)")
        if not isinstance(p.get("authors"), list) or not p["authors"]: err(f"{w}: authors")
        af = p.get("affiliations")
        if af is not None and (not isinstance(af, list) or not 1 <= len(af) <= 3 or not all(isinstance(x, str) and x.strip() for x in af)): err(f"{w}: affiliations must be 1-3 non-empty strings or omitted")
        t = p.get("topics")
        if not isinstance(t, list) or not t or not set(t) <= TOPICS: err(f"{w}: topics {t}")
        s = p.get("summary")
        if not isinstance(s, list) or len(s) != 3 or not all(isinstance(x, str) and x.strip() for x in s): err(f"{w}: summary must be 3 strings [problem, method, result]")
        if not isinstance(p.get("score"), int) or not 1 <= p["score"] <= 5: err(f"{w}: score")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", p.get("published","")): err(f"{w}: published must be YYYY-MM-DD")
    return d
idx = json.load(open(os.path.join(root, "index.json")))
dates = idx.get("dates", [])
if dates != sorted(dates, reverse=True): err("index.json dates must be newest first")
for dt in dates:
    f = os.path.join(root, "archive", dt + ".json")
    if not os.path.exists(f): err(f"missing archive file for {dt}")
    else: check(f)
for f in glob.glob(os.path.join(root, "archive", "*.json")):
    if os.path.basename(f)[:-5] not in dates: err(f"{f} not listed in index.json")
if dates:
    a = check(os.path.join(root, "digest.json"))
    b = json.load(open(os.path.join(root, "archive", dates[0] + ".json")))
    if a != b: err("digest.json differs from newest archive file")
print("OK" if not errs else "\n".join(errs))
sys.exit(1 if errs else 0)

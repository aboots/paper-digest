# Paper Digest

A tiny installable web app (PWA) that shows a daily digest of research papers on six topics. It is plain HTML, CSS and JavaScript with no build step and no backend, so it can be hosted as static files, for example at `https://aboots.github.io/paper-digest/`.

Topics: prostate cancer detection from ultrasound, activation steering, sparse autoencoders, interpretability, tabular foundation models, self-supervised learning on tabular data.

## Files

| Path | Purpose |
| --- | --- |
| `index.html`, `style.css`, `app.js` | The app (mobile first, dark and light mode, safe-area aware) |
| `manifest.webmanifest`, `icons/` | Install metadata and icons (180, 192, 512 px) |
| `sw.js` | Service worker: shell is cache-first, `data/*.json` is network-first with the last copy as offline fallback |
| `data/digest.json` | The latest day (identical to the newest file in `data/archive/`) |
| `data/archive/YYYY-MM-DD.json` | One file per day |
| `data/index.json` | `{"dates": ["2026-10-27", "2026-10-26", ...]}`, newest first |
| `DAILY_JOB.md` | Instructions for the daily update job |
| `tools/validate.py` | Checks the data files against the schema (run before committing) |
| `tools/arxiv_search.py`, `tools/arxiv_id.py` | Optional helpers that query the arXiv API |

All paths are relative, so the app works under any subpath.

## Digest JSON schema

```json
{
  "date": "2026-10-27",
  "generated_at": "2026-10-27T07:30:00-07:00",
  "papers": [
    {
      "id": "arxiv:2610.16084",
      "title": "Paper title",
      "authors": ["First Author", "Second Author"],
      "url": "https://arxiv.org/abs/2610.16084",
      "pdf_url": "https://arxiv.org/pdf/2610.16084",
      "source": "arXiv cs.AI, accepted at NeurIPS 2026",
      "published": "2026-10-12",
      "topics": ["steering", "interpretability"],
      "why_it_matters": "One or two sentences on why Mahdi should care.",
      "summary": ["Problem: ...", "Method: ...", "Result: ..."],
      "score": 5
    }
  ]
}
```

Field rules:

- `id`: stable and unique across all days. Use `arxiv:<id without version>`, `pmid:<PubMed id>`, `doi:<doi>` or `openreview:<forum id>`. The id is what the app uses for Save and Mark read, so never change it for a paper.
- `url`: a page that loads (abstract page, PubMed page or DOI). Must start with `http://` or `https://`. `pdf_url` is optional.
- `authors`: the full list in order. The app shows the first three plus "et al.".
- `source`: where it appeared (journal, `arXiv <category>`, `medRxiv preprint`, workshop name, and so on). Only state acceptance if the paper itself says so.
- `published`: `YYYY-MM-DD`.
- `topics`: one or more of `prostate_us`, `steering`, `sae`, `interpretability`, `tabular_fm`, `tabular_ssl`.
- `summary`: exactly three strings in the order problem, method, result. The app adds the "Problem:", "Method:", "Result:" labels, so do not repeat them in the text.
- `score`: integer 1 to 5 for relevance and quality (see `DAILY_JOB.md`). Papers are shown highest score first.
- `generated_at`: ISO 8601 with offset.

The app escapes all text with `textContent` and only links `http(s)` URLs.

## Updating the data

1. Write `data/archive/<today>.json` and copy it to `data/digest.json`.
2. Put the date at the front of `data/index.json`.
3. Run `python3 tools/validate.py`.
4. Commit and push. See `DAILY_JOB.md` for the full routine.

If you change any shell file (`index.html`, `app.js`, `style.css`, icons, manifest), bump `SHELL_VERSION` in `sw.js` so installed copies refresh.

## Run locally

```
python3 -m http.server 8000
```

Open `http://localhost:8000/`. The service worker works on `localhost` and on HTTPS.

## Install on iPhone

Open the site in Safari, tap Share, then Add to Home Screen. The app opens full screen. Read and Saved state is stored on the device (localStorage); it is not synced between devices. Saved papers keep a copy of their data, so they stay available after a day is pruned.

## Limits

- No push notifications (iOS web apps need a backend for that).
- Read and Saved state does not sync between devices.
- Offline use works for days you have opened at least once.

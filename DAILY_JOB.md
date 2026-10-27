# Daily job: update the Paper Digest

You maintain `data/` in this repo. Run once a day (about 7:30 AM Pacific). Schema and field rules are in `README.md`. Work from the repo root.

## Rules (read first)

- **Never fabricate.** Every title, author, date, venue, URL and number must come from a page you opened in this run (arXiv, PubMed or publisher page, OpenReview, Semantic Scholar). Write summaries only from the abstract or paper text you actually read. If you could not read the abstract, skip the paper.
- Do not claim acceptance at a venue unless the arXiv comment, the journal or the venue page says so. Say "preprint" otherwise.
- Do not copy abstract text. Write the summary in your own words, with numbers only if they appear in the source, and with concrete takeaways (see step 5).
- Quality over quantity. If nothing good appeared, write fewer papers, or none. Never pad. An empty `papers` list is allowed, but still write the day.
- Do not touch app files (`index.html`, `app.js`, `style.css`, `sw.js`, icons). Only `data/`.

## Steps

1. **Read the state.** Open `data/index.json` and collect the ids and URLs already in `data/archive/*.json` (at least the last 14 days) so you can skip repeats.
2. **Search the last 1 to 2 days per topic.** Use several sources for each topic:
   - arXiv: new submissions in cs.LG, cs.CL, cs.AI, cs.CV, eess.IV, stat.ML. The API works well: `https://export.arxiv.org/api/query?search_query=<query>&sortBy=submittedDate&sortOrder=descending&max_results=50` (helper: `tools/arxiv_search.py`; abstracts by id: `tools/arxiv_id.py`). Filter by the `published` date.
   - PubMed (E-utilities `esearch`/`efetch`, sorted by date) for prostate ultrasound, plus medRxiv.
   - OpenReview (ICLR 2027 submissions and workshop papers), Semantic Scholar, Google Scholar style web searches, and lab blogs of known groups, for recent releases.
   - Topic queries: 
     - `prostate_us`: prostate cancer detection or grading on ultrasound, micro-ultrasound, transrectal ultrasound, TRUS, MRI-ultrasound fusion with AI, prototype or interpretable models, self-supervised or foundation models for ultrasound.
     - `steering`: activation steering, steering vectors, representation engineering, contrastive activation addition, concept directions, steering geometry.
     - `sae`: sparse autoencoders, transcoders, dictionary learning for LLM or vision features, SAE evaluation.
     - `interpretability`: mechanistic interpretability, circuits, probing, attribution, causal tracing; interpretability in medical imaging.
     - `tabular_fm`: tabular foundation models, TabPFN and relatives, in-context learning on tables, TabArena.
     - `tabular_ssl`: self-supervised or contrastive or masked pretraining on tabular data.
3. **Dedupe.** Drop anything whose `id` or `url` is already in the archive, and drop later versions of the same arXiv paper (same id without the version suffix). Tag a paper with more than one topic key when it truly fits.
4. **Pick the good ones** (see criteria below). Aim for at most 3 to 5 per topic and about 6 to 20 total on a normal day. Fewer is fine.
5. **Summarize each pick** into the schema: `why_it_matters` (1 to 2 sentences for Mahdi, a UBC MASc ECE student working on prostate ultrasound with prototype networks, activation steering geometry and interpretability), and `summary` = exactly three strings, written from the abstract (and paper text if you opened it):
   1. **Problem and motivation** (2 to 3 sentences): why the problem matters and what gap exists.
   2. **Method** (2 to 4 sentences): what they did, specifically (model, data, cohort size, key idea, evaluation setup).
   3. **Results and takeaways** (3 to 5 sentences): the main numbers from the source (metrics, datasets, comparison baselines, effect sizes), then an explicit takeaway, then any limitation or caveat. The takeaway must say what a reader in Mahdi's field (prostate ultrasound with prototype networks, activation steering geometry, SAEs, interpretability, tabular foundation models, tabular SSL) can use or reuse, or what to be careful about. Name limitations the authors state (single institution, small external set, one run, only 7B models, no code) and say so when the abstract gives no numbers or no validation details. Do not write vague takeaways such as "promising" or "an interesting step".
   - Do not put "Problem:", "Method:" or "Result:" prefixes in the strings; the app shows the headings.
   - Own words only, no copied abstract sentences, and every number must appear in the source you read. Never invent numbers, and do not state acceptance unless the source says so.
6. **Verify.** Open every `url` (and `pdf_url` if given) and confirm it loads and shows the same title. PubMed pages may block scripted fetches; in that case confirm the id through the E-utilities API.
7. **Write the files.**
   - `data/archive/<YYYY-MM-DD>.json` (today's date, America/Vancouver) with `generated_at` set to the current time with offset.
   - Copy the same content to `data/digest.json`.
   - Prepend today's date to `data/index.json` (`{"dates": [...]}` newest first, no duplicates).
   - Sort papers by `score` descending.
   - Run `python3 tools/validate.py`. Fix anything it reports.
8. **Commit and push.** `git add data && git commit -m "Digest YYYY-MM-DD (N papers)" && git push`. Do not change other files. If the push fails, report the error instead of retrying with force.
9. **Report** one short line: the date, number of papers per topic, and anything skipped or unverified.

## Quality criteria

Score 1 to 5 (integer):

- **5**: Strong venue or well-known group, clearly novel, and directly relevant to Mahdi's work (prostate ultrasound or micro-ultrasound AI, interpretable or prototype models for medical imaging, activation steering or representation geometry, mechanistic interpretability, SAEs).
- **4**: Solid paper with real results (accepted at a good venue, or convincing experiments and code), relevant to a topic.
- **3**: Useful or interesting but narrower, a review, a small study, or a workshop paper. Include only if the day is thin.
- **1 to 2**: Do not include.

Prefer: peer-reviewed or top-venue acceptance (NeurIPS, ICML, ICLR, ACL, EMNLP, MICCAI, MIDL, IPCAI, Nature family, Radiology, European Urology, IEEE TMI, Medical Image Analysis), reputable labs, code released, honest evaluation, external validation for clinical papers.

Skip: duplicates, press releases, papers with no abstract you can read, pure applications with a weak link to the topic, obvious low-quality submissions, and anything you cannot verify.

If a topic had nothing worthwhile that day, leave it out. Do not stretch a paper to fit a topic.

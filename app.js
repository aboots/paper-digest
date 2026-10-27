/* Paper Digest: vanilla JS, no build step. All text is inserted with textContent (never innerHTML). */
(function () {
  'use strict';

  var TOPICS = [
    { key: 'prostate_us', label: 'Prostate US' },
    { key: 'steering', label: 'Steering' },
    { key: 'sae', label: 'SAEs' },
    { key: 'interpretability', label: 'Interpretability' },
    { key: 'tabular_fm', label: 'Tabular FMs' },
    { key: 'tabular_ssl', label: 'Tabular SSL' }
  ];
  var TOPIC_LABEL = {};
  TOPICS.forEach(function (t) { TOPIC_LABEL[t.key] = t.label; });
  var SUMMARY_LABELS = ['Problem and motivation', 'Method', 'Results and takeaways'];

  var LS_READ = 'pd.read.v1';
  var LS_SAVED = 'pd.saved.v1';       // { id: { savedAt, paper } }
  var LS_HINT = 'pd.hintDismissed.v1';
  var LS_FILTER = 'pd.filter.v1';

  var state = {
    dates: [],
    date: null,
    digest: null,
    filter: 'all',      // 'all' | 'saved' | topic key
    unreadOnly: false,
    query: ''
  };

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    list: $('list'), chips: $('chips'), count: $('count'), prev: $('prev'), next: $('next'),
    date: $('date'), dateText: $('dateText'), search: $('search'), unread: $('unread'),
    status: $('status'), gen: $('gen'), hint: $('hint'), hintClose: $('hintClose')
  };

  /* ---------- storage ---------- */
  function load(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode / full */ }
  }
  var readSet = load(LS_READ, {});
  var savedMap = load(LS_SAVED, {});

  /* ---------- helpers ---------- */
  function h(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function safeUrl(u) {
    return (typeof u === 'string' && /^https?:\/\//i.test(u)) ? u : null;
  }
  function str(v) { return typeof v === 'string' ? v : ''; }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function fmtAuthors(list) {
    var a = arr(list).filter(function (x) { return typeof x === 'string' && x; });
    if (!a.length) return 'Unknown authors';
    var s = a.slice(0, 3).join(', ');
    return a.length > 3 ? s + ' et al.' : s;
  }
  function parseDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  }
  function fmtDay(s, long) {
    var d = parseDay(s);
    if (!d) return str(s);
    return d.toLocaleDateString(undefined, long
      ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function setStatus(msg) { el.status.textContent = msg || ''; el.status.hidden = !msg; }

  /* ---------- data ---------- */
  function getJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' ' + r.status);
      return r.json();
    });
  }
  function normalize(d) {
    var papers = arr(d && d.papers).filter(function (p) { return p && typeof p === 'object' && p.id && p.title; });
    papers.forEach(function (p, i) { p._order = i; });
    papers.sort(function (a, b) { return (Number(b.score) || 0) - (Number(a.score) || 0) || a._order - b._order; });
    return { date: str(d && d.date), generated_at: str(d && d.generated_at), papers: papers };
  }
  function loadDay(date) {
    setStatus('Loading…');
    var latest = state.dates.length && date === state.dates[0];
    var path = latest ? 'data/digest.json' : 'data/archive/' + encodeURIComponent(date) + '.json';
    return getJSON(path).then(function (d) {
      state.digest = normalize(d);
      state.date = date;
      setStatus('');
      render();
    }).catch(function () {
      state.digest = { date: date, generated_at: '', papers: [] };
      state.date = date;
      setStatus('Could not load this day. You may be offline and it was not cached yet.');
      render();
    });
  }

  /* ---------- filtering ---------- */
  function currentPapers() {
    var base;
    if (state.filter === 'saved') {
      base = Object.keys(savedMap).map(function (id) { return savedMap[id]; })
        .sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); })
        .map(function (x) { return x.paper; });
    } else {
      base = state.digest ? state.digest.papers.slice() : [];
      if (state.filter !== 'all') {
        base = base.filter(function (p) { return arr(p.topics).indexOf(state.filter) !== -1; });
      }
    }
    if (state.unreadOnly) base = base.filter(function (p) { return !readSet[p.id]; });
    var q = state.query.trim().toLowerCase();
    if (q) {
      base = base.filter(function (p) {
        var hay = [str(p.title), str(p.why_it_matters)].concat(arr(p.summary).map(str)).concat(arr(p.authors).map(str)).join(' ').toLowerCase();
        return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
      });
    }
    return base;
  }
  function topicCount(key) {
    if (!state.digest) return 0;
    return state.digest.papers.filter(function (p) {
      return key === 'all' || arr(p.topics).indexOf(key) !== -1;
    }).length;
  }

  /* ---------- rendering ---------- */
  function renderChips() {
    el.chips.textContent = '';
    var items = [{ key: 'all', label: 'All', n: topicCount('all') }]
      .concat(TOPICS.map(function (t) { return { key: t.key, label: t.label, n: topicCount(t.key) }; }))
      .concat([{ key: 'saved', label: 'Saved', n: Object.keys(savedMap).length }]);
    items.forEach(function (it) {
      var b = h('button', 'chip' + (state.filter === it.key ? ' on' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', state.filter === it.key ? 'true' : 'false');
      b.appendChild(h('span', null, it.label));
      b.appendChild(h('span', 'n', it.n));
      b.addEventListener('click', function () {
        state.filter = it.key;
        save(LS_FILTER, it.key);
        render();
        window.scrollTo(0, 0);
      });
      el.chips.appendChild(b);
    });
  }

  function renderHeader() {
    var idx = state.dates.indexOf(state.date);
    el.dateText.textContent = state.date ? fmtDay(state.date, false) : '';
    el.date.value = state.date || '';
    if (state.dates.length) {
      el.date.min = state.dates[state.dates.length - 1];
      el.date.max = state.dates[0];
    }
    el.prev.disabled = idx === -1 || idx >= state.dates.length - 1;
    el.next.disabled = idx <= 0;
    var d = state.digest;
    if (d && d.generated_at) {
      var g = new Date(d.generated_at);
      el.gen.textContent = isNaN(g) ? '' : 'Generated ' + g.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } else { el.gen.textContent = ''; }
  }

  function btn(label, cls, onClick, pressed) {
    var b = h('button', 'btn ' + cls, label);
    b.type = 'button';
    if (pressed !== undefined) b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.addEventListener('click', onClick);
    return b;
  }

  function card(p) {
    var isRead = !!readSet[p.id];
    var isSaved = !!savedMap[p.id];
    var c = h('article', 'card' + (isRead ? ' read' : ''));

    var top = h('div', 'cardtop');
    var tags = h('div', 'tags');
    arr(p.topics).forEach(function (t) { tags.appendChild(h('span', 'tag t-' + String(t).replace(/[^a-z_]/g, ''), TOPIC_LABEL[t] || t)); });
    top.appendChild(tags);
    var score = h('span', 'score', String(Number(p.score) || '–'));
    score.title = 'Relevance score (1 to 5)';
    score.setAttribute('aria-label', 'Relevance ' + (Number(p.score) || 'unknown') + ' out of 5');
    top.appendChild(score);
    c.appendChild(top);

    var title = h('h2', 'title');
    var href = safeUrl(p.url);
    if (href) {
      var a = h('a', null, str(p.title));
      a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      title.appendChild(a);
    } else { title.textContent = str(p.title); }
    c.appendChild(title);

    c.appendChild(h('p', 'authors', fmtAuthors(p.authors)));
    var metaParts = [str(p.source), p.published ? fmtDay(p.published, false) : ''].filter(Boolean);
    c.appendChild(h('p', 'meta muted', metaParts.join(' · ')));

    if (p.why_it_matters) {
      var why = h('p', 'why');
      why.appendChild(h('strong', null, 'Why it matters: '));
      why.appendChild(document.createTextNode(str(p.why_it_matters)));
      c.appendChild(why);
    }

    var sum = h('div', 'sum');
    arr(p.summary).slice(0, 3).forEach(function (s, i) {
      var sec = h('section', 'sec');
      sec.appendChild(h('h3', 'sechead', SUMMARY_LABELS[i]));
      sec.appendChild(h('p', 'sectext', str(s)));
      sum.appendChild(sec);
    });
    c.appendChild(sum);

    var actions = h('div', 'actions');
    var saveBtn = btn(isSaved ? '★ Saved' : '☆ Save', 'act' + (isSaved ? ' on' : ''), function () { toggleSaved(p); }, isSaved);
    var readBtn = btn(isRead ? '✓ Read' : 'Mark read', 'act' + (isRead ? ' on' : ''), function () { toggleRead(p); }, isRead);
    actions.appendChild(saveBtn);
    actions.appendChild(readBtn);
    var pdf = safeUrl(p.pdf_url);
    if (pdf) {
      var pa = h('a', 'btn act link', 'PDF');
      pa.href = pdf; pa.target = '_blank'; pa.rel = 'noopener noreferrer';
      actions.appendChild(pa);
    }
    c.appendChild(actions);
    return c;
  }

  function renderList() {
    var papers = currentPapers();
    el.list.textContent = '';
    papers.forEach(function (p) { el.list.appendChild(card(p)); });
    var total = state.filter === 'saved' ? Object.keys(savedMap).length : (state.digest ? state.digest.papers.length : 0);
    el.count.textContent = papers.length + (papers.length === total ? '' : ' of ' + total) + (papers.length === 1 ? ' paper' : ' papers');
    if (!papers.length && !el.status.textContent) {
      var msg;
      if (state.filter === 'saved' && !Object.keys(savedMap).length) msg = 'Nothing saved yet. Tap ☆ Save on a paper.';
      else if (state.unreadOnly) msg = 'Nothing unread here. Nice.';
      else if (state.query) msg = 'No papers match your search.';
      else msg = 'No papers for this day or topic.';
      el.list.appendChild(h('p', 'empty muted', msg));
    }
  }

  function render() {
    renderHeader();
    renderChips();
    renderList();
    el.unread.setAttribute('aria-pressed', state.unreadOnly ? 'true' : 'false');
    el.unread.classList.toggle('on', state.unreadOnly);
  }

  /* ---------- actions ---------- */
  function toggleRead(p) {
    if (readSet[p.id]) delete readSet[p.id]; else readSet[p.id] = Date.now();
    save(LS_READ, readSet);
    renderList();
  }
  function toggleSaved(p) {
    if (savedMap[p.id]) delete savedMap[p.id];
    else savedMap[p.id] = { savedAt: Date.now(), paper: p };
    save(LS_SAVED, savedMap);
    renderChips();
    renderList();
  }
  function goTo(date) {
    if (state.dates.indexOf(date) === -1) return;
    loadDay(date).then(function () { window.scrollTo(0, 0); });
  }
  function step(delta) {
    var i = state.dates.indexOf(state.date);
    if (i === -1) return;
    var j = i + delta; // dates are newest first: +1 = older
    if (j < 0 || j >= state.dates.length) return;
    goTo(state.dates[j]);
  }

  /* ---------- iOS hint ---------- */
  function maybeHint() {
    var ua = navigator.userAgent || '';
    var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var standalone = window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    var dismissed = false;
    try { dismissed = localStorage.getItem(LS_HINT) === '1'; } catch (e) { /* ignore */ }
    if (ios && !standalone && !dismissed) {
      el.hint.hidden = false;
      el.hintClose.addEventListener('click', function () {
        el.hint.hidden = true;
        try { localStorage.setItem(LS_HINT, '1'); } catch (e) { /* ignore */ }
      });
    }
  }

  /* ---------- wiring ---------- */
  function wire() {
    el.prev.addEventListener('click', function () { step(1); });
    el.next.addEventListener('click', function () { step(-1); });
    el.date.addEventListener('change', function () {
      var v = el.date.value;
      if (state.dates.indexOf(v) !== -1) { goTo(v); return; }
      setStatus('No digest for ' + (v ? fmtDay(v, false) : 'that day') + '.');
      el.date.value = state.date || '';
      setTimeout(function () { if (/^No digest/.test(el.status.textContent)) setStatus(''); }, 3000);
    });
    el.unread.addEventListener('click', function () { state.unreadOnly = !state.unreadOnly; render(); });
    var t = null;
    el.search.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { state.query = el.search.value; renderList(); }, 120);
    });
    window.addEventListener('storage', function () {
      readSet = load(LS_READ, {}); savedMap = load(LS_SAVED, {}); render();
    });
  }

  function init() {
    var f = load(LS_FILTER, 'all');
    if (f === 'all' || f === 'saved' || TOPIC_LABEL[f]) state.filter = f;
    wire();
    maybeHint();
    setStatus('Loading…');
    getJSON('data/index.json').then(function (idx) {
      var dates = arr(idx && idx.dates).filter(function (d) { return parseDay(d); });
      dates.sort().reverse();
      state.dates = dates;
      if (!dates.length) throw new Error('no dates');
      return loadDay(dates[0]);
    }).catch(function () {
      // Index failed (offline first load?). Try the latest digest directly.
      return getJSON('data/digest.json').then(function (d) {
        state.digest = normalize(d);
        state.date = state.digest.date;
        state.dates = state.date ? [state.date] : [];
        setStatus('');
        render();
      }).catch(function () {
        state.digest = { date: '', generated_at: '', papers: [] };
        setStatus('No digest available yet.');
        render();
      });
    });
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
      });
    }
  }

  init();
})();

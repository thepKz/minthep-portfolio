/* ============================================================================
   speaking.js — the JPD113 / JPD123 oral-exam trainer (blog/Speaking.html)
   ----------------------------------------------------------------------------
   ES module. Imports only ./core.js. No third-party code, no build step.

   WHAT THIS FILE IS AND IS NOT
   ----------------------------------------------------------------------------
   It is NOT the page. blog/Speaking.html ships every prose section, the full
   exam structure and scoring for both courses, all ten tips, and a static
   sample of every drill type — roughly 1,900 crawlable words — before this
   module is even requested. If this file 404s, throws, or the reader has
   scripting off, the page stays a complete, readable, navigable document with
   working native <audio> players on all 23 real recordings and working
   <details> answers on every static card.

   What it adds, strictly on top:
     1. Machine speech (Web Speech API) for every Japanese line, since there
        are no per-question recordings in this repo and never were.
     2. Hydration of the remaining drills out of blog/data/jpd113.json and
        blog/data/jpd123.json, appended after the static samples.

   THE 512 DEAD REFERENCES
   ----------------------------------------------------------------------------
   The pre-refactor page referenced 486 files under blog/Speaking/audio/ (a
   directory that has never existed in this repository), plus 25 phantom
   jpd123 reading tracks and one missing picture. Every one of those was
   verified absent with a case-exact readdir and dropped at extraction time,
   so nothing in the two JSON files points at a file that is not on disk.
   That is why machine speech is the PRIMARY playback path here and is
   labelled as such in Vietnamese, in the page, in plain words — dressing a
   synthesiser up as a native-speaker recording would be a lie a learner
   would only discover after copying the wrong pitch accent for a month.

   PERFORMANCE CONTRACT (inherited from core.js)
   ----------------------------------------------------------------------------
     · hydration runs after window `load`, inside requestIdleCallback, in
       course-sized chunks assembled off-document in a DocumentFragment, so
       it never lands inside an interaction and never blocks INP;
     · one delegated click listener for every speak button on the page,
       however many get appended;
     · no getBoundingClientRect() anywhere;
     · every appended <img> carries width, height, loading and decoding, so
       hydration cannot move anything that is already on screen (CLS 0).
   ========================================================================== */

import { onIdle } from './core.js';

/* core.boot() is deliberately NOT called here — js/surface-b.js already calls
   it on this page, and booting twice would double the nav listeners. */

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.prototype.slice.call(root.querySelectorAll(sel));

/* Resolved against THIS MODULE's URL, not the document's, so the same code
   works from blog/Speaking.html today and from anywhere else tomorrow. Never
   root-absolute: the site is served from the /minthep-portfolio/ subpath and
   "/blog/data/…" would 404 in production while working fine locally. */
const DATA_URL = {
  jpd113: new URL('../blog/data/jpd113.json', import.meta.url),
  jpd123: new URL('../blog/data/jpd123.json', import.meta.url)
};

const STORE_KEY = 'minthep:speaking';

/* localStorage throws (not returns null) in Safari Private Browsing. */
function readPrefs() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? v : {};
  } catch (err) { return {}; }
}

function writePrefs(patch) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.assign(readPrefs(), patch)));
  } catch (err) { /* private mode — a lost preference is not a failure */ }
}


/* ============================================================================
   1. SPEECH — the primary playback path
   ----------------------------------------------------------------------------
   speechSynthesis is a genuinely awkward API and every quirk below is load
   bearing:

     · getVoices() returns [] on the first call in Chrome and Edge. The list
       arrives asynchronously and announces itself through `voiceschanged`.
       A one-shot check would therefore report "no Japanese voice" on a
       machine that has four.
     · Utterances longer than roughly 200 characters are silently truncated
       in several engines. The reading passages run past 300, so they are
       split on Japanese sentence punctuation and queued as separate
       utterances — the queue is FIFO, so the join is inaudible.
     · A cancel() immediately followed by a speak() drops the new utterance
       in Chrome. Hence the one-frame gap before re-speaking.
     · Nothing here throws if speechSynthesis is absent (older Safari on iOS,
       Firefox with media.webspeech.synth.enabled=false, most WebViews). The
       controls are simply reported as unavailable, in Vietnamese, and the 23
       real recordings carry on working through their native <audio> players.
   ========================================================================== */

const synth = typeof window === 'object' && window.speechSynthesis ? window.speechSynthesis : null;
const Utterance = typeof window === 'object' && window.SpeechSynthesisUtterance
  ? window.SpeechSynthesisUtterance
  : null;

const speech = {
  ready: false,
  voices: { ja: [], vi: [] },
  chosen: { ja: null, vi: null },
  rate: 0.9,
  active: null            // the button currently in the "speaking" state
};

function matchVoices() {
  if (!synth) return;
  let list = [];
  try { list = synth.getVoices() || []; } catch (err) { list = []; }
  speech.voices.ja = list.filter((v) => /^ja(-|_|$)/i.test(v.lang || ''));
  speech.voices.vi = list.filter((v) => /^vi(-|_|$)/i.test(v.lang || ''));
}

function pickVoice(lang, wantedURI) {
  const pool = speech.voices[lang] || [];
  if (!pool.length) return null;
  if (wantedURI) {
    const hit = pool.filter((v) => v.voiceURI === wantedURI)[0];
    if (hit) return hit;
  }
  /* Prefer a local voice: a network voice adds latency on every single tap
     and stops working entirely offline. */
  return pool.filter((v) => v.localService)[0] || pool[0];
}

/* Split on Japanese and Latin sentence enders, keeping the punctuation, then
   regroup into chunks under the truncation ceiling. */
function chunkText(text) {
  const parts = String(text)
    .split(/\n+/)
    .join('。')
    .split(/(?<=[。．.!?！？])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  let buf = '';
  for (const part of parts) {
    if ((buf + part).length > 160 && buf) { out.push(buf); buf = part; }
    else buf += part;
  }
  if (buf) out.push(buf);
  return out.length ? out : [String(text)];
}

function stopSpeaking() {
  if (!synth) return;
  try { synth.cancel(); } catch (err) { /* engine already torn down */ }
  if (speech.active) {
    speech.active.setAttribute('data-speaking', 'false');
    speech.active = null;
  }
}

function speak(text, lang, button) {
  if (!synth || !Utterance || !text) return false;

  /* Tapping the button that is already speaking means "stop". */
  const wasActive = speech.active === button;
  stopSpeaking();
  if (wasActive) return true;

  const voice = speech.chosen[lang] || pickVoice(lang, null);
  const chunks = chunkText(text);

  if (button) {
    button.setAttribute('data-speaking', 'true');
    speech.active = button;
  }

  chunks.forEach((chunk, i) => {
    const u = new Utterance(chunk);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : (lang === 'ja' ? 'ja-JP' : 'vi-VN');
    u.rate = speech.rate;
    u.pitch = 1;
    if (i === chunks.length - 1) {
      u.onend = () => { if (speech.active === button) stopSpeaking(); };
      u.onerror = () => { if (speech.active === button) stopSpeaking(); };
    }
    /* One frame of air after cancel(), or Chrome swallows the first chunk. */
    window.setTimeout(() => { try { synth.speak(u); } catch (err) { stopSpeaking(); } }, i === 0 ? 24 : 0);
  });

  return true;
}


/* ============================================================================
   2. THE SPEECH PANEL (margin rail)
   ----------------------------------------------------------------------------
   Markup lives in blog/Speaking.html and is class="js-only", so a reader with
   scripting off never sees a control that cannot work. This function only
   fills the <select> and wires the two inputs; every Vietnamese string that a
   reader sees in the normal case is authored in the HTML, not here. The
   strings below are the exceptional states only, which is where they have to
   be because they depend on what the browser actually reports.
   ========================================================================== */

function paintVoiceStatus(panel) {
  const status = qs('[data-speech-status]', panel);
  const select = qs('[data-speech-voice]', panel);
  if (!status) return;

  if (!synth || !Utterance) {
    status.textContent =
      'Trình duyệt này không hỗ trợ đọc tự động (Web Speech API). Bạn vẫn nghe được ' +
      '23 bản thu thật ở phần Bài đọc, và vẫn xem được toàn bộ câu hỏi, gợi ý, ' +
      'câu trả lời mẫu và romaji.';
    panel.setAttribute('data-speech-state', 'unsupported');
    return;
  }

  const ja = speech.voices.ja.length;
  const vi = speech.voices.vi.length;

  if (!ja && !vi) {
    status.textContent =
      'Máy của bạn chưa cài giọng đọc tiếng Nhật lẫn tiếng Việt nên nút “Nghe” sẽ ' +
      'không phát ra tiếng. Cách khắc phục: Windows → Cài đặt → Thời gian và ngôn ngữ ' +
      '→ Ngôn ngữ → Thêm “日本語” kèm gói giọng nói; macOS/iOS → Cài đặt → Trợ năng → ' +
      'Nội dung nói → Giọng nói → Tiếng Nhật. Mọi nội dung chữ trên trang vẫn dùng bình thường.';
    panel.setAttribute('data-speech-state', 'novoice');
    return;
  }

  if (!ja) {
    status.textContent =
      'Máy của bạn chưa có giọng đọc tiếng Nhật (chỉ tìm thấy ' + vi + ' giọng tiếng Việt). ' +
      'Nút “Nghe” sẽ đọc câu tiếng Nhật bằng giọng mặc định của hệ thống nên phát âm sẽ sai. ' +
      'Nên cài thêm gói giọng nói 日本語 trước khi luyện phát âm.';
    panel.setAttribute('data-speech-state', 'partial');
    return;
  }

  status.textContent =
    'Đã tìm thấy ' + ja + ' giọng đọc tiếng Nhật trên thiết bị này. Đây là giọng tổng hợp ' +
    'của trình duyệt, không phải bản thu của người bản xứ — hãy dùng nó để kiểm tra cách ' +
    'ngắt câu và tốc độ, đừng bắt chước 100% ngữ điệu.';
  panel.setAttribute('data-speech-state', 'ok');

  if (!select) return;
  const prefs = readPrefs();
  select.textContent = '';
  speech.voices.ja.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = v.name + ' (' + v.lang + ')' + (v.localService ? '' : ' — trực tuyến');
    select.appendChild(opt);
  });
  speech.chosen.ja = pickVoice('ja', prefs.voiceJa);
  speech.chosen.vi = pickVoice('vi', prefs.voiceVi);
  if (speech.chosen.ja) select.value = speech.chosen.ja.voiceURI;
  select.disabled = false;
}

function initSpeechPanel() {
  const panel = qs('[data-speech]');
  if (!panel) return;

  const prefs = readPrefs();
  if (typeof prefs.rate === 'number' && prefs.rate >= 0.5 && prefs.rate <= 1.5) {
    speech.rate = prefs.rate;
  }

  const rate = qs('[data-speech-rate]', panel);
  const rateOut = qs('[data-speech-rate-out]', panel);
  const showRate = () => {
    if (rateOut) rateOut.textContent = speech.rate.toFixed(1).replace('.', ',');
  };
  if (rate) {
    rate.value = String(speech.rate);
    rate.addEventListener('input', () => {
      const v = Number(rate.value);
      if (!Number.isFinite(v)) return;
      speech.rate = v;
      showRate();
      writePrefs({ rate: v });
    });
  }
  showRate();

  const select = qs('[data-speech-voice]', panel);
  if (select) {
    select.addEventListener('change', () => {
      speech.chosen.ja = pickVoice('ja', select.value);
      writePrefs({ voiceJa: select.value });
    });
  }

  const stop = qs('[data-speech-stop]', panel);
  if (stop) stop.addEventListener('click', stopSpeaking);

  matchVoices();
  paintVoiceStatus(panel);

  /* Chrome/Edge deliver the voice list asynchronously — sometimes twice. */
  if (synth && typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', () => {
      matchVoices();
      paintVoiceStatus(panel);
    });
  }

  /* A page unload with the queue running leaves the voice talking over the
     next page in some builds of Chrome. */
  window.addEventListener('pagehide', stopSpeaking);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopSpeaking();
  }, { passive: true });
}


/* ============================================================================
   3. ONE DELEGATED LISTENER FOR EVERY SPEAK BUTTON
   ----------------------------------------------------------------------------
   Buttons carry either data-say (the literal text) or data-say-ref (the id of
   the element holding it — used for the long reading passages, so a 400
   character string is not duplicated into an attribute). Delegation means
   hydration appends 300 more buttons at zero listener cost.
   ========================================================================== */

function sayTextOf(btn) {
  if (btn.dataset.say) return btn.dataset.say;
  const ref = btn.dataset.sayRef;
  if (!ref) return '';
  const el = document.getElementById(ref);
  return el ? el.textContent : '';
}

function initSpeakButtons() {
  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('[data-say],[data-say-ref]') : null;
    if (!btn) return;
    const lang = btn.dataset.sayLang === 'vi' ? 'vi' : 'ja';
    speak(sayTextOf(btn), lang, btn);
  });

  /* Pressing play on a real recording must silence the synthesiser, or the
     learner hears both at once. */
  document.addEventListener('play', (e) => {
    if (e.target && e.target.tagName === 'AUDIO') stopSpeaking();
  }, true);
}


/* ============================================================================
   4. RENDERING — identical in shape to the static cards in the HTML
   ----------------------------------------------------------------------------
   Everything is built with createElement/textContent. No innerHTML anywhere:
   the course data contains user-visible Japanese and Vietnamese that must
   never be parsed as markup, and textContent is also measurably cheaper.
   ========================================================================== */

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function speakButton(text, lang, label) {
  const b = el('button', 'sp-say js-only');
  b.type = 'button';
  b.dataset.say = text;
  b.dataset.sayLang = lang;
  b.setAttribute('data-speaking', 'false');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('data-icon', 'volume-up');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '../img/sprite.svg#volume-up');
  svg.appendChild(use);

  b.appendChild(svg);
  b.appendChild(el('span', null, label));
  return b;
}

function disclosure(summaryText, buildBody) {
  const d = el('details', 'sp-fold');
  d.appendChild(el('summary', null, summaryText));
  buildBody(d);
  return d;
}

/* --- a reading passage --------------------------------------------------- */

function readingCard(item, code) {
  const card = el('article', 'sp-card');

  card.appendChild(el('p', 'sp-card__kicker', code + ' · ' + item.hint));

  const jp = el('p', 'sp-jp', item.text);
  jp.lang = 'ja';
  card.appendChild(jp);

  const tools = el('div', 'sp-tools');
  if (item.audio) {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.src = item.audio;
    audio.className = 'sp-audio';
    tools.appendChild(audio);
    tools.appendChild(el('p', 'sp-src', 'Bản thu thật của giáo viên.'));
  } else {
    tools.appendChild(speakButton(item.text, 'ja', 'Nghe (giọng máy)'));
    tools.appendChild(el('p', 'sp-src', 'Chưa có bản thu — đây là giọng tổng hợp của trình duyệt.'));
  }
  card.appendChild(tools);

  card.appendChild(disclosure('Hiện romaji', (d) => {
    d.appendChild(el('p', 'sp-romaji', item.romaji));
  }));

  card.appendChild(disclosure('Hiện bản dịch tiếng Việt', (d) => {
    d.appendChild(el('p', 'sp-vi', item.translation));
  }));

  return card;
}

/* --- a question / answer drill ------------------------------------------- */

function drillCard(item, code, kicker) {
  const card = el('article', 'sp-card');
  card.appendChild(el('p', 'sp-card__kicker', kicker));

  const q = el('p', 'sp-jp', item.question);
  q.lang = 'ja';
  card.appendChild(q);

  card.appendChild(el('p', 'sp-hint', item.hint));

  const tools = el('div', 'sp-tools');
  tools.appendChild(speakButton(item.question, 'ja', 'Nghe câu hỏi'));
  card.appendChild(tools);

  if (item.romaji && item.romaji.question) {
    card.appendChild(disclosure('Hiện romaji câu hỏi', (d) => {
      d.appendChild(el('p', 'sp-romaji', item.romaji.question));
    }));
  }

  card.appendChild(disclosure('Hiện câu trả lời mẫu', (d) => {
    const a = el('p', 'sp-jp', item.example);
    a.lang = 'ja';
    d.appendChild(a);
    if (item.romaji && item.romaji.example) {
      d.appendChild(el('p', 'sp-romaji', item.romaji.example));
    }
    const t = el('div', 'sp-tools');
    t.appendChild(speakButton(item.example, 'ja', 'Nghe câu trả lời'));
    d.appendChild(t);
  }));

  return card;
}

/* --- a picture group ----------------------------------------------------- */

function pictureGroup(group, code) {
  const wrap = el('section', 'sp-group');
  wrap.appendChild(el('h4', null, code + ' · Bộ câu hỏi có tranh ' + group.no));

  if (group.image) {
    const fig = el('figure', 'sp-figure');
    const pic = document.createElement('picture');
    if (group.image.avif) {
      const s = document.createElement('source');
      s.srcset = group.image.avif;
      s.type = 'image/avif';
      pic.appendChild(s);
    }
    if (group.image.webp) {
      const s = document.createElement('source');
      s.srcset = group.image.webp;
      s.type = 'image/webp';
      pic.appendChild(s);
    }
    const img = document.createElement('img');
    img.src = group.image.src;
    img.width = group.image.w;
    img.height = group.image.h;
    img.alt = group.image.alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    pic.appendChild(img);
    fig.appendChild(pic);
    wrap.appendChild(fig);
  }

  group.questions.forEach((q) => {
    wrap.appendChild(drillCard(q, code, code + ' · Tranh ' + group.no + ' · Câu ' + q.no));
  });

  return wrap;
}


/* ============================================================================
   5. HYDRATION
   ----------------------------------------------------------------------------
   Each container declares which course and which part it holds, and how many
   items the HTML already shipped:

     <div data-drills="jpd113:reading" data-static="2"> … 2 static cards … </div>

   The module APPENDS from index data-static onward. It never clears and never
   re-renders what the crawler and the no-JS reader already have, so there is
   no flash, no duplicate content and no wasted parse.
   ========================================================================== */

const PART = {
  reading: (course) => course.reading,
  without: (course) => course.talking_without_pictures,
  pictures: (course) => course.talking_with_pictures
};

function renderInto(container, course, part, from) {
  const list = PART[part] ? PART[part](course) : null;
  if (!list) return 0;
  const frag = document.createDocumentFragment();
  let n = 0;
  for (let i = from; i < list.length; i++) {
    if (part === 'reading') frag.appendChild(readingCard(list[i], course.code));
    else if (part === 'without') {
      frag.appendChild(drillCard(list[i], course.code, course.code + ' · Câu hỏi không tranh ' + list[i].no));
    } else frag.appendChild(pictureGroup(list[i], course.code));
    n++;
  }
  container.appendChild(frag);
  container.setAttribute('data-hydrated', 'true');
  return n;
}

function setStatus(courseId, text, state) {
  qsa('[data-hydrate-status="' + courseId + '"]').forEach((p) => {
    p.textContent = text;
    p.setAttribute('data-state', state);
  });
}

async function hydrateCourse(courseId) {
  const containers = qsa('[data-drills^="' + courseId + ':"]');
  if (!containers.length) return;

  setStatus(courseId, 'Đang tải toàn bộ bài luyện ' + courseId.toUpperCase() + '…', 'loading');

  let course;
  try {
    const res = await fetch(DATA_URL[courseId], { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    course = await res.json();
  } catch (err) {
    console.warn('[speaking] không tải được dữ liệu ' + courseId + ':', err);
    setStatus(
      courseId,
      'Không tải được phần bài luyện mở rộng của ' + courseId.toUpperCase() +
      ' (có thể do mất mạng). Các bài mẫu phía trên vẫn dùng bình thường, ' +
      'và bạn có thể mở trực tiếp tệp dữ liệu tại data/' + courseId + '.json.',
      'error'
    );
    return;
  }

  let added = 0;
  containers.forEach((container) => {
    const part = (container.getAttribute('data-drills') || '').split(':')[1];
    const from = Math.max(0, parseInt(container.getAttribute('data-static') || '0', 10) || 0);
    added += renderInto(container, course, part, from);
  });

  const c = course.counts || {};
  setStatus(
    courseId,
    'Đã tải đủ ' + (c.reading || 0) + ' bài đọc, ' + (c.talkingWithoutPictures || 0) +
    ' câu hỏi không tranh và ' + (c.pictureGroups || 0) + ' bộ câu hỏi có tranh (' +
    (c.talkingWithPicturesQuestions || 0) + ' câu). ' +
    (c.readingWithAudio || 0) + '/' + (c.reading || 0) +
    ' bài đọc có bản thu thật; phần còn lại dùng giọng đọc máy.',
    'done'
  );
  return added;
}

function hydrate() {
  /* Sequential, not Promise.all: two 40 KB / 128 KB parses back to back on a
     low-end phone is a long task, and the reader is almost certainly looking
     at JPD113 first anyway. */
  hydrateCourse('jpd113')
    .then(() => onIdle(() => { hydrateCourse('jpd123'); }))
    .catch((err) => console.warn('[speaking] hydrate failed:', err));
}


/* ============================================================================
   6. BOOT
   ========================================================================== */

function run(label, fn) {
  try { fn(); } catch (err) { console.warn('[speaking] ' + label + ' failed:', err); }
}

function start() {
  run('initSpeechPanel', initSpeechPanel);
  run('initSpeakButtons', initSpeakButtons);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

/* Hydration waits for `load`, then for an idle slot. Nothing above the fold
   depends on it, so there is no reason for it to compete with the LCP image,
   the fonts, or the reader's first tap. */
if (document.readyState === 'complete') onIdle(hydrate);
else window.addEventListener('load', () => onIdle(hydrate), { once: true });

export { speak, stopSpeaking, hydrateCourse };

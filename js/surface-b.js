/* ============================================================================
   surface-b.js — behaviour for the reading surface (9 blog pages)
   ----------------------------------------------------------------------------
   ES module. Imports only ./core.js. No third-party code, no build step.

   Contracts inherited from core.js and enforced here:
     · no getBoundingClientRect() in any scroll or pointer handler;
     · every scroll / pointer listener is {passive:true};
     · every init is a no-op on a page that contains none of its elements;
     · if this module 404s or throws, the page is still a complete, readable,
       navigable article. Nothing here is required to see the content.


   ==========================================================================
   HANDOFF CONTRACT — THE PRE-PAINT <head> SNIPPET
   ==========================================================================
   T10–T13: paste the block below into <head> of all 9 blog pages, VERBATIM,
   as the LAST thing before </head> and BEFORE any <link rel="stylesheet">
   is unnecessary — it only needs to run before first paint, so anywhere in
   <head> works. It must be INLINE (no src=) and must NOT be type="module":
   a module is deferred and would paint the dark theme first, then repaint to
   paper. That white-to-dark (or dark-to-white) flash is the entire reason
   this snippet exists.

   Copy everything between the two ----8<---- markers, indentation and all.

   ----8<---------------------------------------------------------------------
  <script>
    (function () {
      var d = document.documentElement;
      d.classList.remove('no-js');
      d.classList.add('js');
      try {
        var m = localStorage.getItem('minthep:reading');
        if (m === 'paper' || m === 'dark') d.setAttribute('data-reading', m);
      } catch (e) {}
    })();
  </script>
   ----8<---------------------------------------------------------------------

   Notes on the contract, so nobody "improves" it later:

   1. STORAGE KEY is exactly  minthep:reading
      VALUES are exactly      "paper" | "dark"     (nothing else is honoured)
      DEFAULT is dark, expressed as the ABSENCE of the attribute. Storing
      "dark" is still supported so an explicit opt-out survives a future
      change of default.
   2. The classList swap is the same no-js -> js swap every other surface
      does. It is folded into this one snippet so blog pages carry ONE inline
      script, not two. Surfaces A and C keep their own copy.
   3. The try/catch is not decorative. localStorage throws — not returns null
      — in Safari Private Browsing and when a user has blocked site data.
      Without it, the classList swap above it would have already run but the
      exception would abort the rest of <head> parsing in some engines.
   4. `d` is documentElement, not body: <body> does not exist yet at this
      point in the parse.
   5. The attribute goes on <html>, matching the CSS selector
      [data-reading="paper"] in css/surface-b.css §12.
   6. The toggle button itself is authored with class="js-only" so it is
      absent when scripting is off (base.css §6) — a persisted preference
      with no way to unset it would be a trap.

   Toggle markup the snippet pairs with (css/surface-b.css §11.5):

     <button type="button" class="b-modetoggle js-only" data-reading-toggle
             aria-pressed="false">
       <svg data-icon="sun" aria-hidden="true" focusable="false">
         <use href="../img/sprite.svg#sun"></use></svg>
       <span class="b-modetoggle__on">Chế độ giấy</span>
       <span class="b-modetoggle__off">Chế độ tối</span>
     </button>

   aria-pressed="false" in the HTML is correct for the default (dark). This
   module corrects it on load when the stored mode is paper, so the initial
   value never lies for more than one frame and is right for no-JS readers
   (who never see the button at all).
   ========================================================================== */

import boot, { REDUCED, onIdle } from './core.js';

/* ---------- tiny helpers ---------------------------------------------- */

const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.prototype.slice.call(root.querySelectorAll(sel));

const STORE_KEY = 'minthep:reading';

/* localStorage throws in Safari Private Browsing. Never let it take the page
   down with it — a lost preference is a nuisance, a thrown module is a dead
   toggle, dead copy buttons and a dead video. */
function readMode() {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return v === 'paper' || v === 'dark' ? v : null;
  } catch (err) { return null; }
}

function writeMode(v) {
  try { localStorage.setItem(STORE_KEY, v); } catch (err) { /* private mode */ }
}

/* One shared polite live region for the whole surface. Created lazily, so a
   page with no announceable controls never gets an extra node. */
let _live = null;
function announce(msg) {
  if (!_live) {
    _live = document.createElement('p');
    _live.className = 'visually-hidden';
    _live.setAttribute('role', 'status');
    _live.setAttribute('aria-live', 'polite');
    document.body.appendChild(_live);
  }
  /* Clear first: repeating the same string is otherwise not re-announced. */
  _live.textContent = '';
  window.setTimeout(() => { if (_live) _live.textContent = msg; }, 60);
}


/* ============================================================================
   1. TOC SCROLLSPY — IntersectionObserver only, never a scroll listener
   ----------------------------------------------------------------------------
   The headings come from the TOC's own hrefs rather than from a heading query,
   so the observer set and the link set can never drift apart: an entry with no
   target is dropped, a heading with no entry is not tracked.

   The observer root margin carves a thin activation band across the top of the
   viewport, just under the fixed header. A heading becomes current when it
   enters that band and stays current until another one does — which is exactly
   what a reader means by "the section I am in", including inside a 12,000-word
   chapter where nothing crosses the band for two screens.

   No layout is read anywhere in the callback: entry.isIntersecting is all it
   uses. The optional rail auto-scroll uses scrollIntoView({block:'nearest'}),
   which is a no-op when the link is already visible and cannot move the window
   because the rail is sticky and therefore always on screen.
   ========================================================================== */

function initTOC() {
  const toc = qs('[data-toc]');
  if (!toc) return;

  const links = qsa('a[href^="#"]', toc);
  if (!links.length) return;

  const pairs = [];
  links.forEach((link) => {
    const id = decodeURIComponent(link.hash || '').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (target) pairs.push({ link, target });
  });
  if (!pairs.length) return;

  if (typeof IntersectionObserver !== 'function') return;  // plain anchors, still fine

  const visible = new Set();
  let current = -1;

  const scroller = toc.scrollHeight > toc.clientHeight + 1
    ? toc
    : qs('nav', toc);

  const setCurrent = (idx) => {
    if (idx === current || idx < 0 || idx >= pairs.length) return;
    if (current >= 0) pairs[current].link.removeAttribute('aria-current');
    current = idx;
    const link = pairs[current].link;
    link.setAttribute('aria-current', 'location');

    /* Keep the active entry in view inside the rail / the ≤860px strip. */
    if (!scroller) return;
    const scrollable = scroller.scrollHeight > scroller.clientHeight + 1 ||
                       scroller.scrollWidth > scroller.clientWidth + 1;
    if (!scrollable || typeof link.scrollIntoView !== 'function') return;
    try {
      link.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: REDUCED ? 'auto' : 'smooth'
      });
    } catch (err) {
      link.scrollIntoView(false);                          // ancient signature
    }
  };

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const i = Number(entry.target.dataset.tocIndex);
      if (Number.isNaN(i)) continue;
      if (entry.isIntersecting) visible.add(i); else visible.delete(i);
    }
    if (!visible.size) return;                             // keep the last one
    setCurrent(Math.min.apply(null, Array.from(visible)));
  }, {
    /* top edge just below the fixed header, bottom edge at ~35vh */
    rootMargin: '-72px 0px -65% 0px',
    threshold: 0
  });

  pairs.forEach((p, i) => {
    p.target.dataset.tocIndex = String(i);
    io.observe(p.target);
  });

  /* Before the first heading crosses the band nothing is current; the article
     head is the honest answer, so mark entry 0 once the page is at the top. */
  if (window.scrollY < 8) setCurrent(0);
}


/* ============================================================================
   2. READING PROGRESS
   ----------------------------------------------------------------------------
   If the browser has scroll-driven animations AND the reader has not asked for
   reduced motion, css/surface-b.css §2 already runs this on the compositor and
   this function does nothing at all — no listener, no rAF, no work.

   Otherwise: ONE passive scroll listener, rAF-throttled, writing ONE custom
   property. window.scrollY is a scroll-position read, not a layout read.
   The expensive number (max scroll) is cached and only recomputed on resize
   and on a ResizeObserver tick — which is what catches MathJax, since
   textblog-3 typesets after load and grows the document by several screens.
   ========================================================================== */

function initProgress() {
  const el = qs('[data-progress]');
  if (!el) return;

  const nativeTimeline =
    typeof CSS === 'object' && CSS && typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline', 'scroll()');

  if (nativeTimeline && !REDUCED) return;                  // CSS owns it

  let max = 1;
  let ticking = false;

  const measure = () => {
    const doc = document.documentElement;
    max = Math.max(1, doc.scrollHeight - window.innerHeight);
  };

  const paint = () => {
    ticking = false;
    const p = Math.min(1, Math.max(0, window.scrollY / max));
    el.style.setProperty('--b-progress', p.toFixed(4));
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  };

  measure();
  paint();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
  window.addEventListener('load', () => { measure(); onScroll(); }, { passive: true, once: true });

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => { measure(); onScroll(); });
    ro.observe(document.documentElement);
  }
}


/* ============================================================================
   3. READING-MODE TOGGLE
   ----------------------------------------------------------------------------
   The stored mode is applied by the inline <head> snippet documented at the
   top of this file, long before this module executes. All this function does
   is (a) make the button's aria-pressed agree with reality, and (b) flip it.

   Deliberately NOT implemented: auto-adopting prefers-color-scheme: light.
   Dark is the site's identity; paper is a decision the reader makes for a
   60-minute session. Auto-adoption would also have to be duplicated inside
   the pre-paint snippet, where every extra branch is a chance to flash.
   ========================================================================== */

function initReadingMode() {
  const btn = qs('[data-reading-toggle]');
  if (!btn) return;

  const root = document.documentElement;

  const sync = () => {
    const paper = root.getAttribute('data-reading') === 'paper';
    btn.setAttribute('aria-pressed', paper ? 'true' : 'false');
  };

  sync();

  btn.addEventListener('click', () => {
    const paper = root.getAttribute('data-reading') === 'paper';
    const next = paper ? 'dark' : 'paper';
    if (next === 'paper') root.setAttribute('data-reading', 'paper');
    else root.removeAttribute('data-reading');             // dark = no attribute
    writeMode(next);
    sync();
    announce(next === 'paper' ? 'Đã bật chế độ giấy.' : 'Đã bật chế độ tối.');
  }, { passive: true });

  /* Two tabs open on the same article should not disagree. */
  window.addEventListener('storage', (e) => {
    if (e.key !== STORE_KEY) return;
    const v = readMode();
    if (v === 'paper') root.setAttribute('data-reading', 'paper');
    else root.removeAttribute('data-reading');
    sync();
  }, { passive: true });
}


/* ============================================================================
   4. COPY-TO-CLIPBOARD FOR CODE BLOCKS
   ----------------------------------------------------------------------------
   The button is INJECTED, never authored. No JS, no button — instead of a
   button that does nothing, which is the worse failure.

   Vietnamese states: Sao chép -> Đã sao chép -> Sao chép (after 2s).
   The label lives in JS here (unlike the mode toggle) because the element it
   labels does not exist in the HTML at all.
   ========================================================================== */

const COPY_IDLE = 'Sao chép';
const COPY_DONE = 'Đã sao chép';
const COPY_FAIL = 'Không sao chép được';

function legacyCopy(text) {
  /* execCommand is deprecated but is still the only path on http:// origins
     and in older WebKit. It is never reached on the live https:// site. */
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.className = 'visually-hidden';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

function initCopy() {
  const blocks = qsa('[data-code], .b-code');
  if (!blocks.length) return;

  blocks.forEach((block) => {
    const code = qs('pre code', block) || qs('pre', block);
    if (!code) return;
    if (qs('.b-code__copy', block)) return;                // never double-inject

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'b-code__copy';
    btn.textContent = COPY_IDLE;
    btn.setAttribute('aria-label', COPY_IDLE + ' đoạn mã');

    let timer = 0;

    const flash = (state, label) => {
      btn.dataset.state = state;
      btn.textContent = label;
      announce(label);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        delete btn.dataset.state;
        btn.textContent = COPY_IDLE;
      }, 2000);
    };

    btn.addEventListener('click', () => {
      const text = code.innerText;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(
          () => flash('done', COPY_DONE),
          () => {
            /* Permissions-Policy or a non-secure context. Try once more the
               old way, then tell the truth. Called EXACTLY once — copying
               twice would fire two clipboard writes. */
            const ok = legacyCopy(text);
            flash(ok ? 'done' : 'fail', ok ? COPY_DONE : COPY_FAIL);
          }
        );
        return;
      }
      const ok = legacyCopy(text);
      flash(ok ? 'done' : 'fail', ok ? COPY_DONE : COPY_FAIL);
    }, { passive: true });

    block.appendChild(btn);
  });
}


/* ============================================================================
   5. YOUTUBE FACADE
   ----------------------------------------------------------------------------
   textblog-5 embeds a lecture. A bare <iframe src="youtube.com/embed/…"> costs
   roughly 700 KB and a dozen requests to three Google origins on every page
   view, whether or not anybody presses play.

   Authored markup is a real link to the watch page over a locally-hosted
   poster, so the no-JS path works and is honest about leaving the site. On
   activation the link is replaced in place by a youtube-nocookie iframe with
   autoplay. Nothing is requested from any Google origin before that click —
   there is deliberately no preconnect-on-hover here.
   ========================================================================== */

function initVideo() {
  const wraps = qsa('[data-youtube]');
  if (!wraps.length) return;

  wraps.forEach((wrap) => {
    const link = qs('.b-video__play', wrap) || qs('a[href]', wrap);
    if (!link) return;

    /* The ONE non-passive listener on this surface. It has to be: swapping the
       facade for the iframe means cancelling the navigation to youtube.com,
       which requires preventDefault(). It is a click handler, never a scroll
       handler, so it costs the scroller nothing. */
    link.addEventListener('click', (e) => {
      const id = wrap.getAttribute('data-youtube');
      if (!id) return;                                     // fall through to YouTube
      e.preventDefault();

      const params = 'autoplay=1&rel=0&modestbranding=1&playsinline=1&hl=vi&cc_lang_pref=vi';
      const frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' +
                  encodeURIComponent(id) + '?' + params;
      frame.title = wrap.getAttribute('data-title') || 'Video YouTube';
      frame.loading = 'lazy';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.setAttribute('frameborder', '0');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
      );

      wrap.classList.add('is-playing');
      wrap.appendChild(frame);
      try { frame.focus({ preventScroll: true }); } catch (err) { /* older engines */ }
    });
  });
}


/* ============================================================================
   6. BOOT
   ----------------------------------------------------------------------------
   Each init is isolated: a throw in one cannot stop the others, and none of
   them can stop the page from being read. core.boot() already wraps its own.
   ========================================================================== */

function run(label, fn) {
  try { fn(); } catch (err) { console.warn('[surface-b] ' + label + ' failed:', err); }
}

function start() {
  run('initReadingMode', initReadingMode);   // first: it is the only visual state
  run('initProgress', initProgress);
  run('initTOC', initTOC);
  run('initCopy', initCopy);
  run('initVideo', initVideo);
}

boot();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

/* MathJax typesets after this module runs and can move every heading by a
   screen or more. Re-running the observer wholesale would be wasteful; the
   ResizeObserver in initProgress already re-measures, and IntersectionObserver
   re-evaluates its own targets after layout changes, so nothing else is
   needed. This idle hook exists only to catch late-injected code blocks. */
onIdle(() => run('initCopy(idle)', initCopy));

export { initTOC, initProgress, initReadingMode, initCopy, initVideo };

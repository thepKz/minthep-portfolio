/* core.js — shared behaviour layer for every surface (A / B / C).
   Zero dependencies. ES module. No build step.
   Contracts: no getBoundingClientRect() in any scroll or pointer handler,
   every scroll/pointer listener is {passive:true}, and every export is safe to
   call on a page that contains none of its target elements. */

/* ---------- environment ---------------------------------------------- */

const mm = (q) => (typeof matchMedia === 'function' ? matchMedia(q) : null);
const qsa = (sel, root = document) => Array.prototype.slice.call(root.querySelectorAll(sel));

const _reducedMQ = mm('(prefers-reduced-motion: reduce)');

/* Declared with `let` so the module binding stays LIVE: importers get a
   read-only view that updates when the user flips the OS setting. */
export let REDUCED = !!(_reducedMQ && _reducedMQ.matches);
if (_reducedMQ) {
  const onChange = (e) => { REDUCED = !!e.matches; };
  if (_reducedMQ.addEventListener) _reducedMQ.addEventListener('change', onChange);
  else if (_reducedMQ.addListener) _reducedMQ.addListener(onChange);
}

/* Every property below is optional — guard all of them. */
const _nav = typeof navigator === 'object' && navigator ? navigator : {};
const _conn = _nav.connection || _nav.mozConnection || _nav.webkitConnection || null;
export const LOW_END = !!(
  (typeof _nav.deviceMemory === 'number' && _nav.deviceMemory < 4) ||
  (typeof _nav.hardwareConcurrency === 'number' && _nav.hardwareConcurrency < 4) ||
  (_conn && _conn.saveData === true) ||
  (_conn && typeof _conn.effectiveType === 'string' && /2g/i.test(_conn.effectiveType))
);

const _fineMQ = mm('(pointer: fine)');
export const FINE_POINTER = !!(_fineMQ && _fineMQ.matches);

/* ---------- onIdle ---------------------------------------------------- */

export function onIdle(fn) {
  if (typeof fn !== 'function') return;
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 1);
}

/* ---------- nav: scroll state + drawer + focus trap -------------------- */

const FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,iframe,object,embed,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

export function initNav() {
  const header = document.querySelector('[data-nav]');
  if (!header) return;                                   // no-op on pages without a nav

  /* Scroll state: one passive listener that only writes a class.
     scrollY is a cheap scroll-position read, never a layout read. */
  let scrolled = false;
  const sync = () => {
    const next = window.scrollY > 80;
    if (next === scrolled) return;                       // no redundant class writes
    scrolled = next;
    header.classList.toggle('is-scrolled', next);
  };
  sync();
  window.addEventListener('scroll', sync, { passive: true });

  const toggle = document.querySelector('[data-nav-toggle]');
  const drawer = document.querySelector('[data-drawer]');
  if (!toggle || !drawer) return;                        // scroll state still active

  const main = document.querySelector('main');
  let open = false;

  const setInert = (on) => {
    if (!main) return;
    if ('inert' in HTMLElement.prototype) main.inert = on;
    else if (on) main.setAttribute('inert', '');
    else main.removeAttribute('inert');
  };

  const openDrawer = () => {
    if (open) return;
    open = true;
    drawer.classList.add('is-open');
    document.documentElement.classList.add('is-nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    setInert(true);
    const first = qsa(FOCUSABLE, drawer)[0];
    (first || drawer).focus({ preventScroll: true });
  };

  const closeDrawer = (restore = true) => {
    if (!open) return;
    open = false;
    drawer.classList.remove('is-open');
    document.documentElement.classList.remove('is-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    setInert(false);
    if (restore) toggle.focus({ preventScroll: true });
  };

  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => (open ? closeDrawer() : openDrawer()), { passive: true });
  drawer.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('a[href]')) closeDrawer(false);
  }, { passive: true });

  /* keydown is deliberately NOT passive: Esc-to-close and the Tab trap both
     require preventDefault(). It is a key handler, never a scroll handler. */
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    const items = qsa(FOCUSABLE, drawer).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ---------- theme: dark (canonical) / light ---------------------------- */

/* CONTRACT — do not "improve" any of the four points below.
   1. STORAGE KEY is exactly  minthep:theme
      VALUES are exactly      "light" | "dark"     (nothing else is honoured)
      DEFAULT is dark, expressed as the ABSENCE of data-theme on <html>.
      Storing "dark" is still supported so an explicit opt-out survives a
      future change of default. Same shape as minthep:reading in surface-b.js,
      deliberately — two keys, one mental model.
   2. The attribute goes on <html>, matching [data-theme="light"] in
      css/tokens.css and html[data-theme='light'] in css/base.css.
   3. An INLINE, NON-MODULE <head> script must set the attribute before first
      paint. This module runs deferred; without the pre-paint snippet a
      light-mode visitor gets a full dark repaint on every navigation.
   4. Not auto-adopted from prefers-color-scheme. Dark is the site's identity —
      the hero, the plate tints and the preloaded portrait are all lit for it —
      so light is a decision the visitor makes, not one the OS makes for them.
      Auto-adoption would also have to be duplicated inside the pre-paint
      snippet, where every extra branch is another chance to flash. */

const THEME_KEY = 'minthep:theme';

/* localStorage THROWS — it does not return null — in Safari Private Browsing
   and wherever site data is blocked. A lost preference is a nuisance; an
   uncaught throw here would take the nav, the reveals and the LQIP fades with
   it, because boot() calls all four from one module. */
function readTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch (err) { return null; }
}

function writeTheme(v) {
  try { localStorage.setItem(THEME_KEY, v); } catch (err) { /* private mode */ }
}

export function initTheme() {
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;                                      // no-op on pages without one

  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');

  /* Read the live token rather than hard-coding a second copy of the page
     colour: tokens.css stays the only place either theme's --page is written,
     and the browser chrome can never drift from it. */
  const paintChrome = () => {
    if (!meta) return;
    const page = getComputedStyle(root).getPropertyValue('--page').trim();
    if (page) meta.setAttribute('content', page);
  };

  const sync = () => {
    btn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'light' ? 'true' : 'false');
    paintChrome();
  };

  sync();

  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    if (next === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');             // dark = no attribute
    writeTheme(next);
    sync();
  }, { passive: true });

  /* Two tabs open on the same site should not disagree. */
  window.addEventListener('storage', (e) => {
    if (e.key !== THEME_KEY) return;
    if (readTheme() === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    sync();
  }, { passive: true });
}

/* ---------- reveal ---------------------------------------------------- */

export function initReveal(sel = '[data-reveal]') {
  const els = qsa(sel);
  if (!els.length) return;

  /* Stagger index, capped at 6 direct children per group. */
  qsa('[data-reveal-group]').forEach((group) => {
    Array.prototype.forEach.call(group.children, (child, i) => {
      child.style.setProperty('--i', String(Math.min(i, 5)));
    });
  });

  if (REDUCED || typeof IntersectionObserver !== 'function') {
    els.forEach((el) => el.classList.add('is-in'));      // visible immediately, no observer
    return;
  }

  /* threshold MUST stay 0. A ratio threshold is a trap here because the ratio
     is a fraction of the TARGET's own area, not the viewport's: a target
     taller than the viewport can never reach it. The previous 0.15 demanded
     15% of the element on screen at once, which #portfolio — 5781px of
     project plates — cannot do on any laptop (867px required against an
     ~828px effective root after the -8% margin). It never got .is-in, so the
     entire Projects section shipped at opacity: 0.

     threshold 0 with a negative bottom rootMargin is height-independent: the
     element reveals the moment any part of it crosses 88% of the viewport,
     whether it is 200px or 6000px tall. */
  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      obs.unobserve(entry.target);                       // fires once, then stops costing
    }
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

  els.forEach((el) => io.observe(el));
}

/* ---------- animation gate (the idle-CPU fix) ------------------------- */

export function initAnimGate(sel = '[data-anim]') {
  const els = qsa(sel);
  if (!els.length) return;
  /* Under reduced motion the CSS drops the animation entirely and the element
     stays at its authored `animation-play-state: paused`. No observer at all. */
  if (REDUCED || typeof IntersectionObserver !== 'function') return;

  const visible = new Set();
  const paint = () => {
    const awake = document.visibilityState !== 'hidden';
    els.forEach((el) => {
      el.style.animationPlayState = (awake && visible.has(el)) ? 'running' : 'paused';
    });
  };

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    paint();
  }, { threshold: 0 });

  els.forEach((el) => io.observe(el));
  document.addEventListener('visibilitychange', paint, { passive: true });
}

/* ---------- lazy frames: LQIP blur-up, fail open ---------------------- */

export function initLazyFrames(sel = '.frame') {
  qsa(sel).forEach((frame) => {
    const img = frame.querySelector('img');
    const done = () => frame.classList.add('is-loaded');
    if (!img) { done(); return; }                        // nothing to wait on
    if (img.complete) { done(); return; }                // already loaded OR already errored
    img.addEventListener('load', done, { once: true, passive: true });
    img.addEventListener('error', done, { once: true, passive: true }); // never a permanent blur
  });
}

/* ---------- boot ------------------------------------------------------ */

export default function boot(opts = {}) {
  const run = (label, fn) => {
    try { fn(); } catch (err) { console.warn('[core] ' + label + ' failed:', err); }
  };
  if (opts.nav !== false) run('initNav', () => initNav());
  /* Before the reveals: this one only writes two attributes, and a page that
     boots into the wrong theme is more visible than a late fade-in. */
  if (opts.theme !== false) run('initTheme', () => initTheme());
  if (opts.reveal !== false) run('initReveal', () => initReveal(opts.reveal || '[data-reveal]'));
  if (opts.anim !== false) run('initAnimGate', () => initAnimGate(opts.anim || '[data-anim]'));
  if (opts.frames !== false) run('initLazyFrames', () => initLazyFrames(opts.frames || '.frame'));
}

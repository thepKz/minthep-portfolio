/* surface-c.js — /wy/. Markup contract lives in css/surface-c.css's header.
   Replaces 5 documents, 4 GSAP instances and 4 scrollers that together burned
   240 recalcs/s + 120 layouts/s + 27.7% CPU while idle at scrollY=0.

   FOUR RULES
   1 ONE rAF (gsap.ticker) reading ONE cached scrollY from ONE passive
     listener, writing 4 quickSetters. No getBoundingClientRect in a handler.
   2 That callback early-returns on unchanged scrollY and is removed while the
     stage is off-screen: idle = one integer compare/frame, zero DOM touches.
   3 ScrollTrigger.refresh() runs EXACTLY 3x — fonts, last above-fold image,
     once after boot. Never on resize (see AUTO_REFRESH).
   4 Under reduced motion nothing is created. Not faster — absent.

   ABSENT ON PURPOSE: ScrollSmoother (transformed wrapper, promotes the whole
   document, breaks position:fixed and find-in-page — the exact scroll-jacking
   that made the old page unusable on touch); console.clear() (mainDoor.js:1
   wiped the shared console from an iframe); bare-tag targets like `"img"`.

   BUDGET: gsap 28,314 gz + ScrollTrigger 17,982 = 46,296 static. Flip (9,706)
   is injected on idle / first open; until it lands the lightbox is a plain
   fade. See vendor/gsap/VERSION.txt for the byte accounting — but note its
   claim that these bundles can be `import`ed as ES modules is FALSE; see the
   block below. */

import boot, { REDUCED, LOW_END, onIdle } from './core.js';

/* GSAP IS NOT IMPORTED HERE — READ THIS BEFORE "TIDYING" IT.
   gsap.min.js / ScrollTrigger.min.js / Flip.min.js are UMD bundles. A UMD
   wrapper's browser branch runs `e((t = t || self).window = t.window || {})`.
   Inside an ES module `this` is undefined, so `t` falls back to `self` and the
   assignment `self.window = …` throws — `window` is a getter-only accessor on
   the global object:

       TypeError: Cannot set property window of #<Window>
                  which has only a getter

   The throw happens while evaluating the *imported* module, so this file would
   never reach its own first statement. Verified in headless Chrome: a classic
   `<script src>` yields `gsap=object ScrollTrigger=function`, while
   `await import('/vendor/gsap/Flip.min.js')` throws the above.

   So each wy/*.html loads the two static bundles as CLASSIC scripts placed
   immediately before this module. Classic (non-async) scripts run before any
   deferred module script, so window.gsap / window.ScrollTrigger are already
   set when this line runs. Flip is injected the same way, on demand — see
   loadFlip(). Everything below only ever *reads* the globals. */

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const HAS_GSAP = !!(gsap && ScrollTrigger);
if (!HAS_GSAP) console.warn('[surface-c] GSAP unavailable — static layout stands.');

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.prototype.slice.call(r.querySelectorAll(s));
const guard = (label, fn) => {
  try { return fn(); } catch (e) { console.warn('[surface-c] ' + label + ':', e); }
};

/* wy.html should also set this inline in <head>. Safe late: the .js branch
   defaults to the full reveal, so nothing is ever hidden waiting on JS. */
document.documentElement.classList.add('js');
document.documentElement.classList.remove('no-js');

/* 1. core boot. The anim selector is narrowed: core's initAnimGate and the
   carousel toggle below both write animationPlayState, and two writers means
   the user's pause is undone by the next intersection callback. Rotators carry
   [data-anim] (so the CSS default holds with no JS) AND [data-anim-local];
   core skips the local ones. One writer per element. */

boot({ anim: '[data-anim]:not([data-anim-local])', frames: '.sc-frame' });

/* 2. ScrollTrigger config.
   ignoreMobileResize — the mobile URL bar collapsing mid-scroll fires a resize
     with a changed height; without this every flick re-measures every trigger.
   limitCallbacks — boundary callbacks fire on crossing, not every tick past.
   autoRefreshEvents — the default includes 'resize'; dropping it is the only
     way to honour "never refresh on resize" literally.
   HONEST TRADEOFF: a desktop user who drags the window to a materially
   different width keeps values measured at the old width until reload or a tab
   switch, so the pin and scrub sit wrong until then. Accepted as the literal
   reading. To relax it correctly: a >=250 ms debounced refresh on a WIDTH-ONLY
   change — height-only is the URL bar. */

const AUTO_REFRESH = 'visibilitychange,DOMContentLoaded,load';

if (HAS_GSAP) guard('config', () => {
  ScrollTrigger.config({
    ignoreMobileResize: true,
    limitCallbacks: true,
    autoRefreshEvents: AUTO_REFRESH,
  });
  /* keeps a GC pause or a slow decode from producing one huge catch-up delta */
  gsap.ticker.lagSmoothing(500, 33);
});

/* 3. the scroll cache: one listener, one number, page-wide. window.scrollY is
   served from the committed scroll offset and flushes nothing; rect reads do,
   which is why getBoundingClientRect appears in no handler here. */

let scrollY = window.scrollY || 0;
let scrollDirty = true;

window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  scrollDirty = true;
}, { passive: true });

/* 4. entry parallax. Four columns, four depths, ONE ticker callback, zero
   layout. The old build scrubbed `width` on 35 flex children: 178 layouts /
   180 frames, p99 123.3 ms. Same machine, same frames, Door animating scale/z
   only: 0 layouts, p99 10.3 ms. That is the whole argument. quickSetter caches
   the lookup and unit; the callback is added/removed by the stage's own
   trigger, so off-screen the ticker list is empty and rAF costs nothing. */

const DEPTHS = [-0.08, 0.12, -0.16, 0.06];

guard('parallax', () => {
  if (!HAS_GSAP || REDUCED || LOW_END) return;   // LOW_END gets the static mosaic
  const entry = qs('.sc-entry');
  if (!entry) return;
  const cols = qsa('.sc-col', entry).slice(0, DEPTHS.length);
  if (!cols.length) return;

  const setters = cols.map((el) => gsap.quickSetter(el, 'y', 'px'));
  const depths = DEPTHS.slice(0, cols.length);
  let base = 0;
  let last = -1;

  const tick = () => {
    if (!scrollDirty) return;              // the idle-CPU guarantee
    scrollDirty = false;
    const y = Math.round(scrollY - base);
    if (y === last) return;                // and the second one
    last = y;
    for (let i = 0; i < setters.length; i++) setters[i](y * depths[i]);
  };

  let running = false;
  const start = () => { if (!running) { running = true; scrollDirty = true; gsap.ticker.add(tick); } };
  const stop = () => { if (running) { running = false; gsap.ticker.remove(tick); } };

  ScrollTrigger.create({
    trigger: entry,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      if (self.isActive) { base = self.scroll(); last = -1; start(); }
      else { stop(); for (let i = 0; i < setters.length; i++) setters[i](0); }
    },
  });

  /* the page can load already scrolled (a #hash, a restored position) */
  const r0 = entry.getBoundingClientRect();   // ONCE, at setup. Never in a handler.
  if (r0.top < window.innerHeight && r0.bottom > 0) { base = scrollY; start(); }
});

/* FIX 7 — old: backdrop-filter blur(10px) with border-radius scrubbed 100->0%,
   re-sampling AND re-blurring the whole backdrop every frame. New: a clip-path
   radius over a blur declared once — one custom property on one element, one
   single-element recalc, zero layout. */

guard('panel reveal', () => {
  if (!HAS_GSAP || REDUCED) return;
  const panel = qs('.sc-entry__panel');
  const entry = qs('.sc-entry');
  if (!panel || !entry) return;
  gsap.fromTo(panel, { '--sc-panel-r': '0%' }, {
    '--sc-panel-r': '78%',
    ease: 'none',
    scrollTrigger: { trigger: entry, start: 'top top', end: '60% top', scrub: 0.4 },
  });
});

/* 5. door. The one timeline the old build got right, kept in kind: scale and
   z only — 180 frames, LayoutCount 0, p99 10.3 ms, nothing over 16.7 ms.
   The pinned section must NEVER carry content-visibility: a height change
   while it is skipped invalidates the pin. surface-c.css guards it; this
   comment is the other half of that contract. */

guard('door', () => {
  if (!HAS_GSAP || REDUCED) return;
  const wrap = qs('.sc-door__wrap');
  const hero = qs('.sc-door__hero');
  const gate = qs('.sc-door__gate');        // explicit class, never `"img"`
  if (!wrap || !gate) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: wrap, start: 'top top', end: '+=180%',
      pin: true, pinSpacing: true, anticipatePin: 1,
      scrub: 0.6, invalidateOnRefresh: true,
    },
  });
  tl.fromTo(gate, { scale: 1 }, { scale: 9, ease: 'power2.in' }, 0);
  if (hero) tl.fromTo(hero, { scale: 1.12 }, { scale: 1, ease: 'none' }, 0);
  tl.to(gate, { autoAlpha: 0, ease: 'none', duration: 0.25 }, 0.75);
});

/* 6. carousel play/pause (WCAG 2.2.2). The old build's only pause was
   :has(:hover), which does not exist on touch — a phone user could not stop
   the 25 s rotation at all. This gate owns [data-anim-local] exclusively and
   ANDs three inputs (on screen, tab visible, not user-paused) into one
   animationPlayState write per element per change. */

guard('carousel', () => {
  const rotators = qsa('[data-anim-local]');
  if (!rotators.length) return;
  const toggle = qs('[data-carousel-toggle]');
  const shell = qs('.sc-carousel');

  /* under reduce, components.css already set animation:none — there is nothing
     to pause, so the control leaves the a11y tree rather than lying */
  if (REDUCED) { if (toggle) toggle.hidden = true; return; }

  let userPaused = false;
  const visible = new Set();

  const paint = () => {
    const play = document.visibilityState !== 'hidden' && !userPaused;
    rotators.forEach((el) => {
      el.style.animationPlayState = (play && visible.has(el)) ? 'running' : 'paused';
    });
    if (shell) shell.classList.toggle('is-paused', userPaused);
  };

  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }
      paint();
    }, { threshold: 0 });
    rotators.forEach((el) => io.observe(el));
  } else {
    rotators.forEach((el) => visible.add(el));
  }

  document.addEventListener('visibilitychange', paint, { passive: true });

  if (toggle) {
    toggle.setAttribute('aria-pressed', 'false');
    toggle.addEventListener('click', () => {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      paint();
    }, { passive: true });
  }
  paint();
});

/* 7. lightbox: <dialog> + Flip morph. showModal() gives a focus trap, Esc,
   an inert background and focus restoration in the platform. The old page had
   no lightbox — 1440x1800 originals were used as 70x351 thumbnails.
   --ease-spring is a CSS linear() easing that GSAP cannot consume, so the CSS
   shell uses the token directly and the JS morph uses back.out(0.35) — an
   approximation of its ~1.7% overshoot, not an equivalence. */

let FlipPlugin = null;
let flipRequest = null;

function loadFlip() {
  if (FlipPlugin) return Promise.resolve(FlipPlugin);
  if (!HAS_GSAP || REDUCED) return Promise.resolve(null);
  if (!flipRequest) {
    /* classic <script>, not import() — Flip.min.js is a UMD bundle and an ES
       import of it throws (see the header). import.meta.url keeps the path
       relative to this file, so the /minthep-portfolio/ subpath still works. */
    flipRequest = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = new URL('../vendor/gsap/Flip.min.js', import.meta.url).href;
      s.onload = res;
      s.onerror = () => rej(new Error('failed to load ' + s.src));
      document.head.appendChild(s);
    })
      .then(() => (FlipPlugin = window.Flip || null))
      .catch((e) => { console.warn('[surface-c] Flip unavailable, using a fade:', e); return null; });
  }
  return flipRequest;
}

guard('lightbox', () => {
  const dialog = qs('[data-lightbox]');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const img = qs('[data-lightbox-img]', dialog);
  const cap = qs('[data-lightbox-cap]', dialog);
  const closeBtn = qs('[data-lightbox-close]', dialog);
  const prevBtn = qs('[data-lightbox-prev]', dialog);
  const nextBtn = qs('[data-lightbox-next]', dialog);
  const triggers = qsa('[data-lightbox-open]');
  if (!img || !triggers.length) return;

  let index = -1;
  let invoker = null;

  const paint = (i) => {
    const el = triggers[i];
    if (!el) return;
    index = i;
    const full = el.getAttribute('data-full');
    const caption = el.getAttribute('data-caption') || '';
    const inner = el.querySelector('img');
    if (full) img.setAttribute('src', full);
    img.setAttribute('alt', (inner && inner.getAttribute('alt')) || caption);
    if (cap) cap.textContent = caption;
    [prevBtn, nextBtn].forEach((b) => { if (b) b.hidden = triggers.length < 2; });
  };

  /* morph from the thumbnail's own img where there is one, so the rect matches
     the visible picture rather than its padded button */
  const sourceOf = (i) => {
    const el = triggers[i];
    return el ? (el.querySelector('img') || el.querySelector('.sc-frame') || el) : null;
  };

  const fade = () => {
    if (HAS_GSAP) gsap.fromTo(dialog, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'none' });
  };

  const morphIn = (i) => {
    /* Reduced motion: 0.2 s opacity, no transform. Deliberately not the
       collapsed --dur-* — opacity is not vestibular motion, and an element
       that simply materialises is its own kind of disorienting. */
    const source = sourceOf(i);
    if (REDUCED || !HAS_GSAP || !FlipPlugin || !source) { fade(); return; }

    guard('flip', () => {
      const Flip = FlipPlugin;
      dialog.classList.add('is-morphing');
      /* fit onto the thumb rect -> record it -> restore the real layout ->
         animate from the record */
      Flip.fit(img, source, { scale: true });
      const state = Flip.getState(img);
      gsap.set(img, { clearProps: 'transform,width,height' });
      Flip.from(state, {
        duration: 0.55,
        ease: 'back.out(0.35)',          // ~ --ease-spring's 1.7% overshoot
        scale: true,
        absolute: true,
        onComplete: () => {
          gsap.set(img, { clearProps: 'all' });
          dialog.classList.remove('is-morphing');
        },
      });
      fade();
    });
  };

  const open = (i, el) => {
    invoker = el || triggers[i] || null;
    paint(i);
    document.documentElement.classList.add('sc-modal-open');
    dialog.showModal();
    /* exactly one morph per open: when Flip is already resolved the promise
       settles on the next microtask, before paint */
    loadFlip().then(() => { if (dialog.open) morphIn(i); });
  };

  const step = (d) => paint((index + d + triggers.length) % triggers.length);

  triggers.forEach((el, i) => el.addEventListener('click', (e) => { e.preventDefault(); open(i, el); }));
  if (closeBtn) closeBtn.addEventListener('click', () => dialog.close(), { passive: true });
  if (prevBtn) prevBtn.addEventListener('click', () => step(-1), { passive: true });
  if (nextBtn) nextBtn.addEventListener('click', () => step(1), { passive: true });

  /* the dialog element is the backdrop's hit area outside the figure */
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }, { passive: true });

  /* arrow keys; Esc is the platform's */
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  /* `close` fires for Esc, the buttons and method=dialog alike, so cleanup
     lives here and nowhere else. Focus restoration is the platform's job but
     Safari has been unreliable about it, so it is done explicitly. */
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('sc-modal-open');
    dialog.classList.remove('is-morphing');
    if (HAS_GSAP) gsap.set(dialog, { clearProps: 'opacity' });
    if (invoker && invoker.focus) invoker.focus({ preventScroll: true });
    invoker = null;
  }, { passive: true });
});

/* 8. the three refreshes. ScrollTrigger caches every start/end value at
   creation; exactly three things change document height afterwards:
   1 fonts.ready (Anton/Newsreader replace fallback metrics), 2 the last
   above-fold image resolving, 3 once after boot as the catch-all. Never on
   resize, never on a timer. The counter catches a future fourth. */

let refreshCount = 0;

function refreshOnce(reason) {
  if (!HAS_GSAP) return;
  refreshCount += 1;
  if (refreshCount > 3) { console.warn('[surface-c] refresh budget exceeded at ' + reason); return; }
  guard('refresh:' + reason, () => ScrollTrigger.refresh());
}

guard('refresh/fonts', () => {
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refreshOnce('fonts'));
  else refreshOnce('fonts.unsupported');
});

/* decode() resolves once the pixels reach the compositor and rejects on a
   broken image — hence allSettled, so a dead URL never withholds the refresh. */
guard('refresh/images', () => {
  const above = qsa('.sc-entry img, .sc-door__gate');
  if (!above.length) { refreshOnce('images.none'); return; }
  const waits = above.map((el) => {
    if (el.complete) return Promise.resolve();
    if (el.decode) return el.decode().catch(() => undefined);
    return new Promise((res) => {
      el.addEventListener('load', res, { once: true, passive: true });
      el.addEventListener('error', res, { once: true, passive: true });
    });
  });
  Promise.allSettled(waits).then(() => refreshOnce('images'));
});

/* catch-all + Flip prefetch, on idle so neither competes with the LCP paint */
onIdle(() => { refreshOnce('boot'); loadFlip(); });

/* 9. dev assertions — one-shot, warn only. All three mistakes were real. */

onIdle(() => guard('assert', () => {
  if (qsa('.sc-door [data-cv], .sc-door[data-cv]').length) {
    console.warn('[surface-c] [data-cv] inside the pinned Door stage — remove it.');
  }
  if (document.getAnimations) {
    const ungated = document.getAnimations().filter((a) => {
      const t = a.effect && a.effect.target;
      if (!t || !t.matches || !a.effect.getTiming) return false;
      return a.effect.getTiming().iterations === Infinity &&
        !t.matches('[data-anim], [data-anim-local]');
    });
    if (ungated.length) console.warn('[surface-c] ' + ungated.length + ' ungated infinite animation(s).');
  }
  const promoted = qsa('.sc-col, .sc-door__hero, .sc-door__gate, [style*="will-change"]');
  if (promoted.length > 20) console.warn('[surface-c] ' + promoted.length + ' promoted layers, budget 20.');
}));

export { refreshCount };

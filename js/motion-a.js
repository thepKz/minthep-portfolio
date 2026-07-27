/* motion-a.js — the motion layer for Surface A (index.html). NEW FILE, additive.
   MOTION-SPEC §2: M1 sheen · M2 tilt · M3 portrait parallax · M4 band velocity ·
   M7 ledger spines · M8 header tuck · M9 footer mark · M10 scrollspy. M5 and M6
   are pure CSS and appear nowhere here — that is the design, not an omission.

   Four rules not derivable from any single line below:
   1 0 pins, 0 scrollerProxy, 0 normalizeScroll, no ScrollSmoother. Pin spacing
     inside a content-visibility:auto section invalidates its --cv-size and grows
     the document under the cursor; scrub:0.6 is the only legal source of
     perceived smoothness here.
   2 ONE rAF — gsap.ticker. No requestAnimationFrame, no getBoundingClientRect()
     in a scroll or pointer handler, every listener passive.
   3 Every custom property written here is a UNITLESS NUMBER (spec RULE A); CSS
     applies the unit via calc(var(--a-tilt-y,0) * 1deg). Writing "3deg" from here
     removes the one thing keeping the two files independent.
   4 NEVER WRITE clip-path TO .hero__name OR ANY DESCENDANT. surface-a.css:419
     carries the negative headroom Anton's Ấ Ầ Ẫ Ế Ộ Ữ need — their ink rises
     34.6px above the line box at hero size, and clipping it shipped as a bug once.

   js/core.js is READ-ONLY here: four imported flags, nothing else. */

import { REDUCED, LOW_END, FINE_POINTER, onIdle } from './core.js';

/* GSAP off the globals, never imported — proof at surface-c.js:27: the UMD
   wrapper assigns self.window, which throws inside an ES module, so this file
   would never reach its first statement. Classic <script defer> and module
   scripts share one execute-after-parsing list in document order, so window.gsap
   exists before initMotion() runs. That ordering is spec, not luck. */

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const HAS_GSAP = !!(gsap && ScrollTrigger);

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.prototype.slice.call(r.querySelectorAll(s));

/* Mirrors core.js boot()'s run(): warn and continue, so one broken effect never
   takes the other nine down. */
const guard = (label, fn) => {
  try { return fn(); } catch (e) { console.warn('[motion-a] ' + label + ' failed:', e); }
};

/* REDUCED is a live `let` that core.js re-assigns on the matchMedia change
   event, so it is read HERE at call time, never copied to module scope. Routing
   every named export through this is what makes each safe to call alone. */
const motionReady = () => HAS_GSAP && !REDUCED;

/* ---------- M1 · hero portrait specular sheen ------------------------- */

/* ONE tween, fires once, never loops — a repeating sheen is an "endless floating
   loop", banned by name. delay 0.9 overlaps the TAIL of the existing --dur-6
   portrait reveal rather than butt-joining after it. LOW_END: keep. */
export function initSheen() {
  if (!motionReady()) return;
  const sheen = qs('.hero__portrait .hero__sheen');
  if (!sheen) return;                       // HTML implementer owns the element

  /* fromTo, not to: with motion-a.css missing, --a-sheen is unregistered and its
     computed value is "", which GSAP cannot parse to a number. */
  gsap.fromTo(sheen,
    { '--a-sheen': 0 },
    { '--a-sheen': 1, duration: 1.2, delay: 0.9, ease: 'power2.inOut' });
}

/* ---------- M2 · hero portrait pointer tilt --------------------------- */

/* The page's only pointer effect, on its only focal object.
   LOW_END or coarse pointer: skip entirely — no listener, no setter, no tween. */
export function initPortraitTilt() {
  if (!motionReady()) return;
  if (!FINE_POINTER || LOW_END) return;
  const hero = qs('.hero');
  const portrait = qs('.hero__portrait');
  if (!hero || !portrait) return;

  gsap.set(portrait, { '--a-tilt-x': 0, '--a-tilt-y': 0 });   // see M1's fromTo note

  /* quickTo allocates its tween ONCE and thereafter only mutates a target value;
     a gsap.to() per pointermove would allocate thousands a second off a 120Hz
     stream. Custom properties work as quickTo targets because CSSPlugin stores
     the var name as the PropTween's funcParam and resetTo() matches pt.fp as
     well as pt.p — read out of the vendored 3.15.0 bundle, not assumed. */
  const setX = gsap.quickTo(portrait, '--a-tilt-x', { duration: 0.5, ease: 'power3' });
  const setY = gsap.quickTo(portrait, '--a-tilt-y', { duration: 0.5, ease: 'power3' });

  /* ±3.2°: at ~380px wide under 1100px perspective the corners travel ~10px,
     inside .hero__grid's gutter and well inside .hero's overflow:clip. */
  const AMP = 3.2;
  const tilt = gsap.utils.mapRange(0, 1, AMP, -AMP);
  /* Clamp the NORMALISED input, not the output: pointer coordinates land outside
     [0,vw] on multi-monitor and pen setups, and this caps the output for free. */
  const unit = gsap.utils.clamp(0, 1);

  /* Window geometry, not a layout read, refreshed only on resize/refresh —
     never inside the handler. That is why no gBCR appears in this file. */
  let vw = window.innerWidth || 1;
  let vh = window.innerHeight || 1;
  const measure = () => { vw = window.innerWidth || 1; vh = window.innerHeight || 1; };
  window.addEventListener('resize', measure, { passive: true });
  ScrollTrigger.addEventListener('refresh', measure);

  const onMove = (e) => {
    if (REDUCED) { setX(0); setY(0); return; }   // live read: parks on OS change
    setY(tilt(unit(e.clientX / vw)));
    /* SPEC GAP: the spec hands down ONE mapper for both axes, but the axes then
       disagree about which way "toward the pointer" is — rotateY(+deg) brings the
       LEFT edge forward while rotateX(+deg) tips the TOP edge AWAY, so horizontal
       faces the cursor while vertical flinches from it, reading as wobble rather
       than weight. X is negated; amplitude, clamp and mapper are unchanged. */
    setX(-tilt(unit(e.clientY / vh)));
  };

  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerleave', () => { setX(0); setY(0); }, { passive: true });
}

/* ---------- M3 · hero portrait counter-parallax ----------------------- */

/* 26px of rise inside a frame whose aspect-ratio and overflow:clip are already
   fixed, so no layout moves and there is no CLS risk. CSS applies it through
   `translate`, not `transform`, because the <img> already animates the separate
   `scale` property in its reveal and the browser multiplies the two.
   LOW_END: skip — the least legible of the three hero moves. */
export function initPortraitParallax() {
  if (!motionReady() || LOW_END) return;
  const hero = qs('.hero');
  const img = qs('.hero__portrait img');
  if (!hero || !img) return;

  gsap.fromTo(img,
    { '--a-por-y': 0 },
    {
      '--a-por-y': -26,
      ease: 'none',                         // damping comes from scrub, never from
      scrollTrigger: {                      // a second ease stacked on top of it
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
      },
    });
}

/* ---------- M4 · kinetic band scroll-velocity modulation --------------- */

/* Deliberately NOT a GSAP rewrite. The CSS marquee already has a measured
   -102.55px/s, core.js's [data-anim] idle gate, a :hover pause and a
   reduced-motion kill; a GSAP tween forfeits all four. So we modulate the
   EXISTING CSSAnimation's playbackRate — that does not detach the animation from
   its stylesheet the way play()/pause() would, so animation-play-state keeps full
   authority. Hence nobody may set play-state or use the `animation` shorthand
   here: the shorthand resets play-state and silently defeats the gate.
   MAGNITUDE ONLY, NO REVERSAL — a reversing infinite marquee reads as a glitch.
   LOW_END: skip; the marquee stays at rate 1. */
export function initBandVelocity() {
  if (!motionReady() || LOW_END) return;
  const track = qs('.kinetic-band__track[data-anim]');
  if (!track || !track.getAnimations) return;
  const anim = track.getAnimations()[0];
  if (!anim) return;      // reduced motion set animation-name:none — nothing to do

  const rate = gsap.utils.clamp(1, 2.6);
  const proxy = { r: 1 };
  const write = () => { anim.playbackRate = proxy.r; };

  /* ONE reusable settle tween: invalidate() re-reads proxy.r as the start, so
     restart() always eases from wherever the scroll left it back to 1, and a
     gsap.to() inside the delayedCall would allocate one tween per scroll-stop.
     Eased, not assigned: a hard snap from 2.6 to 1 on an infinite marquee jerks. */
  const settle = gsap.to(proxy, {
    r: 1, duration: 0.5, ease: 'power2.out', paused: true, onUpdate: write,
  });
  const stop = gsap.delayedCall(0.14, () => settle.invalidate().restart()).pause();

  ScrollTrigger.create({
    onUpdate: (self) => {
      const next = rate(1 + Math.abs(self.getVelocity()) / 1400);
      /* Deadband: playbackRate is a compositor-visible mutation, so re-writing an
         imperceptibly different value every tick is pure churn. */
      if (Math.abs(next - proxy.r) > 0.02) { proxy.r = next; write(); }
      settle.pause();                       // direct writes win while scrolling
      stop.restart(true);                   // ...and hand back 140ms after it ends
    },
  });
}

/* ---------- M7 · ledger spines ---------------------------------------- */

/* The DrawSVG substitute and cheaper: one composited scale on a 1px ::before.
   --a-spine is the system's only inherits:true registered property and so its
   only per-frame subtree invalidation (3 <ol>s, ~46 descendants) — if §5.6's perf
   gate fails THIS IS THE FIRST CUT, before M3. It must inherit: a ::before
   inherits from its originating element, so at inherits:false the pseudo gets the
   initial-value and the spine never draws. */
export function initLedgerSpines() {
  if (!motionReady()) return;
  const lists = qsa('ol[data-spine]');
  if (!lists.length) return;

  lists.forEach((ol) => {
    gsap.fromTo(ol,
      { '--a-spine': 0 },
      {
        '--a-spine': 1,
        ease: 'none',
        scrollTrigger: { trigger: ol, start: 'top 78%', end: 'bottom 62%', scrub: 0.6 },
      });
  });
}

/* ---------- M8 · directionally aware header ---------------------------- */

/* ZERO TWEENS: one boolean class flip per direction change; CSS owns the
   translate. Two guards beyond the scroll threshold, correctness not taste:
   never tuck while the drawer is open (overflow:hidden has frozen the scroller),
   and never tuck while focus is inside the header — sliding a focused link
   off-screen is a keyboard trap.
   LOW_END: keep — functional, not decorative, and costs one class write. */
export function initHeaderTuck() {
  if (!motionReady()) return;
  const header = qs('[data-nav]');
  if (!header) return;

  const root = document.documentElement;
  const blocked = () =>
    root.classList.contains('is-nav-open') || header.contains(document.activeElement);

  ScrollTrigger.create({
    start: 'top -140',
    end: 99999,
    onUpdate: (self) => {
      header.classList.toggle('is-tucked', self.direction === 1 && !blocked());
    },
  });

  /* SPEC GAP: the spec places the focus guard only inside onUpdate, which fires
     on scroll. Focus can enter a tucked header with NO scroll — Shift+Tab back
     from the skip link, a browser restoring focus — leaving the header off-screen
     around a focused element. Not a scroll or pointer listener, so §5.1 holds. */
  header.addEventListener('focusin', () => header.classList.remove('is-tucked'), { passive: true });
}

/* ---------- M9 · footer wordmark rise ---------------------------------- */

/* Safe because the mark is aria-hidden decorative texture (--ink-850 on
   --ink-1000, 1.15:1) and [data-footer] is overflow:clip, so the rise can't
   bleed. Its resting value is 1 — the FINISHED state — so with no JS the wordmark
   is simply visible. The clip formula lives in CSS and copies surface-a.css's
   -26% top / -16% foot verbatim: a 0 top inset on Anton is a bug by definition.

   --a-mark IS THE ONE PROPERTY NOT REGISTERED WITH @property (motion-a.css:55):
   the name was already taken by surface-a.css:139, which declares it on :root as
   a 20px LENGTH for 34 .skill-row__mark icons, so registering it '<number>'
   would invalidate that declaration and collapse 35 icons to inline-size:auto.
   CSS shadows it back to 1 on [data-footer-mark] instead. That is why fromTo is
   mandatory here and `to` is not merely preferred: fromTo supplies the 0 start
   explicitly, so GSAP never reads a computed value at all. A `to` would depend
   on that shadow rule having loaded, and inherit 20px if it had not. */
export function initFooterMark() {
  if (!motionReady()) return;
  const footer = qs('[data-footer]');
  const mark = qs('[data-footer-mark]');
  if (!footer || !mark) return;

  gsap.fromTo(mark,
    { '--a-mark': 0 },
    {
      '--a-mark': 1,
      ease: 'none',
      scrollTrigger: { trigger: footer, start: 'top 92%', end: 'top 45%', scrub: 0.6 },
    });
}

/* ---------- M10 · nav scrollspy --------------------------------------- */

/* IntersectionObserver, not ScrollTrigger, and outside the HAS_GSAP and REDUCED
   guards: orientation on an 18,800px document is functional, and functional
   behaviour must not depend on a decoration library. Under reduced motion it
   STILL RUNS — a state change, not motion.
   THRESHOLD MUST BE 0, band expressed entirely through rootMargin. A ratio
   threshold is a fraction of the TARGET's area and #portfolio is 5,779px tall, so
   0.15 is unreachable on a laptop; that shipped Projects at opacity:0 once.
   Zero new CSS: components.css:295 already gives [aria-current]::after a
   scaleX(1) and :300 sets --ink-50, so the state never relies on colour alone. */
export function initScrollspy() {
  if (typeof IntersectionObserver !== 'function') return;
  const links = qsa('[data-nav-link][href^="#"]');
  const sections = qsa('section[id]');
  if (!links.length || !sections.length) return;

  /* hash -> links, because the header nav and the drawer can both point at the
     same section and both must track. */
  const byHash = new Map();
  links.forEach((a) => {
    const h = a.getAttribute('href');
    if (!h || h.length < 2) return;
    const list = byHash.get(h);
    if (list) list.push(a); else byHash.set(h, [a]);
  });

  const live = new Set();
  let current = null;

  const paint = () => {
    /* Last intersecting section in DOCUMENT order wins: two sections straddle the
       10%-tall band at a seam, and the later one is the one being scrolled into. */
    let active = null;
    for (let i = 0; i < sections.length; i++) if (live.has(sections[i])) active = sections[i];

    /* SPEC GAP: the spec fixes what happens when the active section has no link,
       but not what happens when NOTHING is in the band — reachable, since the 96px
       .kinetic-band between #about and #skills fills the whole strip on a 900px
       viewport. Clearing would flicker the underline off and back on mid-transit,
       so the last state is HELD. */
    if (!active) return;

    const hash = '#' + active.id;
    if (hash === current) return;           // no redundant attribute writes
    current = hash;

    /* An active section with no nav link (#testimonials, #faq) clears every link
       rather than leaving a stale one lit: a wrong "you are here" is worse than
       none. */
    const on = byHash.get(hash);
    links.forEach((a) => {
      if (on && on.indexOf(a) !== -1) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) live.add(entry.target);
      else live.delete(entry.target);
    }
    paint();
  }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });

  sections.forEach((s) => io.observe(s));
}

/* ---------- refresh discipline ---------------------------------------- */

/* SPEC GAP (reconciliation): §5.4 mandates three hooks —
   contentvisibilityautostatechange, fonts.ready, window load — while the house
   pattern at surface-c.js:384 caps three ONE-SHOT refreshes. Both are honoured:
   the counter caps one-shots at 3 (fonts / hero portrait / load), and the
   content-visibility refresh is deliberately UNCOUNTED because it is repeatable
   by nature — sections realise as the reader scrolls — and is bounded by its
   150ms debounce instead. */

let refreshCount = 0;

function refreshOnce(reason) {
  if (!HAS_GSAP) return;
  refreshCount += 1;
  if (refreshCount > 3) { console.warn('[motion-a] refresh budget exceeded at ' + reason); return; }
  guard('refresh:' + reason, () => ScrollTrigger.refresh());
}

export function initRefreshDiscipline() {
  if (!motionReady()) return;

  guard('config', () => {
    /* The mobile URL bar collapsing mid-scroll fires a resize with a changed
       height; without this every flick re-measures every trigger. autoRefreshEvents
       is deliberately NOT narrowed the way surface-c narrows it — §5.4 relies on
       ScrollTrigger's own resize re-measurement, and this page ships no pin whose
       mis-measurement would be visible. */
    ScrollTrigger.config({ ignoreMobileResize: true });
    /* stops a GC pause or slow AVIF decode producing one huge catch-up delta */
    gsap.ticker.lagSmoothing(500, 33);
  });

  /* Seven sections carry content-visibility:auto, and a skipped subtree has NO
     layout boxes, so a trigger measuring inside one reads the reserved --cv-size
     rather than the real height. capture:true is mandatory, not cosmetic:
     contentvisibilityautostatechange does not bubble, but a non-bubbling event
     still traverses the capture phase from the root down, so a capturing listener
     on document is the only way to hear all seven from one place. Debounced
     through gsap.delayedCall so it rides the one rAF. */
  guard('refresh/cv', () => {
    const settle = gsap.delayedCall(0.15, () => ScrollTrigger.refresh()).pause();
    document.addEventListener('contentvisibilityautostatechange',
      () => settle.restart(true), { passive: true, capture: true });
  });

  /* Anton and Newsreader replace fallback metrics and move every start/end on an
     18,800px document. This is the refresh that matters most. */
  guard('refresh/fonts', () => {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refreshOnce('fonts'));
    else refreshOnce('fonts.unsupported');
  });

  /* The last above-fold image. It carries width/height inside an aspect-ratio
     frame so it should not move layout — this is the belt to those braces.
     decode() rejects on a broken image, hence the catch: a dead URL must never
     withhold the refresh. */
  guard('refresh/images', () => {
    const img = qs('.hero__portrait img');
    if (!img) { refreshOnce('images.none'); return; }
    if (img.complete) { refreshOnce('images.cached'); return; }
    if (img.decode) { img.decode().catch(() => undefined).then(() => refreshOnce('images')); return; }
    img.addEventListener('load', () => refreshOnce('images'), { once: true, passive: true });
    img.addEventListener('error', () => refreshOnce('images'), { once: true, passive: true });
  });

  window.addEventListener('load', () => refreshOnce('load'), { once: true, passive: true });
}

/* ---------- dev assertions -------------------------------------------- */

/* One-shot, on idle, warn-only. Each guards a cross-implementer contract that no
   single file can enforce alone. */
function assertContracts() {
  /* A transformed / perspective'd / filtered ancestor above [data-nav] silently
     demotes its position:fixed to absolute and kills its backdrop-filter.
     .hero__plate legitimately gains perspective for M2, so this confirms it never
     lands on the header's ancestor chain. */
  const header = qs('[data-nav]');
  if (header) {
    for (let n = header.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.transform !== 'none' || cs.perspective !== 'none' || cs.filter !== 'none') {
        console.warn('[motion-a] transformed ancestor above [data-nav]:', n,
          '— position:fixed and backdrop-filter are now broken.');
        break;
      }
    }
  }

  if (!HAS_GSAP) return;
  const all = ScrollTrigger.getAll();
  if (all.some((st) => st.pin)) {
    console.warn('[motion-a] a pinned ScrollTrigger exists. Pin spacing inside a ' +
      'content-visibility:auto section invalidates its --cv-size. Zero pins ship.');
  }
  if (all.length > 7) console.warn('[motion-a] ' + all.length + ' ScrollTriggers, budget 7.');
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
    console.warn('[motion-a] the document scrolls horizontally — a transform escaped its clip.');
  }
}

/* ---------- boot ------------------------------------------------------ */

/* Called from its OWN <script type="module">, separate from the one calling
   core.js's boot(). That separation is load-bearing: a 404 or syntax error here
   would abort the whole module that imported it, taking nav, reveal and the anim
   gate with it. */
export default function initMotion() {
  const run = (label, fn) => {
    try { fn(); } catch (err) { console.warn('[motion-a] ' + label + ' failed:', err); }
  };

  run('initScrollspy', initScrollspy);      // first, and outside every guard below

  try {
    if (REDUCED) return;        // live binding. Attach nothing: no tween, no
                                // listener, no class.
    if (!HAS_GSAP) return;      // silent — a console error is a visible artifact

    gsap.registerPlugin(ScrollTrigger);   // no-op in practice, but free, and it
                                          // throws on undefined — hence after

    /* THE ONLY PLACE THIS CLASS IS EVER ADDED, and it is never removed. Every
       .has-motion rule in motion-a.css goes live here and JS is now committed to
       writing the values those rules read; absent it, the page renders exactly as
       it does with JS off. */
    document.documentElement.classList.add('has-motion');

    run('initRefreshDiscipline', initRefreshDiscipline);

    run('initSheen', initSheen);            // above the fold, immediately
    run('initPortraitTilt', initPortraitTilt);
    run('initPortraitParallax', initPortraitParallax);
    run('initHeaderTuck', initHeaderTuck);

    /* SPEC GAP: below-fold work is deferred to onIdle. Creating four more
       ScrollTriggers forces a measurement pass exactly when the browser wants to
       paint the LCP portrait, and none is visible before the reader scrolls. A
       late trigger still renders its correct scrubbed progress on creation, so
       the worst case is a highlight up to 2s late — never a jump or a flash. */
    onIdle(() => {
      run('initBandVelocity', initBandVelocity);
      run('initLedgerSpines', initLedgerSpines);
      run('initFooterMark', initFooterMark);
      run('assertContracts', assertContracts);
    });
  } catch (err) {
    console.warn('[motion-a] init failed:', err);
  }
}

/* Exposed for §5.6's acceptance tests, which assert the refresh count and the
   instrument budget from the page rather than from the source. */
export { refreshCount, HAS_GSAP };

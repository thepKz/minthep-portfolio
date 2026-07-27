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
      /* INTEGRATION FIX — the spec's literal `top 92%` / `top 45%` are wrapped in
         ScrollTrigger's clamp(), which pins a resolved position inside
         [0, maxScroll] at every refresh and is a no-op whenever it already is.
         Without it M9 CANNOT FINISH, and the arithmetic is not close: [data-footer]
         is the last element on the page, so at maximum scroll its top can only ever
         reach `innerHeight - footerHeight`, while `top 45%` demands it reach
         `0.45 * innerHeight`. The mark therefore completes only where
         footerHeight >= 0.55 * innerHeight, and the footer measures a fixed 518px —
         i.e. only below a 941px viewport, and even at 900px by 23px, which the
         ~1.6k of content-visibility over-reservation eats before the reader lands.
         Measured at the true document bottom, --a-mark rested at 0 (760px),
         0.128 (900px), 0.728 (1080px) and 0.748 (1200px): on every desktop the
         giant aria-hidden MINTHEP stayed permanently half-clipped, WORSE than the
         JS-off baseline, whose resting value is the finished 1. */
      scrollTrigger: {
        trigger: footer,
        start: 'clamp(top 92%)',
        end: 'clamp(top 45%)',
        scrub: 0.6,
      },
    });
}

/* ---------- M11-M15 · section signatures ------------------------------- */

/* WHY THESE FIVE EXIST, measured before a line was written: the page shipped 7
   ScrollTriggers and 5 of them served the hero, the experience ledger and the
   footer. #skills, #service and #testimonials had exactly ONE effect each and it
   was the SAME one — the shared 18px [data-reveal] fade. #faq and #contact had
   none at all. Five of eight sections were one beat repeated; the last two were
   silence.

   THE SHAPE IS IDENTICAL FIVE TIMES, deliberately: one fromTo, one unitless
   number, one scrub trigger, no pin, no toggleActions, no onEnter. All the
   choreography lives in CSS (motion-a.css §10), where each child derives its own
   0..1 from the group number via clamp() and :nth-child(). That is what buys
   "one section at a time" for ONE trigger instead of four.

   fromTo AND NEVER to. §2's rule: the CSS resting value of every one of these is
   the FINISHED state (--a-read 1, --a-svc 4, --a-quote 1, --a-faq 6, --a-close
   1), so a `to` tween would read the finished value as its start and animate
   nowhere. fromTo states the 0 explicitly and never reads computed style.

   NEVER toggleActions HERE. Measured: one-shot probes on #faq and #contact both
   fired onEnter at the same scrollY — the document maximum at that instant —
   because the document collapsed under them as content-visibility sections
   realised. A scrub recomputes progress from corrected start/end on the next
   frame, so the worst case is a single wrong frame rather than a fire that is
   missed or doubled. §5.4's contentvisibilityautostatechange refresh is what
   corrects it, and it already exists.

   AFFORDABLE BECAUSE THE SIGNATURE WINDOWS DO NOT OVERLAP EACH OTHER. Read off
   ScrollTrigger.getAll() at 1440x900 with every [data-cv=section] forced
   visible, so these are real coordinates:

     skills        826 -  3942   (3116px)
     service     12083 - 12866   ( 783px)   gap 238px
     testimonials 13113 - 13878  ( 765px)   gap 247px
     faq         14223 - 14912   ( 689px)   gap 345px
     contact     15093 - 15658   ( 565px)   gap 181px    maxScroll 15953

   THE NUMBERS THAT USED TO BE HERE WERE PRE-REALISATION AND FALSE. They put
   service at 13636 and contact at 18620-19185 — a window ending 2,667px past a
   maxScroll of 15953, i.e. a stretch of document that does not exist. They were
   captured while the later content-visibility sections were still standing at
   their contain-intrinsic-size reservations rather than their real heights,
   which inflates every coordinate below the first skipped section. skills is
   the one row that survived unchanged, because it sits above all of them. Read
   them the way this table now is: crawl the document end to end first, or force
   [data-cv=section] visible, THEN ask ScrollTrigger.

   AND "AT MOST ONE IS EVER ACTIVE" WAS FALSE TOO, so it is gone. The five
   signature windows genuinely do not overlap one another — but the real dead
   air between them is 238/247/345/181px, not the 925/968/855px claimed, and
   #contact overlaps the footer wordmark trigger by 151px (footer 15507-15930).
   Over that 151px two scrubs run together. Elsewhere #experience's three spine
   triggers overlap each other by design, so four ScrollTriggers can be live at
   once counting the two page-level ones. None of that is a problem — every one
   of these is a single unitless-number tween with no layout read, no pin and no
   toggleActions, which is the entire reason the budget survives concurrency —
   but the file should not tell the next reader a serialisation guarantee it
   does not have. Baseline headroom is real and unchanged: 860 rAF samples
   across a full scripted scroll gave p50 8.3ms / p99 11.1ms, with 2 frames over
   16.7ms.

   THESE COORDINATES DRIFT WITH LAYOUT. Any change to section heights above a
   row moves that row. Re-read them, do not adjust them by hand. */

/* M11 · skills read-head. 3044px of ledger used to get one 350ms fade and then
   ~2400px of nothing. */
export function initSkillsRead() {
  if (!motionReady()) return;
  const list = qs('.ledger-skills');
  if (!list) return;

  gsap.fromTo(list,
    { '--a-read': 0 },
    {
      '--a-read': 1,
      ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 78%', end: 'bottom 70%', scrub: 0.6 },
    });
}

/* M12 · service hairlines, one after another. 0->4, not 0->1: CSS subtracts each
   row's :nth-child index and clamps, so row n gets its whole ramp while the
   number crosses n->n+1. */
export function initServiceRun() {
  if (!motionReady()) return;
  const list = qs('.services');
  if (!list) return;

  gsap.fromTo(list,
    { '--a-svc': 0 },
    {
      '--a-svc': 4,
      ease: 'none',
      /* A 782px window, under one viewport, so it reads as punchy rather than
         as something the reader has to drag through. */
      scrollTrigger: { trigger: list, start: 'top 85%', end: 'bottom 60%', scrub: 0.6 },
    });
}

/* M13 · testimonial quote marks bloom. Stays 0->1; CSS multiplies by 3 to give
   each of the three marks its own full ramp. */
export function initQuoteBloom() {
  if (!motionReady()) return;
  const list = qs('.quotes');
  if (!list) return;

  gsap.fromTo(list,
    { '--a-quote': 0 },
    {
      '--a-quote': 1,
      ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 82%', end: 'bottom 65%', scrub: 0.6 },
    });
}

/* M14 · FAQ markers snap into place. The section had zero scroll motion of any
   kind; a reader who did not click saw nothing move. */
export function initFaqCascade() {
  if (!motionReady()) return;
  const faq = qs('.faq');
  if (!faq) return;

  gsap.fromTo(faq,
    { '--a-faq': 0 },
    {
      '--a-faq': 6,
      ease: 'none',
      scrollTrigger: { trigger: faq, start: 'top 85%', end: 'bottom 62%', scrub: 0.6 },
    });
}

/* M15 · contact close. The last content section and previously the deadest.
   Ends as the three CTAs reach viewport centre. */
export function initContactClose() {
  if (!motionReady()) return;
  const shell = qs('#contact .shell--narrow');
  if (!shell) return;

  gsap.fromTo(shell,
    { '--a-close': 0 },
    {
      '--a-close': 1,
      ease: 'none',
      scrollTrigger: { trigger: shell, start: 'top 80%', end: 'bottom 55%', scrub: 0.6 },
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

/* A REFRESH MUST NEVER RUN WHILE THE PAGE IS MOVING.
   ScrollTrigger.refresh() restores the scroll position by writing scrollTop, and
   writing scrollTop cancels an in-flight NATIVE smooth scroll. base.css:392 sets
   scroll-behavior: smooth on <html>, so every nav click and every
   scrollTo({behavior:'smooth'}) starts one of those.

   Measured, three arms against the same click on a[href="#portfolio"] (needing
   4712px):
     refresh left alone   travelled  324px, stopped at 162ms — refresh ran at 162ms
     refresh stubbed out  travelled 4536px, landed at the correct 158px offset
     programmatic control travelled 3750px, stopped at 498ms — refresh ran at 498ms
   The scroll dies at the exact millisecond of the refresh in every arm, and the
   control proves this is not about nav links: it is every smooth scroll on the
   page. Before this guard, clicking a nav item moved the reader 7% of the way to
   the section and stopped dead.

   So the position is sampled, not trusted: each scroll event stamps lastScrollAt,
   and a refresh requested within QUIET_MS of one is re-armed instead of run. The
   timer restarts on every subsequent scroll, so the re-measure lands once the page
   has actually been still — after the smooth scroll has completed, which is both
   the safe moment and the correct one, since that is when the layout it measures
   has stopped changing. QUIET_MS sits above the ~16ms scroll-event cadence (so an
   ordinary wheel gesture keeps deferring rather than slipping through between
   events) and below the 150ms content-visibility debounce that used to fire
   mid-flight.

   Deliberately NOT starvation-capped. A reader scrolling continuously is the one
   case where a stale start/end costs nothing — ScrollTrigger keeps updating
   progress on the triggers it already has — and forcing a refresh through mid-
   gesture would reintroduce the cancellation this exists to prevent. */
const QUIET_MS = 120;
let lastScrollAt = -1e9;
let quietRefresh = null;          // gsap.delayedCall, created in initRefreshDiscipline

function safeRefresh(reason) {
  if (!HAS_GSAP) return;
  /* quietRefresh is null only if a refresh is requested before
     initRefreshDiscipline has run, i.e. before any scroll listener exists and
     therefore before any smooth scroll can be in flight — refresh immediately. */
  if (quietRefresh && performance.now() - lastScrollAt < QUIET_MS) {
    quietRefresh.restart(true);
    return;
  }
  guard('refresh:' + (reason || 'safe'), () => ScrollTrigger.refresh());
}

function refreshOnce(reason) {
  if (!HAS_GSAP) return;
  refreshCount += 1;
  if (refreshCount > 3) { console.warn('[motion-a] refresh budget exceeded at ' + reason); return; }
  safeRefresh(reason);
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
  /* Arms the quiet-scroll gate above. Both the listener and the timer have to
     exist before anything can request a refresh, so this runs first. The timer
     re-enters safeRefresh rather than calling ScrollTrigger.refresh() directly:
     if the reader is still moving when it elapses, that re-entry re-arms it
     again, which is what makes the gate hold for a whole gesture instead of just
     one frame. */
  guard('refresh/gate', () => {
    quietRefresh = gsap.delayedCall(QUIET_MS / 1000, () => safeRefresh('quiet')).pause();
    window.addEventListener('scroll', () => { lastScrollAt = performance.now(); },
      { passive: true });
  });

  guard('refresh/cv', () => {
    const settle = gsap.delayedCall(0.15, () => safeRefresh('cv')).pause();
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
  /* Raised 7 -> 12 for the five §10 section signatures (M11-M15), deliberately
     and not because the old number was inconvenient. The pin assertion directly
     above is the one that actually protects --cv-size and is untouched: this
     number is a cost ceiling, that one is a correctness invariant. Twelve is
     affordable because the five new windows do not overlap — at most one is
     active at any scroll position — and because the page measured p99 11.1ms
     over 860 frames before they were added. */
  if (all.length > 12) console.warn('[motion-a] ' + all.length + ' ScrollTriggers, budget 12.');
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
    console.warn('[motion-a] the document scrolls horizontally — a transform escaped its clip.');
  }
}

/* ---------- anchor scrolling ------------------------------------------ */

/* WHY THIS EXISTS AT ALL, given base.css:392 already sets scroll-behavior:smooth.
   A native smooth scroll resolves its destination to an absolute pixel offset ONCE,
   at the moment of the click, and then flies to that number. On a page with seven
   content-visibility:auto sections that is a false assumption: the sections between
   the reader and the target realise as they are passed, each replacing its
   --cv-size reservation with its true height, and the document changes length
   UNDER the in-flight animation. The destination has moved; the animation has not
   heard about it.

   Measured at 1440x900, clicking each nav item and reading the section's position
   after everything settled — a correct landing is +158, i.e. scroll-padding-top
   below the viewport top:
     #skills      158   ok, nothing realises in between
     #portfolio   158   ok
     #experience -776   overshot by 934px
     #contact    -360   overshot
     #service   +2048   undershot by 1890px
   The error grows with distance because distance is how many sections get to
   change size mid-flight. Deep-linking to /#testimonials on a cold load did not
   scroll at all.

   So the destination is re-resolved EVERY FRAME from the live element box instead
   of once up front, and the easing is applied to the gap that remains rather than
   to a fixed span. Reflow mid-flight then costs a few pixels of path curvature
   instead of a thousand pixels of final error.

   Native smooth scrolling is suppressed for the duration (scroll-behavior:auto)
   because our per-frame scrollTo would otherwise be re-animated by the browser,
   stacking two easings and landing somewhere neither intends. It is restored in
   finish() including on every early exit. */

const SCROLL_MIN_MS = 420;
const SCROLL_MAX_MS = 900;

export function initAnchorScroll() {
  const root = document.documentElement;

  /* The offset a correct landing sits at. Read live rather than cached: the
     header tucks as the page scrolls, --nav-h shrinks with it, and
     scroll-padding-top follows — 158 at rest, 88 once tucked. Reading it at
     click time and holding it would land every deep scroll 70px off. */
  const padTop = () => {
    const v = parseFloat(getComputedStyle(root).scrollPaddingTop);
    return Number.isFinite(v) ? v : 0;
  };
  const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
  const targetY = (el) =>
    Math.min(maxScroll(), Math.max(0, el.getBoundingClientRect().top + window.scrollY - padTop()));

  let active = null;   // the in-flight scroll, so a second click supersedes the first

  const finish = (el, hash) => {
    active = null;
    root.style.scrollBehavior = '';
    if (!el) return;
    /* pushState, not location.hash: assigning the hash makes the browser perform
       its own jump to the position we just carefully arrived at. This keeps the
       URL bookmarkable and the back button working — C3, route preservation —
       without a second scroll. */
    try { history.pushState(null, '', hash); } catch { /* file:// */ }
    /* Keyboard and screen-reader users must land ON the section, not merely near
       it. tabindex is removed again on blur so the section never becomes a
       lingering tab stop for mouse users. */
    if (!el.hasAttribute('tabindex')) {
      el.setAttribute('tabindex', '-1');
      el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true });
    }
    el.focus({ preventScroll: true });
    /* Arriving is not the end of the job on a content-visibility page. Keep the
       aim true for a bounded window afterwards, driven by document resizes
       rather than by a clock. Applied to BOTH paths — a click is already clean
       at every tested viewport, but nothing about a click makes it immune to a
       late-loading image changing the layout above the reader. */
    holdAim(el);
  };

  /* Reduced motion and the no-GSAP path both want an instant landing — but a
     single scrollTo is exactly the thing that misses, because the sections it
     jumps past realise only after it has arrived. So it re-aims a few frames in a
     row and stops as soon as two consecutive frames agree.

     TWO CONSECUTIVE FRAMES IS NOT ENOUGH, measured. A cold deep link to #faq at
     1440x900 agreed at frame 4, finished, and then drifted to 607px above the
     viewport top as the sections above it went on realising. content-visibility
     realisation is asynchronous and arrives in bursts, so a quiet pair of frames
     proves nothing about the next burst. Hold the aim for SETTLE_MIN_MS — chosen
     above the 150ms debounce on the contentvisibilityautostatechange refresh, so
     at least one full realise-and-remeasure cycle is inside the window — and only
     then let stability end it. */
  const SETTLE_MIN_MS = 700;
  const SETTLE_MAX_FRAMES = 110;

  /* AND 700ms IS STILL NOT ENOUGH FOR A COLD DEEP LINK. Measured after the
     window above was added: WARM clicks went clean at 1440x900, 1280x800 and
     390x844, but a cold /#faq at 1280 still settled 613px low and a cold
     /#testimonials 571px low, always OVERSHOOTING — the sections above the
     target go on realising and shrinking long after any fixed timeout.

     So stop guessing a duration and watch the actual cause. A ResizeObserver on
     <html> fires exactly when the document's box changes and its callback runs
     after layout and before paint, which is the correct moment to re-aim: no
     polling, no extra rAF, and above all no per-frame read of
     documentElement.scrollHeight, which would force a layout on every frame and
     keep the page churning — the same mistake that once made a settled page look
     like it never settled.

     The hold is bounded and yields instantly to the reader, because a correction
     the reader did not ask for is worse than a landing that is slightly off.

     THE BOUND IS A QUIET WINDOW, NOT A CLOCK, and that distinction is the whole
     lesson of this function. The first version stopped after a flat 2600ms and
     measured far better than the fixed timeouts before it — cold /#faq at 1280
     went from 613px low to exact — but cold /#testimonials still finished 107px
     out, because realisation was simply still running when the clock expired. A
     wall-clock deadline can only ever be a guess about how long other work takes.
     So the ResizeObserver that already fires on every document-box change now
     also resets the countdown: the hold ends once the document has been the same
     size for HOLD_QUIET_MS, which is the actual condition being waited for.
     HOLD_MAX_MS survives only as a backstop against a page that never stops
     resizing — an infinite hold would fight the reader forever. */
  const HOLD_QUIET_MS = 900;
  const HOLD_MAX_MS = 6000;

  const holdAim = (el) => {
    if (typeof ResizeObserver !== 'function') return;
    let wrote = Math.round(window.scrollY);
    let ro = null;
    let quiet = 0;
    let hard = 0;
    const stop = () => {
      if (ro) { ro.disconnect(); ro = null; }
      if (quiet) { clearTimeout(quiet); quiet = 0; }
      if (hard) { clearTimeout(hard); hard = 0; }
      document.removeEventListener('contentvisibilityautostatechange', reaim, true);
    };
    function reaim() {
      /* The reader wins, always. If the page is not where this left it, a wheel,
         a swipe or a key moved it and any correction now would be a fight. */
      if (Math.abs(window.scrollY - wrote) > 2) { stop(); return; }
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(stop, HOLD_QUIET_MS);
      const y = targetY(el);
      if (Math.abs(y - window.scrollY) < 1) return;
      window.scrollTo(0, y);
      wrote = Math.round(window.scrollY);
    }
    ro = new ResizeObserver(reaim);
    ro.observe(document.documentElement);
    document.addEventListener('contentvisibilityautostatechange', reaim,
      { capture: true, passive: true });
    quiet = setTimeout(stop, HOLD_QUIET_MS);
    hard = setTimeout(stop, HOLD_MAX_MS);
  };

  const settleJump = (el, hash) => {
    root.style.scrollBehavior = 'auto';
    let last = NaN, n = 0, riding = false, wrote = -1;
    const t0 = performance.now();
    const step = () => {
      /* Yield the moment the reader takes over. If the page is not where this
         loop last put it, a wheel, a swipe or a key moved it, and continuing
         would be a fight the reader must lose. */
      if (wrote >= 0 && Math.abs(window.scrollY - wrote) > 2) {
        if (riding) { riding = false; gsap.ticker.remove(step); }
        finish(el, hash);
        return;
      }
      const y = targetY(el);
      window.scrollTo(0, y);
      wrote = Math.round(window.scrollY);
      const held = Math.abs(y - last) <= 1 && performance.now() - t0 >= SETTLE_MIN_MS;
      if (held || ++n > SETTLE_MAX_FRAMES) {
        if (riding) { riding = false; gsap.ticker.remove(step); }
        finish(el, hash);
        return;
      }
      last = y;
      if (riding) return;   // already driven by the ticker; do not double-schedule
      /* INTEGRATION FIX — this used to be a raw requestAnimationFrame loop, which
         §5.1 forbids: one rAF for the whole page and gsap.ticker is it. Two of the
         four callers (the cold deep-link re-aim and hashchange) run with GSAP
         loaded and motion live, so that loop really was a second rAF racing the
         ticker. It now rides the ticker whenever there is one. The raw rAF is kept
         and is still reachable, but only on the no-GSAP path — where there is no
         ticker to ride and therefore no second loop to be a second of. The first
         step stays synchronous either way, so the landing timing is unchanged. */
      if (HAS_GSAP) { riding = true; gsap.ticker.add(step); }
      else requestAnimationFrame(step);
    };
    step();
  };

  const glide = (el, hash) => {
    const startY = window.scrollY;
    const distance = Math.abs(targetY(el) - startY);
    if (distance < 2) { finish(el, hash); return; }
    /* Duration scales with distance but is clamped: a full-page jump that took
       proportional time would feel broken, and a short hop that took the full
       time would feel syrupy. */
    const dur = Math.min(SCROLL_MAX_MS, Math.max(SCROLL_MIN_MS, distance * 0.35));
    const t0 = performance.now();
    root.style.scrollBehavior = 'auto';

    const me = {};
    active = me;
    const tick = () => {
      /* INTEGRATION FIX — superseded meant "stop steering", but the callback was
         left on the ticker forever: it returned early every frame for the rest of
         the session, and a second dead callback joined it on the next superseded
         click. §5.1 budgets one rAF for the whole page, so an unbounded pile of
         no-op listeners on it is exactly the leak that budget exists to prevent.
         Two nav clicks in quick succession is the ordinary way to hit this. */
      if (active !== me) { gsap.ticker.remove(tick); return; }   // superseded by a newer click
      const p = Math.min(1, (performance.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);            // easeOutCubic
      /* The live re-read. `to` is whatever the destination is RIGHT NOW, so a
         section realising this frame is absorbed into the remaining path. */
      const to = targetY(el);
      window.scrollTo(0, startY + (to - startY) * eased);
      if (p >= 1) { gsap.ticker.remove(tick); window.scrollTo(0, targetY(el)); finish(el, hash); }
    };
    gsap.ticker.add(tick);   // §5.1: one rAF for the whole page, and this rides it
  };

  const go = (el, hash) => ((REDUCED || !HAS_GSAP) ? settleJump(el, hash) : glide(el, hash));

  document.addEventListener('click', (e) => {
    /* Never swallow a modified click — ctrl/cmd/shift/middle all mean "open
       elsewhere", and defaultPrevented means another handler already owns it. */
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (!hash || hash === '#') return;
    let el = null;
    try { el = document.querySelector(hash); } catch { return; }   // '#' + weird id
    if (!el) return;
    e.preventDefault();
    go(el, hash);
  }, { passive: false });

  /* A cold deep link (/#experience) has the same problem and one more: the
     browser performs its jump before the sections below have any layout at all,
     so it can land nowhere near the target — /#testimonials did not move at all.
     Re-aim once the page has settled. Deliberately silent when there is no hash. */
  const arrive = () => {
    if (!location.hash || location.hash === '#') return;
    let el = null;
    try { el = document.querySelector(location.hash); } catch { return; }
    if (el) settleJump(el, location.hash);
  };
  if (document.readyState === 'complete') onIdle(arrive);
  else window.addEventListener('load', () => onIdle(arrive), { once: true });

  /* Back/forward between in-page anchors must land correctly too. */
  window.addEventListener('hashchange', () => {
    if (active) return;
    let el = null;
    try { el = location.hash && location.hash !== '#' ? document.querySelector(location.hash) : null; } catch { return; }
    if (el) settleJump(el, location.hash);
  }, { passive: true });
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

  /* Also outside the guards, and deliberately ABOVE the REDUCED and HAS_GSAP
     returns: landing on the section you asked for is correctness, not decoration.
     Both of those paths are handled inside as an instant, re-aimed jump. */
  run('initAnchorScroll', initAnchorScroll);

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

      /* §10 section signatures. Deferred with the rest for the same reason:
         none is visible before the reader scrolls, and creating them eagerly
         would force a measurement pass exactly when the browser wants to paint
         the LCP portrait. Every one is a scrub, so a late creation still renders
         its correct progress immediately — there is no fire to miss. */
      run('initSkillsRead', initSkillsRead);
      run('initServiceRun', initServiceRun);
      run('initQuoteBloom', initQuoteBloom);
      run('initFaqCascade', initFaqCascade);
      run('initContactClose', initContactClose);

      /* INTEGRATION FIX — the deferral above opened a hole in §5.4's refresh
         discipline. requestIdleCallback lands AFTER all three one-shot refreshes
         (fonts / hero image / load) have been spent, so the five triggers just
         created are measured exactly once, at construction, against whatever
         layout exists in that idle slot — and four of them sit inside
         content-visibility:auto sections that may have no layout boxes at that
         instant. Measured over ten cold loads with the cache disabled, the first
         ol[data-spine] took start:-702 instead of 10619 on SEVEN of them: the
         trigger began 702px above the top of the document, so --a-spine read
         0.058 at scroll 0 and the rule drew itself almost fully before the reader
         ever reached it. Nothing ever corrected it, because every later refresh
         is a re-measure of a trigger set that had already been mis-measured and
         no further refresh was scheduled.
         Uncounted, exactly like the content-visibility refresh, and for the same
         reason: it answers this file's own deferral rather than an external asset
         settling, so it must not consume the one-shot budget. Routed through
         gsap.delayedCall so it rides the single ticker (§5.1) and lands one beat
         after ScrollTrigger's own queued post-create refresh, making it the last
         word on every start/end. */
      guard('refresh/deferred', () => gsap.delayedCall(0.2, () => safeRefresh('deferred')));

      run('assertContracts', assertContracts);
    });
  } catch (err) {
    console.warn('[motion-a] init failed:', err);
  }
}

/* Exposed for §5.6's acceptance tests, which assert the refresh count and the
   instrument budget from the page rather than from the source. */
export { refreshCount, HAS_GSAP };

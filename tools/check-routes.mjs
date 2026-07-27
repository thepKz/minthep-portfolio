#!/usr/bin/env node
/**
 * tools/check-routes.mjs — CI route + link verifier for minthep-portfolio.
 *
 * Zero dependencies. Node 24 ESM. Never runs at deploy time; it is a gate only.
 * Run:  node tools/check-routes.mjs
 *       node tools/check-routes.mjs --skip=F        (skip one check)
 *       node tools/check-routes.mjs --skip=B,F,G    (skip several)
 *       node tools/check-routes.mjs --only=A,C      (run only these)
 *       node tools/check-routes.mjs --quiet         (summary table only)
 *
 * Why each check exists — all eight are live production bugs or near-misses:
 *
 *   A  A frozen route disappeared. The site is a GitHub Pages *project page* with real
 *      organic traffic on 223 indexed URLs. A removed/renamed file is an unrecoverable 404.
 *   B  A local href/src/url()/import does not resolve CASE-EXACTLY on a case-sensitive
 *      filesystem. macOS APFS is case-insensitive, GitHub Pages' Linux box is not, so
 *      `Histogram.webp` referenced as `histogram.webp` renders fine locally and 404s in
 *      production. Two images are broken in production today for exactly this reason.
 *      Both spellings of those two images are committed (same blob), which a
 *      case-insensitive volume cannot show; on such a volume this check reads the git
 *      index as well, so it agrees with what the Linux runner actually serves.
 *   C  A root-absolute path. The site is served from /minthep-portfolio/, so href="/css/x.css"
 *      resolves to https://thepkz.github.io/css/x.css — an instant sitewide 404.
 *   D  A surviving reference to a banned third party: dead CDNs, abandoned libraries, and
 *      tracking pixels. res.cloudinary.com is explicitly ALLOWED (owner's own account).
 *      Comments are stripped first — naming a library in prose that explains why it was
 *      removed is the opposite of shipping it — and only files a page actually loads are
 *      scanned, since unreferenced kept-on-disk files are never downloaded.
 *   E  A CNAME file at the repo root. Adding one rewrites the base path from
 *      /minthep-portfolio/ to / and 404s every indexed URL at once.
 *   F  An <img> without both width and height — layout shift, and CLS is a ranking factor.
 *   G  A colour / size / z-index literal inside a css/surface-*.css file. The three surfaces
 *      only read as one system because every one of those values comes from css/tokens.css.
 *   H  A referenced file exists on disk but not in the git index. Pages deploys the COMMIT,
 *      not the working tree, so an uncommitted stylesheet is a 404 in production while every
 *      other check above — all of which read the working tree — still says PASS. This is the
 *      state of the repo right now: index.html is tracked and links six untracked stylesheets.
 *
 * Exit code: 0 = all non-skipped checks passed. 1 = at least one violation. 2 = harness error.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, resolve, relative, sep, posix } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

const ALL_CHECKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const CHECK_TITLES = {
  A: 'Frozen routes still exist',
  B: 'Local refs resolve, case-exact',
  C: 'No root-absolute local paths',
  D: 'No banned third-party refs',
  E: 'No CNAME at repo root',
  F: '<img> has width + height',
  G: 'surface-*.css has no literals',
  H: 'Referenced files are committed',
};

function parseArgv(argv) {
  const opts = { skip: new Set(), only: null, quiet: false };
  for (const arg of argv) {
    if (arg === '--quiet' || arg === '-q') {
      opts.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg.startsWith('--skip=')) {
      for (const id of arg.slice(7).split(',')) {
        const k = id.trim().toUpperCase();
        if (k) opts.skip.add(k);
      }
    } else if (arg.startsWith('--only=')) {
      opts.only ??= new Set();
      for (const id of arg.slice(7).split(',')) {
        const k = id.trim().toUpperCase();
        if (k) opts.only.add(k);
      }
    } else {
      console.error(`check-routes: unknown argument "${arg}" (try --help)`);
      process.exit(2);
    }
  }
  return opts;
}

function usage() {
  console.log('Usage: node tools/check-routes.mjs [--skip=A,B] [--only=C] [--quiet]\n');
  console.log('Checks:');
  for (const id of ALL_CHECKS) console.log(`  ${id}  ${CHECK_TITLES[id]}`);
  console.log('\nExit 0 = clean, 1 = violations found, 2 = harness error.');
}

const opts = parseArgv(process.argv.slice(2));
if (opts.help) {
  usage();
  process.exit(0);
}
for (const id of [...opts.skip, ...(opts.only ?? [])]) {
  if (!ALL_CHECKS.includes(id)) {
    console.error(`check-routes: "${id}" is not a check id. Valid: ${ALL_CHECKS.join(', ')}`);
    process.exit(2);
  }
}
const enabled = (id) => !opts.skip.has(id) && (opts.only === null || opts.only.has(id));

/* ------------------------------------------------------------------ *
 * Filesystem index — built from readdir, so every lookup is case-EXACT
 * even when this runs on a case-insensitive macOS volume.
 * ------------------------------------------------------------------ */

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.cache']);

const FILES = new Set(); // posix-relative paths of real files
const DIRS = new Set(); // posix-relative paths of real directories

function walk(absDir, relDir) {
  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const relPath = relDir ? posix.join(relDir, ent.name) : ent.name;
    const absPath = join(absDir, ent.name);
    if (ent.isSymbolicLink()) {
      // Follow it only far enough to classify; never recurse through it.
      let st;
      try {
        st = statSync(absPath);
      } catch {
        continue;
      }
      if (st.isDirectory()) DIRS.add(relPath);
      else FILES.add(relPath);
      continue;
    }
    if (ent.isDirectory()) {
      if (IGNORED_DIRS.has(ent.name)) continue;
      DIRS.add(relPath);
      walk(absPath, relPath);
    } else if (ent.isFile()) {
      FILES.add(relPath);
    }
  }
}
walk(ROOT, '');

/* ------------------------------------------------------------------ *
 * Case-insensitive-volume fallback for check B.
 *
 * macOS APFS cannot physically hold `Histogram.webp` and `histogram.webp`
 * side by side, but git's index — and therefore the case-SENSITIVE Linux box
 * that actually serves the site — holds both, pointing at the same blob.
 * readdirSync only ever sees one of the pair, so on macOS check B invents a
 * CASE MISMATCH for a URL that returns 200 in production.
 *
 * So: when the local volume is case-insensitive, treat `git ls-files` as the
 * additional source of truth for what exists. Purely additive — nothing is
 * ever removed from FILES/DIRS, so a genuinely missing file still fails.
 * On the ubuntu CI runner this whole block is a no-op and readdir rules.
 * ------------------------------------------------------------------ */

const FILES_EXTRA = new Set(); // in the git index but not visible to readdir
const DIRS_EXTRA = new Set();

function volumeIsCaseInsensitive() {
  const self = basename(fileURLToPath(import.meta.url));
  const flipped = /[a-z]/.test(self) ? self.toUpperCase() : self.toLowerCase();
  if (flipped === self) return false;
  try {
    return existsSync(join(HERE, flipped));
  } catch {
    return false;
  }
}

const CASE_INSENSITIVE_FS = volumeIsCaseInsensitive();

/* The git index, read once. Two checks need it for different reasons: B wants
   it as an ADDITIONAL source of truth about what exists (above), H wants it as
   the ONLY source of truth about what deploys (below). Empty when git is
   absent or this is not a work tree, which both checks treat as "no opinion". */
let TRACKED_LIST = [];
try {
  TRACKED_LIST = execFileSync('git', ['ls-files', '-z'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .split('\0')
    .filter(Boolean);
} catch {
  TRACKED_LIST = []; // no git, or not a work tree
}
const TRACKED = new Set(TRACKED_LIST);
const GIT_READABLE = TRACKED_LIST.length > 0;

if (CASE_INSENSITIVE_FS) {
  for (const p of TRACKED_LIST) {
    if (FILES.has(p)) continue;
    if (p.split('/').some((seg) => IGNORED_DIRS.has(seg))) continue;
    FILES_EXTRA.add(p);
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) {
      const d = parts.slice(0, i).join('/');
      if (!DIRS.has(d)) DIRS_EXTRA.add(d);
    }
  }
}

/** Does this posix-relative path exist on the *deployed* (case-sensitive) site? */
const hasFile = (p) => FILES.has(p) || FILES_EXTRA.has(p);
const hasDir = (p) => DIRS.has(p) || DIRS_EXTRA.has(p);

const filesByExt = (...exts) =>
  [...FILES].filter((f) => exts.some((e) => f.toLowerCase().endsWith(e))).sort();

const HTML_FILES = filesByExt('.html');
const CSS_FILES = filesByExt('.css');

/* ------------------------------------------------------------------ *
 * Small text helpers
 * ------------------------------------------------------------------ */

const read = (relPath) => readFileSync(join(ROOT, relPath.split('/').join(sep)), 'utf8');

/** Returns fn(charIndex) -> 1-based line number. */
function locator(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** Replace every regex match with spaces, keeping newlines so offsets & lines survive. */
function blankOut(text, re) {
  return text.replace(re, (m) => m.replace(/[^\n]/g, ' '));
}

const stripHtmlComments = (t) => blankOut(t, /<!--[\s\S]*?-->/g);
const stripCssComments = (t) => blankOut(t, /\/\*[\s\S]*?\*\//g);

/**
 * Blank out JS comments while leaving every string literal intact, so a real
 * `import "https://cdn…/jquery.js"` is still seen but `// we dropped jquery`
 * is not. Length is preserved character-for-character, newlines included, so
 * every byte offset — and therefore every reported line number — is unchanged.
 *
 * Regex literals are recognised with the usual previous-significant-token
 * heuristic, and only when the closing `/` is on the same line; that bounds a
 * misread to a single line and stops `/\/\//` from looking like a comment.
 */
function stripJsComments(text) {
  const n = text.length;
  const out = text.split('');
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  const REGEX_PREV = new Set('(,=:[!&|?{};+-*%~^<>'.split(''));
  let prevSig = ''; // last non-whitespace char of real code

  for (let i = 0; i < n; ) {
    const c = text[i];
    const d = text[i + 1];

    if (c === '/' && d === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (c === '/' && d === '/') {
      let end = text.indexOf('\n', i);
      if (end === -1) end = n;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n) {
        if (text[j] === '\\') j += 2;
        else if (text[j] === c) {
          j++;
          break;
        } else j++;
      }
      i = Math.min(j, n);
      prevSig = c;
      continue;
    }
    if (c === '/' && (prevSig === '' || REGEX_PREV.has(prevSig))) {
      // Possible regex literal. Only accept one that closes on this line.
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n && text[j] !== '\n') {
        const ch = text[j];
        if (ch === '\\') {
          j += 2;
          continue;
        }
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) {
          closed = true;
          j++;
          break;
        }
        j++;
      }
      if (closed) {
        i = j;
        prevSig = '/';
        continue;
      }
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return out.join('');
}

/** Blank out the comments of one file, chosen by extension. Offsets survive. */
function stripCommentsFor(file, text) {
  const f = file.toLowerCase();
  if (f.endsWith('.css')) return stripCssComments(text);
  if (f.endsWith('.js') || f.endsWith('.mjs')) return stripJsComments(text);
  if (f.endsWith('.html') || f.endsWith('.htm')) {
    let src = stripHtmlComments(text);
    // Inline <style> and <script> carry their own comment syntax.
    src = src.replace(
      /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
      (_m, open, body, close) => open + stripCssComments(body) + close
    );
    src = src.replace(
      /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi,
      (_m, open, body, close) => open + stripJsComments(body) + close
    );
    return src;
  }
  return text;
}

/* ------------------------------------------------------------------ *
 * Reference extraction
 * ------------------------------------------------------------------ */

const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i; // http:, https:, mailto:, tel:, data:, javascript:, blob:, //cdn
const REF_ATTRS = new Set(['href', 'src', 'xlink:href', 'poster', 'data-src', 'data-href']);
const SRCSET_ATTRS = new Set(['srcset', 'imagesrcset', 'data-srcset']);

/**
 * One extracted reference.
 * @typedef {{file:string, line:number, raw:string, attr:string}} Ref
 */

/** Pull every local-ish reference out of an HTML file. */
function refsFromHtml(file) {
  const raw = read(file);
  const at = locator(raw);
  const src = stripHtmlComments(raw);
  /** @type {Ref[]} */
  const refs = [];

  // Element attributes. The tag matcher steps over quoted values so a `>` inside
  // an attribute (alt="a > b") cannot truncate the tag.
  const tagRe = /<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  const attrRe = /([a-zA-Z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let tag;
  while ((tag = tagRe.exec(src)) !== null) {
    const attrsText = tag[2];
    const attrsOffset = tag.index + 1 + tag[1].length;
    let a;
    attrRe.lastIndex = 0;
    while ((a = attrRe.exec(attrsText)) !== null) {
      const name = a[1].toLowerCase();
      const value = a[2] ?? a[3] ?? a[4] ?? '';
      const line = at(attrsOffset + a.index);
      if (REF_ATTRS.has(name)) {
        refs.push({ file, line, raw: value, attr: name });
      } else if (SRCSET_ATTRS.has(name)) {
        // Candidates are comma + whitespace separated. Cloudinary transform
        // segments (f_auto,q_auto,w_400) have no space after the comma, so they
        // survive intact.
        for (const cand of value.split(/,\s+/)) {
          const url = cand.trim().split(/\s+/)[0];
          if (url) refs.push({ file, line, raw: url, attr: 'srcset' });
        }
      }
    }
  }

  // CSS url(...) — inline style="" attributes and <style> blocks alike.
  for (const m of src.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)/gi)) {
    const value = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (value) refs.push({ file, line: at(m.index), raw: value, attr: 'url()' });
  }

  // ES module specifiers inside <script type="module">.
  for (const r of moduleSpecifiers(src, file, at)) refs.push(r);

  return refs;
}

/** Static + dynamic import specifiers. Bare specifiers are ignored (import maps are legal). */
function* moduleSpecifiers(src, file, at) {
  const patterns = [
    /\bimport\s+(?:[\w${}*,\s]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) {
    for (const m of src.matchAll(re)) {
      const spec = m[1];
      const looksRelative =
        spec.startsWith('./') ||
        spec.startsWith('../') ||
        /\.(?:js|mjs|css|json)(?:[?#].*)?$/i.test(spec);
      if (looksRelative) yield { file, line: at(m.index), raw: spec, attr: 'import' };
    }
  }
}

/** Pull every reference out of a CSS file. url() resolves against the CSS file, not the HTML. */
function refsFromCss(file) {
  const raw = read(file);
  const at = locator(raw);
  const src = stripCssComments(raw);
  /** @type {Ref[]} */
  const refs = [];

  for (const m of src.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"]*))\s*\)/gi)) {
    const value = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (value) refs.push({ file, line: at(m.index), raw: value, attr: 'url()' });
  }
  // @import "x.css";  (the url() form is already caught above)
  for (const m of src.matchAll(/@import\s+(?:layer\([^)]*\)\s*)?['"]([^'"]+)['"]/gi)) {
    refs.push({ file, line: at(m.index), raw: m[1], attr: '@import' });
  }
  return refs;
}

/* ------------------------------------------------------------------ *
 * Reference resolution
 * ------------------------------------------------------------------ */

const isExternal = (v) =>
  v === '' || v.startsWith('#') || v.startsWith('?') || EXTERNAL_RE.test(v);

const isRootAbsolute = (v) => v.startsWith('/') && !v.startsWith('//');

/**
 * Resolve a local reference against the referring file's directory.
 * @returns {{ok:true, target:string} | {ok:false, reason:string, target:string}}
 */
function resolveRef(fromFile, value) {
  let clean = value.split('#')[0].split('?')[0].trim();
  if (clean === '') return { ok: true, target: fromFile }; // pure fragment/query on self
  try {
    clean = decodeURIComponent(clean);
  } catch {
    /* leave the raw form; a literal space or % is still resolvable on disk */
  }

  const baseDir = posix.dirname(fromFile) === '.' ? '' : posix.dirname(fromFile);
  const joined = posix.normalize(posix.join(baseDir, clean));

  if (joined.startsWith('..')) {
    return { ok: false, reason: 'escapes the repository root', target: joined };
  }
  // posix.normalize keeps the trailing slash, so joining a directory-ish ref
  // with the repo root yields './' (NOT '.') — e.g. join('wy', '../'). Both
  // spellings mean "the repo root", whose index.html is the site home page.
  const target = joined === '.' || joined === './' ? '' : joined.replace(/\/$/, '');

  if (hasFile(target)) return { ok: true, target };

  if (target === '' || hasDir(target)) {
    const index = target === '' ? 'index.html' : `${target}/index.html`;
    if (hasFile(index)) return { ok: true, target: index };
    return { ok: false, reason: 'directory has no index.html', target: target || '.' };
  }

  // Distinguish a genuine miss from a case-only miss — the latter is the whole point.
  const ciHit = [...FILES, ...FILES_EXTRA].find((f) => f.toLowerCase() === target.toLowerCase());
  if (ciHit) {
    return { ok: false, reason: `CASE MISMATCH — on disk it is "${ciHit}"`, target };
  }
  return { ok: false, reason: 'no such file', target };
}

/* ------------------------------------------------------------------ *
 * Collect every reference once; checks B and C both consume it.
 * ------------------------------------------------------------------ */

/** @type {Ref[]} */
const ALL_REFS = [];
for (const f of HTML_FILES) {
  try {
    ALL_REFS.push(...refsFromHtml(f));
  } catch (err) {
    console.error(`check-routes: could not read ${f}: ${err.message}`);
  }
}
for (const f of CSS_FILES) {
  try {
    ALL_REFS.push(...refsFromCss(f));
  } catch (err) {
    console.error(`check-routes: could not read ${f}: ${err.message}`);
  }
}

/* ------------------------------------------------------------------ *
 * Reachability — which CSS/JS a page actually loads.
 * Check D only cares about files a visitor downloads. Superseded-but-kept
 * files (css/style.css, js/main.js, wy/app.js …) stay on disk unreferenced
 * by design; they must not fail the build for libraries nobody loads.
 * ------------------------------------------------------------------ */

function computeReachable() {
  const reachable = new Set();
  const queue = [];
  for (const ref of ALL_REFS) {
    if (!ref.file.toLowerCase().endsWith('.html')) continue;
    if (isExternal(ref.raw) || isRootAbsolute(ref.raw)) continue;
    const r = resolveRef(ref.file, ref.raw);
    if (r.ok && /\.(css|js|mjs)$/i.test(r.target)) queue.push(r.target);
  }
  while (queue.length) {
    const cur = queue.pop();
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    if (!cur.toLowerCase().endsWith('.css')) continue;
    for (const ref of refsFromCss(cur)) {
      if (isExternal(ref.raw) || isRootAbsolute(ref.raw)) continue;
      const r = resolveRef(cur, ref.raw);
      if (r.ok && /\.(css|js|mjs)$/i.test(r.target)) queue.push(r.target);
    }
  }
  return reachable;
}

/* ------------------------------------------------------------------ *
 * Checks
 * ------------------------------------------------------------------ */

/** @typedef {{where:string, message:string}} Violation */

/** A — every frozen route still exists, byte-exact and case-exact. */
function checkA() {
  /** @type {Violation[]} */
  const out = [];
  const manifestPath = 'tools/routes-frozen.json';
  if (!FILES.has(manifestPath)) {
    out.push({ where: manifestPath, message: 'frozen route manifest is missing' });
    return out;
  }
  let manifest;
  try {
    manifest = JSON.parse(read(manifestPath));
  } catch (err) {
    out.push({ where: manifestPath, message: `manifest is not valid JSON: ${err.message}` });
    return out;
  }
  for (const route of manifest.routes ?? []) {
    if (FILES.has(route)) continue;
    const ciHit = [...FILES].find((f) => f.toLowerCase() === route.toLowerCase());
    out.push({
      where: route,
      message: ciHit
        ? `FROZEN ROUTE RENAMED — now "${ciHit}". Restore the original spelling; a rename is a 404.`
        : 'FROZEN ROUTE MISSING — this URL has organic traffic and must never 404',
    });
  }
  return out;
}

/** B — every local href/src/url()/import resolves case-exactly. */
function checkB() {
  /** @type {Violation[]} */
  const out = [];
  for (const ref of ALL_REFS) {
    if (isExternal(ref.raw)) continue;
    if (isRootAbsolute(ref.raw)) continue; // reported by C; resolving it here is double-counting
    const r = resolveRef(ref.file, ref.raw);
    if (r.ok) continue;
    out.push({
      where: `${ref.file}:${ref.line}`,
      message: `${ref.attr}="${ref.raw}" -> ${r.reason}`,
    });
  }
  return out;
}

/** C — no root-absolute local paths. */
function checkC() {
  /** @type {Violation[]} */
  const out = [];
  for (const ref of ALL_REFS) {
    if (!isRootAbsolute(ref.raw)) continue;
    out.push({
      where: `${ref.file}:${ref.line}`,
      message: `${ref.attr}="${ref.raw}" is root-absolute -> resolves to https://thepkz.github.io${ref.raw} (404). Use a relative path.`,
    });
  }
  return out;
}

/** D — no surviving reference to a banned third party. */
const BANNED = [
  'bootstrap',
  'jquery',
  'popper',
  'font-awesome',
  'fontawesome',
  'animate.css',
  'scrollreveal',
  'clearbit',
  'stackpath',
  'codepen.io',
  'unpkg.co',
  'visitcount.itsvg.in',
  'count-view-pagea.onrender.com',
];

function checkD(reachable) {
  /** @type {Violation[]} */
  const out = [];
  // Scope: every page, plus only the CSS/JS a page actually pulls in. The
  // superseded-but-kept files (js/mycode.js, js/main.js, css/style.css,
  // wy/app.js, wy/iframe/*, blog/seeding.css) are referenced by zero pages,
  // are never downloaded by a visitor, and stay on disk by contract — so they
  // are deliberately out of scope and must not turn the build red.
  const targets = [
    ...HTML_FILES,
    ...[...reachable].filter((f) => /\.(css|js|mjs)$/i.test(f)).sort(),
  ];
  for (const file of targets) {
    if (file.startsWith('tools/') || file.startsWith('.github/')) continue; // this file names them all
    let text;
    try {
      text = read(file);
    } catch {
      continue;
    }
    const at = locator(text);
    // Prose describing a dependency we REMOVED is not a dependency. Comments
    // are blanked (length-preserving, so line numbers still point at the real
    // source line) before the needle scan; refsFromCss already did the same.
    const lower = stripCommentsFor(file, text).toLowerCase();
    for (const needle of BANNED) {
      let from = 0;
      for (;;) {
        const idx = lower.indexOf(needle, from);
        if (idx === -1) break;
        out.push({
          where: `${file}:${at(idx)}`,
          message: `banned third-party reference "${needle}"`,
        });
        from = idx + needle.length;
      }
    }
  }
  return out;
}

/** E — no CNAME at the repo root. */
function checkE() {
  if (!FILES.has('CNAME')) return [];
  return [
    {
      where: 'CNAME',
      message:
        'CNAME at repo root rewrites the Pages base path from /minthep-portfolio/ to / and instantly 404s every indexed URL. Remove it.',
    },
  ];
}

/** F — every <img> carries both width and height. */
function checkF() {
  /** @type {Violation[]} */
  const out = [];
  for (const file of HTML_FILES) {
    let raw;
    try {
      raw = read(file);
    } catch {
      continue;
    }
    const at = locator(raw);
    const src = stripHtmlComments(raw);
    const imgRe = /<img((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi;
    let m;
    while ((m = imgRe.exec(src)) !== null) {
      const attrs = m[1];
      const has = (n) => new RegExp(`(?:^|\\s)${n}\\s*=`, 'i').test(attrs);
      const missing = ['width', 'height'].filter((n) => !has(n));
      if (missing.length === 0) continue;
      const srcAttr = /(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(attrs);
      const label = srcAttr ? (srcAttr[1] ?? srcAttr[2] ?? srcAttr[3]) : '(no src)';
      out.push({
        where: `${file}:${at(m.index)}`,
        message: `<img src="${label}"> is missing ${missing.join(' and ')} -> layout shift`,
      });
    }
  }
  return out;
}

/** G — css/surface-*.css must contain no colour / size / z-index literal. */

// px is legal in these three places only.
const PX_OK_PROPS =
  /^(?:-?border(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?(?:-width)?|outline|outline-width|outline-offset|column-rule|column-rule-width|text-decoration-thickness|text-underline-offset)$/;

function isInsideFn(segment, relIdx, fnName) {
  // Walk back from relIdx counting parens; true if an unclosed `fnName(` encloses it.
  let depth = 0;
  for (let i = relIdx - 1; i >= 0; i--) {
    const ch = segment[i];
    if (ch === ')') depth++;
    else if (ch === '(') {
      if (depth === 0) {
        const before = segment.slice(Math.max(0, i - fnName.length - 2), i).toLowerCase();
        if (before.endsWith(fnName)) return true;
        depth = 0;
      } else depth--;
    }
  }
  return false;
}

function checkG() {
  /** @type {Violation[]} */
  const out = [];
  const surfaces = CSS_FILES.filter((f) => /^css\/surface-[^/]*\.css$/i.test(f));
  for (const file of surfaces) {
    const raw = read(file);
    const at = locator(raw);
    const src = stripCssComments(raw);

    // Segment boundaries: the statement or prelude a match sits inside.
    const segmentAt = (idx) => {
      let start = 0;
      for (let i = idx - 1; i >= 0; i--) {
        const c = src[i];
        if (c === '{' || c === '}' || c === ';') {
          start = i + 1;
          break;
        }
      }
      return { text: src.slice(start, idx + 1), start };
    };

    // G1 — raw hex colour.
    for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const seg = segmentAt(m.index);
      const rel = m.index - seg.start;
      if (isInsideFn(seg.text, rel, 'url')) continue; // url(sprite.svg#icon)
      if (/^[^:{]*$/.test(seg.text) && !seg.text.includes(':')) continue; // a selector, e.g. #main
      out.push({
        where: `${file}:${at(m.index)}`,
        message: `raw hex colour "${m[0]}" — surface CSS must use var(--…) from css/tokens.css`,
      });
    }

    // G2 — raw px outside var() fallbacks, @media/@container/@supports preludes, borders.
    for (const m of src.matchAll(/(?<![\w-])-?\d*\.?\d+px(?![\w-])/g)) {
      const seg = segmentAt(m.index);
      const rel = m.index - seg.start;
      if (/@(?:media|container|supports)\b/i.test(seg.text)) continue;
      if (isInsideFn(seg.text, rel, 'var')) continue;
      const propMatch = /(?:^|[{};])\s*([-\w]+)\s*:/.exec(seg.text);
      const prop = propMatch ? propMatch[1].toLowerCase() : '';
      if (PX_OK_PROPS.test(prop)) continue;
      out.push({
        where: `${file}:${at(m.index)}`,
        message: `raw px value "${m[0]}"${prop ? ` on "${prop}"` : ''} — use a --s-* / --fs-* token`,
      });
    }

    // G3 — bare numeric z-index.
    for (const m of src.matchAll(/z-index\s*:\s*(-?\d+)/gi)) {
      out.push({
        where: `${file}:${at(m.index)}`,
        message: `bare z-index "${m[1]}" — use one of the eight --z-* tokens`,
      });
    }
  }
  return out;
}

/** H — every referenced local file is in the git index. */

/* ---------------------------------------------------------------------------
   The one failure mode the other seven checks are structurally blind to.

   A–G all ask questions of the WORKING TREE, and the working tree is not what
   ships. .github/workflows/static.yml runs actions/checkout and hands the
   result to actions/upload-pages-artifact with path: '.' — so the site is the
   COMMIT, and a file that exists on this laptop but has never been `git add`ed
   simply is not there on the runner. Locally every check passes, `python3 -m
   http.server` serves a perfect page, and the deploy is a page with no CSS.

   That is not hypothetical: it is the state of this repository right now. The
   tracked-and-modified index.html links six stylesheets that git has never
   seen. Merging to main today would publish an unstyled site, and every check
   above would have said PASS on the way there.

   Reported per TARGET, not per reference — one missing stylesheet pulled in by
   twenty pages is one thing to fix, and twenty near-identical lines would bury
   the other nineteen missing files.

   Silent when git cannot be read (tarball export, no .git). "I have no opinion"
   is the only honest answer there, and inventing violations would make the
   check untrustworthy in exactly the environment where it matters least.

   NOT a duplicate of B. B asks "does this path exist on disk, case-exactly?" —
   a spelling check. H asks "does this path exist in the commit?" — a deploy
   check. A file can pass either one and fail the other, and the fix is
   different each time: rename vs. `git add`.

   THIS CHECK IS TRIVIALLY GREEN ON CI, and that is not a defect. The runner
   works from actions/checkout, where the tree IS the commit, so on-disk and
   in-index are the same set and B already covers it. H is the same question
   asked in the one place the two sets can diverge: a developer's machine,
   before the push. Its firing site is local; verify.yml just carries it along.
   --------------------------------------------------------------------------- */

function checkH() {
  /** @type {Violation[]} */
  const out = [];
  if (!GIT_READABLE) return out;

  /** @type {Map<string, Ref[]>} */
  const missing = new Map();
  for (const ref of ALL_REFS) {
    if (isExternal(ref.raw)) continue;
    if (isRootAbsolute(ref.raw)) continue; // C's problem
    const r = resolveRef(ref.file, ref.raw);
    if (!r.ok) continue; // B's problem — do not report a broken path twice
    if (TRACKED.has(r.target)) continue;
    if (!missing.has(r.target)) missing.set(r.target, []);
    missing.get(r.target).push(ref);
  }

  for (const target of [...missing.keys()].sort()) {
    const refs = missing.get(target);
    const from = [...new Set(refs.map((r) => `${r.file}:${r.line}`))];
    const shown = from.slice(0, 3).join(', ');
    const more = from.length > 3 ? ` +${from.length - 3} more` : '';
    out.push({
      where: target,
      message: `on disk but NOT in the git index — ${from.length} reference(s): ${shown}${more}. Pages deploys the commit, so this 404s in production until it is committed.`,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

const reachable = enabled('D') ? computeReachable() : new Set();

const RUNNERS = {
  A: checkA,
  B: checkB,
  C: checkC,
  D: () => checkD(reachable),
  E: checkE,
  F: checkF,
  G: checkG,
  H: checkH,
};

const results = [];
for (const id of ALL_CHECKS) {
  if (!enabled(id)) {
    results.push({ id, skipped: true, violations: [] });
    continue;
  }
  let violations;
  try {
    violations = RUNNERS[id]();
  } catch (err) {
    console.error(`check-routes: check ${id} crashed: ${err.stack}`);
    process.exit(2);
  }
  results.push({ id, skipped: false, violations });
}

if (!opts.quiet) {
  for (const r of results) {
    if (r.skipped || r.violations.length === 0) continue;
    console.log(`\n--- ${r.id}. ${CHECK_TITLES[r.id]} — ${r.violations.length} violation(s)`);
    for (const v of r.violations) console.log(`  ${v.where}: ${v.message}`);
  }
}

/* Summary table */
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const W = [3, 34, 7, 11];
const line = `+${W.map((w) => '-'.repeat(w + 2)).join('+')}+`;

console.log('');
console.log(line);
console.log(`| ${pad('#', W[0])} | ${pad('CHECK', W[1])} | ${pad('STATUS', W[2])} | ${padL('VIOLATIONS', W[3])} |`);
console.log(line);
let total = 0;
let failed = 0;
for (const r of results) {
  const status = r.skipped ? 'SKIP' : r.violations.length ? 'FAIL' : 'PASS';
  if (!r.skipped) {
    total += r.violations.length;
    if (r.violations.length) failed++;
  }
  console.log(
    `| ${pad(r.id, W[0])} | ${pad(CHECK_TITLES[r.id], W[1])} | ${pad(status, W[2])} | ${padL(
      r.skipped ? '-' : r.violations.length,
      W[3]
    )} |`
  );
}
console.log(line);
console.log(
  `| ${pad('', W[0])} | ${pad('TOTAL', W[1])} | ${pad(failed ? 'FAIL' : 'PASS', W[2])} | ${padL(
    total,
    W[3]
  )} |`
);
console.log(line);

const scanned = `scanned ${HTML_FILES.length} html + ${CSS_FILES.length} css, ${ALL_REFS.length} references, ${FILES.size} files on disk`;
console.log(scanned);

if (failed) {
  console.log(`\ncheck-routes: FAILED — ${total} violation(s) across ${failed} check(s).`);
  process.exit(1);
}
console.log('\ncheck-routes: OK.');
process.exit(0);

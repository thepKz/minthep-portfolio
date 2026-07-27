#!/usr/bin/env bash
#
# tools/subset-fonts.sh — self-host the three site typefaces as woff2.
#
# ┌──────────────────────────────────────────────────────────────────────────┐
# │ THIS IS NOT A BUILD STEP.                                                │
# │ GitHub Pages uploads the repo root verbatim. Nothing here runs at        │
# │ deploy time. This script is run ONCE, locally, by a human, and its       │
# │ output (fonts/*.woff2) is committed to git. It exists as documentation   │
# │ and as a way to regenerate the font payload if Google ships a new        │
# │ version of a family.                                                     │
# └──────────────────────────────────────────────────────────────────────────┘
#
# WHY NOT pyftsubset?
# ───────────────────
# The original plan (BRIEF.md §6, T02) was to merge latin + latin-ext +
# vietnamese into ONE woff2 per face with `pyftsubset --layout-features=...`.
# `pyftsubset` / `fonttools` are NOT installed on the build machine and there
# is no npm/pip install budget for this project (see IMPLEMENTATION-CONTRACT.md
# Override 3). So we take the fully-equivalent zero-tooling route:
#
#   Google Fonts ALREADY serves per-subset, already-subsetted woff2 files.
#   We ask the CSS2 API for them with a modern Chrome User-Agent (an old or
#   absent UA gets you ttf/woff instead of woff2), keep only the latin /
#   latin-ext / vietnamese slices, and self-host those exact bytes.
#
# The result is strictly BETTER than a merged subset for this site: because
# each file carries its own `unicode-range`, a visitor reading a
# pure-ASCII page never downloads the vietnamese slice at all, and nobody
# ever downloads latin-ext unless a page actually contains one of its
# codepoints. The cost is more files, not more bytes.
#
# CONSEQUENCE FOR T01 (css/base.css) — READ THIS:
# ──────────────────────────────────────────────
# BRIEF.md §2 predicted 6 files (`anton-400-vn.woff2`, `bvp-400-vn.woff2`, …).
# Google splits each face into 3 subsets, so the real payload is 18 files and
# T01 must write 18 @font-face blocks, not 6. The naming keeps the brief's
# stems and swaps the `-vn` suffix for the true subset name:
#
#   anton-400-{latin,latin-ext,vietnamese}.woff2
#   bvp-400-{latin,latin-ext,vietnamese}.woff2
#   bvp-500-{latin,latin-ext,vietnamese}.woff2
#   bvp-700-{latin,latin-ext,vietnamese}.woff2
#   newsreader-vf-{latin,latin-ext,vietnamese}.woff2          (roman,  wght 200..800, opsz 6..72)
#   newsreader-italic-vf-{latin,latin-ext,vietnamese}.woff2   (italic, wght 200..800, opsz 6..72)
#
# fonts/README.md is the authoritative handoff: it lists every file with its
# family / style / weight / subset / byte size and the exact unicode-range
# string that must be paired with it.
#
# THE THREE unicode-range VALUES, CAPTURED VERBATIM FROM THE CSS RESPONSE
# ──────────────────────────────────────────────────────────────────────
# Verified 2026-07-26: all six faces returned byte-identical unicode-range
# strings for a given subset, so there are exactly three distinct values.
# Copy these into css/base.css EXACTLY — do not "tidy" them.
#
# latin:
#   unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
#
# latin-ext:
#   unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
#
# vietnamese:
#   unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
#
# NOTE: the `vietnamese` slice is the one that carries Ă Đ Ĩ Ũ Ơ Ư and the
# whole U+1EA0-1EF9 precomposed block (ế ộ ữ ệ ậ …) plus ₫ (U+20AB). A page
# in Vietnamese therefore pulls latin + vietnamese for each face it uses.
# Preload budget (R13): exactly 2 files per surface — pick the two the
# above-the-fold text actually needs, which for Surface A is
# anton-400-vietnamese.woff2 + bvp-400-vietnamese.woff2.
#
# NOT REQUESTED, DELIBERATELY:
#   * Poppins — no vietnamese subset exists. It is the reason `Hướng dẫn học`
#     currently font-switches mid-word on the live site. See BRIEF.md R11.
#   * cyrillic / cyrillic-ext / greek / greek-ext — none of these three
#     families even offer them, but the filter below drops them if a future
#     version adds them.
#
# Usage:  bash tools/subset-fonts.sh            # download + verify
#         bash tools/subset-fonts.sh --dry-run  # print the plan only
#
set -euo pipefail

# ── locations ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
OUT_DIR="${REPO_ROOT}/fonts"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# A modern Chrome UA is REQUIRED. Without it the CSS2 API decides your client
# cannot handle woff2 and serves ttf, which is ~4x the bytes.
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

# One request, three families. Newsreader is requested as a VARIABLE font so a
# single file covers wght 200..800 across opsz 6..72, in both roman and italic.
CSS_URL='https://fonts.googleapis.com/css2?family=Anton&family=Be+Vietnam+Pro:wght@400;500;700&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap'

# Subsets we keep. Anything else in the response is dropped with a warning.
KEEP_SUBSETS='latin latin-ext vietnamese'

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT
CSS_FILE="${TMP_DIR}/gf.css"

mkdir -p "${OUT_DIR}"

# ── 1. fetch the stylesheet ──────────────────────────────────────────────────
echo "==> GET ${CSS_URL}"
curl -fsS -A "${UA}" "${CSS_URL}" -o "${CSS_FILE}"
echo "    $(wc -c < "${CSS_FILE}" | tr -d ' ') bytes, $(grep -c '@font-face' "${CSS_FILE}") @font-face blocks"

# ── 2. parse it into: filename <TAB> url <TAB> unicode-range ─────────────────
# Single quotes are stripped up front so the awk program never has to quote a
# quote. Each @font-face block is flushed on its closing brace.
tr -d "'" < "${CSS_FILE}" | awk -v keep="${KEEP_SUBSETS}" '
  function stem(fam, sty, wgt) {
    if (fam == "Anton")          return "anton-400"
    if (fam == "Be Vietnam Pro") return "bvp-" wgt
    if (fam == "Newsreader")     return (sty == "italic") ? "newsreader-italic-vf" : "newsreader-vf"
    return ""
  }
  BEGIN { split(keep, k, " "); for (i in k) wanted[k[i]] = 1 }

  /^\/\* /          { subset = $0; gsub(/^\/\* | \*\/$/, "", subset); next }
  /font-family:/    { fam = $0; gsub(/^[^:]*: *|; *$/, "", fam);    next }
  /font-style:/     { sty = $0; gsub(/^[^:]*: *|; *$/, "", sty);    next }
  /font-weight:/    { wgt = $0; gsub(/^[^:]*: *|; *$/, "", wgt);    next }
  /src: *url\(/     { url = $0; gsub(/^.*url\(|\).*$/, "", url);    next }
  /unicode-range:/  { ur  = $0; gsub(/^[^:]*: *|; *$/, "", ur);     next }

  /^}/ {
    s = stem(fam, sty, wgt)
    if (s == "") { print "WARN unmapped family: " fam > "/dev/stderr"; next }
    if (!(subset in wanted)) { print "SKIP " s " / " subset > "/dev/stderr"; next }
    print s "-" subset ".woff2" "\t" url "\t" ur
    next
  }
' > "${TMP_DIR}/plan.tsv"

PLANNED=$(wc -l < "${TMP_DIR}/plan.tsv" | tr -d ' ')
echo "==> ${PLANNED} files planned"

if [ "${DRY_RUN}" -eq 1 ]; then
  cut -f1,2 "${TMP_DIR}/plan.tsv"
  exit 0
fi

# Guard against a silently truncated parse.
if [ "${PLANNED}" -lt 18 ]; then
  echo "FATAL: expected >= 18 files (6 faces x 3 subsets), parsed ${PLANNED}." >&2
  exit 1
fi

# ── 3. download every woff2 ──────────────────────────────────────────────────
while IFS=$'\t' read -r name url _ur; do
  printf '    %-40s' "${name}"
  curl -fsS -A "${UA}" "${url}" -o "${OUT_DIR}/${name}"
  printf '%8s bytes\n' "$(wc -c < "${OUT_DIR}/${name}" | tr -d ' ')"
done < "${TMP_DIR}/plan.tsv"

# ── 4. verify every file really is woff2 ─────────────────────────────────────
# A woff2 file MUST begin with the four ASCII bytes wOF2 == 77 4f 46 32.
# An HTML error page or a redirect body would fail here.
echo "==> magic-number check"
FAIL=0
for f in "${OUT_DIR}"/*.woff2; do
  MAGIC="$(head -c4 "${f}" | xxd -p)"
  if [ "${MAGIC}" != "774f4632" ]; then
    echo "    FAIL $(basename "${f}") magic=${MAGIC} (expected 774f4632 = wOF2)" >&2
    FAIL=1
  fi
done
[ "${FAIL}" -eq 0 ] && echo "    OK: all $(ls -1 "${OUT_DIR}"/*.woff2 | wc -l | tr -d ' ') files start with wOF2"
[ "${FAIL}" -eq 0 ] || exit 1

# ── 5. optional: dump the sfnt table tags out of each woff2 header ───────────
# Proves the OpenType layout tables survived Google's subsetting (GSUB carries
# ccmp, GPOS carries mark/mkmk — both are load-bearing for stacked Vietnamese
# tone marks) and that the Newsreader files are genuinely variable (fvar/gvar).
# The woff2 table directory is UNCOMPRESSED, so this needs no brotli.
if command -v python3 >/dev/null 2>&1; then
  echo "==> sfnt table inventory"
  python3 - "${OUT_DIR}" <<'PY'
import sys, glob, os, struct

# WOFF2 spec, "Known Table Tags" — index 0..62; 63 means a 4-byte tag follows.
KNOWN = ('cmap head hhea hmtx maxp name OS/2 post cvt  fpgm glyf loca prep CFF  VORG '
         'EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC '
         'JSTF MATH CBDT CBLC COLR CPAL SVG  sbix acnt avar bdat bloc bsln cvar fdsc '
         'feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat '
         'Gloc Feat Sill').split(' ')
KNOWN = [t for t in KNOWN if t != '']

def base128(buf, i):
    v = 0
    for _ in range(5):
        b = buf[i]; i += 1
        v = (v << 7) | (b & 0x7f)
        if not (b & 0x80):
            return v, i
    raise ValueError('bad UIntBase128')

for path in sorted(glob.glob(os.path.join(sys.argv[1], '*.woff2'))):
    b = open(path, 'rb').read()
    assert b[:4] == b'wOF2', path
    num = struct.unpack('>H', b[12:14])[0]
    i, tags = 48, []
    for _ in range(num):
        flags = b[i]; i += 1
        idx = flags & 0x3f
        if idx == 0x3f:
            tags.append(b[i:i+4].decode('latin-1')); i += 4
        else:
            tags.append(KNOWN[idx])
        _, i = base128(b, i)                      # origLength
        xform = (flags >> 6) & 0x03
        t = tags[-1]
        transformed = (xform == 0) if t in ('glyf', 'loca') else (xform != 0)
        if transformed:
            _, i = base128(b, i)                  # transformLength
    t = set(x.strip() for x in tags)
    print('    %-40s %s' % (
        os.path.basename(path),
        ' '.join(x for x in ('GSUB', 'GPOS', 'GDEF', 'fvar', 'gvar', 'avar', 'STAT')
                 if x in t) or '(no layout/variation tables)'))
PY
fi

# ── 6. summary ───────────────────────────────────────────────────────────────
echo "==> fonts/ total"
du -sh "${OUT_DIR}"
echo
echo "Now update fonts/README.md if the file list or byte sizes changed,"
echo "and make sure css/base.css (owned by T01) still matches it."

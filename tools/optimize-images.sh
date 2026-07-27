#!/usr/bin/env bash
#
# tools/optimize-images.sh — local, re-runnable image pipeline for minthep-portfolio.
#
# THIS IS NOT A BUILD STEP. GitHub Pages uploads the repo root verbatim
# (.github/workflows/static.yml, path: '.'), so every derived file this script
# produces is generated once on a developer machine and committed.
#
# ADDITIVE ONLY. Originals are never touched, never renamed, never removed —
# old image URLs must keep returning 200. Everything here writes *siblings*:
#
#     img/project4.png   (original, untouched, still resolves)
#     img/project4.webp  (derived)
#     img/project4.avif  (derived)
#
# Consumed as:
#     <picture>
#       <source srcset="img/project4.avif" type="image/avif">
#       <source srcset="img/project4.webp" type="image/webp">
#       <img src="img/project4.png" width="1080" height="546" alt="…">
#     </picture>
#
# It also:
#   * fixes the two GitHub-Pages case bugs by COPY (never by rename),
#   * runs tools/gen-lqip.sh to emit css/lqip.css,
#   * writes tools/asset-manifest.json — the contract every page task reads for
#     intrinsic width/height (CLS 0) and for the LQIP/tint custom-property names.
#
# Requires: ImageMagick 7 (`magick`), cwebp/gif2webp (libwebp), python3.
# `magick` on this machine routes AVIF through libheif and writes real AVIF even
# though `magick -version` does not advertise avif in DELEGATES — verified with
# `file out.avif` => "ISO Media, AVIF Image". The script re-verifies every file.
#
# Usage:  bash tools/optimize-images.sh [repo-root]
#         FORCE=1 bash tools/optimize-images.sh     # re-encode even if up to date
#
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$ROOT" || { echo "cannot cd $ROOT" >&2; exit 1; }

FORCE="${FORCE:-0}"
WEBP_Q="${WEBP_Q:-82}"
AVIF_Q="${AVIF_Q:-50}"
# An AVIF that is not at least this much smaller than its WebP sibling is not
# worth an extra <source> line, an extra decode path, or an extra repo file.
AVIF_MIN_WIN_PCT="${AVIF_MIN_WIN_PCT:-10}"

MANIFEST="tools/asset-manifest.json"
LQIP_CSS="css/lqip.css"
TSV="$(mktemp -t t06rows)"
trap 'rm -f "$TSV"' EXIT

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing tool: $1" >&2; exit 1; }; }
need magick; need cwebp; need gif2webp; need python3

bytes() { stat -f%z "$1" 2>/dev/null || echo 0; }
pxw()   { magick identify -format '%w' "$1[0]" 2>/dev/null || echo 0; }
pxh()   { magick identify -format '%h' "$1[0]" 2>/dev/null || echo 0; }

# ---------------------------------------------------------------------------
# 1. Width policy — per rendering surface, never an upscale.
#
#    Nothing on this site renders wider than a ~720px content column except the
#    Surface A project plates (bleed-wide, 1080 covers 2x DPR at the real box)
#    and the Surface C door hero.
# ---------------------------------------------------------------------------
target_width() {
  case "$1" in
    img/project*.png)                    echo 1080 ;;   # Surface A project plates
    # The four plates that shipped with no media. Sources are the real
    # screenshots the live minthep.com build serves; same 1080 policy as the
    # numbered plates because they land in the same .plate__media box.
    img/genkikoi.png)                    echo 1080 ;;
    img/trustfundme.png)                 echo 1080 ;;
    img/blackhole.png)                   echo 1080 ;;
    img/wygallery.png)                   echo 1080 ;;
    img/conga.jpg)                       echo  600 ;;   # Surface A hero portrait, 4/5 crop
    img/wonyoung.jpg)                    echo 1280 ;;   # Surface C stage-4 hero
    img/Forbidden.png)                   echo 1600 ;;
    img/profile.jpeg)                    echo  800 ;;
    img/hover.png)                       echo  640 ;;   # 2000x2000 source used as a small mark
    blog/myblog/*.png)                   echo  640 ;;   # 1000x1000 index card thumbnails
    blog/Speaking/jpd.png)               echo  640 ;;   # 1024x1024 course cover
    blog/textblog-3/mas291.png)          echo  640 ;;   # 1024x1024 course cover
    blog/textblog-0/textblog-0.jpg)      echo  640 ;;   # 1024x1024 article cover
    blog/textblog-2/textblog-2.jpg)      echo  640 ;;   # 1024x1024 article cover
    blog/*)                              echo 1400 ;;   # article figures
    *)                                   echo 1400 ;;
  esac
}

# Files another task owns. Never write these, never write next to them.
owned_elsewhere() {
  case "$1" in
    img/sprite.svg|img/favicon.svg|img/favicon-32.ico|img/logo.png) return 0 ;;  # T05
    test_html/product.png)                                          return 0 ;;  # T05
    *)                                                              return 1 ;;
  esac
}

# ---------------------------------------------------------------------------
# 2. WebP + AVIF siblings
# ---------------------------------------------------------------------------
printf '%-58s %9s %9s %9s  %s\n' "FILE" "ORIG" "WEBP" "AVIF" "W x H"
printf '%s\n' "---------------------------------------------------------------------------------------------"

avif_kept=0; avif_dropped=0; webp_made=0; webp_kept=0

encode_avif() {  # encode_avif <src> <target-width> <out.avif> <webp-bytes>
  local src="$1" tw="$2" out="$3" wb="$4" ab
  magick "$src[0]" -resize "${tw}x>" -strip -quality "$AVIF_Q" "$out" >/dev/null 2>&1 || { rm -f "$out"; return 1; }
  [ -s "$out" ] || { rm -f "$out"; return 1; }
  # Hard proof it is a real AVIF and not a silently-renamed something else.
  case "$(file -b "$out")" in
    *AVIF*) : ;;
    *) rm -f "$out"; return 1 ;;
  esac
  ab=$(bytes "$out")
  if [ "$wb" -gt 0 ] && [ "$ab" -ge $(( wb * (100 - AVIF_MIN_WIN_PCT) / 100 )) ]; then
    rm -f "$out"; return 2      # not worth it
  fi
  return 0
}

# Two stems in blog/Speaking/ carry both a .jpg and a .png (`0.*`, `jpd.*`), so a
# naive "<stem>.webp" would have the two sources fighting over one derived file
# and re-encoding on every run. The stem is awarded to whichever extension sorts
# last (png > jpeg > jpg), which in both cases is the PNG — the referenced one.
# The loser gets "<stem>-<ext>.webp" so both remain addressable.
derived_stem() {  # derived_stem <relative source path>
  local f="$1" base ext e last=""
  base="${f%.*}"; ext="$(printf '%s' "${f##*.}" | tr '[:upper:]' '[:lower:]')"
  for e in gif jpg jpeg png; do [ -e "$base.$e" ] && last="$e"; done
  if [ -n "$last" ] && [ "$last" != "$ext" ]; then
    printf '%s-%s' "$base" "$ext"
  else
    printf '%s' "$base"
  fi
}

process() {  # process <relative source path>
  local f="$1" base ext lext tw nw webp avif ob wb ab fw fh astat
  owned_elsewhere "$f" && return 0
  base="$(derived_stem "$f")"; ext="${f##*.}"
  lext="$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')"
  webp="$base.webp"; avif="$base.avif"
  ob=$(bytes "$f"); nw=$(pxw "$f")
  [ "$nw" -gt 0 ] || return 0
  tw=$(target_width "$f")
  [ "$tw" -gt "$nw" ] && tw="$nw"          # never upscale

  if [ "$lext" = "gif" ]; then
    # Animated. gif2webp cannot resize; AVIF sequences are not worth the risk.
    if [ "$FORCE" = "1" ] || [ ! -e "$webp" ]; then
      gif2webp -quiet -q 62 -lossy -m 6 -mt "$f" -o "$webp" >/dev/null 2>&1 || return 0
      webp_made=$((webp_made+1))
    else
      webp_kept=$((webp_kept+1))
    fi
    wb=$(bytes "$webp"); ab=0; astat="gif:no-avif"
  else
    if [ "$FORCE" = "1" ] || [ ! -e "$webp" ] || [ "$(pxw "$webp")" != "$tw" ]; then
      if [ "$tw" -lt "$nw" ]; then
        cwebp -quiet -q "$WEBP_Q" -m 6 -mt -resize "$tw" 0 "$f" -o "$webp" 2>/dev/null || return 0
      else
        cwebp -quiet -q "$WEBP_Q" -m 6 -mt "$f" -o "$webp" 2>/dev/null || return 0
      fi
      webp_made=$((webp_made+1))
    else
      webp_kept=$((webp_kept+1))
    fi
    wb=$(bytes "$webp")
    if [ "$FORCE" = "1" ] || [ ! -e "$avif" ] || [ "$(pxw "$avif")" != "$tw" ]; then
      rm -f "$avif"
      encode_avif "$f" "$tw" "$avif" "$wb"
      case $? in
        0) astat="ok" ;;
        2) astat="skipped:<${AVIF_MIN_WIN_PCT}%-win-vs-webp" ;;
        *) astat="skipped:encode-failed" ;;
      esac
    else
      astat="ok"
    fi
    ab=$(bytes "$avif")
  fi

  [ "$ab" -gt 0 ] && avif_kept=$((avif_kept+1)) || avif_dropped=$((avif_dropped+1))

  # Intrinsic size of the derived file page tasks will reference.
  # ImageMagick cannot decode ANIMATED WebP, and gif2webp never resizes, so for
  # GIFs the source dimensions are the derived dimensions.
  if [ "$lext" = "gif" ]; then
    fw=$(pxw "$f"); fh=$(pxh "$f")
  else
    fw=$(pxw "$webp"); fh=$(pxh "$webp")
  fi
  { [ "${fw:-0}" -gt 0 ] && [ "${fh:-0}" -gt 0 ]; } || { fw=$(pxw "$f"); fh=$(pxh "$f"); }
  printf '%-58s %8dK %8dK %8dK  %sx%s\n' "$f" $((ob/1024)) $((wb/1024)) $((ab/1024)) "$fw" "$fh"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$f" "$webp" "$([ "$ab" -gt 0 ] && echo "$avif")" "$fw" "$fh" "$ob" "$wb" "$ab" "$astat" >> "$TSV"
}

: > "$TSV"
while IFS= read -r f; do
  process "${f#./}"
done < <(find . -type f -not -path './.git/*' -not -path './node_modules/*' \
           \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.gif' \) | LC_ALL=C sort)

# WebP files that have no raster original (hand-authored diagrams). Still deserve AVIF.
while IFS= read -r f; do
  f="${f#./}"; base="${f%.webp}"
  # skip derived WebPs that already have a raster original
  for e in png jpg jpeg gif PNG JPG; do [ -e "$base.$e" ] && continue 2; done
  # skip the collision-suffixed derivatives ("0-jpg.webp" belongs to "0.jpg")
  case "$base" in
    *-png|*-jpg|*-jpeg|*-gif) [ -e "${base%-*}.${base##*-}" ] && continue ;;
  esac
  avif="$base.avif"; wb=$(bytes "$f"); nw=$(pxw "$f")
  tw=$(target_width "$f"); [ "$tw" -gt "$nw" ] && tw="$nw"
  astat="ok"
  if [ "$FORCE" = "1" ] || [ ! -e "$avif" ] || [ "$(pxw "$avif")" != "$tw" ]; then
    rm -f "$avif"
    encode_avif "$f" "$tw" "$avif" "$wb"
    case $? in
      0) astat="ok" ;;
      2) astat="skipped:<${AVIF_MIN_WIN_PCT}%-win-vs-webp" ;;
      *) astat="skipped:encode-failed" ;;
    esac
  fi
  ab=$(bytes "$avif")
  [ "$ab" -gt 0 ] && avif_kept=$((avif_kept+1)) || avif_dropped=$((avif_dropped+1))
  printf '%-58s %8s %8dK %8dK  %sx%s\n' "$f" "-" $((wb/1024)) $((ab/1024)) "$(pxw "$f")" "$(pxh "$f")"
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$f" "$f" "$([ "$ab" -gt 0 ] && echo "$avif")" "$(pxw "$f")" "$(pxh "$f")" "0" "$wb" "$ab" "$astat" >> "$TSV"
done < <(find . -type f -not -path './.git/*' -iname '*.webp' | LC_ALL=C sort)

printf '%s\n' "---------------------------------------------------------------------------------------------"
printf 'webp encoded=%d reused=%d   avif kept=%d dropped=%d\n' \
  "$webp_made" "$webp_kept" "$avif_kept" "$avif_dropped"

# ---------------------------------------------------------------------------
# 3. Case-sensitivity fixes — BY COPY, NEVER BY RENAME.
#
#     GitHub Pages serves from a case-sensitive Linux filesystem; macOS APFS is
#     case-INsensitive. Two images are 404ing in production right now while
#     looking perfectly fine locally:
#
#       on disk                                referenced in HTML as
#       blog/textblog-3/Histogram.webp    ->   textblog-3/histogram.webp
#       blog/textblog-5/Scrum-model.webp  ->   textblog-5/scrum-model.webp
#
#     A rename is a delete, and a delete is an unrecoverable 404 — so we add the
#     lowercase spelling ALONGSIDE the original. Both spellings then resolve on
#     the deploy target and nothing that already links either one can break.
#
#     On a case-insensitive checkout `cp A a` is a no-op ("are identical"), so
#     the alias is written straight into the git index with plumbing instead.
#     The blob is identical, so the two paths cost one object, not two.
# ---------------------------------------------------------------------------
echo
echo "case-bug fixes (alias added alongside; nothing renamed, nothing deleted):"
alias_case() {  # alias_case <existing-path> <lowercase-alias-path>
  local src="$1" dst="$2" blob
  [ -e "$src" ] || { printf '  MISSING SOURCE: %s\n' "$src"; return 0; }
  if [ "$(cd "$(dirname "$src")" && ls | grep -cx "$(basename "$dst")")" = "1" ]; then
    : # already a distinct file on a case-sensitive filesystem
  elif cp "$src" "$dst" 2>/dev/null; then
    : # case-sensitive filesystem: a plain copy is enough
  fi
  if git rev-parse --git-dir >/dev/null 2>&1; then
    blob="$(git hash-object -w "$src")"
    # Stage the exact-cased original too. Without this a later `git add -A` on a
    # case-insensitive checkout folds the single dirent onto the lowercase index
    # entry and the original spelling silently never reaches the deploy.
    git update-index --add --cacheinfo "100644,$blob,$src" 2>/dev/null
    git update-index --add --cacheinfo "100644,$blob,$dst" 2>/dev/null \
      && printf '  %-46s => %-46s (index, blob %s)\n' "$src" "$dst" "${blob:0:8}" \
      || printf '  FAILED to alias %s -> %s\n' "$src" "$dst"
  fi
}
alias_case blog/textblog-3/Histogram.webp   blog/textblog-3/histogram.webp
alias_case blog/textblog-5/Scrum-model.webp blog/textblog-5/scrum-model.webp
[ -e blog/textblog-3/Histogram.avif ]   && alias_case blog/textblog-3/Histogram.avif   blog/textblog-3/histogram.avif
[ -e blog/textblog-5/Scrum-model.avif ] && alias_case blog/textblog-5/Scrum-model.avif blog/textblog-5/scrum-model.avif

# ---------------------------------------------------------------------------
# 4. LQIP placeholders -> css/lqip.css
# ---------------------------------------------------------------------------
echo
bash tools/gen-lqip.sh "$ROOT" > "$LQIP_CSS"
printf 'wrote %s (%d bytes)\n' "$LQIP_CSS" "$(bytes "$LQIP_CSS")"

# ---------------------------------------------------------------------------
# 5. tools/asset-manifest.json — the contract every page task reads.
# ---------------------------------------------------------------------------
python3 - "$TSV" "$MANIFEST" "$LQIP_CSS" <<'PY'
import json, os, re, sys, datetime

tsv, out, lqip_css = sys.argv[1], sys.argv[2], sys.argv[3]

slots = set()
if os.path.exists(lqip_css):
    slots = set(re.findall(r'--lqip-([a-z0-9-]+)\s*:', open(lqip_css, encoding='utf-8').read()))

# source path -> lqip/tint slot name
SLOT_FOR = {
    'img/conga.jpg':          'conga',       # Surface A hero portrait
    'img/project1.png':       'project1',
    'img/project2.png':       'project2',
    'img/project3.png':       'project3',
    'img/project4.png':       'project4',
    'img/project5.png':       'project5',
    'img/project6.png':       'project6',
    'img/genkikoi.png':       'genkikoi',    # the four plates that shipped bare
    'img/trustfundme.png':    'trustfundme',
    'img/blackhole.png':      'blackhole',
    'img/wygallery.png':      'wygallery',
    'blog/myblog/welcome.png':'welcome',     # Surface B index covers
    'blog/myblog/jpd113.png': 'jpd113',
    'blog/myblog/jpd123.png': 'jpd123',
    'img/wonyoung.jpg':       'wonyoung',    # Surface C hero
}

entries, seen = [], set()
for line in open(tsv, encoding='utf-8'):
    line = line.rstrip('\n')
    if not line:
        continue
    src, webp, avif, w, h, ob, wb, ab, astat = line.split('\t')
    if src in seen:
        continue
    seen.add(src)
    slot = SLOT_FOR.get(src)
    if slot and slot not in slots:
        slot = None
    e = {
        "src":  src,
        "webp": webp,
        "avif": avif or None,
        "w":    int(w),
        "h":    int(h),
        "bytes": {
            "original": int(ob),
            "webp":     int(wb),
            "avif":     int(ab) or None,
        },
        "avifStatus": astat,
        "lqipVar": f"--lqip-{slot}" if slot else None,
        "tintVar": f"--tint-{slot}" if slot else None,
    }
    entries.append(e)

# Case aliases added in section 3. Both spellings resolve on GitHub Pages, so a
# page task may reference either; the manifest carries an entry for each so a
# lookup never misses. On a case-insensitive macOS checkout only the original
# spelling exists as a file — the alias lives in the git index (see section 3).
CASE_ALIASES = {
    'blog/textblog-3/Histogram.webp':   'blog/textblog-3/histogram.webp',
    'blog/textblog-3/Histogram.avif':   'blog/textblog-3/histogram.avif',
    'blog/textblog-5/Scrum-model.webp': 'blog/textblog-5/scrum-model.webp',
    'blog/textblog-5/Scrum-model.avif': 'blog/textblog-5/scrum-model.avif',
}
for e in list(entries):
    if e["src"] in CASE_ALIASES:
        a = dict(e)
        a["src"]  = CASE_ALIASES[e["src"]]
        a["webp"] = CASE_ALIASES.get(e["webp"], e["webp"])
        a["avif"] = CASE_ALIASES.get(e["avif"], e["avif"]) if e["avif"] else None
        a["caseAliasOf"] = e["src"]
        e["caseAlias"] = a["src"]
        entries.append(a)

entries.sort(key=lambda e: e["src"])
tot_o = sum(e["bytes"]["original"] for e in entries)
tot_w = sum(e["bytes"]["webp"] for e in entries)
tot_a = sum(e["bytes"]["avif"] or 0 for e in entries)
with_avif = sum(1 for e in entries if e["avif"])

doc = {
    "$comment": (
        "AUTO-GENERATED by tools/optimize-images.sh. Do not edit by hand. "
        "This is the image contract for every page task: 'w' and 'h' are the REAL "
        "intrinsic pixels of the file named in 'webp' and MUST be copied verbatim into "
        "the width/height attributes of the <img> so CLS stays at 0. "
        "All paths are repo-root-relative; pages under blog/ or wy/ must prefix '../'. "
        "Never emit a root-absolute path - the site is served from /minthep-portfolio/."
    ),
    "generated": datetime.date.today().isoformat(),
    "usage": {
        "picture": (
            "<picture>"
            "<source srcset=\"{avif}\" type=\"image/avif\">"
            "<source srcset=\"{webp}\" type=\"image/webp\">"
            "<img src=\"{src}\" width=\"{w}\" height=\"{h}\" alt=\"...\" "
            "loading=\"lazy\" decoding=\"async\"></picture>"
        ),
        "lqip": (
            "Where lqipVar is non-null: link css/lqip.css, then "
            "background-image: var(--lqip-<slot>); background-size: cover; "
            "on the wrapper, and background-color: var(--tint-<slot>) as the "
            "flat fallback. Clear it in JS on the img 'load' event."
        ),
        "note": "avif is null when AVIF was not at least 10% smaller than the WebP sibling; see avifStatus.",
        "caseBug": (
            "blog/textblog-3/Histogram.webp and blog/textblog-5/Scrum-model.webp were "
            "404ing on GitHub Pages because the HTML referenced them lowercase. Both "
            "spellings now exist (added, never renamed). Prefer the exact-cased original."
        ),
    },
    "caseAliases": {
        "blog/textblog-3/Histogram.webp":   "blog/textblog-3/histogram.webp",
        "blog/textblog-3/Histogram.avif":   "blog/textblog-3/histogram.avif",
        "blog/textblog-5/Scrum-model.webp": "blog/textblog-5/scrum-model.webp",
        "blog/textblog-5/Scrum-model.avif": "blog/textblog-5/scrum-model.avif",
    },
    "totals": {
        "entries": len(entries),
        "withAvif": with_avif,
        "bytesOriginal": tot_o,
        "bytesWebp": tot_w,
        "bytesAvif": tot_a,
    },
    "images": entries,
}
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as fh:
    json.dump(doc, fh, indent=2, ensure_ascii=False)
    fh.write("\n")
print(f"wrote {out}: {len(entries)} entries, {with_avif} with AVIF")
PY

echo
echo "done. Originals untouched; every derived file is a sibling."

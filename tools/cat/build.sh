#!/bin/sh
# Rebuild the shelf cat: its sprite sheets in images/ and cat.js, from the seven source videos.
#
#   tools/cat/build.sh <videos dir> [work dir]
#
# The videos dir holds walk.mp4, startstop.mp4, idle.mp4, sit.mp4, jump.mp4, turn.mp4 and
# pet.mp4 (736x400, 24fps; see README.md). Set OUT to write the sheets and cat.js somewhere
# other than the repository, to compare a rebuild with what's there.
set -e
TOOLS=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$TOOLS/../.." && pwd)
VIDEOS=$1
WORK=${2:-$(mktemp -d)}
OUT=${OUT:-$ROOT}
[ -n "$VIDEOS" ] || { echo "usage: $0 <videos dir> [work dir]" >&2; exit 1; }
mkdir -p "$WORK" "$OUT/images"
echo "work files in $WORK"

# black-on-white silhouettes, eyes and fur sheen filled in
for clip in walk startstop idle sit jump turn pet; do
  ffmpeg -v error -y -i "$VIDEOS/$clip.mp4" -map 0:v:0 -pix_fmt gray -f rawvideo "$WORK/$clip.gray"
  node "$TOOLS/silhouettes.js" "$WORK/$clip.gray" 736 400 "$WORK/$clip.mask" "$WORK/$clip.json" > /dev/null
done

# the walk: video frames 40-140, interpolated to 96fps, one stride from 119 (22.75 video frames)
# with its last third morphed into the stride before, one ear shape and a smooth neck throughout
smooth='gblur=sigma=1.6,lut=y=if(lt(val\,128)\,0\,255)'
node "$TOOLS/walk-frames.js" "$WORK/walk.gray" 736 400 40 100 "$WORK/walk-span.gray" > /dev/null
ffmpeg -v error -y -f rawvideo -pix_fmt gray -s 576x384 -r 24 -i "$WORK/walk-span.gray" \
  -vf "format=yuv444p,minterpolate=fps=96:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=none" \
  -pix_fmt gray -f rawvideo "$WORK/walk-span96.gray"
node "$TOOLS/loop-morph.js" "$WORK/walk-span96.gray" 576 384 119 91 32 "$WORK/walk-loop.gray" > /dev/null
ffmpeg -v error -y -f rawvideo -pix_fmt gray -s 576x384 -i "$WORK/walk-loop.gray" -vf "$smooth" -pix_fmt gray -f rawvideo "$WORK/walk-loop-smooth.gray"
node "$TOOLS/fix-head.js" "$WORK/walk-loop-smooth.gray" 91 30 "$WORK/walk-head.gray" > /dev/null
ffmpeg -v error -y -f rawvideo -pix_fmt gray -s 576x384 -i "$WORK/walk-head.gray" -vf "$smooth" -pix_fmt gray -f rawvideo "$WORK/walk3x.gray"
node "$TOOLS/walk-travel.js" "$WORK/walk3x.gray" "$WORK" "$WORK/walk-travel.json"

# every other behaviour in the same cell, joined through matching poses
node "$TOOLS/place.js" "$WORK" "$WORK/walk3x.gray" "$WORK"
node "$TOOLS/join.js" "$WORK"
node "$TOOLS/turn.js" "$WORK" "$WORK"
node "$TOOLS/pet.js" "$WORK" "$WORK"
node "$TOOLS/sheets.js" "$WORK" "$OUT/images" "$WORK/walk-travel.json"
node "$TOOLS/bridges.js" "$WORK" "$OUT/images"
node "$TOOLS/clean.js" "$WORK" "$OUT/images" walk idle start stop sitdown sitloop standup jump turn petin petloop petout tapjump tapstand

# cat.js, with the sheets' cache version moved on
version=$(( $(sed -n 's/^const version = \([0-9]*\);/\1/p' "$ROOT/cat.js") + 1 ))
node "$TOOLS/cat-js.js" "$TOOLS/cat.template.js" "$WORK/cat-clips.json" "$WORK/walk-travel.json" "$version" "$OUT/cat.js"
if [ "$OUT" = "$ROOT" ]; then
  sed -i.bak 's|/cat\.js?v=\([0-9]*\)|/cat.js?v='"$version"'|' "$ROOT/index.html" && rm "$ROOT/index.html.bak"
fi
echo "done: sheets in $OUT/images, $OUT/cat.js (version $version)"

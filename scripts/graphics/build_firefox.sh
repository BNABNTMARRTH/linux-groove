#!/usr/bin/env bash
# Native ARM64 source build. Run only inside the disposable Linux builder.
set -euo pipefail
PREFIX=${PREFIX:-/opt/groove-graphics}
LOCK=${LOCK:-/workspace/scripts/graphics/firefox-source.lock.json}
locked_version=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$LOCK")
FIREFOX_VERSION=${FIREFOX_VERSION:-$locked_version}
[[ "$FIREFOX_VERSION" == "$locked_version" ]] || { echo "Update and review the source lock before changing Firefox" >&2; exit 1; }
WORK=${WORK:-/tmp/groove-firefox-build}
JOBS=${JOBS:-1}
OBJECT_DIR=${OBJECT_DIR:-/tmp/groove-firefox-objects/build}
mkdir -p "$WORK"
cd "$WORK"
SOURCE="firefox-${FIREFOX_VERSION}.source.tar.xz"
BASE_URL="https://archive.mozilla.org/pub/firefox/releases/${FIREFOX_VERSION}"
curl -fL --retry 3 "${BASE_URL}/SHA512SUMS" -o SHA512SUMS
if [[ ! -f "$SOURCE" ]]; then
    curl -fL --retry 3 "${BASE_URL}/source/${SOURCE}" -o "${SOURCE}.part"
    mv "${SOURCE}.part" "$SOURCE"
fi
python3 - "$SOURCE" "$LOCK" <<'PY'
import hashlib,sys,json
from pathlib import Path
name=sys.argv[1]
locked=json.loads(Path(sys.argv[2]).read_text())
rows=[l.split() for l in Path('SHA512SUMS').read_text().splitlines() if len(l.split())==2]
expected=next(h for h,p in rows if p=='source/'+name)
if expected!=locked['sha512'] or name!=locked['filename']:raise SystemExit('Mozilla checksum disagrees with the reviewed source lock')
h=hashlib.sha512()
with open(name,'rb') as f:
    for block in iter(lambda:f.read(4*1024*1024),b''):h.update(block)
if h.hexdigest()!=expected:raise SystemExit('Firefox source SHA512 mismatch')
Path('SOURCE.sha512').write_text(expected+'  '+name+'\n')
PY
if [[ ${FETCH_ONLY:-0} == 1 ]]; then exit 0; fi
if [[ ! -d source ]]; then
    mkdir source
    tar -xf "$SOURCE" -C source --strip-components=1
fi
cd source
export PATH="$PREFIX/bin:$PATH"
export LD_LIBRARY_PATH="$PREFIX/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig:$PREFIX/share/pkgconfig"
export PKG_CONFIG_LIBDIR="$PKG_CONFIG_PATH"
# Firefox resets pkg-config paths when a sysroot is selected. Keep the runtime
# dependency boundary explicit through this build-only wrapper.
cat > "$WORK/pkg-config" <<PKG
#!/bin/sh
export PKG_CONFIG_PATH=$PREFIX/lib/pkgconfig:$PREFIX/share/pkgconfig
export PKG_CONFIG_LIBDIR=$PREFIX/lib/pkgconfig:$PREFIX/share/pkgconfig
export PKG_CONFIG_SYSROOT_DIR=/
exec /usr/bin/pkg-config "\$@"
PKG
chmod +x "$WORK/pkg-config"
export PKG_CONFIG="$WORK/pkg-config"
export LDFLAGS="-L$PREFIX/lib -Wl,-rpath,$PREFIX/lib"
export CPPFLAGS="-I$PREFIX/include"
export MOZBUILD_STATE_PATH="$WORK/mozbuild"
cat > .mozconfig <<CONFIG
mk_add_options MOZ_OBJDIR=$OBJECT_DIR
mk_add_options MOZ_MAKE_FLAGS=-j$JOBS
ac_add_options --prefix=$PREFIX
ac_add_options --enable-application=browser
ac_add_options --disable-debug
ac_add_options --disable-debug-symbols
ac_add_options --disable-tests
ac_add_options --disable-updater
ac_add_options --disable-crashreporter
ac_add_options --enable-optimize=-O1
ac_add_options --enable-audio-backends=alsa
ac_add_options --enable-bootstrap
ac_add_options --with-sysroot=/
CONFIG
./mach build
./mach install

#!/bin/sh
# Builder-only GTK/XFWM appearance check; not compositor/GPU/UTM acceptance.
set -eu
: "${ROOT:?Set ROOT to the generated staging tree}"
prefix=/opt/groove-graphics
source_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
qa=$(mktemp -d /tmp/groove-window-render.XXXXXX)
export HOME="$qa/home"
mkdir -p "$HOME" "$qa/output"
export PATH=$prefix/bin:/usr/bin:/bin
export LD_LIBRARY_PATH=$prefix/lib
export XDG_DATA_DIRS=$ROOT/usr/share:$prefix/share:/usr/share
export XDG_CONFIG_DIRS=$ROOT/etc/xdg/groove-xfce:$ROOT/etc/xdg:$prefix/etc/xdg
export FONTCONFIG_FILE="$qa/fonts.conf"
# Relocate font paths only for this outside-chroot test. The ISO uses native paths.
cat > "$FONTCONFIG_FILE" <<EOF
<fontconfig><dir>$ROOT/usr/share/fonts</dir><dir>$prefix/share/fonts</dir><cachedir>$qa/font-cache</cachedir><match target="font"><edit name="antialias" mode="assign"><bool>true</bool></edit><edit name="hintstyle" mode="assign"><const>hintslight</const></edit><edit name="rgba" mode="assign"><const>none</const></edit></match></fontconfig>
EOF
export GDK_PIXBUF_MODULE_FILE=$prefix/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache
export PKG_CONFIG_LIBDIR=$prefix/lib/pkgconfig:$prefix/share/pkgconfig
cc "$source_dir/window_design_smoke.c" $(pkg-config --cflags --libs gtk+-3.0) -Wl,-rpath,$prefix/lib -o "$qa/smoke"
cc "$source_dir/window_design_pointer.c" $(pkg-config --cflags --libs x11) -Wl,-rpath,$prefix/lib -o "$qa/pointer"
export DISPLAY=:89
export QA_DIR="$qa"
/bin/Xvfb :89 -screen 0 "${QA_RESOLUTION:-1280x800}x24" -ac >"$qa/output/xvfb.log" 2>&1 &
xpid=$!
trap 'kill "$xpid" 2>/dev/null || true; wait "$xpid" 2>/dev/null || true' EXIT
sleep 1
$prefix/bin/dbus-run-session -- sh -eu -c '
xfsettingsd --no-daemon >"$QA_DIR/output/settings.log" 2>&1 &
settings_pid=$!
xfwm4 --compositor=off --replace >"$QA_DIR/output/xfwm.log" 2>&1 &
wm_pid=$!
trap '\''kill "$settings_pid" "$wm_pid" 2>/dev/null || true; wait "$settings_pid" "$wm_pid" 2>/dev/null || true'\'' EXIT
sleep 2
xfconf-query -c xfwm4 -p /general/use_compositing -s false
if [ "${QA_SCALE:-1}" = 2 ]; then
    xfconf-query -c xfwm4 -p /general/theme -s GrooveWindow-2x
    xfconf-query -c xfwm4 -p /general/title_font -s "Inter Medium 21"
    export GDK_SCALE=2
fi
"$QA_DIR/smoke" "$ROOT/usr/share/themes/GrooveWindow/gtk-3.0/gtk.css" >"$QA_DIR/output/gtk.log" 2>&1 &
app_pid=$!
sleep 5
kill -0 "$app_pid"
"$QA_DIR/pointer" "$((729 * ${QA_SCALE:-1}))" "$((108 * ${QA_SCALE:-1}))"
sleep 1
LD_LIBRARY_PATH= /bin/import -window root "$QA_DIR/output/desktop.png"
kill "$app_pid"
wait "$app_pid" 2>/dev/null || true
'
if grep -E 'CSS:|Theme parsing error|Pango-WARNING|failed to create' "$qa/output/gtk.log"; then exit 1; fi
printf 'Appearance evidence (composition OFF): %s/output\n' "$qa"

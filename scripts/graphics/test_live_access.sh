#!/usr/bin/env bash
# Run as root in the disposable Linux builder against staging, not the host.
set -euo pipefail
ROOT=${1:?staging root required}
PREFIX=/opt/groove-graphics
[[ "$ROOT" != / && -f "$ROOT/etc/os-release" ]]
mkdir -p "$ROOT/tmp" "$ROOT/run/groove"
if [[ -f "$ROOT/usr/bin/pacman" ]]; then
    cp /workspace/tests/pam_session_probe.c "$ROOT/tmp/pam_session_probe.c"
    chroot "$ROOT" cc /tmp/pam_session_probe.c -lpam -o /tmp/groove-pam-probe
    rm -f "$ROOT/tmp/pam_session_probe.c"
else
    gcc -I"$PREFIX/include" -L"$PREFIX/lib" -Wl,-rpath,"$PREFIX/lib" /workspace/tests/pam_session_probe.c -lpam -o "$ROOT/tmp/groove-pam-probe"
fi
mounted_dev=0
mkdir -p "$ROOT/dev"
if [[ ! -c "$ROOT/dev/null" ]]; then
    mount --bind /dev "$ROOT/dev"
    mounted_dev=1
fi
marker="$ROOT/run/groove/live"
[[ ! -e "$marker" ]] || { echo 'Refusing a staging root that already contains a live marker' >&2; exit 1; }
cleanup() { rm -f "$marker" "$ROOT/tmp/groove-pam-probe"; if [[ "$mounted_dev" == 1 ]]; then umount "$ROOT/dev"; fi; }
trap cleanup EXIT
expect_denied() {
    if chroot "$ROOT" /tmp/groove-pam-probe "$1"; then echo "Unexpected passwordless access for $1" >&2; exit 1; fi
}
expect_denied groove
printf '%s\n' LINUX_GROOVE_LIVE > "$marker"
chown 0:0 "$marker"
chroot "$ROOT" /tmp/groove-pam-probe groove
expect_denied root
chown 1000:1000 "$marker"
expect_denied groove
rm "$marker"
ln -s /etc/issue "$marker"
expect_denied groove
rm "$marker"
echo 'PASS: passwordless PAM is limited to groove on a genuine LiveUSB marker'

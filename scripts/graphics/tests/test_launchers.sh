#!/usr/bin/env bash
# Exercise real status propagation/logging inside the staged LFS runtime.
set -euo pipefail
root=${1:?staging root required}
[[ "$root" != / && -x "$root/usr/libexec/groove-launch" ]]
home=/tmp/groove-launch-check
mkdir -p "$root$home"
chown 1000:1000 "$root$home"
trap 'rm -rf "$root$home"' EXIT
chroot --userspec=1000:1000 "$root" /usr/bin/env HOME="$home" \
    /usr/libexec/groove-launch Prueba success /usr/bin/printf 'launcher-ok\n'
[[ $(cat "$root$home/.local/state/groove/launch-success.log") == launcher-ok ]]
result=0
chroot --userspec=1000:1000 "$root" /usr/bin/env HOME="$home" \
    /usr/libexec/groove-launch Prueba failure /bin/sh -c 'echo launch-failed >&2; exit 23' || result=$?
[[ "$result" == 23 ]]
grep -q launch-failed "$root$home/.local/state/groove/launch-failure.log"
grep -q 'Exit status: 23' "$root$home/.local/state/groove/launch-failure.log"
result=0
chroot --userspec=1000:1000 "$root" /opt/groove-graphics/bin/groove-desktop 2>/dev/null || result=$?
[[ "$result" == 1 ]] # Root coordination cannot be invoked by a desktop user.
echo 'Shared launchers: success, failure status and logs verified as groove'

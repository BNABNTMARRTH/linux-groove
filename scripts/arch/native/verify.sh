#!/bin/bash
set -euo pipefail
: "${ROOT:?}"
[[ -x "$ROOT/usr/lib/systemd/systemd" ]]
[[ $(readlink "$ROOT/usr/bin/init") == ../lib/systemd/systemd ]]
[[ ! -e "$ROOT/usr/bin/groove-init" && ! -e "$ROOT/opt/groove-wayfire" ]]
for package in linux-aarch64 sddm networkmanager plasma-workspace wayfire wf-shell pipewire wireplumber rtkit qemu-guest-agent inter-font groove-platform; do
  chroot "$ROOT" pacman -Q "$package"
done
chroot "$ROOT" pacman -Qk groove-platform
chroot "$ROOT" fc-match Inter | grep -i Inter
! grep -R -E 'LIBGL_ALWAYS_SOFTWARE|WLR_NO_HARDWARE_CURSORS|QT_SCALE_FACTOR|GDK_SCALE|@wheel.*rtprio' "$ROOT/etc/environment" "$ROOT/etc/profile.d" "$ROOT/etc/security/limits.d"
[[ $(readlink "$ROOT/etc/systemd/system/default.target") == /usr/lib/systemd/system/graphical.target ]]
[[ $(readlink "$ROOT/etc/systemd/system/display-manager.service") == /usr/lib/systemd/system/sddm.service ]]
[[ $(readlink "$ROOT/etc/systemd/system/systemd-bless-boot.service") == /dev/null ]]
python3 - "$ROOT" <<'PY'
import pathlib,sys,json
r=pathlib.Path(sys.argv[1])
json.loads((r/'usr/share/groove/design.json').read_text())
for p in (r/'etc/xdg/autostart').glob('*.desktop'):
 assert not any(x in p.read_text() for x in ('picom','xfwm4','groove-init'))
for f in ['usr/bin/groove-update','usr/bin/groove-profile','usr/bin/groove-diagnostics']:
 assert (r/f).stat().st_mode & 0o111
print('Native root static checks passed; UTM acceptance remains separate.')
PY

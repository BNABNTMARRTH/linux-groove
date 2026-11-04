#!/bin/bash
set -e

mkdir -p /mnt/lfs/etc /mnt/lfs/home/groove /mnt/lfs/root

cat << 'EOF' > /mnt/lfs/etc/os-release
NAME="Linux Groove OS"
PRETTY_NAME="Linux Groove OS - The Blue Note Edition"
ID=groove
ID_LIKE=lfs
VERSION="0.1.0"
VERSION_CODENAME="Blue Note"
VERSION_ID="0.1.0"
HOME_URL="https://github.com/BNABNTMARRTH/linux-groove"
SUPPORT_URL="https://github.com/BNABNTMARRTH/linux-groove/issues"
BUG_REPORT_URL="https://github.com/BNABNTMARRTH/linux-groove/issues"
EOF

cat << 'EOF' > /mnt/lfs/etc/issue
🎷 Linux Groove OS 0.1.0 (The Blue Note Edition)
   "Where Rust meets the improvisation of Sound and Code"

EOF

cat << 'EOF' > /mnt/lfs/etc/passwd
root:x:0:0:root:/root:/bin/bash
bin:x:1:1:bin:/dev/null:/bin/false
messagebus:x:18:18:D-Bus Message Daemon User:/run/dbus:/bin/false
groove:x:1000:1000:Groove Artist:/home/groove:/bin/bash
EOF

cat << 'EOF' > /mnt/lfs/etc/group
root:x:0:
bin:x:1:
sys:x:2:
kmem:x:3:
tape:x:4:
tty:x:5:
daemon:x:6:
floppy:x:7:
disk:x:8:
lp:x:9:
dialout:x:10:
audio:x:11:groove
video:x:12:groove
messagebus:x:18:
input:x:24:groove
wheel:x:99:groove
groove-audio:x:100:groove
groove:x:1000:
EOF

cat << 'EOF' > /mnt/lfs/etc/fstab
# /etc/fstab: static file system information.
LABEL=GROOVE_ROOT /             ext4    noatime,defaults 0       1
LABEL=GROOVE_BOOT /boot/efi      vfat    defaults        0       2
tmpfs            /run           tmpfs   defaults        0       0
devpts           /dev/pts       devpts  gid=5,mode=620  0       0
sysfs            /sys           sysfs   defaults        0       0
proc             /proc          proc    defaults        0       0
tmpfs            /dev/shm       tmpfs   mode=1777       0       0
EOF

mkdir -p /mnt/lfs/etc/security/limits.d
cat << 'EOF' > /mnt/lfs/etc/security/limits.d/99-groove-rt.conf
@groove-audio   -   rtprio          98
@groove-audio   -   memlock         unlimited
@groove-audio   -   nice            -19
EOF

mkdir -p /mnt/lfs/etc/groove/services
cat << 'EOF' > /mnt/lfs/etc/groove/services/dbus.toml
[service]
name = "dbus"
description = "D-Bus System Message Bus"
after = []
requires = []
restart = "always"
max_retries = 5

[exec]
command = "/usr/bin/dbus-daemon"
args = ["--system", "--nofork", "--nopidfile"]
user = "messagebus"
group = "messagebus"
environment = {}
EOF

cat << 'EOF' > /mnt/lfs/etc/groove/services/pipewire-rt.toml
[service]
name = "pipewire-rt"
description = "PipeWire Low-Latency Audio Server (PREEMPT_RT)"
after = ["dbus"]
requires = ["dbus"]
restart = "always"
max_retries = 5

[exec]
command = "/usr/bin/pipewire"
args = []
user = "groove"
group = "groove-audio"
environment = { PIPEWIRE_LATENCY = "64/48000" }

[limits]
rt_priority = 98
memlock = "unlimited"
nice = -19
EOF

cat << 'EOF' > /mnt/lfs/etc/groove/services/groove-compositor.toml
[service]
name = "groove-compositor"
description = "Groove Wayland Compositor (Velvet & Brass UI)"
after = ["pipewire-rt"]
requires = ["pipewire-rt"]
restart = "on-failure"
max_retries = 3

[exec]
command = "/usr/bin/groove-compositor"
args = []
user = "groove"
group = "groove"
environment = { XDG_RUNTIME_DIR = "/run/user/1000", WAYLAND_DISPLAY = "wayland-0" }

[limits]
rt_priority = 85
nice = -10
EOF

echo 'nameserver 1.1.1.1' > /mnt/lfs/etc/resolv.conf
echo '127.0.0.1 localhost linux-groove' > /mnt/lfs/etc/hosts
echo 'linux-groove' > /mnt/lfs/etc/hostname
chmod 1777 /mnt/lfs/tmp /mnt/lfs/var/tmp || true
chown -R 1000:1000 /mnt/lfs/home/groove || true

echo "=== Configuración de Linux Groove OS instalada exitosamente ==="


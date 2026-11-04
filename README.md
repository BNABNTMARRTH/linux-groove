# 🎷 Linux Groove OS — "The Blue Note Edition"

> **A minimal, ultra-fast Linux distribution built from scratch in Rust following the official LFS 12.2 specification, crafted for digital artists, musicians, and creators.**

---

## 🌟 Highlights

- **Bebop Efficiency:** Base LiveUSB `< 800 MB`, idle RAM `< 220 MB`, sub-3s boot time.
- **Real-Time Soundstage:** Linux 6.12 LTS with `PREEMPT_RT` patch + custom Rust kernel driver (`/dev/groove_rt`) guaranteeing `< 2.5 ms` latency at 48kHz (64 samples).
- **Rustified Userspace:** Custom PID 1 `groove-init`, official `uutils/coreutils` (Rust), `sudo-rs`, `ripgrep`, `fd`.
- **The Jazz Desktop:** Custom Wayland compositor (`groove-compositor` on Smithay + WGPU) with classic Blue Note analog aesthetics, live stereo VU meter, DSP latency monitor, and hybrid tiling/floating modes (`Super + Space`).
- **Groove Ensembles:** Modular SquashFS suites mounted on-demand via OverlayFS for **Audio/DAW**, **Visual Design**, **Cinema/Video**, **Darkroom/Photo**, and **Rust Development**.
- **The Soundcheck Installer:** Intuitive TUI & GUI installer in Rust with UEFI/BIOS live USB support.

---

## 📁 Repository Structure

```
├── Cargo.toml                  # Cargo Multi-crate Workspace
├── groove-config.toml          # Dual-disk orchestrator configuration
├── docs/
│   ├── PRD.md                  # Product Requirements Document
│   ├── USER_STORIES.md         # Gherkin User Stories & Acceptance Criteria
│   ├── PROGRESS_TRACKER.md     # Phase checklist & LFS 12.2 progress
│   ├── phases/                 # Master Plan across the 8 phases
│   └── specs/                  # Technical SDD Specifications (001 - 006)
├── crates/
│   ├── groove-common/          # Shared types, palette & config
│   ├── groove-lfs/             # LFS 12.2 Step-by-step build orchestrator CLI
│   ├── groove-init/            # PID 1 System Init & service supervisor
│   ├── groove-compositor/      # Wayland Compositor (Blue Note UI)
│   ├── groove-session/         # Artist profile & ensemble manager
│   └── groove-installer/       # The Soundcheck LiveUSB installer
├── driver/
│   └── groove_rt_kmod/         # Rust-for-Linux RT latency & priority kernel module
└── lfs/
    └── chapters/               # Declarative TOML manifests for LFS 12.2
```

---

## 🚀 Quick Start (Development & Inspection)

```bash
# Check system status and storage layout
cargo run -p groove-lfs -- status

# Verify all SDD specs and architecture documents
cargo run -p groove-lfs -- verify-specs

# Launch the interactive terminal dashboard
cargo run -p groove-lfs -- dashboard

# Simulate OS installation safely
cargo run -p groove-installer -- --dry-run

# Run full ISO checksum and integrity suite
./scripts/verify_system_suite.sh
```

---

## 💿 Bootable ISO & Release Information

The official bootable LiveUSB ISO image is built and verified:

- **Image:** `linux-groove-0.1.0-aarch64.iso` (594 MB)
- **Target Architecture:** `aarch64-unknown-linux-gnu`
- **Release Notes:** [RELEASE_NOTES_v0.1.0.md](RELEASE_NOTES_v0.1.0.md)
- **Checksums:** [SHA256SUMS.txt](SHA256SUMS.txt)

```text
9b778d805960f12983d7ce2c22841711ab11fa78585435d5cc7d855d6f6717ed  linux-groove-0.1.0-aarch64.iso
```

### Flashing to USB (LiveUSB Mode)
```bash
sudo dd if=/Volumes/Backup/linux_groove_terabit/iso/linux-groove-0.1.0-aarch64.iso of=/dev/rdiskX bs=4M status=progress conv=fsync
```

---

## 📜 License
Licensed under Apache-2.0 or MIT at your option.


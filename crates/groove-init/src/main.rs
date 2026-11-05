//! Linux Groove PID 1. See docs/specs/003-rust-userspace-init-spec.md.
use nix::sys::signal::{self, SaFlags, SigAction, SigHandler, SigSet, Signal};
use nix::sys::wait::{waitpid, WaitPidFlag, WaitStatus};
use nix::unistd::Pid;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs::{self, OpenOptions};
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

static SHUTDOWN: AtomicBool = AtomicBool::new(false);
extern "C" fn request_shutdown(_: i32) {
    SHUTDOWN.store(true, Ordering::Relaxed);
}
fn restart_default() -> String {
    "on-failure".into()
}
fn retries_default() -> u32 {
    3
}
fn timeout_default() -> u64 {
    10_000
}
fn kind_default() -> String {
    "simple".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceManifest {
    pub service: ServiceMeta,
    pub exec: ServiceExec,
    pub limits: Option<ServiceLimits>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceMeta {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub after: Vec<String>,
    #[serde(default)]
    pub requires: Vec<String>,
    #[serde(default = "restart_default")]
    pub restart: String,
    #[serde(default = "retries_default")]
    pub max_retries: u32,
    #[serde(default = "kind_default")]
    pub kind: String,
    #[serde(default)]
    pub ready_path: Option<PathBuf>,
    #[serde(default = "timeout_default")]
    pub timeout_ms: u64,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceExec {
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    pub user: Option<String>,
    pub group: Option<String>,
    #[serde(default)]
    pub environment: HashMap<String, String>,
    #[serde(default)]
    pub console: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceLimits {
    pub rt_priority: Option<i32>,
    pub memlock: Option<String>,
    pub nice: Option<i32>,
}

/// Validate before spawning anything. `after` orders existing services, while
/// `requires` also makes a missing or failed dependency fatal for its consumer.
fn service_order(manifests: &HashMap<String, ServiceManifest>) -> Result<Vec<String>, String> {
    fn visit(
        name: &str,
        all: &HashMap<String, ServiceManifest>,
        visiting: &mut HashSet<String>,
        done: &mut HashSet<String>,
        out: &mut Vec<String>,
    ) -> Result<(), String> {
        if done.contains(name) {
            return Ok(());
        }
        if !visiting.insert(name.into()) {
            return Err(format!("dependency cycle at {name}"));
        }
        let m = &all[name];
        if name.is_empty()
            || !name
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || b"_-.".contains(&c))
            || name != &m.service.name
        {
            return Err(format!("invalid service name: {name}"));
        }
        if !["always", "on-failure", "never"].contains(&m.service.restart.as_str())
            || !["simple", "oneshot"].contains(&m.service.kind.as_str())
            || m.service.timeout_ms == 0
        {
            return Err(format!("invalid service policy: {name}"));
        }
        if !Path::new(&m.exec.command).is_absolute() {
            return Err(format!("service {name}: executable must be absolute"));
        }
        for dep in &m.service.requires {
            if !all.contains_key(dep) {
                return Err(format!("service {name} requires missing {dep}"));
            }
        }
        let mut deps = m
            .service
            .after
            .iter()
            .chain(&m.service.requires)
            .filter(|dep| all.contains_key(*dep))
            .collect::<Vec<_>>();
        deps.sort();
        deps.dedup();
        for dep in deps {
            visit(dep, all, visiting, done, out)?;
        }
        visiting.remove(name);
        done.insert(name.into());
        out.push(name.into());
        Ok(())
    }
    let mut names = manifests.keys().cloned().collect::<Vec<_>>();
    names.sort();
    let (mut visiting, mut done, mut out) = (HashSet::new(), HashSet::new(), Vec::new());
    for name in names {
        visit(&name, manifests, &mut visiting, &mut done, &mut out)?;
    }
    Ok(out)
}
fn read_manifests(dir: &Path) -> Result<HashMap<String, ServiceManifest>, String> {
    let mut all = HashMap::new();
    for entry in fs::read_dir(dir).map_err(|e| format!("{}: {e}", dir.display()))? {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().and_then(|s| s.to_str()) != Some("toml") {
            continue;
        }
        let manifest: ServiceManifest =
            toml::from_str(&fs::read_to_string(&path).map_err(|e| e.to_string())?)
                .map_err(|e| format!("{}: {e}", path.display()))?;
        let name = manifest.service.name.clone();
        if all.insert(name.clone(), manifest).is_some() {
            return Err(format!("duplicate service: {name}"));
        }
    }
    service_order(&all)?;
    Ok(all)
}

#[cfg(target_os = "linux")]
fn configure_identity(
    cmd: &mut Command,
    exec: &ServiceExec,
    limits: &Option<ServiceLimits>,
) -> io::Result<()> {
    use nix::unistd::{getgrouplist, Group, User};
    use std::ffi::CString;
    use std::os::unix::process::CommandExt;
    let user = exec
        .user
        .as_ref()
        .map(|name| {
            User::from_name(name)
                .map_err(io::Error::from)
                .and_then(|u| {
                    u.ok_or_else(|| {
                        io::Error::new(io::ErrorKind::NotFound, format!("unknown user {name}"))
                    })
                })
        })
        .transpose()?;
    let group = exec
        .group
        .as_ref()
        .map(|name| {
            Group::from_name(name)
                .map_err(io::Error::from)
                .and_then(|g| {
                    g.ok_or_else(|| {
                        io::Error::new(io::ErrorKind::NotFound, format!("unknown group {name}"))
                    })
                })
        })
        .transpose()?;
    let gid = group
        .as_ref()
        .map(|g| g.gid)
        .or(user.as_ref().map(|u| u.gid));
    let groups = match &user {
        Some(u) => getgrouplist(&CString::new(u.name.as_str())?, gid.unwrap())
            .map_err(io::Error::from)?
            .iter()
            .map(|g| g.as_raw())
            .collect(),
        None => Vec::new(),
    };
    let uid = user.as_ref().map(|u| u.uid.as_raw());
    if let Some(u) = user {
        cmd.env("HOME", u.dir)
            .env("USER", &u.name)
            .env("LOGNAME", u.name);
    }
    let limits = limits.clone();
    // All data and account lookups are prepared in the parent. The child only
    // makes syscalls before exec; supplementary groups are set before setuid.
    unsafe {
        cmd.pre_exec(move || {
            if nix::libc::setsid() < 0 {
                return Err(io::Error::last_os_error());
            }
            if let Some(l) = &limits {
                if let Some(nice) = l.nice {
                    if nix::libc::setpriority(nix::libc::PRIO_PROCESS, 0, nice) != 0 {
                        return Err(io::Error::last_os_error());
                    }
                }
                if let Some(memlock) = &l.memlock {
                    let value = if memlock == "unlimited" {
                        nix::libc::RLIM_INFINITY
                    } else {
                        memlock.parse().map_err(|_| {
                            io::Error::new(io::ErrorKind::InvalidInput, "invalid memlock")
                        })?
                    };
                    let limit = nix::libc::rlimit {
                        rlim_cur: value,
                        rlim_max: value,
                    };
                    if nix::libc::setrlimit(nix::libc::RLIMIT_MEMLOCK, &limit) != 0 {
                        return Err(io::Error::last_os_error());
                    }
                }
                if let Some(priority) = l.rt_priority {
                    let param = nix::libc::sched_param {
                        sched_priority: priority,
                    };
                    if nix::libc::sched_setscheduler(0, nix::libc::SCHED_FIFO, &param) != 0 {
                        return Err(io::Error::last_os_error());
                    }
                }
            }
            if uid.is_some() || gid.is_some() {
                if nix::libc::setgroups(groups.len(), groups.as_ptr()) != 0 {
                    return Err(io::Error::last_os_error());
                }
                if let Some(gid) = gid {
                    if nix::libc::setgid(gid.as_raw()) != 0 {
                        return Err(io::Error::last_os_error());
                    }
                }
                if let Some(uid) = uid {
                    if nix::libc::setuid(uid) != 0 {
                        return Err(io::Error::last_os_error());
                    }
                }
            }
            Ok(())
        });
    }
    Ok(())
}
#[cfg(not(target_os = "linux"))]
fn configure_identity(
    _: &mut Command,
    exec: &ServiceExec,
    limits: &Option<ServiceLimits>,
) -> io::Result<()> {
    if exec.user.is_some() || exec.group.is_some() || limits.is_some() {
        return Err(io::Error::new(
            io::ErrorKind::Unsupported,
            "service credentials/limits require Linux",
        ));
    }
    Ok(())
}

struct Running {
    pid: Pid,
    ready: bool,
    started: Instant,
}
struct Supervisor {
    manifests: HashMap<String, ServiceManifest>,
    order: Vec<String>,
    running: HashMap<String, Running>,
    completed: HashSet<String>,
    failed: HashSet<String>,
    retries: HashMap<String, u32>,
    retry_at: HashMap<String, Instant>,
    log_dir: PathBuf,
}
impl Supervisor {
    fn new(manifests: HashMap<String, ServiceManifest>, log_dir: PathBuf) -> Result<Self, String> {
        let order = service_order(&manifests)?;
        Ok(Self {
            manifests,
            order,
            running: HashMap::new(),
            completed: HashSet::new(),
            failed: HashSet::new(),
            retries: HashMap::new(),
            retry_at: HashMap::new(),
            log_dir,
        })
    }
    fn active(&self, name: &str) -> bool {
        self.completed.contains(name) || self.running.get(name).is_some_and(|r| r.ready)
    }
    fn failure(&mut self, name: &str, success: bool) {
        let m = &self.manifests[name];
        let count = self.retries.entry(name.into()).or_default();
        let restart =
            m.service.restart == "always" || (!success && m.service.restart == "on-failure");
        if restart && *count < m.service.max_retries {
            *count += 1;
            self.retry_at.insert(
                name.into(),
                Instant::now() + Duration::from_millis(500 * u64::from(*count)),
            );
        } else if success && m.service.kind == "oneshot" {
            self.completed.insert(name.into());
        } else {
            self.failed.insert(name.into());
        }
    }
    fn spawn(&mut self, name: &str) -> io::Result<()> {
        let m = &self.manifests[name];
        let mut cmd = Command::new(&m.exec.command);
        cmd.args(&m.exec.args).envs(&m.exec.environment);
        if !m.exec.console {
            fs::create_dir_all(&self.log_dir)?;
            let log = OpenOptions::new()
                .create(true)
                .append(true)
                .open(self.log_dir.join(format!("{name}.log")))?;
            cmd.stdin(Stdio::null())
                .stdout(log.try_clone()?)
                .stderr(log);
        }
        configure_identity(&mut cmd, &m.exec, &m.limits)?;
        let child = cmd.spawn()?;
        println!("[groove-init] starting {name} pid={}", child.id());
        self.running.insert(
            name.into(),
            Running {
                pid: Pid::from_raw(child.id() as i32),
                ready: m.service.kind == "simple" && m.service.ready_path.is_none(),
                started: Instant::now(),
            },
        );
        Ok(())
    }
    fn terminate(pid: Pid, signal: Signal) {
        #[cfg(target_os = "linux")]
        let _ = signal::kill(Pid::from_raw(-pid.as_raw()), signal);
        let _ = signal::kill(pid, signal);
    }
    fn tick(&mut self) {
        loop {
            let status = match waitpid(Pid::from_raw(-1), Some(WaitPidFlag::WNOHANG)) {
                Ok(WaitStatus::Exited(pid, code)) => Some((pid, code == 0)),
                Ok(WaitStatus::Signaled(pid, _, _)) => Some((pid, false)),
                Ok(WaitStatus::StillAlive) | Err(nix::errno::Errno::ECHILD) => break,
                Err(nix::errno::Errno::EINTR) => continue,
                _ => break,
            };
            if let Some((pid, success)) = status {
                if let Some(name) = self
                    .running
                    .iter()
                    .find_map(|(name, r)| (r.pid == pid).then(|| name.clone()))
                {
                    let runtime = self.running.remove(&name).unwrap().started.elapsed();
                    let is_oneshot = self.manifests[&name].service.kind == "oneshot";
                    if !is_oneshot && runtime >= Duration::from_secs(5) {
                        self.retries.insert(name.clone(), 0);
                    }
                    println!("[groove-init] exited {name} success={success}");
                    self.failure(&name, success);
                }
            }
        }
        for name in self.order.clone() {
            let m = self.manifests[&name].clone();
            let lost_requirement = m.service.requires.iter().any(|dep| !self.active(dep));
            if let Some(r) = self.running.get_mut(&name) {
                if lost_requirement {
                    Self::terminate(r.pid, Signal::SIGKILL);
                    continue;
                }
                if !r.ready
                    && m.service.kind == "simple"
                    && m.service.ready_path.as_ref().is_some_and(|p| p.exists())
                {
                    r.ready = true;
                }
                if !r.ready && r.started.elapsed() > Duration::from_millis(m.service.timeout_ms) {
                    eprintln!("[groove-init] timeout {name}");
                    Self::terminate(r.pid, Signal::SIGKILL);
                }
                continue;
            }
            if self.completed.contains(&name) || self.failed.contains(&name) {
                continue;
            }
            if m.service.requires.iter().any(|d| self.failed.contains(d)) {
                self.failed.insert(name.clone());
                continue;
            }
            if m.service.requires.iter().any(|d| !self.active(d)) {
                continue;
            }
            // Optional ordering edges wait for readiness or a terminal failure.
            if m.service
                .after
                .iter()
                .filter(|d| self.manifests.contains_key(*d))
                .any(|d| !self.active(d) && !self.failed.contains(d))
            {
                continue;
            }
            if self
                .retry_at
                .get(&name)
                .is_some_and(|at| *at > Instant::now())
            {
                continue;
            }
            if let Err(e) = self.spawn(&name) {
                eprintln!("[groove-init] failed {name}: {e}");
                self.failure(&name, false);
            }
        }
    }
    fn shutdown(&mut self) {
        for name in self.order.iter().rev() {
            if let Some(r) = self.running.get(name) {
                Self::terminate(r.pid, Signal::SIGTERM);
            }
        }
        let deadline = Instant::now() + Duration::from_secs(3);
        while Instant::now() < deadline {
            match waitpid(Pid::from_raw(-1), Some(WaitPidFlag::WNOHANG)) {
                Err(nix::errno::Errno::ECHILD) => break,
                _ => std::thread::sleep(Duration::from_millis(25)),
            }
        }
        for r in self.running.values() {
            Self::terminate(r.pid, Signal::SIGKILL);
        }
        let _ = Command::new("/bin/sync").status();
    }
}

#[cfg(target_os = "linux")]
fn setup_mounts() {
    use nix::mount::{mount, MsFlags};
    for (source, target, fstype, opts) in [
        ("proc", "/proc", "proc", ""),
        ("sysfs", "/sys", "sysfs", ""),
        ("devtmpfs", "/dev", "devtmpfs", "mode=0755"),
        ("tmpfs", "/run", "tmpfs", "mode=0755"),
        ("devpts", "/dev/pts", "devpts", "mode=0620,gid=5"),
        ("tmpfs", "/dev/shm", "tmpfs", "mode=1777"),
    ] {
        let _ = fs::create_dir_all(target);
        // Preserve initramfs mounts (including /run/media) across switch_root.
        let mounted = fs::read_to_string("/proc/self/mountinfo")
            .unwrap_or_default()
            .lines()
            .any(|line| line.split_whitespace().nth(4) == Some(target));
        if !mounted {
            if let Err(e) = mount(
                Some(source),
                target,
                Some(fstype),
                MsFlags::MS_NOSUID,
                Some(opts),
            ) {
                eprintln!("[groove-init] mount {target}: {e}");
            }
        }
    }
}
#[cfg(target_os = "linux")]
fn setup_loopback() {
    if let Ok(hostname) = fs::read_to_string("/etc/hostname") {
        let hostname = hostname.trim();
        if !hostname.is_empty() && hostname.len() <= 64 {
            unsafe {
                nix::libc::sethostname(hostname.as_ptr().cast(), hostname.len());
            }
        }
    }
    // Bring up lo without depending on a network utility in the minimal rootfs.
    unsafe {
        let fd = nix::libc::socket(
            nix::libc::AF_INET,
            nix::libc::SOCK_DGRAM | nix::libc::SOCK_CLOEXEC,
            0,
        );
        if fd < 0 {
            eprintln!(
                "[groove-init] loopback socket: {}",
                io::Error::last_os_error()
            );
            return;
        }
        let mut request: nix::libc::ifreq = std::mem::zeroed();
        request.ifr_name[0] = b'l' as nix::libc::c_char;
        request.ifr_name[1] = b'o' as nix::libc::c_char;
        if nix::libc::ioctl(fd, nix::libc::SIOCGIFFLAGS, &mut request) == 0 {
            request.ifr_ifru.ifru_flags |= nix::libc::IFF_UP as nix::libc::c_short;
            if nix::libc::ioctl(fd, nix::libc::SIOCSIFFLAGS, &request) != 0 {
                eprintln!("[groove-init] loopback up: {}", io::Error::last_os_error());
            }
        }
        nix::libc::close(fd);
    }
}

pub fn service_dir_from_cmdline(cmdline: &str) -> &'static str {
    let tokens: Vec<&str> = cmdline.split_whitespace().collect();
    if tokens.iter().any(|s| ["single", "groove.text=1"].contains(s)) {
        "/etc/groove/recovery-services"
    } else if tokens.iter().any(|s| ["groove.wayland=1", "groove.session=weston"].contains(s)) {
        "/etc/groove/wayland-services"
    } else {
        "/etc/groove/services"
    }
}

fn run() -> Result<(), String> {
    let args = std::env::args().collect::<Vec<_>>();
    if args.get(1).map(String::as_str) == Some("--check-services") {
        let dir = args
            .get(2)
            .ok_or("usage: groove-init --check-services DIRECTORY")?;
        let all = read_manifests(Path::new(dir))?;
        println!("{}", service_order(&all)?.join(" -> "));
        return Ok(());
    }
    if std::process::id() != 1 {
        return Err(
            "groove-init must run as PID 1; use --check-services DIRECTORY for validation".into(),
        );
    }
    let action = SigAction::new(
        SigHandler::Handler(request_shutdown),
        SaFlags::SA_RESTART,
        SigSet::empty(),
    );
    unsafe {
        for sig in [Signal::SIGTERM, Signal::SIGINT] {
            signal::sigaction(sig, &action).map_err(|e| e.to_string())?;
        }
    }
    #[cfg(target_os = "linux")]
    setup_mounts();
    #[cfg(target_os = "linux")]
    setup_loopback();
    let cmdline = fs::read_to_string("/proc/cmdline").unwrap_or_default();
    let dir = service_dir_from_cmdline(&cmdline);
    let mut supervisor =
        Supervisor::new(read_manifests(Path::new(dir))?, "/var/log/groove".into())?;
    while !SHUTDOWN.load(Ordering::Relaxed) {
        supervisor.tick();
        std::thread::sleep(Duration::from_millis(100));
    }
    supervisor.shutdown();
    #[cfg(target_os = "linux")]
    {
        nix::unistd::sync();
        nix::sys::reboot::reboot(nix::sys::reboot::RebootMode::RB_POWER_OFF)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
fn main() {
    if let Err(e) = run() {
        eprintln!("[groove-init] {e}");
        if std::process::id() == 1 {
            // Never return from PID 1. Keep an emergency console usable.
            loop {
                let _ = Command::new("/bin/sh").arg("-i").status();
                std::thread::sleep(Duration::from_secs(1));
            }
        }
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    static PROCESS_TEST: std::sync::Mutex<()> = std::sync::Mutex::new(());
    fn manifest(name: &str) -> ServiceManifest {
        toml::from_str(&format!("[service]\nname='{name}'\ndescription='test'\nrestart='never'\n[exec]\ncommand='/usr/bin/true'\n")).unwrap()
    }
    #[test]
    fn orders_required_dependencies_even_without_after() {
        let a = manifest("a");
        let mut b = manifest("b");
        b.service.requires.push("a".into());
        assert_eq!(
            service_order(&HashMap::from([("b".into(), b), ("a".into(), a)])).unwrap(),
            vec!["a", "b"]
        );
    }
    #[test]
    fn rejects_cycles_and_missing_required_services() {
        let mut a = manifest("a");
        a.service.requires.push("missing".into());
        assert!(service_order(&HashMap::from([("a".into(), a.clone())])).is_err());
        a.service.requires = vec!["a".into()];
        assert!(service_order(&HashMap::from([("a".into(), a)])).is_err());
    }
    #[test]
    fn optional_missing_after_is_allowed() {
        let mut a = manifest("a");
        a.service.after.push("optional".into());
        assert!(service_order(&HashMap::from([("a".into(), a)])).is_ok());
    }
    #[test]
    fn failed_requirement_blocks_consumer_and_retries_are_bounded() {
        let _guard = PROCESS_TEST.lock().unwrap();
        let mut a = manifest("a");
        a.exec.command = "/definitely/missing".into();
        a.service.restart = "on-failure".into();
        a.service.max_retries = 1;
        let mut b = manifest("b");
        b.service.requires.push("a".into());
        let mut s = Supervisor::new(
            HashMap::from([("a".into(), a), ("b".into(), b)]),
            std::env::temp_dir().join(format!("groove-init-test-{}", std::process::id())),
        )
        .unwrap();
        s.tick();
        assert_eq!(s.retries["a"], 1);
        assert!(!s.running.contains_key("b"));
        s.retry_at.clear();
        s.tick();
        assert!(s.failed.contains("a"));
        assert!(s.failed.contains("b"));
        let _ = fs::remove_dir_all(s.log_dir);
    }
    #[test]
    fn successful_daemon_exit_is_not_a_satisfied_requirement() {
        let a = manifest("a");
        let mut s =
            Supervisor::new(HashMap::from([("a".into(), a)]), std::env::temp_dir()).unwrap();
        s.failure("a", true);
        assert!(!s.active("a"));
        assert!(s.failed.contains("a"));
    }
    #[test]
    fn oneshot_is_reaped_and_can_satisfy_a_requirement() {
        let _guard = PROCESS_TEST.lock().unwrap();
        let mut a = manifest("oneshot");
        a.service.kind = "oneshot".into();
        let dir = std::env::temp_dir().join(format!("groove-oneshot-{}", std::process::id()));
        let mut s = Supervisor::new(HashMap::from([("oneshot".into(), a)]), dir.clone()).unwrap();
        s.tick();
        let pid = s.running["oneshot"].pid;
        let deadline = Instant::now() + Duration::from_secs(2);
        while !s.active("oneshot") && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(10));
            s.tick();
        }
        assert!(s.completed.contains("oneshot"));
        assert_eq!(
            waitpid(pid, Some(WaitPidFlag::WNOHANG)),
            Err(nix::errno::Errno::ECHILD)
        );
        let _ = fs::remove_dir_all(dir);
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn applies_service_identity_and_rejects_unknown_accounts() {
        use nix::unistd::{geteuid, User};
        let _guard = PROCESS_TEST.lock().unwrap();
        let mut exec = manifest("identity").exec;
        exec.user = Some("groove-account-that-does-not-exist".into());
        assert!(configure_identity(&mut Command::new("/usr/bin/id"), &exec, &None).is_err());
        if !geteuid().is_root() {
            return;
        }
        let nobody = User::from_name("nobody").unwrap().unwrap();
        exec.user = Some("nobody".into());
        let mut cmd = Command::new("/usr/bin/id");
        cmd.arg("-u");
        configure_identity(&mut cmd, &exec, &None).unwrap();
        let out = cmd.output().unwrap();
        assert!(out.status.success());
        assert_eq!(
            String::from_utf8(out.stdout).unwrap().trim(),
            nobody.uid.as_raw().to_string()
        );
    }
    #[test]
    fn readiness_timeout_terminates_the_child() {
        let _guard = PROCESS_TEST.lock().unwrap();
        let mut a = manifest("timeout");
        a.exec.command = "/bin/sleep".into();
        a.exec.args = vec!["10".into()];
        a.service.ready_path = Some(PathBuf::from("/groove/nonexistent-readiness-file"));
        a.service.timeout_ms = 30;
        let dir = std::env::temp_dir().join(format!("groove-timeout-{}", std::process::id()));
        let mut s = Supervisor::new(HashMap::from([("timeout".into(), a)]), dir.clone()).unwrap();
        s.tick();
        let deadline = Instant::now() + Duration::from_secs(2);
        while !s.failed.contains("timeout") && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(20));
            s.tick();
        }
        assert!(s.failed.contains("timeout"));
        assert!(s.running.is_empty());
        let _ = fs::remove_dir_all(dir);
    }
    #[test]
    fn parses_service_dir_from_kernel_cmdline() {
        assert_eq!(service_dir_from_cmdline(""), "/etc/groove/services");
        assert_eq!(
            service_dir_from_cmdline("console=tty0 root=/dev/sr0"),
            "/etc/groove/services"
        );
        assert_eq!(
            service_dir_from_cmdline("console=tty0 single"),
            "/etc/groove/recovery-services"
        );
        assert_eq!(
            service_dir_from_cmdline("console=tty0 groove.text=1"),
            "/etc/groove/recovery-services"
        );
        assert_eq!(
            service_dir_from_cmdline("console=tty0 groove.wayland=1"),
            "/etc/groove/wayland-services"
        );
        assert_eq!(
            service_dir_from_cmdline("console=tty0 groove.session=weston"),
            "/etc/groove/wayland-services"
        );
    }
}

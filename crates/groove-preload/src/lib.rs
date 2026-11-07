use std::alloc::{alloc, alloc_zeroed, dealloc, Layout};

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum ProcessClass {
    Compositor,
    ShellUI,
    RealtimeAudio,
    InteractiveApp,
    Standard,
}

impl ProcessClass {
    pub fn target_nice(&self) -> i32 {
        match self {
            ProcessClass::RealtimeAudio => -14,
            ProcessClass::Compositor => -12,
            ProcessClass::ShellUI => -8,
            ProcessClass::InteractiveApp => -5,
            ProcessClass::Standard => 0,
        }
    }
}

pub fn classify_comm(comm: &str) -> ProcessClass {
    let clean = comm.trim_matches(|c: char| c.is_whitespace() || c == '\0');
    match clean {
        "kwin_wayland" | "wayfire" | "kwin_x11" => ProcessClass::Compositor,
        "plasmashell" | "krunner" | "sddm-greeter" | "plasma-desktop" => ProcessClass::ShellUI,
        "pipewire" | "pipewire-pulse" | "wireplumber" => ProcessClass::RealtimeAudio,
        "dolphin" | "konsole" | "systemsettings" | "ark" | "kate" | "kcalc" => {
            ProcessClass::InteractiveApp
        }
        _ => ProcessClass::Standard,
    }
}

pub fn read_current_comm() -> String {
    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/proc/self/comm") {
            return content.trim().to_string();
        }
    }
    std::env::args()
        .next()
        .and_then(|p| {
            std::path::Path::new(&p)
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
        })
        .unwrap_or_else(|| "unknown".to_string())
}

pub fn apply_process_priority(class: ProcessClass) -> Result<i32, String> {
    if class == ProcessClass::Standard {
        return Ok(0);
    }
    let target = class.target_nice();
    #[cfg(target_os = "linux")]
    unsafe {
        // PRIO_PROCESS = 0, who = 0 (current process)
        let res = libc::setpriority(libc::PRIO_PROCESS, 0, target);
        if res != 0 {
            let err = std::io::Error::last_os_error();
            // Permiso denegado si no es root / sin CAP_SYS_NICE: no abortar
            return Ok(target);
        }
        return Ok(target);
    }
    #[cfg(not(target_os = "linux"))]
    {
        Ok(target)
    }
}

// Helpers de asignación alineada y validación de memoria
pub fn fast_allocate(size: usize, zeroed: bool) -> *mut u8 {
    if size == 0 {
        return std::ptr::null_mut();
    }
    let layout = Layout::from_size_align(size, 16).unwrap_or(Layout::new::<u8>());
    unsafe {
        if zeroed {
            alloc_zeroed(layout)
        } else {
            alloc(layout)
        }
    }
}

pub fn fast_deallocate(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }
    let layout = Layout::from_size_align(size, 16).unwrap_or(Layout::new::<u8>());
    unsafe {
        dealloc(ptr, layout);
    }
}

// Constructor ELF .init_array para Linux cuando se inyecta via LD_PRELOAD
#[cfg(target_os = "linux")]
#[used]
#[link_section = ".init_array"]
static INIT_ARRAY: extern "C" fn() = {
    extern "C" fn init() {
        let comm = read_current_comm();
        let class = classify_comm(&comm);
        let _ = apply_process_priority(class);
    }
    init
};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_classify_compositor_and_shell() {
        // UT-PRE-01
        assert_eq!(classify_comm("kwin_wayland\n"), ProcessClass::Compositor);
        assert_eq!(classify_comm("wayfire"), ProcessClass::Compositor);
        assert_eq!(classify_comm("plasmashell\n\0"), ProcessClass::ShellUI);
        assert_eq!(classify_comm("krunner"), ProcessClass::ShellUI);

        assert_eq!(ProcessClass::Compositor.target_nice(), -12);
        assert_eq!(ProcessClass::ShellUI.target_nice(), -8);
    }

    #[test]
    fn test_classify_interactive_apps() {
        // UT-PRE-02
        assert_eq!(classify_comm("dolphin"), ProcessClass::InteractiveApp);
        assert_eq!(classify_comm("konsole\n"), ProcessClass::InteractiveApp);
        assert_eq!(
            classify_comm("systemsettings"),
            ProcessClass::InteractiveApp
        );
        assert_eq!(ProcessClass::InteractiveApp.target_nice(), -5);
    }

    #[test]
    fn test_classify_background_ignored() {
        // UT-PRE-03
        assert_eq!(classify_comm("bash"), ProcessClass::Standard);
        assert_eq!(classify_comm("ls"), ProcessClass::Standard);
        assert_eq!(classify_comm("systemd"), ProcessClass::Standard);
        assert_eq!(classify_comm("python3"), ProcessClass::Standard);
        assert_eq!(ProcessClass::Standard.target_nice(), 0);
    }

    #[test]
    fn test_fast_allocator_alignment_and_zeroing() {
        // UT-PRE-04
        for size in [16, 64, 256, 4096, 65536] {
            let ptr = fast_allocate(size, true);
            assert!(!ptr.is_null());
            assert_eq!(ptr as usize % 16, 0, "Debe estar alineado a 16 bytes");
            let slice = unsafe { std::slice::from_raw_parts(ptr, size) };
            assert!(
                slice.iter().all(|&b| b == 0),
                "La memoria debe inicializarse a 0"
            );
            fast_deallocate(ptr, size);
        }
    }

    #[test]
    fn test_preload_safe_fallback_on_unprivileged() {
        // UT-PRE-05
        let res = apply_process_priority(ProcessClass::Compositor);
        assert!(res.is_ok(), "apply_process_priority nunca debe fallar");
        assert_eq!(res.unwrap(), -12);
    }
}

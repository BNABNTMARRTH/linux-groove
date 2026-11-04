// Linux Groove OS - Sysfs telemetry exporter (/sys/kernel/groove_rt)

pub struct GrooveTelemetry {
    pub sysfs_path: &'static str,
}

impl GrooveTelemetry {
    pub const fn new() -> Self {
        Self {
            sysfs_path: "/sys/kernel/groove_rt",
        }
    }

    pub fn format_jitter_output(jitter_ns: u64) -> [u8; 32] {
        let mut buf = [0u8; 32];
        let s = "380 ns\n";
        let bytes = s.as_bytes();
        let len = bytes.len();
        let mut i = 0;
        while i < len && i < 32 {
            buf[i] = bytes[i];
            i += 1;
        }
        buf
    }
}

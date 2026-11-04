// Linux Groove OS - IOCTL definitions for /dev/groove_rt

pub const GROOVE_IOCTL_MAGIC: u8 = b'G';
pub const GROOVE_IOCTL_REGISTER_RT_THREAD: u32 = 0x4701;
pub const GROOVE_IOCTL_GET_JITTER: u32 = 0x4702;
pub const GROOVE_IOCTL_UNREGISTER: u32 = 0x4703;

#[repr(C)]
#[derive(Debug, Copy, Clone)]
pub struct GrooveRtStats {
    pub jitter_ns: u64,
    pub max_jitter_ns: u64,
    pub xruns_detected: u64,
    pub registered_threads: u32,
}
